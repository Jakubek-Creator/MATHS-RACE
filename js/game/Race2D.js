/* Race2D — top-down street race on a 2D canvas, tuned for phones.
   Driving feel: steering input is smoothed, the car builds sideways speed with grip (handling) and
   slides a little in corners (drift), with tyre smoke, skid marks, speed lines and screen shake.
   Controls: big ◀ ▶ pads, or drag anywhere to steer (analogue), or arrow keys / A, D.
   Hazards are pre-drawn sprites with a pulsing warning ring; hitboxes are smaller than the drawings.
   Everything heavy (cars, hazards, flames, scenery) is drawn once into sprites so frames stay cheap.
   The race maths (speed, acceleration, nitro) stays in RaceSim. */
(function (NB) {
  const TAU = Math.PI * 2;
  const rng = seed => { let s = seed || 1; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const PINK = '#FF3D8B', CYAN = '#22E5E0', GOLD = '#FFC53D';

  const THEMES = {
    circuit: { name: 'Green Valley GP', ground: '#62b14a', ground2: '#6bbb52', walk: null, road: '#4a4f57', edge: '#f1f3f5', kerb: ['#e84a4a', '#ffffff'], dash: 'rgba(255,255,255,.85)',
      hazards: [['oil', .38], ['cone', .34], ['hole', .28]], curve: [6, 3, 3, 2], side: 'circuit', tip: 'Watch for oil, cones and potholes' },
    city: { name: 'Downtown Loop', ground: '#8d959d', walk: '#b9c0c7', zebra: true, road: '#454a52', edge: '#2e3238', kerb: ['#F8C537', '#2e3238'], dash: 'rgba(255,255,255,.85)',
      hazards: [['hole', .38], ['oil', .36], ['cone', .26]], curve: [5, 2, 3, 1], side: 'buildings', tip: 'Watch for potholes, oil and cones' },
    coast: { name: 'Coast Highway', ground: '#efd39a', ground2: '#f3daa6', walk: null, road: '#4a4f57', edge: '#2e3238', kerb: ['#5EC3E8', '#ffffff'], dash: 'rgba(248,197,55,.95)',
      hazards: [['oil', .4], ['sand', .32], ['cone', .28]], curve: [6, 3, 3, 2], side: 'palms', sea: true, tip: 'Watch for oil, sand and cones' }
  };
  const THEME_KEYS = ['circuit', 'city', 'coast'];
  // r: drawn size. hit: hitbox radius (smaller than the drawing, so near-misses count as misses)
  const HAZ = {
    oil: { r: 2.0, hit: 1.25, slow: .6, stun: .75, spin: true, shake: 3, msg: 'Oil! Spin out' },
    hole: { r: 1.35, hit: .8, slow: .72, stun: .3, shake: 9, msg: 'Pothole!' },
    cone: { r: .9, hit: .6, slow: .86, stun: .12, fly: true, shake: 2, msg: 'Cone!' },
    mud: { r: 2.1, hit: 1.3, slow: .72, stun: .45, shake: 3, msg: 'Mud!' },
    rock: { r: 1.4, hit: .85, slow: .62, stun: .38, shake: 10, msg: 'Rock!' },
    sand: { r: 2.0, hit: 1.2, slow: .76, stun: .3, shake: 2, msg: 'Sand drift!' }
  };
  const LANE = 4.4, HALF = 7.4, LEN = 900;
  const phone = Math.min(screen.width, screen.height) < 600;

  class Race2D {
    constructor(host, racers, { seed = 1, theme, auto = false } = {}) {
      this.auto = auto;   // autopilot for the player's car (previews)
      this.host = host; this.racers = racers; this.seed = seed;
      this.themeKey = theme || THEME_KEYS[seed % THEME_KEYS.length]; this.T = THEMES[this.themeKey];
      const r = rng(seed * 7 + 3), [a1, n1, a2, n2] = this.T.curve, p1 = r() * TAU, p2 = r() * TAU, w1 = TAU * n1 / LEN, w2 = TAU * n2 / LEN;
      this.cx = d => a1 * Math.sin(d * w1 + p1) + a2 * Math.sin(d * w2 + p2);
      this.dcx = d => a1 * w1 * Math.cos(d * w1 + p1) + a2 * w2 * Math.cos(d * w2 + p2);
      this.ddcx = d => -a1 * w1 * w1 * Math.sin(d * w1 + p1) - a2 * w2 * w2 * Math.sin(d * w2 + p2);
      const kmax = a1 * w1 * w1 + a2 * w2 * w2;
      this.track = { length: LEN, kn: d => Math.min(1, Math.abs(this.ddcx(d)) / kmax * 1.15), name: this.T.name, tip: this.T.tip };
      // hazards for one lap (lap 2 repeats them), never two blocking every lane
      this.haz = [];
      for (let d = 95; d < LEN - 45; d += 38 + r() * 30) {
        let u = r(), kind = this.T.hazards[0][0];
        for (const [k, w] of this.T.hazards) { if ((u -= w) <= 0) { kind = k; break; } }
        const lane = Math.floor(r() * 3) - 1;
        this.haz.push({ d, x: lane * LANE + (r() - .5) * 1.4, kind, seen: {} });
        if (r() < .2) { const l2 = lane === 1 ? -1 : lane + 1; this.haz.push({ d: d + 3 + r() * 4, x: l2 * LANE, kind: this.T.hazards[1][0], seen: {} }); }
      }
      this.deco = [];
      for (let d = -40; d < LEN + 60; d += 6 + r() * 7) [-1, 1].forEach(side => {
        if (r() < .85) this.deco.push({ d, side, off: 1.5 + r() * 5, s: .7 + r() * .7, h: r(), c: r() });
        if (r() < .9) this.deco.push({ d: d + r() * 4, side, off: 9 + r() * 22, s: .8 + r() * .9, h: r(), c: r() });
      });
      this.cv = document.createElement('canvas'); this.cv.className = 'r2-cv'; host.appendChild(this.cv);
      this.g = this.cv.getContext('2d', { alpha: false });
      this.sprites = racers.map(rc => NB.carTop(rc.type, rc.color, rc.mods));
      this.sizes = racers.map(rc => (NB.carTop.SIZE[rc.type] || NB.carTop.SIZE.hatch));
      const grid = [-5.2, -1.75, 1.75, 5.2];
      this.lat = racers.map((_, i) => ({ x: grid[i], vx: 0, target: grid[i], spin: 0, slip: 0, ang: 0 }));
      this.parts = []; this.skids = []; this.lines = Array.from({ length: 16 }, () => ({ x: Math.random(), y: Math.random(), l: .5 + Math.random() }));
      this.steerIn = 0; this.steerS = 0; this.keys = {}; this.pad = 0; this.drag = null; this.shake = 0; this.flash = 0; this.fw = null;
      this.resize = this.resize.bind(this); window.addEventListener('resize', this.resize); this.resize();
      this.bindInput();
      this.last = performance.now(); this.alive = true; this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
    }
    /* ---------- input: pads, drag-to-steer, keys ---------- */
    bindInput() {
      const root = this.host.parentElement || document;
      this.pads = [...root.querySelectorAll('[data-pad]')];
      this.padDown = new Map();
      this.pads.forEach(p => {
        const dir = Number(p.dataset.pad);
        const on = e => { e.preventDefault(); this.padDown.set(e.pointerId, dir); p.classList.add('on'); try { p.setPointerCapture(e.pointerId); } catch (x) {} if (navigator.vibrate) navigator.vibrate(6); };
        const off = e => { this.padDown.delete(e.pointerId); if (![...this.padDown.values()].includes(dir)) p.classList.remove('on'); };
        p.addEventListener('pointerdown', on); p.addEventListener('pointerup', off); p.addEventListener('pointercancel', off); p.addEventListener('lostpointercapture', off);
      });
      // drag anywhere on the track: steer by how far the finger moves sideways (analogue)
      this.cv.addEventListener('pointerdown', e => { this.drag = { id: e.pointerId, x0: e.clientX, x: e.clientX }; try { this.cv.setPointerCapture(e.pointerId); } catch (x) {} });
      this.cv.addEventListener('pointermove', e => { if (this.drag && this.drag.id === e.pointerId) this.drag.x = e.clientX; });
      const up = e => { if (this.drag && this.drag.id === e.pointerId) this.drag = null; };
      this.cv.addEventListener('pointerup', up); this.cv.addEventListener('pointercancel', up);
      this.kd = e => { const k = e.key.toLowerCase(); if (['arrowleft', 'arrowright', 'a', 'd'].includes(k)) { this.keys[k] = e.type === 'keydown'; e.preventDefault(); } };
      document.addEventListener('keydown', this.kd); document.addEventListener('keyup', this.kd);
    }
    readSteer() {
      const k = (this.keys.arrowleft || this.keys.a ? -1 : 0) + (this.keys.arrowright || this.keys.d ? 1 : 0);
      const p = [...this.padDown.values()].reduce((a, b) => a + b, 0);
      let d = 0;
      if (this.drag) { const dx = this.drag.x - this.drag.x0; d = Math.abs(dx) < 8 ? 0 : clamp(dx / 70, -1, 1); if (Math.abs(dx) > 90) this.drag.x0 = this.drag.x - Math.sign(dx) * 90; }
      return clamp(k || p || d, -1, 1);
    }
    resize() {
      const r = this.host.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 2);
      this.W = Math.max(1, r.width); this.H = Math.max(1, r.height);
      this.cv.width = Math.round(this.W * dpr); this.cv.height = Math.round(this.H * dpr); this.dpr = dpr;
      this.ppu = Math.min(this.W / 24, this.H / 50);
      this.makeSprites();
    }
    /* ---------- sprites drawn once per size ---------- */
    makeSprites() {
      const u = this.ppu, mk = (w, h, f) => { const c = document.createElement('canvas'); c.width = Math.ceil(w * this.dpr); c.height = Math.ceil(h * this.dpr); const g = c.getContext('2d'); g.scale(this.dpr, this.dpr); f(g, w, h); return c; };
      this.hs = {};
      for (const k in HAZ) { const R = HAZ[k].r * u, S = R * 2.8; this.hs[k] = { c: mk(S, S, (g, w) => { g.translate(w / 2, w / 2); this.drawHaz(g, k, R, u); }), s: S }; }
      this.flame = mk(u * 1.6, u * 4, (g, w, h) => {
        const fl = g.createLinearGradient(0, 0, 0, h); fl.addColorStop(0, '#fff'); fl.addColorStop(.25, '#FFC53D'); fl.addColorStop(1, 'rgba(232,74,63,0)');
        g.fillStyle = fl; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(w / 2, h * .2, w / 2, h); g.quadraticCurveTo(w / 2, h * .2, w, 0); g.closePath(); g.fill();
      });
      this.smoke = mk(64, 64, g => { const sg = g.createRadialGradient(32, 32, 2, 32, 32, 32); sg.addColorStop(0, 'rgba(230,226,240,.7)'); sg.addColorStop(1, 'rgba(230,226,240,0)'); g.fillStyle = sg; g.fillRect(0, 0, 64, 64); });
      this.decoS = {};
    }
    /* ---------- hits ---------- */
    hit(i, kind) {
      const H = HAZ[kind], c = this.sim.cars[i], L = this.lat[i];
      c.v *= H.slow; c.stun = Math.max(c.stun || 0, H.stun);
      if (H.spin) L.spin = 1;
      if (i === 0) { this.shake = Math.max(this.shake, H.shake); this.flash = .22; this.onHit && this.onHit(kind, H.msg); if (navigator.vibrate) navigator.vibrate(H.shake > 5 ? 40 : 18); }
      const col = { oil: '#1d2126', cone: '#FF8A2A', sand: '#ead09c', mud: '#4a3622', rock: '#9aa1a8', hole: '#3a3f46' }[kind];
      for (let k = 0; k < 12; k++) this.parts.push({ d: c.d, x: L.x, vx: (Math.random() - .5) * 12, vd: (Math.random() - .2) * 10, t: .7, s: .3 + Math.random() * .3, c: col });
    }
    /* ---------- physics: steering, grip, drift ---------- */
    update(dt) {
      const s = this.sim; if (!s) return;
      const live = s.phase === 'run';
      this.steerIn = this.readSteer();
      this.steerS += (this.steerIn - this.steerS) * Math.min(1, dt * 9);          // smooth the input
      s.cars.forEach((c, i) => {
        const L = this.lat[i], han = c.stats.han, v = c.v;
        if (live && v > .5) {
          const corner = this.track.kn(c.d), dir = -Math.sign(this.ddcx(c.d));
          const grip = 26 + han * .32;                                              // how fast sideways speed can change
          let want;
          if (i === 0 && !this.auto) want = this.steerS * (8 + han * .06) * Math.min(1, v / 22);
          else {
            const ahead = this.haz.find(h => { const dd = ((h.d - (c.d % LEN)) + LEN) % LEN; return dd > 4 && dd < 34 && Math.abs(h.x - L.target) < 2.4; });
            if (ahead && !ahead['dodge' + i]) { ahead['dodge' + i] = 1; if (Math.random() < .5 + han / 220) { const opts = [-LANE, 0, LANE].filter(xx => this.haz.every(h => h === ahead || Math.abs(h.d - ahead.d) > 10 || Math.abs(h.x - xx) > 2.4)); L.target = opts.sort((a, b) => Math.abs(a - L.x) - Math.abs(b - L.x))[0] ?? L.target; } }
            if (Math.random() < dt * .12) L.target = [-LANE, 0, LANE][Math.floor(Math.random() * 3)];
            want = clamp((L.target - L.x) * 2.2, -7, 7);
          }
          // corners push you outwards; less grip = more slide
          const push = dir * corner * v * .17 * (1.25 - han / 100);
          L.vx += clamp(want - L.vx, -grip * dt, grip * dt);
          L.slip += ((push * .6 + (want - L.vx) * .25) - L.slip) * Math.min(1, dt * 6);   // the visible drift angle
          L.x += (L.vx + push) * dt;
          if (Math.abs(L.x) > HALF + 3) { L.x = Math.sign(L.x) * (HALF + 3); L.vx *= -.3; }
          c.grip = Math.abs(L.x) > HALF - .9 ? .62 : 1;
          // tyre smoke + skids when sliding hard, spinning on oil, or off the road
          const sliding = Math.abs(L.slip) > 2.2 || L.spin > 0 || (i === 0 && s.t < .9 && c.v < 30);
          if ((sliding || c.grip < 1) && Math.random() < dt * (i === 0 ? 40 : 16)) {
            const off = c.grip < 1 && !sliding;
            this.parts.push({ d: c.d - 1.8, x: L.x + (Math.random() - .5) * 1.6, vx: (Math.random() - .5) * 3, vd: -2, t: .8, s: .5, grow: 1, smoke: !off, c: off ? (this.themeKey === 'dirt' ? '#6b8c45' : '#bfa37a') : null });
            if (sliding && this.skids.length < 160) this.skids.push({ d: c.d - 1.6, x: L.x - .7 }, { d: c.d - 1.6, x: L.x + .7 });
          }
          const dl = c.d % LEN, lap = Math.floor(c.d / LEN), hl = this.sizes[i].L * .38;
          for (const h of this.haz) {
            const H = HAZ[h.kind];
            if (h.seen[i] !== lap && Math.abs(h.d - dl) < hl + H.hit * .6 && Math.abs(h.x - L.x) < .75 + H.hit * .6) {
              h.seen[i] = lap; if (H.fly) h.knock = { t: 1, dir: Math.sign(L.x - h.x) || 1 };
              this.hit(i, h.kind);
            }
          }
        }
        if (L.spin > 0) L.spin = Math.max(0, L.spin - dt * 1.4);
        L.ang = Math.atan(this.dcx(c.d)) + clamp(L.vx / Math.max(14, v), -.5, .5) + L.slip * .06 + L.spin * TAU * 1.5;
      });
      for (let a = 0; a < s.cars.length; a++) for (let b = a + 1; b < s.cars.length; b++) {
        const A = s.cars[a], B = s.cars[b], dx = this.lat[a].x - this.lat[b].x;
        if (Math.abs(A.d - B.d) < 4.2 && Math.abs(dx) < 2.3) { const p = (2.3 - Math.abs(dx)) * 5 * dt * (dx >= 0 ? 1 : -1); this.lat[a].x += p; this.lat[b].x -= p; this.lat[a].target += p; this.lat[b].target -= p; if (a === 0 || b === 0) this.shake = Math.max(this.shake, 1.5); }
      }
      this.parts = this.parts.filter(p => (p.t -= dt) > 0);
      for (const p of this.parts) { p.x += p.vx * dt; p.d += p.vd * dt; if (p.grow) p.s += dt * 1.6; }
      this.haz.forEach(h => { if (h.knock && (h.knock.t -= dt * 1.5) <= 0) h.knock = null; });
      this.shake = Math.max(0, this.shake - dt * 28); if (this.flash > 0) this.flash -= dt;
      if (this.fw) { for (const f of this.fw) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 140 * dt; f.t -= dt; } this.fw = this.fw.filter(f => f.t > 0); }
    }
    sx(d, x, pd) { return this.W / 2 + (this.cx(d) - this.cx(pd) + x) * this.ppu; }
    sy(d, pd) { return this.H * .7 - (d - pd) * this.ppu; }
    /* ---------- drawing ---------- */
    render() {
      const g = this.g, W = this.W, H = this.H, T = this.T, u = this.ppu, s = this.sim;
      const me = s ? s.cars[0] : { d: 0, v: 0, nitro: 0 }, pd = me.d;
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      if (this.shake > 0) g.translate((Math.random() - .5) * this.shake, (Math.random() - .5) * this.shake);
      g.fillStyle = T.ground; g.fillRect(-12, -12, W + 24, H + 24);
      if (T.ground2) { const dT = pd + (H * .7 + 30) / u, dB = pd - (H * .3 + 30) / u; g.fillStyle = T.ground2; for (let d = Math.floor(dB / 6) * 6; d < dT; d += 12) { const y1 = this.sy(d, pd), y2 = this.sy(d + 6, pd); g.fillRect(-12, y2, W + 24, y1 - y2); } }
      const dTop = pd + (H * .7 + 30) / u, dBot = pd - (H * .3 + 30) / u, px = 6, step = px / u;
      if (T.sea) {
        g.fillStyle = '#3fa7d6'; g.beginPath(); g.moveTo(-12, H + 12);
        for (let d = dBot; d <= dTop; d += step * 4) g.lineTo(this.sx(d, -HALF - 4.6 - Math.sin(d * .05) * 1.2, pd), this.sy(d, pd));
        g.lineTo(-12, -12); g.closePath(); g.fill();
      }
      const d0 = Math.floor(dBot / step) * step;
      // two passes: pavement and run-off first, then the road, so strips never paint over the road
      for (let d = d0; d <= dTop; d += step) {
        const y = Math.round(this.sy(d, pd)), c = this.sx(d, 0, pd), h = px + 1;
        if (T.walk) { g.fillStyle = T.walk; g.fillRect(c - (HALF + 3.4) * u, y - h, (HALF + 3.4) * 2 * u, h);
          if ((((d % 2.5) + 2.5) % 2.5) < step) { g.fillStyle = 'rgba(0,0,0,.1)'; g.fillRect(c - (HALF + 3.4) * u, y - 1, 2.3 * u, 1.5); g.fillRect(c + (HALF + 1.1) * u, y - 1, 2.3 * u, 1.5); } }
        g.fillStyle = T.edge; g.fillRect(c - (HALF + 1.1) * u, y - h, (HALF + 1.1) * 2 * u, h);
      }
      for (let d = d0; d <= dTop; d += step) {
        const y = Math.round(this.sy(d, pd)), c = this.sx(d, 0, pd), h = px + 1;
        g.fillStyle = T.road; g.fillRect(c - HALF * u, y - h, HALF * 2 * u, h);
        if (T.kerb) { g.fillStyle = T.kerb[Math.floor(d / 3) & 1]; g.fillRect(c - (HALF + .9) * u, y - h, .9 * u, h); g.fillRect(c + HALF * u, y - h, .9 * u, h); }
        if (T.dash && !(Math.floor(d / 4) & 1)) { g.fillStyle = T.dash; g.fillRect(c - .5 * LANE * u - .14 * u, y - h, .28 * u, h); g.fillRect(c + .5 * LANE * u - .14 * u, y - h, .28 * u, h); }
        if (!T.dash) { g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(c - 2.7 * u, y - h, 1.1 * u, h); g.fillRect(c + 1.6 * u, y - h, 1.1 * u, h); }
        const lapD = ((d % LEN) + LEN) % LEN;
        if (T.zebra && lapD > 60 && lapD % 160 < 4) { g.fillStyle = 'rgba(255,255,255,.88)'; for (let q = -HALF + .5; q < HALF - .5; q += 1.8) g.fillRect(c + q * u, y - h, .95 * u, h); }
        if (T.zebra && lapD % 70 < step && lapD % 160 > 8) { const mx = c + ((Math.floor(d / 70) % 3) - 1) * LANE * u + u * .8; g.fillStyle = '#353a41'; g.beginPath(); g.arc(mx, y, .55 * u, 0, TAU); g.fill(); g.strokeStyle = '#5d646c'; g.lineWidth = 2; g.stroke(); }
        if (lapD < step) { const n = 14, cw = HALF * 2 * u / n; for (let q = 0; q < n; q++) for (let rr = 0; rr < 2; rr++) { g.fillStyle = (q + rr) & 1 ? '#111' : '#fff'; g.fillRect(c - HALF * u + q * cw, y - (rr + 1) * cw * .6, cw, cw * .6); } }
      }
      // skid marks
      g.fillStyle = 'rgba(0,0,0,.28)';
      for (const k of this.skids) { if (k.d < dBot || k.d > dTop) continue; g.fillRect(this.sx(k.d, k.x, pd) - .18 * u, this.sy(k.d, pd) - .5 * u, .36 * u, u); }
      if (this.skids.length > 140) this.skids.splice(0, 20);
      const base = Math.floor(pd / LEN) * LEN;
      for (const o of this.deco) {
        if (T.sea && o.side < 0) continue;
        for (const k of [-1, 0, 1]) {
          const d = o.d + base + k * LEN; if (d < dBot - 10 || d > dTop + 10) continue;
          const near = T.walk && o.off < 3;   // street trees in planters stand on the pavement, buildings behind
          this.drawDeco(g, near ? 'planter' : T.side, this.sx(d, o.side * (near ? HALF + 2.3 : HALF + (T.walk ? 6.2 : 2.4) + o.off), pd), this.sy(d, pd), o, u);
        }
      }
      // hazards with a pulsing warning ring
      const pulse = .5 + .5 * Math.sin(performance.now() / 160);
      for (const h of this.haz) for (const k of [0, 1]) {
        const d = h.d + base + k * LEN; if (d < dBot - 5 || d > dTop + 5 || (s && d > s.total + 2)) continue;
        let x = this.sx(d, h.x, pd), y = this.sy(d, pd); const S = this.hs[h.kind];
        if (h.knock) { x += h.knock.dir * (1 - h.knock.t) * 3 * u; y -= (1 - h.knock.t) * 2 * u; }
        if (!h.knock && d > pd) { g.strokeStyle = `rgba(255,197,61,${.25 + pulse * .45})`; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, HAZ[h.kind].r * u * (1.15 + pulse * .12), 0, TAU); g.stroke(); }
        g.drawImage(S.c, x - S.s / 2, y - S.s / 2, S.s, S.s);
      }
      // particles: smoke puffs, dust, debris
      for (const p of this.parts) {
        const x = this.sx(p.d, p.x, pd), y = this.sy(p.d, pd), a = Math.min(1, p.t * 1.6);
        if (p.smoke) { const z = p.s * u * 2.4; g.globalAlpha = a * .8; g.drawImage(this.smoke, x - z / 2, y - z / 2, z, z); }
        else { g.globalAlpha = a; g.fillStyle = p.c; g.fillRect(x - p.s * u / 2, y - p.s * u / 2, p.s * u, p.s * u); }
      }
      g.globalAlpha = 1;
      if (s) { const order = s.cars.map((_, i) => i).sort((a, b) => s.cars[a].d - s.cars[b].d); for (const i of order) this.drawCar(g, i, pd); }
      // speed lines when going fast or on nitro
      const sp = s ? clamp((me.v - 44) / 26, 0, 1) + (me.nitro > 0 ? .6 : 0) : 0;
      if (sp > 0) {
        g.strokeStyle = `rgba(239,234,255,${Math.min(.55, sp * .45)})`; g.lineWidth = 2;
        for (const l of this.lines) {
          l.y += (me.v / 60) * .045 * (1 + l.l); if (l.y > 1.1) { l.y = -.1; l.x = Math.random(); }
          const x = l.x < .5 ? l.x * W * .36 : W - (1 - l.x) * W * .36, y = l.y * H;
          g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 40 * l.l * (.6 + sp)); g.stroke();
        }
      }
      if (this.fw) { for (const f of this.fw) { g.globalAlpha = Math.max(0, Math.min(1, f.t)); g.fillStyle = f.c; g.fillRect(f.x, f.y, 3, 3); } g.globalAlpha = 1; }
      if (this.flash > 0) { g.fillStyle = `rgba(232,74,63,${this.flash * .45})`; g.fillRect(0, 0, W, H); }
      if (s) {
        const x0 = W - 12, y0 = 96, y1 = H * .62; g.fillStyle = 'rgba(29,33,38,.75)'; g.fillRect(x0 - 3, y0, 6, y1 - y0);
        s.cars.forEach((c, i) => { const y = y1 - Math.min(1, c.d / s.total) * (y1 - y0); g.fillStyle = this.racers[i].color; g.beginPath(); g.arc(x0, y, i === 0 ? 7 : 5, 0, TAU); g.fill(); if (i === 0) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); } });
      }
    }
    drawCar(g, i, pd) {
      const c = this.sim.cars[i], L = this.lat[i], sp = this.sprites[i], u = this.ppu, x = this.sx(c.d, L.x, pd), y = this.sy(c.d, pd);
      if (y < -80 || y > this.H + 80) return;
      const sc = u / NB.carTop.PX, Lh = this.sizes[i].L / 2 * u;
      g.save(); g.translate(x, y); g.rotate(L.ang);
      const flames = c.nitro > 0 || (this.racers[i].mods && this.racers[i].mods.nos >= 5 && c.v > 25);
      if (flames) { const f = (c.nitro > 0 ? 1 : .45) * (.8 + Math.random() * .4); g.drawImage(this.flame, -.8 * u * .7, Lh - 2, 1.6 * u * .7, 4 * u * f); }
      g.drawImage(sp, -sp.width * sc / 2, -sp.height * sc / 2, sp.width * sc, sp.height * sc);
      g.restore();
      if (i === 0 && this.sim.phase !== 'run' && !c.finished) { g.fillStyle = '#fff'; g.font = 'italic 900 13px "Exo 2", system-ui'; g.textAlign = 'center'; g.fillText('YOU', x, y + Lh + 16); }
    }
    drawHaz(g, kind, r, u) {
      if (kind === 'oil') {
        g.fillStyle = '#16191d'; g.beginPath(); g.ellipse(0, 0, r * 1.05, r * .75, .4, 0, TAU); g.fill(); g.beginPath(); g.ellipse(r * .55, r * .35, r * .45, r * .32, 0, 0, TAU); g.fill(); g.beginPath(); g.arc(-r * .9, r * .5, r * .18, 0, TAU); g.arc(r * 1.1, -r * .3, r * .14, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(120,130,140,.6)'; g.lineWidth = Math.max(2, u * .18); g.beginPath(); g.ellipse(-r * .15, -r * .1, r * .58, r * .33, .4, 0, TAU); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(-r * .4, -r * .25, r * .16, r * .07, .4, 0, TAU); g.fill();
      } else if (kind === 'hole') {
        g.fillStyle = '#2f343a'; g.beginPath(); g.ellipse(0, 0, r * 1.15, r * .95, 0, 0, TAU); g.fill();
        g.fillStyle = '#121417'; g.beginPath(); g.ellipse(0, r * .08, r * .85, r * .68, 0, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 0, r * 1.15, r * .95, 0, Math.PI * 1.1, Math.PI * 1.8); g.stroke();
      } else if (kind === 'cone') {
        g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.arc(r * .3, r * .35, r * 1.05, 0, TAU); g.fill();
        g.fillStyle = '#FF7A1A'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = r * .3; g.beginPath(); g.arc(0, 0, r * .6, 0, TAU); g.stroke();
        g.fillStyle = '#ffc08a'; g.beginPath(); g.arc(-r * .1, -r * .1, r * .22, 0, TAU); g.fill();
      } else if (kind === 'mud') {
        g.fillStyle = '#3a2817'; g.beginPath(); g.ellipse(0, 0, r * 1.15, r * .82, .3, 0, TAU); g.fill();
        g.fillStyle = '#56402a'; g.beginPath(); g.ellipse(r * .2, r * .1, r * .7, r * .45, .3, 0, TAU); g.fill();
        g.fillStyle = 'rgba(180,150,110,.55)'; g.beginPath(); g.ellipse(-r * .35, -r * .25, r * .32, r * .14, .3, 0, TAU); g.fill();
      } else if (kind === 'rock') {
        g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(r * .3, r * .35, r, r * .8, 0, 0, TAU); g.fill();
        g.fillStyle = '#8b8599'; g.beginPath(); g.moveTo(-r, r * .3); g.lineTo(-r * .6, -r * .8); g.lineTo(r * .4, -r); g.lineTo(r, -r * .1); g.lineTo(r * .6, r * .8); g.lineTo(-r * .4, r * .9); g.closePath(); g.fill();
        g.fillStyle = '#c3bcd2'; g.beginPath(); g.moveTo(-r * .6, -r * .8); g.lineTo(r * .4, -r); g.lineTo(0, -r * .15); g.closePath(); g.fill();
      } else if (kind === 'sand') {
        g.fillStyle = '#ecd29d'; g.beginPath(); g.ellipse(0, 0, r * 1.2, r * .7, -.2, 0, TAU); g.fill();
        g.strokeStyle = '#c69f63'; g.lineWidth = Math.max(1.5, u * .16); [-.3, .1, .45].forEach(k => { g.beginPath(); g.ellipse(0, r * k, r * .8, r * .12, -.2, Math.PI, TAU); g.stroke(); });
      }
    }
    drawDeco(g, kind, x, y, o, u) {
      const tree = r => {
        g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.arc(x + 5, y + 6, r, 0, TAU); g.fill();
        g.fillStyle = o.c > .5 ? '#3f9a3a' : '#4aa944';
        for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + o.h * 3; g.beginPath(); g.arc(x + Math.cos(a) * r * .45, y + Math.sin(a) * r * .45, r * .62, 0, TAU); g.fill(); }
        g.fillStyle = '#7cd16a'; g.beginPath(); g.arc(x - r * .28, y - r * .28, r * .38, 0, TAU); g.fill();
      };
      if (kind === 'planter') {
        g.fillStyle = '#7a6a58'; g.fillRect(x - .9 * u, y - .9 * u, 1.8 * u, 1.8 * u);
        g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.arc(x + 4, y + 5, .95 * u, 0, TAU); g.fill();
        g.fillStyle = o.c > .5 ? '#3f9a3a' : '#4aa944'; g.beginPath(); g.arc(x, y, .95 * u, 0, TAU); g.fill();
        g.fillStyle = '#7cd16a'; g.beginPath(); g.arc(x - .3 * u, y - .3 * u, .35 * u, 0, TAU); g.fill();
      } else if (kind === 'buildings') {
        const w = (2.4 + o.s * 2.2) * u, h = (2.4 + o.h * 2.6) * u, col = ['#c9cfd5', '#7fb7c9', '#d98f6a'][Math.floor(o.c * 3)];
        g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - w / 2 + 6, y - h / 2 + 7, w, h);
        g.fillStyle = col; g.fillRect(x - w / 2, y - h / 2, w, h);
        g.strokeStyle = '#2e3238'; g.lineWidth = 2; g.strokeRect(x - w / 2, y - h / 2, w, h);
        g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x - w / 2 + 4, y - h / 2 + 4, w * .4, h * .3); g.fillRect(x + w * .05, y + h * .05, w * .35, h * .3);
      } else if (kind === 'circuit' || kind === 'trees') {
        if (o.off < 4 && o.c < .45) {          // tyre stack beside the kerb
          for (let k = 0; k < 3; k++) { const tx = x + (k - 1) * .95 * u; g.fillStyle = '#15181c'; g.beginPath(); g.arc(tx, y, .5 * u, 0, TAU); g.fill(); g.fillStyle = k === 1 ? '#e84a4a' : '#5d646c'; g.beginPath(); g.arc(tx, y, .22 * u, 0, TAU); g.fill(); }
        } else tree((1.0 + o.s * .9) * u);
      } else {
        const r = (1.2 + o.s * .8) * u;
        g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.arc(x + 4, y + 4, r * .7, 0, TAU); g.fill();
        g.fillStyle = '#3f9a3a';
        for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + o.c * 3; g.beginPath(); g.ellipse(x + Math.cos(a) * r * .5, y + Math.sin(a) * r * .5, r * .6, r * .2, a, 0, TAU); g.fill(); }
        g.fillStyle = '#8a6a44'; g.beginPath(); g.arc(x, y, r * .18, 0, TAU); g.fill();
      }
    }
    boost() { this.shake = Math.max(this.shake, 4); if (navigator.vibrate) navigator.vibrate(25); }
    fireworks() {
      this.fw = [];
      for (let b = 0; b < 4; b++) { const cx = this.W * (.2 + b * .2), cy = this.H * (.2 + Math.random() * .2), col = [PINK, CYAN, GOLD, '#ffffff'][b];
        for (let k = 0; k < 40; k++) { const a = Math.random() * TAU, v = 60 + Math.random() * 160; this.fw.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 1.4 + Math.random() * .6, c: col }); } }
    }
    loop(now) {
      if (!this.alive) return;
      const dt = Math.min(.1, (now - this.last) / 1000); this.last = now;
      if (this.onFrame) this.onFrame(dt);
      for (let left = dt; left > 1e-4; left -= 1 / 60) this.update(Math.min(1 / 60, left));
      this.render();
      requestAnimationFrame(this.loop);
    }
    dispose() {
      this.alive = false; window.removeEventListener('resize', this.resize);
      document.removeEventListener('keydown', this.kd); document.removeEventListener('keyup', this.kd);
      this.cv.remove();
    }
  }
  Race2D.THEMES = THEMES; Race2D.THEME_KEYS = THEME_KEYS;
  NB.Race2D = Race2D;
})(window.NB = window.NB || {});
