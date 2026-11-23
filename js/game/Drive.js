/* Drive — arcade top-down driving: tracks, car physics, AI, checkpoints, hazards and nitro pickups. No DOM.
   Physics runs in fixed 1/120 s steps, so a race plays the same at any frame rate.
   Every tuning value lives in PARAMS; each car carries its own copy in car.P, so cars (and tests)
   can be balanced without touching code. The model is arcade, not simulation:
   velocity is a world vector, the car's heading turns with steering, and sideways speed bleeds
   away at the rate of lateralGrip. Less grip (drifting, handbrake, oil) = the rear slides. */
(function (NB) {
  const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const wrapA = a => ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  const rng = seed => { let s = (seed >>> 0) || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
  const H = 1 / 120, CPS = 6;   // physics step; checkpoints per lap (the 6th is the finish line)

  const PARAMS = {
    acceleration: 26,        // units/s² from standstill at full throttle
    maxSpeed: 52,            // units/s (the HUD shows ×4.2 as km/h)
    reverseSpeed: 12,
    brake: 50,               // units/s² when braking
    steeringSpeed: 2.7,      // turn rate at full lock, rad/s
    friction: .45,           // coasting drag per second, as a fraction of speed
    lateralGrip: 9,          // how quickly sideways sliding dies away (per second)
    driftFactor: .6,         // grip lost in a sharp turn at high speed (0–1)
    handbrakeStrength: .8,   // grip lost with the handbrake on (0–1)
    collisionBounce: .45,    // share of impact speed bounced back off walls and cars
    nitroMultiplier: 1.35,   // top speed × this while nitro burns
    nitroTime: 1.6, nitroCooldown: 2.5,
    offroad: .58             // top speed × this on grass, sand or pavement
  };
  /* Car stats (0–100, from the garage and the maths) → physics. */
  function paramsFor(s, base = PARAMS) {
    return Object.assign({}, base, {
      maxSpeed: base.maxSpeed * (.8 + s.spd * .0045),
      acceleration: base.acceleration * (.75 + s.acc * .005),
      steeringSpeed: base.steeringSpeed * (.88 + s.han * .0035),
      lateralGrip: base.lateralGrip * (.75 + s.han * .006),
      nitroMultiplier: base.nitroMultiplier + s.nit * .0025
    });
  }

  /* ---------------- tracks ---------------- */
  const THEMES = {
    circuit: { name: 'Green Valley GP', tip: 'Fast sweepers. Watch for oil, cones and potholes', hazards: [['oil', .38], ['cone', .34], ['hole', .28]] },
    city: { name: 'Downtown Loop', tip: 'Tight square corners. Brake or drift into them', hazards: [['hole', .38], ['oil', .32], ['cone', .3]] },
    coast: { name: 'Coast Highway', tip: 'Long seafront straight. Watch for sand and oil', hazards: [['sand', .4], ['oil', .32], ['cone', .28]] }
  };
  const THEME_KEYS = ['circuit', 'city', 'coast'];
  // Loops of control points (the first point sits mid-straight: the start). hw: half road width.
  // verge: run-off between road edge and wall. sub: split long segments so corners stay square (city).
  const LAYOUTS = {
    circuit: { scale: 1.5, hw: 7, verge: 7, laps: 3, pts: [[0, 0], [40, 0], [80, 0], [105, -8], [115, -30], [100, -50], [75, -52], [60, -68], [62, -92], [45, -108], [10, -110], [-25, -100], [-45, -75], [-60, -45], [-55, -15], [-40, 0]] },
    city: { scale: 1.35, hw: 7, verge: 3.2, sub: 11, laps: 2, pts: [[0, 0], [70, 0], [80, -10], [80, -45], [70, -55], [45, -55], [35, -65], [35, -95], [25, -105], [-25, -105], [-35, -95], [-35, -65], [-45, -55], [-70, -55], [-80, -45], [-80, -10], [-70, 0]] },
    coast: { scale: 1.45, hw: 7.4, verge: 6, laps: 3, pts: [[0, 0], [40, 1], [80, -2], [110, -20], [118, -50], [100, -75], [70, -78], [50, -60], [25, -62], [0, -85], [-35, -88], [-60, -70], [-70, -40], [-60, -12], [-35, -1]] }
  };
  const HAZ = {
    oil: { r: 2.0, msg: 'Oil! Spin out' }, hole: { r: 1.3, msg: 'Pothole!' },
    cone: { r: .9, msg: 'Cone!' }, sand: { r: 2.0, msg: 'Sand drift!' }
  };

  function track(key, seed = 1, level = 0) {
    key = LAYOUTS[key] ? key : THEME_KEYS[seed % 3];
    const L = LAYOUTS[key], T = THEMES[key], r = rng(seed * 7 + 3), flip = (Math.floor(seed / 3) & 1) ? -1 : 1;
    let P = L.pts.map(([x, y]) => [x * L.scale * flip, y * L.scale]);
    if (L.sub) { const q = []; P.forEach((p, i) => { const n = P[(i + 1) % P.length], d = Math.hypot(n[0] - p[0], n[1] - p[1]), m = Math.max(1, Math.round(d / (L.sub * L.scale))); for (let j = 0; j < m; j++) q.push([p[0] + (n[0] - p[0]) * j / m, p[1] + (n[1] - p[1]) * j / m]); }); P = q; }
    // Catmull-Rom through the points, then resample evenly every ~1.5 units
    const n = P.length, dense = [];
    for (let i = 0; i < n; i++) {
      const a = P[(i - 1 + n) % n], b = P[i], c = P[(i + 1) % n], d = P[(i + 2) % n];
      for (let t = 0; t < 1; t += 1 / 24) {
        const t2 = t * t, t3 = t2 * t, f = k => .5 * (2 * b[k] + (c[k] - a[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t2 + (3 * b[k] - a[k] - 3 * c[k] + d[k]) * t3);
        dense.push([f(0), f(1)]);
      }
    }
    const cum = [0]; for (let i = 1; i <= dense.length; i++) { const p = dense[i - 1], q = dense[i % dense.length]; cum.push(cum[i - 1] + Math.hypot(q[0] - p[0], q[1] - p[1])); }
    const len = cum[cum.length - 1], N = Math.round(len / 1.5), ds = len / N, S = [];
    for (let k = 0, j = 0; k < N; k++) {
      const want = k * ds; while (cum[j + 1] < want) j++;
      const p = dense[j], q = dense[(j + 1) % dense.length], u = (want - cum[j]) / (cum[j + 1] - cum[j] || 1);
      S.push({ x: p[0] + (q[0] - p[0]) * u, y: p[1] + (q[1] - p[1]) * u });
    }
    S.forEach((s, k) => { const a = S[(k - 1 + N) % N], b = S[(k + 1) % N], l = Math.hypot(b.x - a.x, b.y - a.y); s.tx = (b.x - a.x) / l; s.ty = (b.y - a.y) / l; s.nx = -s.ty; s.ny = s.tx; });
    S.forEach((s, k) => { const a = S[(k - 1 + N) % N], b = S[(k + 1) % N]; s.c = wrapA(Math.atan2(b.ty, b.tx) - Math.atan2(a.ty, a.tx)) / (2 * ds); });   // signed curvature
    const xs = S.map(s => s.x), ys = S.map(s => s.y), W = L.hw + L.verge;
    const tr = { key, name: T.name, tip: T.tip, S, N, ds, len, hw: L.hw, verge: L.verge, wall: W, level,
      box: { x0: Math.min(...xs) - W, y0: Math.min(...ys) - W, x1: Math.max(...xs) + W, y1: Math.max(...ys) + W },
      laps: L.laps };
    tr.dist = (x, y) => { let b = 1e9; for (const s of S) { const d = (s.x - x) ** 2 + (s.y - y) ** 2; if (d < b) b = d; } return Math.sqrt(b); };
    // hazards: more on harder levels, never on the grid, spaced out
    tr.haz = []; const count = Math.round(4 + level * 1.4);
    for (let tries = 0; tr.haz.length < count && tries < 200; tries++) {
      const k = Math.floor(N * (.12 + r() * .82)); if (tr.haz.some(h => Math.abs(h.k - k) < 14)) continue;
      let u = r(), kind = T.hazards[0][0]; for (const [kk, w] of T.hazards) { if ((u -= w) <= 0) { kind = kk; break; } }
      const lat = (r() * 2 - 1) * (L.hw - 2), s = S[k];
      tr.haz.push({ kind, k, lat, x: s.x + s.nx * lat, y: s.y + s.ny * lat, x0: s.x + s.nx * lat, y0: s.y + s.ny * lat, r: HAZ[kind].r, vx: 0, vy: 0, a: r() * TAU, av: 0, cool: {} });
    }
    tr.haz.sort((a, b) => a.k - b.k);
    // nitro canisters: three per lap, they come back 6 s after being picked up
    tr.pick = [.3, .58, .84].map(f => { const k = Math.floor(N * (f + (r() - .5) * .06)), s = S[k], lat = (r() * 2 - 1) * L.hw * .5; return { k, x: s.x + s.nx * lat, y: s.y + s.ny * lat, t: 0 }; });
    return tr;
  }

  /* ---------------- simulation ---------------- */
  class Sim {
    /* racers: [{stats, P?, ai, skill?, charges?, form?, name, type, color, mods}], opts: {laps, seed, slots} */
    constructor(tr, racers, { laps = tr.laps, seed = 1, slots } = {}) {
      this.track = tr; this.laps = laps; this.rnd = rng(seed * 13 + 5); this.t = 0; this.acc = 0;
      this.phase = 'grid'; this.goAt = null; this.events = [];
      const S = tr.S, N = tr.N;
      this.cars = racers.map((rc, i) => {
        const slot = slots ? slots[i] : i, k = N - 4 - (slot >> 1) * 5, s = S[k], lat = (slot & 1 ? 1 : -1) * 3.3;
        return Object.assign({}, rc, { i, P: rc.P || paramsFor(rc.stats || { spd: 50, acc: 50, han: 50, nit: 30 }), skill: rc.skill == null ? .75 : rc.skill,
          x: s.x + s.nx * lat, y: s.y + s.ny * lat, a: Math.atan2(s.ty, s.tx), vx: 0, vy: 0, av: 0, k, prog: k - N, cp: 0, lap: 0, lat,
          finished: false, time: null, charges: rc.charges == null ? 1 : rc.charges, nitroT: 0, nitroCd: 0, oilT: 0, slowT: 0,
          in: { steer: 0, thr: 0, brk: 0, hb: false }, launchAt: rc.ai ? .15 + this.rnd() * .35 : null, stuck: 0, wrongT: 0,
          lane: (this.rnd() - .5) * tr.hw, laneT: 0, slip: 0, off: false, form: rc.form || 1, steer: 0, nitroUsed: 0 });
      });
    }
    ev(e) { this.events.push(e); }
    lights(at) { this.phase = 'count'; this.goAt = this.t + at; this.cars.forEach(c => { if (c.ai) c.launchAt += this.goAt; }); }
    launch(i = 0) {                                  // the player's first press of the gas
      const p = this.cars[i]; if (!p || p.launchAt != null || this.phase === 'grid') return null;
      if (this.t < this.goAt) { p.launchAt = this.goAt + .6; this.ev({ type: 'jump', i }); return 'jump'; }
      const rt = this.t - this.goAt; p.launchAt = this.t;
      if (rt < .35) { const s = this.track.S[p.k], v = p.P.maxSpeed * .3; p.vx = s.tx * v; p.vy = s.ty * v; this.ev({ type: 'perfect', i }); return 'perfect'; }
      this.ev({ type: 'ok', i }); return 'ok';
    }
    nitro(i) {
      const c = this.cars[i]; if (!c || c.charges <= 0 || c.nitroT > 0 || c.nitroCd > 0 || this.phase !== 'run' || c.finished || c.launchAt == null || this.t < c.launchAt) return false;
      c.charges--; c.nitroT = c.P.nitroTime; c.nitroUsed++; this.ev({ type: 'nitro', i }); return true;
    }
    step(dt) {
      this.acc += Math.min(dt, .25);
      while (this.acc >= H) { this.tick(H); this.acc -= H; }
    }
    tick(h) {
      this.t += h;
      if (this.phase === 'count' && this.t >= this.goAt) this.phase = 'run';
      if (this.phase !== 'run' && this.phase !== 'done') return;
      for (const c of this.cars) {
        if (c.launchAt == null && this.t > this.goAt + 3) c.launchAt = this.t;            // never pressed: go anyway
        const go = c.launchAt != null && this.t >= c.launchAt;
        if (go && (c.ai || c.finished)) this.drive(c, h);
        const inp = go ? c.in : { steer: c.in.steer, thr: 0, brk: 0, hb: false };
        this.physics(c, inp, h);
        this.surface(c, h);
      }
      this.collide();
      for (const z of this.track.haz) if (z.vx || z.vy || z.av) { z.x += z.vx * h; z.y += z.vy * h; z.a += z.av * h; const f = Math.exp(-1.6 * h); z.vx *= f; z.vy *= f; z.av *= f; if (Math.hypot(z.vx, z.vy) < .3) { z.vx = z.vy = 0; z.av = 0; } }
      for (const p of this.track.pick) if (p.t > 0) p.t -= h;
      const me = this.cars.find(c => !c.ai) || this.cars[0];
      if (me.finished && !this.doneAt) this.doneAt = this.t;
      if (this.doneAt && (this.t - this.doneAt > 2.2 || this.cars.every(c => c.finished))) this.phase = 'done';
    }
    /* ---------- the car: throttle, brake, steering, grip, drift, nitro ---------- */
    physics(c, inp, h) {
      const P = c.P, fx = Math.cos(c.a), fy = Math.sin(c.a), rx = -fy, ry = fx;
      let vf = c.vx * fx + c.vy * fy, vr = c.vx * rx + c.vy * ry;
      c.steer += (inp.steer - c.steer) * Math.min(1, h * 14);
      if (c.nitroT > 0) { c.nitroT -= h; if (c.nitroT <= 0) c.nitroCd = P.nitroCooldown; } else if (c.nitroCd > 0) c.nitroCd -= h;
      const nos = c.nitroT > 0;
      let top = P.maxSpeed * c.form * (c.off ? P.offroad : 1) * (nos ? P.nitroMultiplier : 1) * (c.slowT > 0 ? .7 : 1) * (c.band || 1);
      if (inp.thr > 0 && vf < top) vf = Math.min(top, vf + P.acceleration * inp.thr * (nos ? 1.8 : 1) * (1 - Math.max(0, vf) / top * .55) * h);
      if (inp.brk > 0) { if (vf > .5) vf -= P.brake * inp.brk * h; else vf = Math.max(-P.reverseSpeed, vf - P.acceleration * .5 * inp.brk * h); }
      vf -= vf * P.friction * (inp.thr || inp.brk ? .25 : 1) * h;
      if (vf > top) vf -= (vf - top) * 1.6 * h;                     // over the limit (nitro ended, onto grass): ease back
      if (inp.hb) vf -= vf * .8 * h;
      const sp = Math.abs(vf);
      let yaw = c.steer * P.steeringSpeed * clamp(sp / 12, 0, 1) * (1 - .22 * clamp((sp - 40) / 30, 0, 1)) * (vf < -.5 ? -1 : 1);
      const drift = clamp((Math.abs(c.steer) - .55) * 2.2, 0, 1) * clamp((sp - .62 * P.maxSpeed) / (.25 * P.maxSpeed), 0, 1);
      if (inp.hb) yaw *= 1.4;
      yaw *= 1 + .25 * drift;                                        // oversteer: the rear steps out
      const grip = P.lateralGrip * (1 - P.driftFactor * drift) * (inp.hb ? 1 - P.handbrakeStrength : 1) * (c.off ? .75 : 1) * (c.oilT > 0 ? .1 : 1);
      vr *= Math.exp(-grip * h);                                     // momentum: sideways speed fades, it does not vanish
      c.slip = Math.abs(vr); c.drift = drift; c.hb = inp.hb;
      c.vx = fx * vf + rx * vr; c.vy = fy * vf + ry * vr;
      c.a += (yaw + c.av) * h; c.av *= Math.exp(-2.6 * h);
      c.x += c.vx * h; c.y += c.vy * h;
      if (c.oilT > 0) c.oilT -= h; if (c.slowT > 0) c.slowT -= h;
    }
    /* ---------- the track: walls, grass, hazards, pickups, checkpoints ---------- */
    surface(c, h) {
      const tr = this.track, S = tr.S, N = tr.N, old = c.k;
      let best = 1e9, bk = c.k;
      for (let j = -10; j <= 10; j++) { const k = (old + j + N) % N, d = (S[k].x - c.x) ** 2 + (S[k].y - c.y) ** 2; if (d < best) { best = d; bk = k; } }
      c.k = bk; const s = S[bk];
      let lat = (c.x - s.x) * s.nx + (c.y - s.y) * s.ny;
      const wall = tr.wall - 1.1, side = lat < 0 ? -1 : 1;
      if (Math.abs(lat) > wall) {
        const over = Math.abs(lat) - wall; c.x -= s.nx * side * over; c.y -= s.ny * side * over; lat = side * wall;
        const vn = (c.vx * s.nx + c.vy * s.ny) * side;
        if (vn > 0) {
          const e = c.P.collisionBounce; c.vx -= (1 + e) * vn * s.nx * side; c.vy -= (1 + e) * vn * s.ny * side;
          c.vx *= .96; c.vy *= .96;
          if (vn > 14) c.av += (this.rnd() - .5) * vn * .14;
          if (vn > 4) this.ev({ type: 'wall', i: c.i, x: c.x + s.nx * side * 1.1, y: c.y + s.ny * side * 1.1, v: vn });
        }
      }
      c.lat = lat; c.off = Math.abs(lat) > tr.hw + .4;
      // progress along the track; checkpoints every sixth of a lap, the last one is the finish line
      let dk = bk - old; if (dk > N / 2) dk -= N; if (dk < -N / 2) dk += N; c.prog += dk;
      while (!c.finished && c.prog >= (c.cp + 1) * N / CPS) {
        c.cp++;
        if (c.cp % CPS === 0) { c.lap = c.cp / CPS; if (c.lap >= this.laps) { c.finished = true; c.time = this.t; this.ev({ type: 'finish', i: c.i }); } else this.ev({ type: 'lap', i: c.i, lap: c.lap }); }
        else this.ev({ type: 'checkpoint', i: c.i, cp: c.cp });
      }
      // wrong way, and stuck against a wall: put the car back on the track
      const sp = Math.hypot(c.vx, c.vy), fwd = Math.cos(c.a) * s.tx + Math.sin(c.a) * s.ty;
      c.wrongT = fwd < -.2 && sp > 3 ? c.wrongT + h : 0;
      const going = this.phase === 'run' && c.launchAt != null && this.t > c.launchAt + 1 && !c.finished;
      c.stuck = going && sp < 2.5 ? c.stuck + h : 0;
      if (c.stuck > 2 || c.wrongT > 4) this.respawn(c);
      // hazards
      for (const z of tr.haz) {
        if ((z.cool[c.i] || 0) > this.t) continue;
        if ((z.x - c.x) ** 2 + (z.y - c.y) ** 2 > (z.r + 1.1) ** 2) continue;
        z.cool[c.i] = this.t + 1.2;
        if (z.kind === 'oil') { c.oilT = .9; c.av += (this.rnd() < .5 ? -1 : 1) * (3 + sp * .05); }
        else if (z.kind === 'hole') { c.vx *= .7; c.vy *= .7; c.slowT = .25; c.av += (this.rnd() - .5) * 1.5; }
        else if (z.kind === 'sand') { c.vx *= .86; c.vy *= .86; c.slowT = .6; }
        else if (z.kind === 'cone') { z.vx = c.vx * 1.15 + (this.rnd() - .5) * 8; z.vy = c.vy * 1.15 + (this.rnd() - .5) * 8; z.av = (this.rnd() - .5) * 18; c.vx *= .93; c.vy *= .93; }
        this.ev({ type: 'haz', i: c.i, kind: z.kind, x: z.x, y: z.y, msg: HAZ[z.kind].msg });
      }
      for (const p of tr.pick) if (p.t <= 0 && (p.x - c.x) ** 2 + (p.y - c.y) ** 2 < 6.5) { p.t = 6; c.charges = Math.min(c.charges + 1, 5); this.ev({ type: 'pickup', i: c.i, x: p.x, y: p.y }); }
    }
    respawn(c) {
      const s = this.track.S[c.k]; c.x = s.x; c.y = s.y; c.a = Math.atan2(s.ty, s.tx); c.vx = c.vy = c.av = 0; c.stuck = c.wrongT = 0; c.oilT = 0;
      this.ev({ type: 'respawn', i: c.i });
    }
    /* ---------- cars bump each other: two circles per car, equal masses ---------- */
    collide() {
      const cs = this.cars, circ = c => { const L = (NB.carTop && NB.carTop.SIZE[c.type] || { L: 4.6, W: 2.2 }), f = L.L * .26, fx = Math.cos(c.a) * f, fy = Math.sin(c.a) * f; return [[c.x + fx, c.y + fy], [c.x - fx, c.y - fy], L.W * .55 + .1]; };
      for (let a = 0; a < cs.length; a++) for (let b = a + 1; b < cs.length; b++) {
        const A = cs[a], B = cs[b]; if ((A.x - B.x) ** 2 + (A.y - B.y) ** 2 > 49) continue;
        const [a1, a2, ra] = circ(A), [b1, b2, rb] = circ(B); let best = null;
        for (const p of [a1, a2]) for (const q of [b1, b2]) { const dx = p[0] - q[0], dy = p[1] - q[1], d = Math.hypot(dx, dy), pen = ra + rb - d; if (pen > 0 && (!best || pen > best.pen)) best = { pen, nx: d ? dx / d : 1, ny: d ? dy / d : 0, p, q }; }
        if (!best) continue;
        const { pen, nx, ny } = best;
        A.x += nx * pen / 2; A.y += ny * pen / 2; B.x -= nx * pen / 2; B.y -= ny * pen / 2;
        const vrel = (A.vx - B.vx) * nx + (A.vy - B.vy) * ny;
        if (vrel >= 0) continue;
        const j = -(1 + (A.P.collisionBounce + B.P.collisionBounce) / 2) * vrel / 2;
        A.vx += j * nx; A.vy += j * ny; B.vx -= j * nx; B.vy -= j * ny;
        // off-centre hits turn the car: torque from where the contact is
        const ta = (best.p[0] - A.x) * ny - (best.p[1] - A.y) * nx, tb = (best.q[0] - B.x) * ny - (best.q[1] - B.y) * nx;
        A.av += ta * j * .05; B.av -= tb * j * .05;
        if (-vrel > 3) this.ev({ type: 'car', i: a, j: b, x: (best.p[0] + best.q[0]) / 2, y: (best.p[1] + best.q[1]) / 2, v: -vrel });
      }
    }
    /* ---------- AI: follow a point ahead on its lane, slow for corners, dodge hazards, use nitro ---------- */
    drive(c, h) {
      const tr = this.track, S = tr.S, N = tr.N, sp = Math.hypot(c.vx, c.vy), sk = c.skill;
      const look = Math.round((5 + sp * .3) / tr.ds), lane0 = c.lane;
      if (this.t > c.laneT) { c.laneT = this.t + 1.5 + this.rnd() * 2.5; c.lane = (this.rnd() - .5) * tr.hw * .9; }
      for (const z of tr.haz) {
        let dk = z.k - c.k; if (dk < 0) dk += N; if (dk > look + 14 || dk < 2) continue;
        const zl = (z.x - S[z.k].x) * S[z.k].nx + (z.y - S[z.k].y) * S[z.k].ny;
        const key = 'd' + c.i + '_' + c.lap; if (z[key] == null) z[key] = this.rnd() < .3 + sk * .65;
        if (z[key] && Math.abs(zl - c.lane) < z.r + 2.2) c.lane = clamp(zl + (zl > 0 ? -1 : 1) * (z.r + 3), -tr.hw + 1.5, tr.hw - 1.5);
      }
      if (c.finished) c.lane = lane0;
      const s = S[(c.k + look) % N], tx = s.x + s.nx * c.lane, ty = s.y + s.ny * c.lane;
      const diff = wrapA(Math.atan2(ty - c.y, tx - c.x) - c.a);
      let cmax = 0; for (let j = 2; j < look + 20; j += 2) cmax = Math.max(cmax, Math.abs(S[(c.k + j) % N].c));
      const vc = c.P.steeringSpeed * (.8 + .25 * sk) / Math.max(cmax, 1e-3);
      c.in.steer = clamp(diff * 2.6, -1, 1);
      c.in.thr = c.finished ? .5 : sp < vc ? 1 : 0; c.in.brk = sp > vc * 1.1 ? .7 : 0; c.in.hb = false;
      if (c.ai && !c.finished && c.charges > 0 && cmax < .012 && sp > c.P.maxSpeed * .6 && this.rnd() < h * (.3 + sk)) this.nitro(c.i);
      // a gentle rubber band keeps the pack together for young drivers
      const me = this.cars.find(x => !x.ai);
      if (c.ai && me) { const gap = (c.prog - me.prog) / N; c.band = gap > .2 ? .94 : gap < -.2 ? 1.04 : 1; }
    }
    order() {
      return this.cars.slice().sort((a, b) => (a.finished && b.finished) ? a.time - b.time : a.finished ? -1 : b.finished ? 1 : b.prog - a.prog);
    }
    finalOrder() {   // cars still running get a projected time
      const T = this.laps * this.track.N;
      return this.cars.map(c => ({ c, time: c.finished ? c.time : this.t + (T - c.prog) * this.track.ds / Math.max(10, Math.hypot(c.vx, c.vy)) })).sort((a, b) => a.time - b.time).map(x => Object.assign(x.c, { time: x.time }));
    }
  }

  NB.Drive = { PARAMS, paramsFor, THEMES, THEME_KEYS, LAYOUTS, HAZ, track, Sim, CPS };
})(typeof window !== 'undefined' ? (window.NB = window.NB || {}) : (globalThis.NB = globalThis.NB || {}));
