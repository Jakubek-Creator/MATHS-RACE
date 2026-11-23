/* Race — car stats, mods, leagues, the race simulation and the race screen.
   Stats (0–100): spd top speed, acc acceleration, han handling (corner speed), nit nitro (charges + power).
   The simulation is plain JS; Race3D (World3D.js) draws it in 3D, or a 2D track is drawn if 3D is unavailable. */
(function (NB) {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const BASE = {
    banger: { spd: 30, acc: 30, han: 35, nit: 10 },
    hatch: { spd: 40, acc: 45, han: 50, nit: 20 },
    scooter: { spd: 36, acc: 62, han: 66, nit: 25 },
    muscle: { spd: 66, acc: 56, han: 36, nit: 35 },
    coupe: { spd: 70, acc: 62, han: 66, nit: 40 },
    hyper: { spd: 86, acc: 80, han: 76, nit: 55 }
  };
  const MODS = [
    { key: 'eng', name: 'Engine', stat: 'spd', desc: 'Higher top speed', mult: 1.0 },
    { key: 'turbo', name: 'Turbo', stat: 'acc', desc: 'Faster acceleration', mult: .9 },
    { key: 'tyre', name: 'Grip & spoilers', stat: 'han', desc: 'Grips corners, stays on the road', mult: .8 },
    { key: 'nos', name: 'Nitro tank', stat: 'nit', desc: 'More nitro boosts', mult: .85 }
  ];
  const PER_LEVEL = 7, MAX_LEVEL = 5;
  const LEAGUES = [
    { name: 'Rookie Cup', rating: 30, prize: 600, color: '#2EE59D' },
    { name: 'Street League', rating: 44, prize: 900, color: '#20D9D2' },
    { name: 'Neon Pro', rating: 57, prize: 1300, color: '#FF9D45' },
    { name: 'Legend Cup', rating: 70, prize: 1800, color: '#FF4F91' },
    { name: 'Champions', rating: 86, prize: 2500, color: '#FFC21A' }
  ];
  const RIVALS = [['Vex', 'muscle', '#9b5cff'], ['Rosa', 'coupe', '#FFC21A'], ['Kit', 'hatch', '#f4f1ff'], ['Blaze', 'hyper', '#ff5d3a'], ['Dash', 'banger', '#20D9D2'], ['Moe', 'scooter', '#FF9D45']];

  function stats(type, mods = {}) {
    const b = BASE[type] || BASE.banger, s = {};
    MODS.forEach(m => { s[m.stat] = clamp(b[m.stat] + (mods[m.key] || 0) * PER_LEVEL, 0, 100); });
    return s;
  }
  const rating = s => Math.round(s.spd * .35 + s.acc * .25 + s.han * .25 + s.nit * .15);
  const charges = s => 1 + Math.floor(s.nit / 34);
  function modCost(carPrice, mod, lvl) { return Math.round(((250 + carPrice * .06) * (lvl + 1) * mod.mult) / 10) * 10; }

  function rivals(league, seed) {
    let s = seed || 1; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const R = LEAGUES[Math.min(league, LEAGUES.length - 1)].rating, picks = RIVALS.slice().sort(() => rnd() - .5).slice(0, 3);
    return picks.map(([name, type, color], i) => {
      const bump = i === 0 ? 5 : i === 1 ? 0 : -4;
      const st = {}; ['spd', 'acc', 'han', 'nit'].forEach(k => { st[k] = clamp(Math.round(R + bump + (rnd() - .5) * 16), 5, 100); });
      const lv = Math.min(5, league + (i === 0 ? 1 : 0)), mods = { eng: lv, turbo: Math.max(0, lv - 1), tyre: lv, nos: Math.max(0, lv - 2) };
      return { name, type, color, stats: st, mods, ai: true };
    });
  }

  /* ---------------- simulation ---------------- */
  class RaceSim {
    /* track: {length, kn(d)} where kn is corner sharpness 0..1. racers: [{stats, ai}] */
    constructor(track, racers, laps = 2) {
      this.track = track; this.laps = laps; this.total = track.length * laps;
      this.t = 0; this.phase = 'grid'; this.goAt = null;
      this.cars = racers.map((r, i) => ({ ...r, i, d: 0, v: 0, nitro: 0, charges: charges(r.stats), finished: false, time: null,
        launchAt: r.ai ? .18 + Math.random() * .35 : null, hold: 0, nitroUsed: 0,
        form: r.ai ? 1 + (Math.random() - .5) * .1 : 1 }));   // rivals have good and bad days
      this.events = [];
    }
    lights(at) { this.phase = 'count'; this.goAt = at; }   // seconds from now until green
    launch() {                                             // the player's launch tap
      const p = this.cars.find(c => !c.ai); if (!p || p.launchAt != null) return null;
      if (this.phase === 'count' && this.t < this.goAt) { p.launchAt = this.goAt + .6; this.events.push('jump'); return 'jump'; }
      const r = this.t - this.goAt; p.launchAt = this.goAt + Math.max(0, r);
      if (r < .35) { p.v = 14; this.events.push('perfect'); return 'perfect'; }
      this.events.push('ok'); return 'ok';
    }
    nitro(i) {
      const c = this.cars[i]; if (!c || c.charges <= 0 || c.nitro > 0 || this.phase !== 'run' || c.finished) return false;
      c.charges--; c.nitro = 2.2 + c.stats.nit / 100; c.nitroUsed++; return true;
    }
    step(dt) {
      dt = Math.min(dt, .05); this.t += dt;
      if (this.phase === 'count' && this.t >= this.goAt) this.phase = 'run';
      if (this.phase !== 'run') return;
      const L = this.track.length;
      this.cars.forEach(c => {
        if (c.finished) { c.v = Math.max(8, c.v - 25 * dt); c.d += c.v * dt; return; }
        if (c.launchAt == null) { if (this.t > this.goAt + 3) c.launchAt = this.t; else return; }  // never tapped: auto-launch late
        if (this.t < c.launchAt) return;
        const s = c.stats, kn = this.track.kn(((c.d % L) + L) % L);
        let vmax = (32 + s.spd * .34) * (1 - kn * .42 * (1.25 - s.han / 100)) * c.form * (c.grip == null ? 1 : c.grip);
        let a = 6 + s.acc * .15;
        if (c.stun > 0) { c.stun -= dt; a *= .15; }        // just hit something: wheels spinning
        if (c.nitro > 0) { vmax *= 1 + (.18 + s.nit / 400) * (1 - kn * .7); a *= 1.8; c.nitro -= dt; }
        if (c.ai && c.charges > 0 && c.nitro <= 0 && kn < .08 && c.v > vmax * .7) {
          const left = (this.total - c.d) / this.total;
          if (Math.random() < dt * .5 || left < c.charges * .12) this.nitro(c.i);
        }
        if (c.v < vmax) c.v = Math.min(vmax, c.v + a * dt); else c.v = Math.max(vmax, c.v - 34 * dt);
        c.d += c.v * dt;
        if (c.d >= this.total) { c.finished = true; c.time = this.t - (c.d - this.total) / Math.max(1, c.v); }
      });
      const p = this.cars.find(c => !c.ai);
      if (p && p.finished && this.cars.every(c => c.finished || c.d > this.total - 1)) this.phase = 'done';
      if (p && p.finished && !this.doneAt) this.doneAt = this.t;
      if (this.doneAt && this.t - this.doneAt > 2.2) this.phase = 'done';
    }
    order() {
      return this.cars.slice().sort((a, b) => (a.finished && b.finished) ? a.time - b.time : a.finished ? -1 : b.finished ? 1 : b.d - a.d);
    }
    finalOrder() { // cars still running get a projected time
      return this.cars.map(c => ({ c, time: c.finished ? c.time : this.t + (this.total - c.d) / Math.max(10, c.v) })).sort((a, b) => a.time - b.time).map(x => Object.assign(x.c, { time: x.time }));
    }
  }

  /* A track description for when 3D is unavailable: four corners per lap. */
  const flatTrack = { length: 620, kn: d => { const x = (d % 620) / 620 * Math.PI * 4; return Math.pow(Math.max(0, Math.sin(x)), 6); } };

  /* ---------------- race screen ---------------- */
  const ord = n => ['1st', '2nd', '3rd', '4th'][n - 1] || `${n}th`;
  const fmtT = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
  const LOCK = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><rect x="2.5" y="7" width="11" height="8" rx="1.5" fill="currentColor"/><path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="2" fill="none"/></svg>';

  class RaceScreen {
    /* opts: {player:{name,type,color,stats}, league, seed, sfx(k), onStart(), onDone(result), onExit()} */
    constructor(opts) { this.o = opts; }
    open() {
      const o = this.o, L = LEAGUES[Math.min(o.league, LEAGUES.length - 1)];
      this.rivals = rivals(o.league, o.seed);
      this.racers = [{ name: 'You', type: o.player.type, color: o.player.color, stats: o.player.stats, mods: o.player.mods, ai: false }, ...this.rivals];
      const el = this.el = document.createElement('div');
      el.className = 'rc'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Daily race');
      el.innerHTML = `<div class="rc-stage"></div>
        <div class="rc-top"><div class="rc-pos"><b>–</b><span>/ 4</span></div><div class="rc-lap">Lap <b>1</b> / 2</div><div class="rc-speed"><b>0</b><span>km/h</span></div>
          <div class="rc-time">0:00.0</div><div class="rc-lg" style="--lc:${L.color}">${L.name}</div></div>
        <div class="rc-lights" aria-hidden="true"><i></i><i></i><i></i></div>
        <div class="rc-msg" aria-live="assertive"></div>
        <div class="rc-bottom"><div class="rc-pads" aria-label="Steering"><button class="rc-pad" data-pad="-1" aria-label="Steer left"><svg viewBox="0 0 24 24"><path d="M15 4 7 12l8 8" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button><button class="rc-pad" data-pad="1" aria-label="Steer right"><svg viewBox="0 0 24 24"><path d="m9 4 8 8-8 8" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>
          <button class="rc-btn rc-launch" data-r="launch">Launch!</button>
          <button class="rc-btn rc-nitro" data-r="nitro" hidden>Nitro <span class="pips"></span></button></div>
        <div class="rc-panel"></div>`;
      document.body.appendChild(el); document.body.classList.add('nbl-open');
      el.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b && !b.disabled) this.act(b.dataset.r); });
      this.onKey = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this.act(this.sim && this.sim.phase === 'run' && this.launched ? 'nitro' : 'launch'); } if (e.key === 'Escape' && !this.started) this.close(); };
      document.addEventListener('keydown', this.onKey);
      // top-down 2D track (one of three, changes every day), or the plain fallback
      const stage = el.querySelector('.rc-stage');
      this.r3 = null;
      if (NB.Race2D) { try { this.r3 = new NB.Race2D(stage, this.racers, { seed: o.seed }); this.r3.onHit = (k, m) => { this.msg(m, 'bad'); this.o.sfx('bad'); }; } catch (e) { console.warn(e); this.r3 = null; } }
      this.track = this.r3 ? this.r3.track : flatTrack;
      if (!this.r3) stage.innerHTML = `<div class="rc-flat">${this.racers.map((r, i) => `<div class="rf-lane"><span class="rf-n">${r.name}</span><span class="rf-car" style="--c:${r.color}"></span></div>`).join('')}</div>`;
      this.sim = new RaceSim(this.track, this.racers, 2);
      if (this.r3) { this.r3.sim = this.sim; this.r3.onFrame = dt => this.frame(dt); }
      this.grid();
    }
    grid() {
      const o = this.o, L = LEAGUES[Math.min(o.league, LEAGUES.length - 1)], me = rating(o.player.stats);
      const row = r => `<div class="rg-row ${r.ai ? '' : 'me'}"><span class="rg-sw" style="background:${r.color}"></span><b>${r.ai ? r.name : 'You'}</b><span>${r.ai ? r.type : o.player.name}</span><span class="rg-r">${rating(r.stats)}</span></div>`;
      const best = Math.max(...this.rivals.map(r => rating(r.stats)));
      const tip = me >= best ? 'Your car is quick enough to win. Nail the launch and use nitro on the straights!'
        : me >= best - 6 ? 'Close match. A perfect launch and good nitro timing can win it.'
        : 'Your rivals are faster. You can still race, but upgrading in the garage first gives you a real chance.';
      this.panel(`<h2 style="--lc:${L.color}">${L.name}</h2><p class="rg-sub">Today's race. The number is each car's rating: higher is faster.</p>
        <div class="rg">${row(this.racers[0])}${this.rivals.map(row).join('')}</div>
        <p class="rg-tip">${tip}</p>
        <p class="rg-track">Today's track: <b>${this.track.name || 'Neon circuit'}</b>${this.r3 ? ` <span>${this.track.tip}</span>` : ''}</p>
        <p class="rg-how"><b>How to race:</b> tap <b>Launch</b> when the lights go green. Steer with the big <b>◀ ▶</b> buttons, or drag your finger left and right. Dodge hazards and hold the road in corners. Tap <b>Nitro</b> on straights. Arrow keys and space bar work too.</p>
        <div class="rg-acts"><button class="rc-cta" data-r="start">Start race ▶</button><button class="rc-sec" data-r="garage">Upgrade first</button><button class="rc-sec" data-r="exit">Not now</button></div>`);
    }
    panel(html) { const p = this.el.querySelector('.rc-panel'); p.innerHTML = html; p.hidden = !html; }
    msg(t, cls = '') { const m = this.el.querySelector('.rc-msg'); m.className = 'rc-msg ' + cls; m.textContent = t; void m.offsetWidth; m.classList.add('show'); }
    act(a) {
      const s = this.sim;
      if (a === 'start') {
        this.started = true; this.o.onStart && this.o.onStart(); this.panel('');
        this.el.classList.add('live');
        s.lights(3.0);
        const ls = this.el.querySelectorAll('.rc-lights i');
        [0, 1, 2].forEach(k => setTimeout(() => { ls[k].className = 'red'; this.o.sfx('tick'); }, 300 + k * 900));
        setTimeout(() => { ls.forEach(x => (x.className = 'green')); this.msg('GO!', 'go'); this.o.sfx('good'); }, 3000);
        setTimeout(() => this.el.querySelector('.rc-lights').classList.add('off'), 4200);
        this.last = performance.now();
        if (!this.r3) this.loop();
      } else if (a === 'launch' && this.started && !this.launched) {
        const r = s.launch(); this.launched = true;
        this.el.querySelector('.rc-launch').hidden = true;
        const nb = this.el.querySelector('.rc-nitro'); nb.hidden = false; this.pips();
        if (r === 'perfect') { this.msg('PERFECT START!', 'good'); this.o.sfx('nitro'); }
        else if (r === 'jump') { this.msg('Jump start! Held back', 'bad'); this.o.sfx('bad'); }
        else this.msg('Go go go!', '');
      } else if (a === 'nitro') {
        if (s.nitro(0)) { this.msg('NITRO!', 'nitro'); this.o.sfx('nitro'); this.pips(); if (this.r3) this.r3.boost(); }
      } else if (a === 'exit') this.close();
      else if (a === 'garage') this.close('garage');
      else if (a === 'done') this.close();
    }
    pips() { const p = this.sim.cars[0]; this.el.querySelector('.rc-nitro .pips').innerHTML = Array.from({ length: charges(p.stats) }, (_, k) => `<i class="${k < p.charges ? 'on' : ''}"></i>`).join(''); this.el.querySelector('.rc-nitro').disabled = p.charges <= 0; }
    loop() { if (this.closed) return; const now = performance.now(); this.frame((now - this.last) / 1000); this.last = now; requestAnimationFrame(() => this.loop()); }
    frame(dt) {
      const s = this.sim; if (!this.started || this.finishedShown) return;
      for (let left = Math.min(dt, .25); left > 1e-4; left -= .05) s.step(Math.min(.05, left));   // keep real time even at low frame rates
      const order = s.order(), me = s.cars[0], pos = order.indexOf(me) + 1;
      const t = Math.max(0, s.t - (s.goAt || 0));
      this.el.querySelector('.rc-pos b').textContent = s.phase === 'run' || s.phase === 'done' ? ord(pos) : '–';
      this.el.querySelector('.rc-lap b').textContent = Math.min(2, 1 + Math.floor(me.d / this.track.length));
      this.el.querySelector('.rc-time').textContent = fmtT(s.phase === 'count' ? 0 : me.finished ? me.time - s.goAt : t);
      this.el.querySelector('.rc-speed b').textContent = Math.round(me.v * 4.2);
      this.el.classList.toggle('boost', me.nitro > 0);
      if (!this.lapShown && me.d >= this.track.length) { this.lapShown = true; this.msg('FINAL LAP', ''); this.o.sfx('good'); }
      if (!this.r3) this.el.querySelectorAll('.rf-car').forEach((c, i) => { c.style.left = `calc(${Math.min(100, s.cars[i].d / s.total * 100)}% - 34px)`; });
      if (me.finished && !this.flagged) { this.flagged = true; this.msg(pos === 1 ? 'YOU WIN!' : `Finished ${ord(pos)}`, pos === 1 ? 'good' : ''); }
      if (s.phase === 'done') this.results();
    }
    results() {
      this.finishedShown = true;
      const s = this.sim, fin = s.finalOrder(), pos = fin.indexOf(s.cars[0]) + 1;
      const res = this.o.onDone({ place: pos, time: s.cars[0].time - s.goAt, league: this.o.league }) || {};
      if (this.r3 && pos === 1) this.r3.fireworks();
      const L = LEAGUES[Math.min(this.o.league, LEAGUES.length - 1)];
      this.el.querySelector('.rc-nitro').hidden = true;
      this.panel(`<h2 class="${pos === 1 ? 'win' : ''}">${pos === 1 ? 'Race won!' : `You finished ${ord(pos)}`}</h2>
        <div class="rg">${fin.map((c, k) => `<div class="rg-row ${c.ai ? '' : 'me'}"><span class="rg-p">${ord(k + 1)}</span><span class="rg-sw" style="background:${c.color}"></span><b>${c.ai ? c.name : 'You'}</b><span class="rg-r">${fmtT(Math.max(0, c.time - s.goAt))}</span></div>`).join('')}</div>
        <div class="rc-prize">+$${(res.cash || 0).toLocaleString('en-US')} <small>+${res.xp || 0} XP</small></div>
        ${res.promoted ? `<p class="rc-up">Promoted to ${res.promoted}!</p>` : pos > 1 ? `<p class="rg-tip">Win the ${L.name} to move up. Upgrade your car with your prize and race again tomorrow.</p>` : ''}
        <div class="rg-acts"><button class="rc-cta" data-r="garage">To the garage ▶</button><button class="rc-sec" data-r="done">Done</button></div>`);
      this.o.sfx(pos === 1 ? 'cash' : 'good');
      const pz = this.el.querySelector('.rc-prize'); if (pz && NB.FX) { pz.innerHTML = `<b>+$0</b> <small>+${res.xp || 0} XP</small>`; NB.FX.roll(pz.querySelector('b'), `+$${(res.cash || 0).toLocaleString('en-US')}`, { delay: 250 }); }
    }
    close(nav) {
      if (this.closed) return; this.closed = true;
      document.removeEventListener('keydown', this.onKey);
      if (this.r3) this.r3.dispose();
      this.el.remove(); document.body.classList.remove('nbl-open');
      this.o.onExit && this.o.onExit(nav, this.started);
    }
  }

  NB.Race = { BASE, MODS, LEAGUES, PER_LEVEL, MAX_LEVEL, stats, rating, charges, modCost, rivals, RaceSim, RaceScreen, LOCK };
})(window.NB = window.NB || {});
