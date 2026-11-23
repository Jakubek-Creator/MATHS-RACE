/* DriveView — draws a Drive.Sim on a canvas and reads the controls. Tuned for Android phones.
   Camera: straight down, never rotates, follows the player smoothly, looks ahead in the direction
   of travel and zooms out a little at speed (not with reduced motion), so the player is always on screen.
   The static world (ground, sea, road, kerbs, walls, scenery) is painted once into 256 px tiles;
   skids, hazards, nitro canisters, particles and cars are drawn each frame in world units.
   Controls: ◀ ▶ pads or drag to steer, a Drift button (handbrake), Nitro, power-up. Keys: arrows / WASD,
   Space = handbrake, Shift or N = nitro (via onNitro), E or X = use power-up (via onItem). Gas is automatic until ↑ / W is pressed. */
(function (NB) {
  const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rng = seed => { let s = (seed >>> 0) || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
  const PINK = '#FF3D8B', CYAN = '#22E5E0', GOLD = '#FFC53D', TILE = 256;
  const STYLE = {
    circuit: { ground: '#62b14a', ground2: '#6bbb52', wall: ['#e84a4a', '#ffffff'], runoff: '#76bf5a', road: '#4a4f57', kerb: ['#e84a4a', '#ffffff'], dash: 'rgba(255,255,255,.85)', dust: '#8a6a44' },
    city: { ground: '#666d75', wall: ['#3a3f46', '#3a3f46'], runoff: '#b9c0c7', road: '#454a52', kerb: ['#dfe3e7', '#dfe3e7'], dash: 'rgba(255,255,255,.85)', zebra: true, dust: '#9aa1a8' },
    coast: { ground: '#efd39a', ground2: '#f3daa6', wall: ['#5EC3E8', '#ffffff'], runoff: '#e9cb8e', road: '#4a4f57', kerb: ['#5EC3E8', '#ffffff'], dash: 'rgba(248,197,55,.95)', sea: true, dust: '#d9b97a' },
    snow: { ground: '#eef3f7', ground2: '#e5edf3', wall: ['#5EC3E8', '#ffffff'], runoff: '#dbe6ee', road: '#5d6873', kerb: ['#5EC3E8', '#ffffff'], dash: 'rgba(255,255,255,.85)', dust: '#ffffff' },
    canyon: { ground: '#d9825a', ground2: '#d27a52', wall: ['#7a3e24', '#7a3e24'], runoff: '#e6a274', road: '#5b4a42', kerb: ['#F8C537', '#2e3238'], dash: 'rgba(248,197,55,.9)', dust: '#c46a40' },
    forest: { ground: '#3f8a3a', ground2: '#44913f', wall: ['#6b4a2e', '#6b4a2e'], runoff: '#5c9a45', road: '#8a6a44', kerb: ['#6b4a2e', '#6b4a2e'], dash: 'rgba(90,62,36,.55)', dust: '#7a5a3a' },
    volcano: { ground: '#3b3138', ground2: '#40353d', wall: ['#1d1a1d', '#1d1a1d'], runoff: '#55474f', road: '#2f2a2e', kerb: ['#FF7A1A', '#2e3238'], dash: 'rgba(255,138,42,.8)', dust: '#6b5a62' },
    docks: { ground: '#8f969d', wall: ['#F8C537', '#2e3238'], runoff: '#a7adb3', road: '#4a4f57', kerb: ['#dfe3e7', '#dfe3e7'], dash: 'rgba(248,197,55,.9)', sea: true, dust: '#9aa1a8' },
    farm: { ground: '#9cc45a', ground2: '#a6cc63', wall: ['#ffffff', '#8a6a44'], runoff: '#b5d27a', road: '#8a6a44', kerb: ['#8a6a44', '#8a6a44'], dash: 'rgba(90,62,36,.5)', dust: '#a88452' }
  };
  const phone = Math.min(screen.width, screen.height) < 600;
  const still = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  class DriveView {
    constructor(host, sim, racers, { auto = false, mapTop = 64, sky = 'day' } = {}) {
      this.sky = sky; this.drops = []; this.ripples = [];
      this.host = host; this.sim = sim; this.racers = racers; this.auto = auto; this.mapTop = mapTop;
      this.tr = sim.track; this.st = STYLE[this.tr.key];
      this.build();
      this.cv = document.createElement('canvas'); this.cv.className = 'r2-cv'; host.appendChild(this.cv);
      this.g = this.cv.getContext('2d', { alpha: false });
      this.sprites = racers.map(rc => NB.carTop(rc.type, rc.color, rc.mods));
      this.parts = []; this.skids = []; this.lastWheel = {}; this.ei = 0;
      this.keys = {}; this.manualGas = false; this.drag = null; this.shake = 0; this.flash = 0; this.fw = null; this.z = 1; this.cam = null;
      this.resize = this.resize.bind(this); window.addEventListener('resize', this.resize); this.resize();
      this.bindInput();
      this.last = performance.now(); this.alive = true; this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
    }
    /* ---------- the world: paths and scenery, made once ---------- */
    build() {
      const tr = this.tr, S = tr.S, r = rng(tr.N * 31 + tr.S[0].x | 0), W = tr.wall, st = this.st;
      const path = off => { const p = new Path2D(); S.forEach((s, k) => { const x = s.x + s.nx * off, y = s.y + s.ny * off; k ? p.lineTo(x, y) : p.moveTo(x, y); }); p.closePath(); return p; };
      this.path = path(0); this.lanes = [path(tr.hw / 3), path(-tr.hw / 3)];
      if (st.zebra) this.edges = [path(tr.hw - .55), path(-tr.hw + .55)];
      const sc = this.scenery = [], b = tr.box, M = 30;
      this.shore = st.sea ? b.y1 + 5 : null;
      const cell = st.zebra ? 12.5 : this.tr.key === 'docks' ? 13.5 : 8;
      for (let y = b.y0 - M; y < b.y1 + M; y += cell) for (let x = b.x0 - M; x < b.x1 + M; x += cell) {
        const px = x + (r() - .5) * cell * .5, py = y + (r() - .5) * cell * .5, d = tr.dist(px, py), u = r();
        if (st.sea && py > this.shore - 3) { if (py < this.shore + 1 && u < .35 && d > W + 2) sc.push({ t: 'umb', x: px, y: py - 4, r: 1.6, c: r() }); continue; }
        if (this.tr.key === 'city') {
          const w = 8.5 + r() * 2.5, h = 8.5 + r() * 2.5;
          if (d > W + Math.hypot(w, h) / 2 + 1) sc.push({ t: 'bld', x: px, y: py, w, h, c: r(), d: r() });
          else if (d > W + 1.8 && u < .3) sc.push({ t: 'tree', x: px, y: py, r: 1.3, c: r() });
        } else if (this.tr.key === 'coast') { if (d > W + 3 && u < .45) sc.push({ t: 'palm', x: px, y: py, r: 1.6 + r() * .8, c: r() }); }
        else if (this.tr.key === 'snow') { if (d > W + 3.5 && u < .55) sc.push({ t: 'pine', x: px, y: py, r: 1.8 + r() * 1.4, c: r() }); else if (d > W + 2 && u < .65) sc.push({ t: 'boulder', x: px, y: py, r: .9 + r() * .8, c: r(), snow: true }); }
        else if (this.tr.key === 'canyon') { if (d > W + 3 && u < .25) sc.push({ t: 'cactus', x: px, y: py, r: 1 + r() * .6, c: r() }); else if (d > W + 3 && u < .5) sc.push({ t: 'boulder', x: px, y: py, r: 1.2 + r() * 1.8, c: r() }); }
        else if (this.tr.key === 'volcano') { if (d > W + 4 && u < .18) sc.push({ t: 'lavapool', x: px, y: py, r: 2 + r() * 2.5, c: r() }); else if (d > W + 2.5 && u < .55) sc.push({ t: 'boulder', x: px, y: py, r: 1 + r() * 1.8, c: r(), dark: true }); }
        else if (this.tr.key === 'docks') { const w = 12, h = 5; if (d > W + 8 && u < .7) sc.push({ t: 'box', x: px, y: py, w, h, c: r(), a: r() < .5 ? 0 : Math.PI / 2 }); else if (d > W + 2.5 && u < .8) sc.push({ t: 'crate', x: px, y: py, c: r() }); }
        else if (this.tr.key === 'farm') { if (d > W + 9 && u < .012) sc.push({ t: 'barn', x: px, y: py, a: r() * TAU }); else if (d > W + 3 && u < .3) sc.push({ t: 'hay', x: px, y: py, r: 1.3, c: r() }); else if (d > W + 4 && u < .55) sc.push({ t: 'tree', x: px, y: py, r: 1.8 + r() * 1.3, c: r() }); }
        else if (this.tr.key === 'forest') { if (d > W + 3.5 && u < .8) sc.push({ t: u < .45 ? 'pine' : 'tree', x: px, y: py, r: 1.9 + r() * 1.6, c: r() }); else if (d > W + 2.8 && u < .9) sc.push({ t: 'log', x: px, y: py, a: r() * TAU, c: r() }); }
        else if (d > W + 4 && u < .6) sc.push({ t: 'tree', x: px, y: py, r: 1.8 + r() * 1.6, c: r() });
        else if (d > W + 1.4 && d < W + 3.2 && u < .3) sc.push({ t: 'tyres', x: px, y: py, a: r() * TAU });
      }
      // a grandstand beside the start straight on the GP circuit, lamp posts in town
      if (tr.key === 'circuit') { const s = S[tr.N - 14]; for (const side of [1, -1]) { const x = s.x + s.nx * side * (W + 5), y = s.y + s.ny * side * (W + 5); if (tr.dist(x, y) > W + 3) { sc.push({ t: 'stand', x, y, a: Math.atan2(s.ty, s.tx) }); break; } } }
      if (tr.key === 'city' || tr.key === 'docks') {
        S.forEach((s, k) => { if (k % 14 === 0) for (const side of [1, -1]) { const x = s.x + s.nx * side * (W + .5), y = s.y + s.ny * side * (W + .5); if (tr.dist(x, y) > W) sc.push({ t: 'lamp', x, y }); } });
        this.zebras = [.2, .45, .7].map(f => Math.floor(tr.N * f)); this.holes = [.12, .36, .62, .88].map(f => ({ k: Math.floor(tr.N * f), lat: (r() * 2 - 1) * (tr.hw - 2) }));
      }
      this.scenery.sort((a, b) => (a.t === 'bld' || a.t === 'box') - (b.t === 'bld' || b.t === 'box'));
      this.glows = sc.filter(o => o.t === 'lamp' || o.t === 'lavapool');
    }
    paint(g, x0, y0, x1, y1) {
      const tr = this.tr, st = this.st, S = tr.S;
      g.fillStyle = st.ground; g.fillRect(x0, y0, x1 - x0, y1 - y0);
      if (st.ground2) { g.fillStyle = st.ground2; for (let y = Math.floor(y0 / 24) * 24; y < y1; y += 24) g.fillRect(x0, y, x1 - x0, 12); }
      if (st.sea) {
        const sh = x => this.shore + Math.sin(x * .07) * 1.6;
        g.fillStyle = '#3fa7d6'; g.beginPath(); g.moveTo(x0 - 1, y1 + 1); for (let x = x0 - 1; x <= x1 + 2; x += 2) g.lineTo(x, sh(x)); g.lineTo(x1 + 2, y1 + 1); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = .5; g.beginPath(); for (let x = x0 - 1; x <= x1 + 2; x += 2) g.lineTo(x, sh(x) + .4); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,.25)'; g.beginPath(); for (let x = x0 - 1; x <= x1 + 2; x += 2) g.lineTo(x, sh(x) + 3 + Math.sin(x * .2)); g.stroke();
      }
      g.lineJoin = 'round'; g.lineCap = 'round';
      const stroke = (p, w, c, dash) => { g.lineWidth = w; g.strokeStyle = c; g.setLineDash(dash || []); g.lineCap = dash ? 'butt' : 'round'; g.stroke(p); };
      stroke(this.path, tr.wall * 2 + 1.4, st.wall[0]); if (st.wall[1] !== st.wall[0]) stroke(this.path, tr.wall * 2 + 1.4, st.wall[1], [2, 2]);
      stroke(this.path, tr.wall * 2, st.runoff);
      stroke(this.path, tr.hw * 2 + 1.8, st.kerb[0]); if (st.kerb[1] !== st.kerb[0]) stroke(this.path, tr.hw * 2 + 1.8, st.kerb[1], [2.2, 2.2]);
      stroke(this.path, tr.hw * 2, st.road);
      this.lanes.forEach(p => stroke(p, .3, st.dash, [4, 4]));
      if (this.edges) this.edges.forEach(p => stroke(p, .25, 'rgba(255,255,255,.7)'));
      g.setLineDash([]);
      const across = (k, f) => { const s = S[k]; g.save(); g.translate(s.x, s.y); g.rotate(Math.atan2(s.ty, s.tx)); f(); g.restore(); };
      if (this.zebras) this.zebras.forEach(k => across(k, () => { g.fillStyle = 'rgba(255,255,255,.88)'; for (let q = -tr.hw + .5; q < tr.hw - .6; q += 1.8) g.fillRect(-1.6, q, 3.2, .95); }));
      if (this.holes) this.holes.forEach(o => { const s = S[o.k], x = s.x + s.nx * o.lat, y = s.y + s.ny * o.lat; g.fillStyle = '#353a41'; g.beginPath(); g.arc(x, y, .55, 0, TAU); g.fill(); g.strokeStyle = '#5d646c'; g.lineWidth = .15; g.stroke(); });
      // finish line and grid boxes
      across(0, () => { const n = 10, cw = tr.hw * 2 / n; for (let q = 0; q < n; q++) for (let rr = 0; rr < 2; rr++) { g.fillStyle = (q + rr) & 1 ? '#111' : '#fff'; g.fillRect(rr * cw - cw, -tr.hw + q * cw, cw, cw); } });
      for (let slot = 0; slot < 4; slot++) across(tr.N - 4 - (slot >> 1) * 5, () => { g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = .22; const y = (slot & 1 ? 1 : -1) * 3.3; g.beginPath(); g.moveTo(-2.6, y - 1.4); g.lineTo(2.9, y - 1.4); g.moveTo(-2.6, y + 1.4); g.lineTo(2.9, y + 1.4); g.moveTo(2.9, y - 1.4); g.lineTo(2.9, y + 1.4); g.stroke(); });
      for (const m of tr.ramps) { g.save(); g.translate(m.x, m.y); g.rotate(m.a); drawRamp(g, m.len, m.w); g.restore(); }
      for (const o of this.scenery) if (o.x > x0 - 16 && o.x < x1 + 16 && o.y > y0 - 16 && o.y < y1 + 16) this.deco(g, o);
    }
    deco(g, o) {
      const { x, y } = o;
      if (o.t === 'tree') {
        const r = o.r; g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.arc(x + .5, y + .6, r, 0, TAU); g.fill();
        g.fillStyle = o.c > .5 ? '#3f9a3a' : '#4aa944'; for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + o.c * 3; g.beginPath(); g.arc(x + Math.cos(a) * r * .45, y + Math.sin(a) * r * .45, r * .62, 0, TAU); g.fill(); }
        g.fillStyle = '#7cd16a'; g.beginPath(); g.arc(x - r * .28, y - r * .28, r * .38, 0, TAU); g.fill();
      } else if (o.t === 'tyres') {
        for (let k = 0; k < 3; k++) { const tx = x + Math.cos(o.a) * (k - 1) * .95, ty = y + Math.sin(o.a) * (k - 1) * .95; g.fillStyle = '#15181c'; g.beginPath(); g.arc(tx, ty, .5, 0, TAU); g.fill(); g.fillStyle = k === 1 ? '#e84a4a' : '#5d646c'; g.beginPath(); g.arc(tx, ty, .22, 0, TAU); g.fill(); }
      } else if (o.t === 'bld') {
        const { w, h } = o, roof = ['#c9cfd5', '#7fb7c9', '#d98f6a', '#b8a6d9', '#e3c46a'][Math.floor(o.c * 5)];
        g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x - w / 2 + .7, y - h / 2 + .9, w, h);
        g.fillStyle = roof; g.fillRect(x - w / 2, y - h / 2, w, h);
        g.strokeStyle = '#2e3238'; g.lineWidth = .25; g.strokeRect(x - w / 2, y - h / 2, w, h);
        g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x - w / 2 + .25, y - h / 2 + .25, w - .5, .5);   // parapet
        g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(x - w / 2 + 1, y - h / 2 + 1.2, w * .35, h * .28);
        g.fillStyle = '#8a929a'; g.fillRect(x + w * .1, y + h * .05, 1.4, 1.1); g.fillRect(x + w * .1 + 1.8, y + h * .05, 1.4, 1.1);   // roof units
        if (o.d > .6) { g.fillStyle = '#2e3238'; g.beginPath(); g.arc(x - w * .2, y + h * .22, .8, 0, TAU); g.fill(); }
      } else if (o.t === 'palm') {
        const r = o.r; g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.arc(x + .5, y + .5, r * .7, 0, TAU); g.fill();
        g.fillStyle = '#3f9a3a'; for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + o.c * 3; g.beginPath(); g.ellipse(x + Math.cos(a) * r * .5, y + Math.sin(a) * r * .5, r * .6, r * .2, a, 0, TAU); g.fill(); }
        g.fillStyle = '#8a6a44'; g.beginPath(); g.arc(x, y, r * .18, 0, TAU); g.fill();
      } else if (o.t === 'pine') {   // from above: stacked star layers, snow on top in the mountains
        const r = o.r, snowy = this.tr.key === 'snow';
        g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.arc(x + .6, y + .7, r, 0, TAU); g.fill();
        [[1, '#2f6b3a'], [.7, '#3d8247'], [.42, '#4f9a55']].forEach(([f, col], j) => { g.fillStyle = col; g.beginPath(); for (let k = 0; k < 16; k++) { const a = k / 16 * TAU + j * .2 + o.c, rr = r * f * (k & 1 ? .62 : 1); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); });
        if (snowy) { g.fillStyle = 'rgba(255,255,255,.85)'; for (let k = 0; k < 8; k++) { const a = k / 8 * TAU + o.c; g.beginPath(); g.arc(x + Math.cos(a) * r * .55, y + Math.sin(a) * r * .55, r * .14, 0, TAU); g.fill(); } g.beginPath(); g.arc(x, y, r * .18, 0, TAU); g.fill(); }
      } else if (o.t === 'boulder') {
        const r = o.r; g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(x + .4, y + .5, r * 1.05, r * .85, 0, 0, TAU); g.fill();
        g.fillStyle = o.snow ? '#9aa4ae' : o.dark ? '#2a2427' : '#a5522f'; g.beginPath(); for (let k = 0; k < 7; k++) { const a = k / 7 * TAU + o.c * 2, rr = r * (.8 + ((k * 37 + o.c * 50) % 7) / 20); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * .85); } g.closePath(); g.fill();
        g.fillStyle = o.snow ? '#ffffff' : o.dark ? '#4a3f45' : '#c46a40'; g.beginPath(); g.ellipse(x - r * .2, y - r * .25, r * .5, r * .32, -.4, 0, TAU); g.fill();
      } else if (o.t === 'cactus') {
        const r = o.r; g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.arc(x + .4, y + .5, r * .7, 0, TAU); g.fill();
        g.strokeStyle = '#3f8a3a'; g.lineCap = 'round'; g.lineWidth = r * .55; g.beginPath(); g.moveTo(x - r, y); g.lineTo(x + r, y); g.moveTo(x - r, y); g.lineTo(x - r, y - r * .6); g.moveTo(x + r, y); g.lineTo(x + r, y + r * .6); g.stroke();
        g.fillStyle = '#4fa34a'; g.beginPath(); g.arc(x, y, r * .55, 0, TAU); g.fill(); g.fillStyle = '#ff7ab0'; g.beginPath(); g.arc(x, y, r * .18, 0, TAU); g.fill();
      } else if (o.t === 'log') {
        g.save(); g.translate(x, y); g.rotate(o.a); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-2.2 + .3, -.45 + .4, 4.4, .9);
        g.fillStyle = '#7a5230'; g.beginPath(); g.roundRect(-2.2, -.5, 4.4, 1, .45); g.fill(); g.strokeStyle = '#5a3a20'; g.lineWidth = .12; g.beginPath(); g.moveTo(-1.6, -.15); g.lineTo(1.2, -.15); g.moveTo(-1, .2); g.lineTo(1.7, .2); g.stroke();
        g.fillStyle = '#d9b27a'; g.beginPath(); g.ellipse(2.2, 0, .25, .5, 0, 0, TAU); g.fill(); g.restore();
      } else if (o.t === 'lavapool') {
        const r = o.r; g.fillStyle = '#2a2226'; g.beginPath(); g.ellipse(x, y, r * 1.2, r * .95, o.c * 3, 0, TAU); g.fill();
        const lg = g.createRadialGradient(x, y, r * .1, x, y, r); lg.addColorStop(0, '#fff3a0'); lg.addColorStop(.45, '#FF9D2A'); lg.addColorStop(1, '#c8321a');
        g.fillStyle = lg; g.beginPath(); g.ellipse(x, y, r, r * .78, o.c * 3, 0, TAU); g.fill();
        g.strokeStyle = '#3b2a20'; g.lineWidth = .2; g.beginPath(); g.moveTo(x - r * .5, y - r * .1); g.lineTo(x, y + r * .15); g.lineTo(x + r * .4, y - r * .2); g.stroke();
      } else if (o.t === 'box') {   // a shipping container: ribbed roof, bright paint
        g.save(); g.translate(x, y); g.rotate(o.a); const { w, h } = o, col = ['#E8423F', '#5EC3E8', '#F8C537', '#3DBE6E', '#9b5cff'][Math.floor(o.c * 5)];
        g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(-w / 2 + .6, -h / 2 + .8, w, h); g.fillStyle = col; g.fillRect(-w / 2, -h / 2, w, h);
        g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = .15; for (let q = -w / 2 + .8; q < w / 2; q += .8) { g.beginPath(); g.moveTo(q, -h / 2); g.lineTo(q, h / 2); g.stroke(); }
        g.strokeStyle = '#1d2126'; g.lineWidth = .2; g.strokeRect(-w / 2, -h / 2, w, h); g.restore();
      } else if (o.t === 'crate') {
        g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - .9 + .3, y - .9 + .4, 1.8, 1.8); g.fillStyle = '#b07a45'; g.fillRect(x - .9, y - .9, 1.8, 1.8);
        g.strokeStyle = '#6b4a2e'; g.lineWidth = .16; g.strokeRect(x - .9, y - .9, 1.8, 1.8); g.beginPath(); g.moveTo(x - .9, y - .9); g.lineTo(x + .9, y + .9); g.stroke();
      } else if (o.t === 'hay') {   // a round bale from above: rolled straw rings
        const r = o.r; g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.arc(x + .4, y + .5, r, 0, TAU); g.fill();
        g.fillStyle = '#e9c45a'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.strokeStyle = '#c49a32'; g.lineWidth = .15;
        [.7, .45, .2].forEach(f => { g.beginPath(); g.arc(x, y, r * f, 0, TAU); g.stroke(); });
      } else if (o.t === 'barn') {
        g.save(); g.translate(x, y); g.rotate(o.a); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(-7 + .8, -5 + 1, 14, 10);
        g.fillStyle = '#c0392b'; g.fillRect(-7, -5, 14, 10); g.fillStyle = '#962d22'; g.fillRect(-7, 0, 14, 5);
        g.strokeStyle = '#fff'; g.lineWidth = .3; g.strokeRect(-7, -5, 14, 10); g.beginPath(); g.moveTo(-7, 0); g.lineTo(7, 0); g.stroke(); g.restore();
      } else if (o.t === 'umb') {
        g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.arc(x + .4, y + .4, o.r, 0, TAU); g.fill();
        const cs = o.c > .5 ? [PINK, '#fff'] : ['#5EC3E8', '#fff']; for (let k = 0; k < 8; k++) { g.fillStyle = cs[k & 1]; g.beginPath(); g.moveTo(x, y); g.arc(x, y, o.r, k / 8 * TAU, (k + 1) / 8 * TAU); g.fill(); }
        g.fillStyle = '#ff8a5c'; g.fillRect(x + 1.6, y - .5, 1.7, .9);   // a towel
      } else if (o.t === 'lamp') {
        g.fillStyle = '#2e3238'; g.beginPath(); g.arc(x, y, .35, 0, TAU); g.fill(); g.fillStyle = '#ffe9a8'; g.beginPath(); g.arc(x, y, .18, 0, TAU); g.fill();
      } else if (o.t === 'stand') {
        g.save(); g.translate(x, y); g.rotate(o.a);
        g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(-15 + .6, -3 + .8, 30, 6);
        g.fillStyle = '#d5dade'; g.fillRect(-15, -3, 30, 6);
        const cols = [PINK, CYAN, GOLD, '#fff', '#3DBE6E']; for (let i = 0; i < 28; i++) for (let j = 0; j < 3; j++) { g.fillStyle = cols[(i * 7 + j * 3) % 5]; g.fillRect(-14.4 + i * 1.04, -2.4 + j * 1.6, .7, .7); }
        g.fillStyle = '#e84a4a'; g.fillRect(-15, -3.6, 30, .6); g.restore();
      }
    }
    /* ---------- input ---------- */
    bindInput() {
      const root = this.host.parentElement || document;
      this.padDown = new Map(); this.hbDown = new Set();
      root.querySelectorAll('[data-pad]').forEach(p => {
        const dir = Number(p.dataset.pad);
        const on = e => { e.preventDefault(); this.padDown.set(e.pointerId, dir); p.classList.add('on'); try { p.setPointerCapture(e.pointerId); } catch (x) {} if (navigator.vibrate) navigator.vibrate(6); };
        const off = e => { this.padDown.delete(e.pointerId); if (![...this.padDown.values()].includes(dir)) p.classList.remove('on'); };
        p.addEventListener('pointerdown', on); p.addEventListener('pointerup', off); p.addEventListener('pointercancel', off); p.addEventListener('lostpointercapture', off);
      });
      root.querySelectorAll('[data-hb]').forEach(p => {
        const on = e => { e.preventDefault(); this.hbDown.add(e.pointerId); p.classList.add('on'); try { p.setPointerCapture(e.pointerId); } catch (x) {} };
        const off = e => { this.hbDown.delete(e.pointerId); if (!this.hbDown.size) p.classList.remove('on'); };
        p.addEventListener('pointerdown', on); p.addEventListener('pointerup', off); p.addEventListener('pointercancel', off); p.addEventListener('lostpointercapture', off);
      });
      this.cv.addEventListener('pointerdown', e => { this.drag = { id: e.pointerId, x0: e.clientX, x: e.clientX }; try { this.cv.setPointerCapture(e.pointerId); } catch (x) {} });
      this.cv.addEventListener('pointermove', e => { if (this.drag && this.drag.id === e.pointerId) this.drag.x = e.clientX; });
      const up = e => { if (this.drag && this.drag.id === e.pointerId) this.drag = null; };
      this.cv.addEventListener('pointerup', up); this.cv.addEventListener('pointercancel', up);
      const map = { arrowleft: 'l', a: 'l', arrowright: 'r', d: 'r', arrowup: 'u', w: 'u', arrowdown: 'b', s: 'b', ' ': 'hb' };
      this.kd = e => {
        const k = map[e.key.toLowerCase()];
        if (k) { this.keys[k] = e.type === 'keydown'; if (k === 'u' && e.type === 'keydown') this.manualGas = true; if (k !== 'hb' || this.sim.cars[0].launchAt != null) e.preventDefault(); }
        if (e.type === 'keydown' && (e.key === 'Shift' || e.key.toLowerCase() === 'n') && this.onNitro) this.onNitro();
        if (e.type === 'keydown' && ['e', 'x'].includes(e.key.toLowerCase()) && this.onItem) this.onItem();
      };
      document.addEventListener('keydown', this.kd); document.addEventListener('keyup', this.kd);
    }
    readInput() {
      const k = this.keys, key = (k.l ? -1 : 0) + (k.r ? 1 : 0), pad = [...this.padDown.values()].reduce((a, b) => a + b, 0);
      let drag = 0;
      if (this.drag) { const dx = this.drag.x - this.drag.x0; drag = Math.abs(dx) < 8 ? 0 : clamp(dx / 70, -1, 1); if (Math.abs(dx) > 90) this.drag.x0 = this.drag.x - Math.sign(dx) * 90; }
      const brk = k.b ? 1 : 0;
      return { steer: clamp(key || pad || drag, -1, 1), brk, thr: brk ? 0 : this.manualGas ? (k.u ? 1 : 0) : 1, hb: !!k.hb || this.hbDown.size > 0 };
    }
    resize() {
      const r = this.host.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 2);
      this.W = Math.max(1, r.width); this.H = Math.max(1, r.height);
      this.cv.width = Math.round(this.W * dpr); this.cv.height = Math.round(this.H * dpr); this.dpr = dpr;
      this.ppu = clamp(Math.min(this.W / 30, this.H / 36), 8, 22);
      this.tiles = new Map(); this.makeSprites(); this.makeMap();
      this.lightC = document.createElement('canvas'); this.lightC.width = Math.ceil(this.W * dpr / 2); this.lightC.height = Math.ceil(this.H * dpr / 2);
    }
    sprite(w, h, f) { const c = document.createElement('canvas'), s = this.ppu * this.dpr; c.width = Math.ceil(w * s); c.height = Math.ceil(h * s); const g = c.getContext('2d'); g.scale(s, s); f(g, w, h); return c; }
    makeSprites() {
      this.hs = {};
      for (const k in NB.Drive.HAZ) { const R = NB.Drive.HAZ[k].r, S = R * 3.2; this.hs[k] = { c: this.sprite(S, S, g => { g.translate(S / 2, S / 2); drawHaz(g, k, R); }), s: S }; }
      this.boxS = this.sprite(3.4, 3.4, g => drawBox(g));
      this.rocketS = this.sprite(1.4, 3.4, g => { g.translate(.7, 1.7); drawRocket(g); });
      this.flame = this.sprite(1.2, 3, (g, w, h) => { const fl = g.createLinearGradient(0, 0, 0, h); fl.addColorStop(0, '#fff'); fl.addColorStop(.25, GOLD); fl.addColorStop(1, 'rgba(232,74,63,0)'); g.fillStyle = fl; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(w / 2, h * .2, w / 2, h); g.quadraticCurveTo(w / 2, h * .2, w, 0); g.closePath(); g.fill(); });
      this.smoke = document.createElement('canvas'); this.smoke.width = this.smoke.height = 64;
      const sg = this.smoke.getContext('2d'), gr = sg.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(235,235,240,.75)'); gr.addColorStop(1, 'rgba(235,235,240,0)'); sg.fillStyle = gr; sg.fillRect(0, 0, 64, 64);
    }
    makeMap() {   // minimap: the whole loop, cars as dots
      const b = this.tr.box, mw = Math.min(104, this.W * .26), sc = mw / (b.x1 - b.x0), mh = (b.y1 - b.y0) * sc;
      const c = document.createElement('canvas'); c.width = Math.ceil(mw * this.dpr); c.height = Math.ceil(mh * this.dpr);
      const g = c.getContext('2d'); g.scale(this.dpr * sc, this.dpr * sc); g.translate(-b.x0, -b.y0);
      g.lineJoin = 'round'; g.strokeStyle = 'rgba(29,33,38,.8)'; g.lineWidth = 7 / sc; g.stroke(this.path); g.strokeStyle = '#fff'; g.lineWidth = 2.2 / sc; g.stroke(this.path);
      this.map = { c, w: mw, h: mh, sc };
    }
    tile(ix, iy) {
      const key = ix + ',' + iy; let t = this.tiles.get(key); if (t) return t;
      const Cw = TILE / this.ppu, c = document.createElement('canvas'), s = this.ppu * this.dpr; c.width = c.height = Math.ceil(TILE * this.dpr);
      const g = c.getContext('2d', { alpha: false }); g.setTransform(s, 0, 0, s, -ix * Cw * s, -iy * Cw * s);
      this.paint(g, ix * Cw, iy * Cw, (ix + 1) * Cw, (iy + 1) * Cw);
      if (this.tiles.size > 60) this.tiles.delete(this.tiles.keys().next().value);
      this.tiles.set(key, c); return c;
    }
    /* ---------- per frame: input, camera, effects ---------- */
    update(dt) {
      const s = this.sim, me = s.cars[0];
      if (!this.auto && !me.ai) me.in = this.readInput();
      for (; this.ei < s.events.length; this.ei++) this.event(s.events[this.ei]);
      const sp = Math.hypot(me.vx, me.vy), calm = still();
      const tx = me.x + me.vx * .32, ty = me.y + me.vy * .32;
      if (!this.cam) this.cam = { x: tx, y: ty };
      const k = 1 - Math.exp(-5 * dt); this.cam.x += (tx - this.cam.x) * k; this.cam.y += (ty - this.cam.y) * k;
      const mx = this.W * .2 / (this.ppu * this.z), my = this.H * .28 / (this.ppu * this.z);   // never let the player leave the middle
      this.cam.x = clamp(this.cam.x, me.x - mx, me.x + mx); this.cam.y = clamp(this.cam.y, me.y - my, me.y + my);
      const zt = calm ? 1 : 1 - .14 * clamp(sp / me.P.maxSpeed, 0, 1.3); this.z += (zt - this.z) * Math.min(1, dt * 2);
      // smoke and skids when sliding, dust off the road, sparks on nitro
      s.cars.forEach((c, i) => {
        const v = Math.hypot(c.vx, c.vy); if (v < 3 || c.air > 0) { this.lastWheel[i] = null; return; }
        const sz = NB.carTop.SIZE[c.type] || NB.carTop.SIZE.hatch, fx = Math.cos(c.a), fy = Math.sin(c.a), bx = c.x - fx * sz.L * .32, by = c.y - fy * sz.L * .32, wx = -fy * sz.W * .38, wy = fx * sz.W * .38;
        const sliding = c.slip > 4.5 || (c.hb && v > 8) || c.oilT > 0;
        if (sliding) {
          const w = [bx + wx, by + wy, bx - wx, by - wy], l = this.lastWheel[i];
          if (l) this.skids.push([l[0], l[1], w[0], w[1]], [l[2], l[3], w[2], w[3]]);
          this.lastWheel[i] = w; if (this.skids.length > 700) this.skids.splice(0, 40);
          if (Math.random() < dt * (i === 0 ? 30 : 12)) this.parts.push({ x: bx + (Math.random() - .5) * 1.5, y: by + (Math.random() - .5) * 1.5, vx: -c.vx * .1, vy: -c.vy * .1, t: .8, T: .8, s: 1.4, grow: 2.2, k: 'smoke' });
        } else this.lastWheel[i] = null;
        if (c.off && Math.random() < dt * 20) this.parts.push({ x: bx, y: by, vx: -c.vx * .15 + (Math.random() - .5) * 3, vy: -c.vy * .15 + (Math.random() - .5) * 3, t: .5, T: .5, s: .45, k: 'bit', c: this.st.dust });
      });
      const wx = s.wx ? s.wx() : { kind: 'clear', w: 0 }; this.wxNow = wx;
      if (wx.kind === 'rain' && wx.w > .3) s.cars.forEach(c => { const v = Math.hypot(c.vx, c.vy); if (v > 18 && c.air <= 0 && Math.random() < dt * 25 * wx.w) this.parts.push({ x: c.x - Math.cos(c.a) * 2.6 + (Math.random() - .5), y: c.y - Math.sin(c.a) * 2.6 + (Math.random() - .5), vx: -c.vx * .15, vy: -c.vy * .15, t: .5, T: .5, s: 1, grow: 2.5, k: 'smoke' }); });
      for (const m of s.rockets) if (Math.random() < dt * 40) this.parts.push({ x: m.x - Math.cos(m.a) * 1.6, y: m.y - Math.sin(m.a) * 1.6, vx: 0, vy: 0, t: .5, T: .5, s: .9, grow: 3, k: 'smoke' });
      this.parts = this.parts.filter(p => (p.t -= dt) > 0); if (this.parts.length > 260) this.parts.splice(0, this.parts.length - 260);
      for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.grow) p.s += p.grow * dt; }
      this.shake = calm ? 0 : Math.max(0, this.shake - dt * 26); if (this.flash > 0) this.flash -= dt;
      if (this.fw) { for (const f of this.fw) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 140 * dt; f.t -= dt; } this.fw = this.fw.filter(f => f.t > 0); }
    }
    event(e) {
      const mine = (e.i === 0 || e.j === 0) && !this.auto && !this.sim.cars[0].ai, burst = (n, col, sp, k = 'bit', t = .5) => { for (let q = 0; q < n; q++) { const a = Math.random() * TAU, v = sp * (.4 + Math.random() * .6); this.parts.push({ x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t, T: t, s: k === 'spark' ? .25 : .4, k, c: col }); } };
      if (e.type === 'wall' || e.type === 'car') {
        burst(Math.min(16, 3 + e.v * .5), GOLD, 10 + e.v * .4, 'spark', .35);
        if (mine) { this.shake = Math.max(this.shake, Math.min(10, e.v * .4)); if (navigator.vibrate) navigator.vibrate(e.v > 15 ? 35 : 15); }
      } else if (e.type === 'haz') {
        burst(12, { oil: '#1d2126', cone: '#FF8A2A', sand: '#ead09c', hole: '#3a3f46', ice: '#dff4ff', mud: '#5a3e24', rock: '#9b5a3a', lava: '#FF9D2A', hay: '#e9c45a' }[e.kind], 8);
        if (mine) { this.shake = Math.max(this.shake, e.kind === 'hole' ? 9 : 3); this.flash = .22; if (navigator.vibrate) navigator.vibrate(e.kind === 'hole' ? 40 : 18); }
      } else if (e.type === 'pickup') burst(14, PINK, 9);
      else if (e.type === 'boom') {
        burst(22, '#FF8A2A', 18, 'bit', .6); burst(12, GOLD, 24, 'spark', .4); this.parts.push({ x: e.x, y: e.y, vx: 0, vy: 0, t: .7, T: .7, s: 3, grow: 9, k: 'smoke' });
        const me = this.sim.cars[0], near = (me.x - e.x) ** 2 + (me.y - e.y) ** 2 < 900;
        if (near && !this.auto && !me.ai && !still()) this.shake = Math.max(this.shake, e.i === 0 ? 12 : 5);
        if (e.i === 0 && !this.auto && !me.ai) { this.flash = .3; if (navigator.vibrate) navigator.vibrate(60); }
      } else if (e.type === 'land') { burst(10, this.st.dust, 7); if (mine) this.shake = Math.max(this.shake, 4); }
      else if (e.type === 'item' && e.item === 'oil') burst(8, '#1d2126', 5);
      else if (e.type === 'respawn') { const c = this.sim.cars[e.i]; this.parts.push({ x: c.x, y: c.y, vx: 0, vy: 0, t: .6, T: .6, s: 2, grow: 10, k: 'smoke' }); }
      else if (e.type === 'nitro' && mine) this.boost();
    }
    /* ---------- drawing ---------- */
    render() {
      const g = this.g, W = this.W, H = this.H, s = this.sim, u = this.ppu * this.z, cam = this.cam, dpr = this.dpr;
      const sx = this.shake ? (Math.random() - .5) * this.shake : 0, sy = this.shake ? (Math.random() - .5) * this.shake : 0;
      const ox = W / 2 - cam.x * u + sx, oy = H / 2 - cam.y * u + sy;
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = this.st.ground; g.fillRect(0, 0, W, H);
      const Cw = TILE / this.ppu, ix0 = Math.floor((cam.x - W / 2 / u) / Cw) - 1, ix1 = Math.floor((cam.x + W / 2 / u) / Cw) + 1, iy0 = Math.floor((cam.y - H / 2 / u) / Cw) - 1, iy1 = Math.floor((cam.y + H / 2 / u) / Cw) + 1;
      let made = 0, sz = TILE * this.z;
      for (let iy = iy0; iy <= iy1; iy++) for (let ix = ix0; ix <= ix1; ix++) {
        const key = ix + ',' + iy; if (!this.tiles.has(key) && made++ > (this.warm ? 2 : 99)) continue;
        g.drawImage(this.tile(ix, iy), Math.floor(ox + ix * Cw * u), Math.floor(oy + iy * Cw * u), Math.ceil(sz) + 1, Math.ceil(sz) + 1);
      }
      this.warm = true;
      g.setTransform(dpr * u, 0, 0, dpr * u, ox * dpr, oy * dpr);   // world units from here
      g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = .32; g.lineCap = 'butt'; g.beginPath();
      for (const k of this.skids) { g.moveTo(k[0], k[1]); g.lineTo(k[2], k[3]); } g.stroke();
      const pulse = .5 + .5 * Math.sin(performance.now() / 160), me = s.cars[0];
      for (const z of this.tr.haz) {
        const S = this.hs[z.kind]; if ((z.gone || 0) > s.t) continue;
        if (z.kind !== 'cone' && (z.x - me.x) ** 2 + (z.y - me.y) ** 2 < 1600) { g.strokeStyle = `rgba(255,197,61,${.25 + pulse * .45})`; g.lineWidth = .25; g.beginPath(); g.arc(z.x, z.y, z.r * (1.2 + pulse * .12), 0, TAU); g.stroke(); }
        g.save(); g.translate(z.x, z.y); if (z.kind === 'cone') g.rotate(z.a); g.drawImage(S.c, -S.s / 2, -S.s / 2, S.s, S.s); g.restore();
      }
      const now = performance.now();
      for (const p of this.tr.boxes) if (p.t <= 0) { const b = 1 + Math.sin(now / 200 + p.k) * .08; g.save(); g.translate(p.x, p.y); g.rotate(now / 900 + p.x); g.drawImage(this.boxS, -1.7 * b, -1.7 * b, 3.4 * b, 3.4 * b); g.restore(); }
      for (const m of s.rockets) { g.save(); g.translate(m.x, m.y); g.rotate(m.a + Math.PI / 2); g.drawImage(this.rocketS, -.7, -1.7, 1.4, 3.4); g.restore(); }
      for (const p of this.parts) {
        const a = Math.min(1, p.t / p.T * 1.6);
        if (p.k === 'smoke') { g.globalAlpha = a * .7; g.drawImage(this.smoke, p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); }
        else if (p.k === 'spark') { g.globalAlpha = a; g.strokeStyle = p.c; g.lineWidth = .18; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * .03, p.y - p.vy * .03); g.stroke(); }
        else { g.globalAlpha = a; g.fillStyle = p.c; g.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); }
      }
      g.globalAlpha = 1;
      s.cars.forEach((c, i) => { if (i) this.drawCar(g, i); }); this.drawCar(g, 0);   // the player on top
      this.atmosphere(g, u, ox, oy, dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);                            // screen space
      if (s.phase !== 'run' && !me.finished) { const x = ox + me.x * u, y = oy + me.y * u - 3.4 * u; g.fillStyle = '#fff'; g.font = 'italic 900 13px "Exo 2", system-ui'; g.textAlign = 'center'; g.fillText('YOU ▼', x, y); }
      if (this.fw) { for (const f of this.fw) { g.globalAlpha = Math.max(0, Math.min(1, f.t)); g.fillStyle = f.c; g.fillRect(f.x, f.y, 3, 3); } g.globalAlpha = 1; }
      if (this.flash > 0) { g.fillStyle = `rgba(232,74,63,${this.flash * .45})`; g.fillRect(0, 0, W, H); }
      const m = this.map, mx = W - m.w - 10, my = this.mapTop, b = this.tr.box;
      g.drawImage(m.c, mx, my, m.w, m.h);
      s.order().slice().reverse().forEach(c => { g.fillStyle = this.racers[c.i].color; g.beginPath(); g.arc(mx + (c.x - b.x0) * m.sc, my + (c.y - b.y0) * m.sc, c.i === 0 ? 4.5 : 3.2, 0, TAU); g.fill(); if (c.i === 0) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); } });
    }
    /* ---------- sky and weather: rain ripples, night darkness with headlights, falling rain/snow, fog ---------- */
    atmosphere(g, u, ox, oy, dpr) {
      const W = this.W, H = this.H, s = this.sim, wx = this.wxNow || { kind: 'clear', w: 0 }, now = performance.now() / 1000, x0 = -ox / u, y0 = -oy / u;
      if (wx.kind === 'rain' && wx.w > 0) {   // ripples on the road, still in world units
        if (this.ripples.length < 40 * wx.w) this.ripples.push({ x: x0 + Math.random() * W / u, y: y0 + Math.random() * H / u, t: 0 });
        g.strokeStyle = 'rgba(220,235,255,.45)'; g.lineWidth = .08;
        for (const r of this.ripples) { r.t += .03; g.globalAlpha = Math.max(0, 1 - r.t) * wx.w; g.beginPath(); g.ellipse(r.x, r.y, r.t * 1.2, r.t * .8, 0, 0, TAU); g.stroke(); }
        g.globalAlpha = 1; this.ripples = this.ripples.filter(r => r.t < 1);
      }
      const dark = { day: 0, dusk: .38, night: .8 }[this.sky] || 0;
      if (dark) {
        const L = this.lightC, l = L.getContext('2d'), k = dpr / 2;
        l.setTransform(1, 0, 0, 1, 0, 0); l.globalCompositeOperation = 'source-over'; l.clearRect(0, 0, L.width, L.height);
        l.fillStyle = this.sky === 'night' ? `rgba(6,10,32,${dark})` : `rgba(70,30,80,${dark})`; l.fillRect(0, 0, L.width, L.height);
        l.globalCompositeOperation = 'destination-out'; l.setTransform(u * k, 0, 0, u * k, ox * k, oy * k);
        const hole = (x, y, r, a) => { const gr = l.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); l.fillStyle = gr; l.fillRect(x - r, y - r, r * 2, r * 2); };
        for (const c of s.cars) {
          hole(c.x, c.y, 4, .55);
          l.save(); l.translate(c.x, c.y); l.rotate(c.a);
          const gr = l.createRadialGradient(2, 0, 0, 2, 0, 18); gr.addColorStop(0, 'rgba(0,0,0,.95)'); gr.addColorStop(.6, 'rgba(0,0,0,.7)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
          l.fillStyle = gr; l.beginPath(); l.moveTo(2, -1); l.lineTo(19, -7); l.quadraticCurveTo(22, 0, 19, 7); l.lineTo(2, 1); l.closePath(); l.fill(); l.restore();
        }
        for (const o of this.glows) if (o.x > x0 - 10 && o.x < x0 + W / u + 10 && o.y > y0 - 10 && o.y < y0 + H / u + 10) hole(o.x, o.y, o.t === 'lamp' ? 7 : o.r * 2.2, o.t === 'lamp' ? .8 : .9);
        for (const z of this.tr.haz) if (z.kind === 'lava') hole(z.x, z.y, 5, .9);
        for (const b of this.tr.boxes) if (b.t <= 0) hole(b.x, b.y, 3.2, .7);
        for (const m of s.rockets) hole(m.x, m.y, 6, .9);
        g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(L, 0, 0, this.cv.width, this.cv.height); g.restore();
        // warm beams and red tail lights on top
        g.globalCompositeOperation = 'lighter';
        for (const c of s.cars) {
          const L2 = (NB.carTop.SIZE[c.type] || NB.carTop.SIZE.hatch).L / 2;
          g.save(); g.translate(c.x, c.y); g.rotate(c.a);
          const bg = g.createLinearGradient(L2, 0, 16, 0); bg.addColorStop(0, 'rgba(255,240,190,.28)'); bg.addColorStop(1, 'rgba(255,240,190,0)');
          g.fillStyle = bg; g.beginPath(); g.moveTo(L2, -.9); g.lineTo(16, -5.5); g.lineTo(16, 5.5); g.lineTo(L2, .9); g.closePath(); g.fill();
          g.fillStyle = 'rgba(255,60,50,.9)'; g.fillRect(-L2 - .1, -.85, .35, .45); g.fillRect(-L2 - .1, .4, .35, .45);
          g.fillStyle = 'rgba(255,60,50,.16)'; g.beginPath(); g.arc(-L2, 0, .9, 0, TAU); g.fill();
          g.restore();
        }
        g.globalCompositeOperation = 'source-over';
      }
      g.save(); g.setTransform(dpr, 0, 0, dpr, 0, 0);
      if ((wx.kind === 'rain' || wx.kind === 'snow') && wx.w > 0) {   // falling rain or snow, moving with the world
        const n = Math.round((wx.kind === 'rain' ? 110 : 130) * wx.w), cx = this.cam.x * u, cy = this.cam.y * u;
        while (this.drops.length < n) this.drops.push({ x: Math.random() * W, y: Math.random() * H, z: .6 + Math.random() * .8 });
        this.drops.length = Math.min(this.drops.length, n);
        const dx = this.lastCx == null ? 0 : cx - this.lastCx, dy = this.lastCy == null ? 0 : cy - this.lastCy; this.lastCx = cx; this.lastCy = cy;
        if (wx.kind === 'rain') { g.fillStyle = `rgba(30,45,70,${.18 * wx.w})`; g.fillRect(0, 0, W, H); g.strokeStyle = 'rgba(210,225,255,.55)'; g.lineWidth = 1.2; g.beginPath(); }
        else g.fillStyle = 'rgba(255,255,255,.9)';
        for (const d of this.drops) {
          d.x -= dx * d.z * .6; d.y -= dy * d.z * .6;
          if (wx.kind === 'rain') { d.x -= 3 * d.z; d.y += 14 * d.z; g.moveTo(d.x, d.y); g.lineTo(d.x + 3 * d.z, d.y - 12 * d.z); }
          else { d.y += 1.2 * d.z; d.x += Math.sin(now * 2 + d.z * 9) * .6; g.beginPath(); g.arc(d.x, d.y, 2.2 * d.z + .6, 0, TAU); g.fill(); }
          if (d.y > H + 15) { d.y = -15; d.x = Math.random() * W; } if (d.y < -20) d.y = H + 10; if (d.x < -20) d.x = W + 10; if (d.x > W + 20) d.x = -10;
        }
        if (wx.kind === 'rain') g.stroke();
      } else this.lastCx = this.lastCy = null;
      if (wx.kind === 'fog' && wx.w > 0) {
        const fg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .18, W / 2, H / 2, Math.max(W, H) * .62), col = this.sky === 'night' ? '40,45,62' : '226,230,236';
        fg.addColorStop(0, `rgba(${col},${.12 * wx.w})`); fg.addColorStop(1, `rgba(${col},${.92 * wx.w})`); g.fillStyle = fg; g.fillRect(0, 0, W, H);
      }
      g.restore();
    }
    drawCar(g, i) {
      const c = this.sim.cars[i], sp = this.sprites[i], PX = NB.carTop.PX, L = (NB.carTop.SIZE[c.type] || NB.carTop.SIZE.hatch).L;
      const up = c.air > 0 ? Math.sin(Math.PI * (1 - c.air / c.airT)) : 0;
      if (up) {                                                    // in the air: shadow stays on the road, the car grows
        const W = (NB.carTop.SIZE[c.type] || NB.carTop.SIZE.hatch).W;
        g.save(); g.translate(c.x + up * 1.4, c.y + up * 1.8); g.rotate(c.a + Math.PI / 2); g.fillStyle = `rgba(0,0,0,${.35 - up * .12})`;
        g.beginPath(); g.roundRect(-W / 2, -L / 2, W, L, .6); g.fill(); g.restore();
      }
      g.save(); g.translate(c.x, c.y); g.rotate(c.a + Math.PI / 2); if (up) g.scale(1 + up * .38, 1 + up * .38);
      const flames = c.nitroT > 0 || (this.racers[i].mods && this.racers[i].mods.nos >= 5 && Math.hypot(c.vx, c.vy) > 25);
      if (flames) { const f = (c.nitroT > 0 ? 1 : .45) * (.8 + Math.random() * .4); g.drawImage(this.flame, -.6, L / 2 - .15, 1.2, 3 * f); }
      g.drawImage(sp, -sp.width / PX / 2, -sp.height / PX / 2, sp.width / PX, sp.height / PX);
      g.restore();
    }
    boost() { if (!still()) this.shake = Math.max(this.shake, 4); if (navigator.vibrate) navigator.vibrate(25); }
    fireworks() {
      if (still()) return; this.fw = [];
      for (let b = 0; b < 4; b++) { const cx = this.W * (.2 + b * .2), cy = this.H * (.2 + Math.random() * .2), col = [PINK, CYAN, GOLD, '#ffffff'][b];
        for (let k = 0; k < 40; k++) { const a = Math.random() * TAU, v = 60 + Math.random() * 160; this.fw.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 1.4 + Math.random() * .6, c: col }); } }
    }
    loop(now) {
      if (!this.alive) return;
      const dt = Math.min(.1, (now - this.last) / 1000); this.last = now;
      if (this.paused) { requestAnimationFrame(this.loop); return; }   // off screen: skip the work
      if (this.onFrame) this.onFrame(dt); else this.sim.step(dt);
      this.update(dt); this.render();
      requestAnimationFrame(this.loop);
    }
    dispose() {
      this.alive = false; window.removeEventListener('resize', this.resize);
      document.removeEventListener('keydown', this.kd); document.removeEventListener('keyup', this.kd);
      this.cv.remove(); this.tiles = null;
    }
  }

  /* hazard drawings, in world units: r is the hazard's size. A fixed seed keeps each shape the same every race. */
  function blob(g, r, n, wob, seed) {   // a wobbly closed shape
    const R = rng(seed), pts = Array.from({ length: n }, (_, k) => { const a = k / n * TAU, rr = r * (1 - wob / 2 + R() * wob); return [Math.cos(a) * rr, Math.sin(a) * rr]; });
    g.beginPath(); pts.forEach((p, k) => { const q = pts[(k + 1) % n], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2; k ? g.quadraticCurveTo(p[0], p[1], mx, my) : g.moveTo(mx, my); });
    const p = pts[0], q = pts[1]; g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); g.closePath();
  }
  function drawHaz(g, kind, r) {
    if (kind === 'oil') {   // a splash: wobbly pool, thrown droplets, a rainbow sheen
      const R = rng(7);
      g.fillStyle = 'rgba(0,0,0,.25)'; blob(g, r * .95, 14, .55, 3); g.save(); g.translate(.15, .2); g.fill(); g.restore();
      g.fillStyle = '#121418'; blob(g, r * .92, 14, .55, 3); g.fill();
      for (let k = 0; k < 9; k++) {
        const a = k / 9 * TAU + R() * .5, d = r * (1.02 + R() * .3), s = r * (.08 + R() * .1);
        g.save(); g.translate(Math.cos(a) * d, Math.sin(a) * d); g.rotate(a); g.beginPath(); g.ellipse(0, 0, s * 1.8, s, 0, 0, TAU); g.fill(); g.restore();
        g.beginPath(); g.moveTo(Math.cos(a - .08) * r * .7, Math.sin(a - .08) * r * .7); g.lineTo(Math.cos(a) * (d - s), Math.sin(a) * (d - s)); g.lineTo(Math.cos(a + .08) * r * .7, Math.sin(a + .08) * r * .7); g.fill();
      }
      const sh = g.createLinearGradient(-r * .6, -r * .5, r * .5, r * .4);
      sh.addColorStop(0, 'rgba(155,92,255,.35)'); sh.addColorStop(.35, 'rgba(34,229,224,.28)'); sh.addColorStop(.65, 'rgba(255,197,61,.2)'); sh.addColorStop(1, 'rgba(255,61,139,0)');
      g.fillStyle = sh; blob(g, r * .5, 9, .5, 11); g.save(); g.translate(-r * .15, -r * .12); g.fill(); g.restore();
      g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(-r * .38, -r * .3, r * .16, r * .06, -.5, 0, TAU); g.fill(); g.beginPath(); g.arc(-r * .12, -r * .42, r * .04, 0, TAU); g.fill();
    } else if (kind === 'hole') {   // broken asphalt: jagged rim, deep middle, cracks, loose bits
      const R = rng(5);
      g.strokeStyle = '#1d2126'; g.lineWidth = .14;
      for (let k = 0; k < 5; k++) { const a = k / 5 * TAU + R(); g.beginPath(); g.moveTo(Math.cos(a) * r * .8, Math.sin(a) * r * .8); g.lineTo(Math.cos(a + .2) * r * 1.15, Math.sin(a + .2) * r * 1.15); g.lineTo(Math.cos(a - .1) * r * 1.35, Math.sin(a - .1) * r * 1.35); g.stroke(); }
      g.fillStyle = '#3a3f46'; g.beginPath(); for (let k = 0; k < 11; k++) { const a = k / 11 * TAU, rr = r * (.85 + R() * .3); g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * .85); } g.closePath(); g.fill();
      g.fillStyle = '#16191d'; g.beginPath(); for (let k = 0; k < 9; k++) { const a = k / 9 * TAU, rr = r * (.55 + R() * .2); g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * .8 + r * .08); } g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = .12; g.beginPath(); g.arc(0, 0, r * .95, Math.PI * 1.05, Math.PI * 1.75); g.stroke();
      g.fillStyle = '#6b737b'; for (let k = 0; k < 5; k++) { const a = R() * TAU, d = r * (1 + R() * .3); g.fillRect(Math.cos(a) * d, Math.sin(a) * d, .22, .18); }
    } else if (kind === 'cone') {   // from above: square rubber base, round cone, reflective band
      g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.roundRect(-r + .2, -r + .25, r * 2, r * 2, r * .3); g.fill();
      g.fillStyle = '#c4520f'; g.beginPath(); g.roundRect(-r, -r, r * 2, r * 2, r * .3); g.fill();
      const cg = g.createRadialGradient(-r * .25, -r * .25, r * .05, 0, 0, r * .85); cg.addColorStop(0, '#ffb070'); cg.addColorStop(1, '#FF7A1A');
      g.fillStyle = cg; g.beginPath(); g.arc(0, 0, r * .82, 0, TAU); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = r * .22; g.beginPath(); g.arc(0, 0, r * .5, 0, TAU); g.stroke();
      g.fillStyle = '#ffe2c4'; g.beginPath(); g.arc(0, 0, r * .18, 0, TAU); g.fill();
    } else if (kind === 'lava') {   // a glowing crack in the road
      g.fillStyle = '#1d1a1d'; blob(g, r * 1.05, 12, .45, 23); g.fill();
      const lg = g.createRadialGradient(0, 0, r * .05, 0, 0, r * .85); lg.addColorStop(0, '#fff3a0'); lg.addColorStop(.4, '#FF9D2A'); lg.addColorStop(1, '#c8321a');
      g.fillStyle = lg; blob(g, r * .78, 10, .5, 29); g.fill();
      g.strokeStyle = '#1d1a1d'; g.lineWidth = .22; g.beginPath(); g.moveTo(-r * .6, -r * .3); g.lineTo(-r * .1, r * .1); g.lineTo(r * .5, -r * .25); g.moveTo(-r * .1, r * .1); g.lineTo(r * .1, r * .6); g.stroke();
    } else if (kind === 'hay') {   // a bale fallen on the road
      g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.arc(r * .25, r * .3, r, 0, TAU); g.fill();
      g.fillStyle = '#e9c45a'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.strokeStyle = '#c49a32'; g.lineWidth = .14;
      [.72, .46, .2].forEach(f => { g.beginPath(); g.arc(0, 0, r * f, 0, TAU); g.stroke(); });
      g.strokeStyle = '#d9b04a'; for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; g.beginPath(); g.moveTo(Math.cos(a) * r * .95, Math.sin(a) * r * .95); g.lineTo(Math.cos(a + .1) * r * 1.2, Math.sin(a + .1) * r * 1.2); g.stroke(); }
    } else if (kind === 'ice') {   // a glassy patch with cracks and glints
      g.fillStyle = 'rgba(190,230,250,.55)'; blob(g, r * 1.1, 12, .35, 21); g.fill();
      const ig = g.createLinearGradient(-r, -r, r, r); ig.addColorStop(0, '#f4fbff'); ig.addColorStop(1, '#a9dcf3');
      g.fillStyle = ig; blob(g, r * .9, 12, .35, 21); g.fill();
      g.strokeStyle = 'rgba(94,195,232,.9)'; g.lineWidth = .1; g.beginPath(); g.moveTo(-r * .6, -r * .2); g.lineTo(-r * .1, r * .05); g.lineTo(r * .3, -r * .35); g.moveTo(-r * .1, r * .05); g.lineTo(r * .05, r * .55); g.moveTo(r * .3, -r * .35); g.lineTo(r * .65, -r * .1); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(-r * .4, -r * .45, r * .2, r * .06, -.6, 0, TAU); g.fill(); g.beginPath(); g.arc(r * .45, r * .3, r * .06, 0, TAU); g.fill();
    } else if (kind === 'mud') {   // a brown pool with darker middle and splats
      const R = rng(13);
      g.fillStyle = '#5a3e24'; blob(g, r * .95, 13, .45, 17); g.fill();
      for (let k = 0; k < 6; k++) { const a = R() * TAU, d = r * (1 + R() * .25); g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, r * (.07 + R() * .07), 0, TAU); g.fill(); }
      g.fillStyle = '#3e2a17'; blob(g, r * .55, 9, .4, 19); g.fill();
      g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-r * .3, -r * .35, r * .18, r * .06, -.4, 0, TAU); g.fill();
    } else if (kind === 'rock') {   // a fallen boulder with a shadow
      g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(r * .25, r * .3, r * 1.05, r * .85, 0, 0, TAU); g.fill();
      g.fillStyle = '#8a4a2c'; g.beginPath(); g.moveTo(-r, r * .3); g.lineTo(-r * .6, -r * .8); g.lineTo(r * .4, -r); g.lineTo(r, -r * .1); g.lineTo(r * .6, r * .8); g.lineTo(-r * .4, r * .9); g.closePath(); g.fill();
      g.fillStyle = '#c2734a'; g.beginPath(); g.moveTo(-r * .6, -r * .8); g.lineTo(r * .4, -r); g.lineTo(0, -r * .15); g.closePath(); g.fill();
      g.strokeStyle = '#5a2e1a'; g.lineWidth = .1; g.beginPath(); g.moveTo(0, -r * .15); g.lineTo(-r * .3, r * .5); g.stroke();
    } else if (kind === 'sand') {   // a drift blown across the road, ripples and pebbles
      g.fillStyle = 'rgba(236,210,157,.55)'; blob(g, r * 1.25, 12, .4, 9); g.fill();
      g.fillStyle = '#ecd29d'; blob(g, r * .95, 12, .4, 9); g.fill();
      g.strokeStyle = '#c69f63'; g.lineWidth = .16; [-.45, -.1, .25, .55].forEach(k => { g.beginPath(); g.moveTo(-r * .75, r * k); g.quadraticCurveTo(-r * .2, r * (k - .22), r * .2, r * k); g.quadraticCurveTo(r * .5, r * (k + .18), r * .78, r * (k - .05)); g.stroke(); });
      g.fillStyle = '#a88452'; [[.4, -.6], [-.5, .45], [.6, .35]].forEach(([x, y]) => { g.beginPath(); g.arc(r * x, r * y, .14, 0, TAU); g.fill(); });
    }
  }
  /* jump ramp, drawn along +x (driving direction): yellow kicker with chevrons and a white lip */
  function drawRamp(g, len, w) {
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(len, -w / 2, 1.2, w);                       // the drop after the lip
    g.fillStyle = '#2e3238'; g.fillRect(-.25, -w / 2 - .25, len + .5, w + .5);
    const rg = g.createLinearGradient(0, 0, len, 0); rg.addColorStop(0, '#d9a21f'); rg.addColorStop(1, '#ffd75a');
    g.fillStyle = rg; g.fillRect(0, -w / 2, len, w);
    g.fillStyle = '#1d2126'; for (let y = -w / 2 + .8; y < w / 2 - .6; y += 1.6) { g.beginPath(); g.moveTo(.4, y - .55); g.lineTo(1.4, y); g.lineTo(.4, y + .55); g.lineTo(.9, y); g.closePath(); g.fill(); g.beginPath(); g.moveTo(1.5, y - .55); g.lineTo(2.5, y); g.lineTo(1.5, y + .55); g.lineTo(2, y); g.closePath(); g.fill(); }
    g.fillStyle = '#fff'; g.fillRect(len - .35, -w / 2, .35, w);
  }
  /* power-up box: a glowing cube with a question mark */
  function drawBox(g) {
    g.translate(1.7, 1.7);
    const gl = g.createRadialGradient(0, 0, .5, 0, 0, 1.7); gl.addColorStop(0, 'rgba(255,61,139,.6)'); gl.addColorStop(1, 'rgba(255,61,139,0)'); g.fillStyle = gl; g.fillRect(-1.7, -1.7, 3.4, 3.4);
    g.fillStyle = '#1d2126'; g.beginPath(); g.roundRect(-1.15, -1.15, 2.3, 2.3, .35); g.fill();
    const bg = g.createLinearGradient(-1, -1, 1, 1); bg.addColorStop(0, '#ff7ab0'); bg.addColorStop(.5, PINK); bg.addColorStop(1, '#9b5cff');
    g.fillStyle = bg; g.beginPath(); g.roundRect(-1, -1, 2, 2, .28); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.roundRect(-.85, -.85, 1.7, .5, .2); g.fill();
    g.fillStyle = '#fff'; g.font = '900 1.5px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 0, .08);
  }
  /* rocket, nose up */
  function drawRocket(g) {
    g.fillStyle = '#e8423f'; g.beginPath(); g.moveTo(-.55, 1.1); g.lineTo(-.7, 1.5); g.lineTo(-.3, 1.3); g.closePath(); g.moveTo(.55, 1.1); g.lineTo(.7, 1.5); g.lineTo(.3, 1.3); g.closePath(); g.fill();
    g.fillStyle = '#f1f3f5'; g.beginPath(); g.roundRect(-.38, -.9, .76, 2.3, .3); g.fill();
    g.fillStyle = '#e8423f'; g.beginPath(); g.moveTo(-.38, -.7); g.quadraticCurveTo(0, -1.7, .38, -.7); g.closePath(); g.fill();
    g.fillStyle = '#1d2126'; g.fillRect(-.38, .1, .76, .22);
    g.fillStyle = GOLD; g.beginPath(); g.moveTo(-.25, 1.4); g.lineTo(0, 1.7); g.lineTo(.25, 1.4); g.closePath(); g.fill();
  }
  DriveView.drawHaz = drawHaz; DriveView.drawRamp = drawRamp; DriveView.drawBox = drawBox; DriveView.drawRocket = drawRocket;

  DriveView.STYLE = STYLE;
  NB.DriveView = DriveView;
})(window.NB = window.NB || {});
/* the whole track as one picture (for maps and previews) */
NB.DriveView.overview = (tr, w) => {
  const v = Object.create(NB.DriveView.prototype); v.tr = tr; v.st = NB.DriveView.STYLE[tr.key]; v.build();
  const b = tr.box, M = 14, sc = w / (b.x1 - b.x0 + 2 * M), c = document.createElement('canvas');
  c.width = w; c.height = Math.round((b.y1 - b.y0 + 2 * M) * sc);
  const g = c.getContext('2d'); g.setTransform(sc, 0, 0, sc, -(b.x0 - M) * sc, -(b.y0 - M) * sc);
  v.paint(g, b.x0 - M, b.y0 - M, b.x1 + M, b.y1 + M);
  return c;
};
