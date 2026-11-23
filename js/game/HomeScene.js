/* HomeScene — a top-down race circuit behind the home screen. 2D canvas, built for phones.
   The road scrolls under your car (front = up): grass with mowing stripes, red/white kerbs,
   tyre stacks and trees slide past, and a couple of rivals overtake now and then.
   Pauses when hidden or off screen, and stands still for reduced motion. */
(function (NB) {
  const rng = s => () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const TAU = Math.PI * 2;

  class HomeScene {
    constructor(host, { car } = {}) {
      this.host = host; this.car = car || { type: 'banger', color: '#9a8fbf', mods: {} };
      this.cv = document.createElement('canvas'); this.cv.className = 'hs-cv'; this.cv.setAttribute('aria-hidden', 'true');
      host.prepend(this.cv); this.g = this.cv.getContext('2d', { alpha: false });
      this.still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.t = 0; this.scroll = 0; this.alive = true; this.loop = this.loop.bind(this); this.resize = this.resize.bind(this);
      const r = rng(5);
      this.props = Array.from({ length: 26 }, (_, i) => ({ y: i * 70 + r() * 40, side: i % 2 ? 1 : -1, off: r(), kind: r() < .35 ? 'tyres' : 'tree', s: .8 + r() * .5, c: r() }));
      this.rivals = [{ type: 'hyper', color: '#E8423F', lane: -1, y: -.2, v: .055 }, { type: 'coupe', color: '#5EC3E8', lane: 1, y: .55, v: .03 }]
        .map(o => Object.assign(o, { sp: NB.carTop(o.type, o.color) }));
      this.me = NB.carTop(this.car.type, this.car.color, this.car.mods);
      this.ro = window.ResizeObserver ? new ResizeObserver(this.resize) : null; if (this.ro) this.ro.observe(host); else window.addEventListener('resize', this.resize);
      this.vis = () => { if (!document.hidden) this.kick(); }; document.addEventListener('visibilitychange', this.vis);
      this.resize(); this.kick();
    }
    resize() {
      const r = this.host.getBoundingClientRect(); if (r.width < 2) return;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2); this.W = r.width; this.H = r.height;
      this.cv.width = Math.round(this.W * this.dpr); this.cv.height = Math.round(this.H * this.dpr);
      this.roadW = Math.min(this.W * .62, 340); this.u = this.roadW / 14;    // world unit: the road is 14 units wide
      this.draw();
    }
    kick() { if (!this.raf && this.alive) { this.last = performance.now(); this.raf = requestAnimationFrame(this.loop); } }
    loop(now) {
      this.raf = null;
      if (!this.host.isConnected) return this.dispose();
      if (document.hidden) return;
      const dt = Math.min(.05, (now - this.last) / 1000); this.last = now; this.t += dt;
      this.scroll += dt * this.u * 16;
      this.rivals.forEach(o => { o.y -= o.v * dt * 4; if (o.y < -.35) { o.y = 1.35; o.lane = Math.random() < .5 ? -1 : 1; } });
      this.draw();
      if (!this.still) this.raf = requestAnimationFrame(this.loop);
    }
    draw() {
      const g = this.g, W = this.W, H = this.H, u = this.u, rw = this.roadW, cx = W / 2, x0 = cx - rw / 2;
      if (!W) return;
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const sc = this.scroll;
      // grass with mowing stripes
      g.fillStyle = '#62b14a'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#6bbb52'; const band = u * 6; for (let y = (sc % (band * 2)) - band * 2; y < H; y += band * 2) g.fillRect(0, y, W, band);
      // run-off, kerbs, road
      g.fillStyle = '#f1f3f5'; g.fillRect(x0 - u * 1.6, 0, rw + u * 3.2, H);
      const kh = u * 1.6;
      for (let y = (sc % (kh * 2)) - kh * 2; y < H; y += kh * 2) { g.fillStyle = '#e84a4a'; g.fillRect(x0 - u * 1.2, y, u * 1.2, kh); g.fillRect(x0 + rw, y, u * 1.2, kh); }
      g.fillStyle = '#4a4f57'; g.fillRect(x0, 0, rw, H);
      // asphalt flecks
      g.fillStyle = 'rgba(255,255,255,.05)'; for (let k = 0; k < 40; k++) { const y = ((k * 97 + sc) % (H + 20)) - 10; g.fillRect(x0 + ((k * 53) % rw), y, 3, 3); }
      // lane dashes
      g.fillStyle = 'rgba(255,255,255,.85)'; const dl = u * 3;
      for (let y = (sc % (dl * 2)) - dl * 2; y < H; y += dl * 2) [-1, 1].forEach(s => g.fillRect(cx + s * rw / 6 - u * .14, y, u * .28, dl));
      // start/finish line passes every so often
      const fy = (sc % (H * 2.2)) - u * 2; if (fy < H) for (let q = 0; q < 14; q++) for (let r = 0; r < 2; r++) { g.fillStyle = (q + r) & 1 ? '#15181c' : '#fff'; g.fillRect(x0 + q * rw / 14, fy + r * rw / 28, rw / 14, rw / 28); }
      // props: trees and tyre stacks on the grass
      const span = 26 * 70;
      for (const p of this.props) {
        const y = ((p.y * u / 4 + sc) % (span * u / 4)) - 60;
        const side = p.side, gx = side < 0 ? x0 - u * 2.6 - p.off * Math.max(10, x0 - u * 5) : x0 + rw + u * 2.6 + p.off * Math.max(10, W - x0 - rw - u * 5);
        if (gx < -40 || gx > W + 40) continue;
        if (p.kind === 'tyres') {
          for (let k = 0; k < 3; k++) { const tx = side < 0 ? x0 - u * 2.4 : x0 + rw + u * 2.4, ty = y + k * u * .95; g.fillStyle = '#15181c'; g.beginPath(); g.arc(tx, ty, u * .5, 0, TAU); g.fill(); g.fillStyle = k === 1 ? '#e84a4a' : '#5d646c'; g.beginPath(); g.arc(tx, ty, u * .22, 0, TAU); g.fill(); }
        } else {
          const r = u * (1.3 + p.s);
          g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.arc(gx + 6, y + 7, r, 0, TAU); g.fill();
          g.fillStyle = p.c > .5 ? '#3f9a3a' : '#4aa944';
          for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + p.c * 3; g.beginPath(); g.arc(gx + Math.cos(a) * r * .45, y + Math.sin(a) * r * .45, r * .62, 0, TAU); g.fill(); }
          g.fillStyle = '#7cd16a'; g.beginPath(); g.arc(gx - r * .28, y - r * .28, r * .38, 0, TAU); g.fill();
        }
      }
      // cars: rivals overtaking, and you in the middle lane
      const drawCar = (sp, x, y, scale) => { const k = scale * u / NB.carTop.PX; g.drawImage(sp, x - sp.width * k / 2, y - sp.height * k / 2, sp.width * k, sp.height * k); };
      this.rivals.forEach(o => drawCar(o.sp, cx + o.lane * rw / 3, o.y * H, 1.35));
      drawCar(this.me, cx + rw / 3 * 0, H * .5 + Math.sin(this.t * 2) * 2, 1.7);
    }
    dispose() {
      this.alive = false; if (this.raf) cancelAnimationFrame(this.raf);
      if (this.ro) this.ro.disconnect(); else window.removeEventListener('resize', this.resize);
      document.removeEventListener('visibilitychange', this.vis); this.cv.remove();
    }
  }
  NB.HomeScene = HomeScene;
})(window.NB = window.NB || {});
