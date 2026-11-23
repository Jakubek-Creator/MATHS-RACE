/* Race — car stats, mods, leagues, the race simulation and the race screen.
   Stats (0–100): spd top speed, acc acceleration, han handling (corner speed), nit nitro (charges + power).
   The driving itself (physics, tracks, AI) is NB.Drive (Drive.js), drawn by NB.DriveView (DriveView.js). */
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

  function rivals(league, seed, rate) {
    let s = seed || 1; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const R = rate || LEAGUES[Math.min(league, LEAGUES.length - 1)].rating, picks = RIVALS.slice().sort(() => rnd() - .5).slice(0, 3);
    return picks.map(([name, type, color], i) => {
      const bump = i === 0 ? 5 : i === 1 ? 0 : -4;
      const st = {}; ['spd', 'acc', 'han', 'nit'].forEach(k => { st[k] = clamp(Math.round(R + bump + (rnd() - .5) * 16), 5, 100); });
      const lv = Math.min(5, league + (i === 0 ? 1 : 0)), mods = { eng: lv, turbo: Math.max(0, lv - 1), tyre: lv, nos: Math.max(0, lv - 2) };
      return { name, type, color, stats: st, mods, ai: true };
    });
  }

  /* ---------------- mission races: maths performance → race boosts ----------------
     perf: {n, clean, fast, hinted, wrong, best} counted over the mission's questions.
     Clean answers add speed, fast clean answers add acceleration and a head start, a streak of 3+
     earns extra nitro, wrong answers cost a little momentum. Hinted answers help, but less. */
  function boost(p) {
    const b = {
      spd: Math.min(12, p.clean * 2 + Math.max(0, p.n - p.clean - p.wrong)),   // hinted-but-right counts half as much
      acc: Math.min(10, p.fast * 2),
      extra: p.best >= 5 ? 2 : p.best >= 3 ? 1 : 0,
      head: p.clean * 1.5 + p.fast,
      form: Math.max(.9, 1 - .02 * p.wrong)
    };
    b.lines = [`+${b.spd} top speed and grip from ${p.clean} clean answer${p.clean === 1 ? '' : 's'}`,
      `+${b.acc} acceleration from ${p.fast} fast answer${p.fast === 1 ? '' : 's'}`,
      b.extra ? `+${b.extra} extra nitro for a ${p.best}-answer streak` : 'Get 3 in a row next time for extra nitro',
      p.wrong ? `−${Math.round((1 - b.form) * 100)}% momentum from ${p.wrong} wrong answer${p.wrong === 1 ? '' : 's'}` : 'No wrong answers: full momentum'];
    return b;
  }
  /* Opponents match the child: rated around their own car before the maths boost, so the boost is a real edge. Higher maths level and a strong
     mission make rivals tougher; a struggling child gets slower rivals so the race stays winnable. */
  const missionLeague = (levels, acc) => clamp(Math.floor(levels / 5) + (acc >= .9 ? 1 : acc < .6 ? -1 : 0), 0, LEAGUES.length - 1);
  const missionRivalRating = (myRating, levels, acc) => clamp(Math.round(myRating - 14 + Math.min(6, levels / 3) + (acc >= .9 ? 2 : acc < .7 ? -2 : 0)), 15, 95);

  /* ---------------- race screen ---------------- */
  const ord = n => ['1st', '2nd', '3rd', '4th'][n - 1] || `${n}th`;
  const fmtT = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
  const LOCK = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><rect x="2.5" y="7" width="11" height="8" rx="1.5" fill="currentColor"/><path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="2" fill="none"/></svg>';

  // power-ups: [name, message when used, icon]
  const ITEMS = {
    oil: ['Oil splash', 'Oil dropped!', '<svg viewBox="0 0 24 24"><path d="M12 3c3 4.5 6 8 6 11a6 6 0 0 1-12 0c0-3 3-6.5 6-11z" fill="#14171b" stroke="#fff" stroke-width="1.6"/><path d="M9 14a3 3 0 0 0 2 3" stroke="#22E5E0" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>'],
    nitro: ['Nitro', 'NITRO!', '<svg viewBox="0 0 24 24"><path d="M14 2 5 14h6l-2 8 9-12h-6z" fill="#fff"/></svg>'],
    rocket: ['Rocket', 'Rocket away!', '<svg viewBox="0 0 24 24"><path d="M12 2c3 2 4 6 4 10v5H8v-5c0-4 1-8 4-10z" fill="#fff"/><path d="M8 13l-3 4v3l3-2zM16 13l3 4v3l-3-2z" fill="#E8423F"/><path d="M10 19h4l-2 3z" fill="#FFC53D"/><circle cx="12" cy="9" r="1.6" fill="#1d2126"/></svg>']
  };

  const WXMSG = { rain: 'Rain! Roads are slippy', snow: 'Snow is falling! Less grip', fog: 'Fog rolling in!', clear: 'The sky is clearing!' };
  const WXNAME = { clear: 'clear skies', rain: 'rain', snow: 'snow', fog: 'fog' };
  function forecast(c) {
    const w = c.weather, sky = { day: 'Day race', dusk: 'Sunset race', night: 'Night race: headlights on' }[c.sky];
    return `${sky}, ${WXNAME[w.from]}${w.to !== w.from ? `, then ${WXNAME[w.to]} later` : ''}.`;
  }

  class RaceScreen {
    /* opts: {player:{name,type,color,stats}, league, seed, sfx(k), onStart(), onDone(result), onExit()} */
    constructor(opts) { this.o = opts; }
    open() {
      const o = this.o, L = LEAGUES[Math.min(o.league, LEAGUES.length - 1)];
      const B = o.mission, ps = B ? Object.assign({}, o.player.stats, { spd: clamp(o.player.stats.spd + B.spd, 0, 100), acc: clamp(o.player.stats.acc + B.acc, 0, 100), han: clamp(o.player.stats.han + B.spd, 0, 100) }) : o.player.stats;
      this.rivals = rivals(o.league, o.seed, o.mission ? missionRivalRating(rating(o.player.stats), o.levels || 0, o.acc || 0) : 0);
      const skill = Math.min(.95, .55 + o.league * .1);
      this.rivals.forEach(r => { r.skill = skill; r.charges = charges(r.stats); });
      // good maths puts you near the front of the grid; the daily race starts you third
      this.slot = B ? (B.head >= 8 ? 0 : B.head >= 4 ? 1 : 3) : 2;
      this.racers = [{ name: 'You', type: o.player.type, color: o.player.color, stats: ps, mods: o.player.mods, ai: false, charges: charges(ps) + (B ? B.extra : 0), form: B ? B.form : 1 }, ...this.rivals];
      this.track = NB.Drive.track(o.theme, o.seed, o.league);
      const slots = [this.slot, ...[0, 1, 2, 3].filter(k => k !== this.slot)];
      this.cond = NB.Drive.conditions(this.track.key, o.seed);
      this.sim = new NB.Drive.Sim(this.track, this.racers, { laps: o.laps || this.track.laps, seed: o.seed, slots, weather: this.cond.weather });
      const el = this.el = document.createElement('div');
      el.className = 'rc'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', o.mission ? 'Mission race' : 'Daily race');
      const arrow = d => `<svg viewBox="0 0 24 24"><path d="${d}" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      el.innerHTML = `<div class="rc-stage"></div>
        <div class="rc-top"><div class="rc-pos"><b>–</b><span>/ 4</span></div><div class="rc-lap">Lap <b>1</b> / ${this.sim.laps}</div><div class="rc-speed"><b>0</b><span>km/h</span></div>
          <div class="rc-time">0:00.0</div><div class="rc-lg" style="--lc:${L.color}">${L.name}</div></div>
        <div class="rc-lights" aria-hidden="true"><i></i><i></i><i></i></div>
        <div class="rc-msg" aria-live="assertive"></div>
        <div class="rc-bottom"><div class="rc-pads" aria-label="Steering"><button class="rc-pad" data-pad="-1" aria-label="Steer left">${arrow('M15 4 7 12l8 8')}</button><button class="rc-pad" data-pad="1" aria-label="Steer right">${arrow('m9 4 8 8-8 8')}</button></div>
          <div class="rc-right"><button class="rc-btn rc-launch" data-r="launch">Launch!</button>
          <button class="rc-btn rc-item" data-r="item" hidden disabled aria-label="Use power-up"><span class="ic"></span><span class="nm">Find a ? box</span></button>
          <button class="rc-btn rc-drift" data-hb hidden aria-label="Drift (handbrake)">Drift</button>
          <button class="rc-btn rc-nitro" data-r="nitro" hidden>Nitro <span class="pips"></span></button></div></div>
        <div class="rc-panel"></div>`;
      document.body.appendChild(el); document.body.classList.add('nbl-open');
      el.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b && !b.disabled) this.act(b.dataset.r); });
      this.onKey = e => {
        const k = e.key.toLowerCase();
        if (!this.launched && this.started && (k === ' ' || k === 'enter' || k === 'arrowup' || k === 'w')) { e.preventDefault(); this.act('launch'); }
        if (e.key === 'Escape' && !this.started) this.close();
      };
      document.addEventListener('keydown', this.onKey);
      this.view = new NB.DriveView(el.querySelector('.rc-stage'), this.sim, this.racers, { mapTop: 112, sky: this.cond.sky });
      this.view.onFrame = dt => this.frame(dt); this.view.onNitro = () => this.act('nitro'); this.view.onItem = () => this.act('item');
      this.ei = 0;
      this.grid();
    }
    grid() {
      const o = this.o, L = LEAGUES[Math.min(o.league, LEAGUES.length - 1)], me = rating(o.player.stats);
      const row = r => `<div class="rg-row ${r.ai ? '' : 'me'}"><span class="rg-sw" style="background:${r.color}"></span><b>${r.ai ? r.name : 'You'}</b><span>${r.ai ? r.type : o.player.name}</span><span class="rg-r">${rating(r.stats)}</span></div>`;
      const best = Math.max(...this.rivals.map(r => rating(r.stats)));
      const tip = me >= best ? 'Your car is quick enough to win. Nail the launch and use nitro on the straights!'
        : me >= best - 6 ? 'Close match. A perfect launch and good nitro timing can win it.'
        : 'Your rivals are faster. You can still race, but upgrading in the garage first gives you a real chance.';
      const B = o.mission;
      this.panel(`<h2 style="--lc:${L.color}">${B ? 'Mission race' : L.name}</h2><p class="rg-sub">${B ? `${L.name} rivals, matched to your maths level. Your answers tuned your car:` : "Today's race. The number is each car's rating: higher is faster."}</p>
        ${B ? `<ul class="rg-boost">${B.lines.map(t => `<li>${t}</li>`).join('')}</ul>` : ''}
        <div class="rg">${row(this.racers[0])}${this.rivals.map(row).join('')}</div>
        <p class="rg-tip">${tip}</p>
        <p class="rg-track">Today's track: <b>${this.track.name}</b>, ${this.sim.laps} laps. <span>${this.track.tip}</span> You start <b>${ord(this.slot + 1)}</b> on the grid.</p>
        <p class="rg-track"><b>Forecast:</b> ${forecast(this.cond)}</p>
        <p class="rg-how"><b>How to race:</b> tap <b>Launch</b> when the lights go green, then your car drives itself forward. Steer with <b>◀ ▶</b> or drag your finger. Hold <b>Drift</b> to slide round tight corners. Hit the <b>ramps</b> for big air. Drive through <b>?</b> boxes for a power-up (an oil splash to drop behind you, extra nitro, or a rocket that chases the car in front) and tap it to use it. Tap <b>Nitro</b> on straights. Keys: arrows to drive, space to drift, N for nitro, E for the power-up.</p>
        <div class="rg-acts"><button class="rc-cta" data-r="start">Start race ▶</button>${B ? '' : '<button class="rc-sec" data-r="garage">Upgrade first</button>'}<button class="rc-sec" data-r="exit">Not now</button></div>`);
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
      } else if (a === 'launch' && this.started && !this.launched) {
        const r = s.launch(); this.launched = true;
        this.el.querySelector('.rc-launch').hidden = true;
        const nb = this.el.querySelector('.rc-nitro'); nb.hidden = false; this.el.querySelector('.rc-drift').hidden = false; this.el.querySelector('.rc-item').hidden = false; this.pips();
        if (r === 'perfect') { this.msg('PERFECT START!', 'good'); this.o.sfx('nitro'); }
        else if (r === 'jump') { this.msg('Jump start! Held back', 'bad'); this.o.sfx('bad'); }
        else this.msg('Go go go!', '');
      } else if (a === 'nitro') {
        if (s.nitro(0)) { this.msg('NITRO!', 'nitro'); this.o.sfx('nitro'); this.pips(); }
      } else if (a === 'item') {
        const it = s.cars[0].item; if (s.useItem(0)) { this.msg(ITEMS[it][1], 'nitro'); this.o.sfx('nitro'); }
      } else if (a === 'exit') this.close();
      else if (a === 'garage') this.close('garage');
      else if (a === 'done') this.close();
    }
    pips() { const p = this.sim.cars[0], n = Math.max(p.charges, charges(p.stats)); this.el.querySelector('.rc-nitro .pips').innerHTML = Array.from({ length: n }, (_, k) => `<i class="${k < p.charges ? 'on' : ''}"></i>`).join(''); this.el.querySelector('.rc-nitro').disabled = p.charges <= 0; }
    frame(dt) {
      const s = this.sim; if (this.finishedShown) return;
      s.step(dt);                                   // fixed physics steps inside, so any frame rate plays the same
      if (!this.started) return;
      const order = s.order(), me = s.cars[0], pos = order.indexOf(me) + 1;
      const t = Math.max(0, s.t - (s.goAt || 0));
      for (; this.ei < s.events.length; this.ei++) {
        const e = s.events[this.ei];
        if (e.type === 'boom' && e.by === 0 && e.i > 0) { this.msg('DIRECT HIT!', 'good'); this.o.sfx('good'); continue; }
        if (e.i !== 0 && e.j !== 0 && e.type !== 'weather') continue;
        if (e.type === 'haz') { this.msg(e.msg, 'bad'); this.o.sfx('bad'); }
        else if (e.type === 'pickup') { this.msg(`Got ${ITEMS[e.item][0]}!`, 'nitro'); this.o.sfx('good'); }
        else if (e.type === 'boom') { this.msg('Rocket hit!', 'bad'); this.o.sfx('bad'); }
        else if (e.type === 'air') { this.msg(e.t > .6 ? 'BIG AIR!' : 'AIR!', 'good'); this.o.sfx('nitro'); }
        else if (e.type === 'lap') { this.msg(e.lap === s.laps - 1 ? 'FINAL LAP' : `LAP ${e.lap + 1}`, ''); this.o.sfx('good'); }
        else if (e.type === 'respawn') this.msg('Back on track', '');
        else if (e.type === 'weather') { this.msg(WXMSG[e.to] || 'The weather is changing', e.to === 'clear' ? 'good' : 'nitro'); this.o.sfx('tick'); }
      }
      if (me.wrongT > .8 && !this.wrong) { this.wrong = true; this.msg('WRONG WAY! Turn round', 'bad'); } else if (!me.wrongT) this.wrong = false;
      this.el.querySelector('.rc-pos b').textContent = s.phase === 'run' || s.phase === 'done' ? ord(pos) : '–';
      this.el.querySelector('.rc-lap b').textContent = Math.min(s.laps, me.lap + 1);
      this.el.querySelector('.rc-time').textContent = fmtT(s.phase === 'count' ? 0 : me.finished ? me.time - s.goAt : t);
      this.el.querySelector('.rc-speed b').textContent = Math.round(Math.hypot(me.vx, me.vy) * 4.2);
      this.el.classList.toggle('boost', me.nitroT > 0);
      if (me.item !== this.shown && this.launched) {
        this.shown = me.item; const b = this.el.querySelector('.rc-item');
        b.disabled = !me.item; b.dataset.item = me.item || ''; b.querySelector('.ic').innerHTML = me.item ? ITEMS[me.item][2] : '';
        b.querySelector('.nm').textContent = me.item ? ITEMS[me.item][0] : 'Find a ? box';
      }
      if (this.launched) { const nb = this.el.querySelector('.rc-nitro'); nb.disabled = me.charges <= 0 || me.nitroT > 0 || me.nitroCd > 0; }
      if (me.finished && !this.flagged) { this.flagged = true; this.msg(pos === 1 ? 'YOU WIN!' : `Finished ${ord(pos)}`, pos === 1 ? 'good' : ''); }
      if (s.phase === 'done') this.results();
    }
    results() {
      this.finishedShown = true;
      const s = this.sim, fin = s.finalOrder(), pos = fin.indexOf(s.cars[0]) + 1;
      const res = this.o.onDone({ place: pos, time: s.cars[0].time - s.goAt, league: this.o.league }) || {};
      if (pos === 1) this.view.fireworks();
      const L = LEAGUES[Math.min(this.o.league, LEAGUES.length - 1)];
      this.el.querySelector('.rc-nitro').hidden = true; this.el.querySelector('.rc-drift').hidden = true; this.el.querySelector('.rc-item').hidden = true;
      this.panel(`<div class="job-nova rc-nova"><div class="jn-n"></div><p class="jn-say">${pos === 1 ? 'Victory! Your maths made that car fly!' : pos <= 2 ? 'So close! A few more clean answers and you win.' : 'Good race! Every right answer makes your car faster.'}</p></div>
        <h2 class="${pos === 1 ? 'win' : ''}">${pos === 1 ? 'Race won!' : `You finished ${ord(pos)}`}</h2>
        <div class="rg">${fin.map((c, k) => `<div class="rg-row ${c.ai ? '' : 'me'}"><span class="rg-p">${ord(k + 1)}</span><span class="rg-sw" style="background:${c.color}"></span><b>${c.ai ? c.name : 'You'}</b><span class="rg-r">${fmtT(Math.max(0, c.time - s.goAt))}</span></div>`).join('')}</div>
        <div class="rc-prize">+$${(res.cash || 0).toLocaleString('en-US')} <small>+${res.xp || 0} XP</small></div>
        ${res.summary ? `<p class="rg-sum">${res.summary}</p>` : ''}${res.note ? `<p class="rc-up">${res.note}</p>` : ''}
        ${res.promoted ? `<p class="rc-up">Promoted to ${res.promoted}!</p>` : pos > 1 && !this.o.mission ? `<p class="rg-tip">Win the ${L.name} to move up. Upgrade your car with your prize and race again tomorrow.</p>` : ''}
        <div class="rg-acts"><button class="rc-cta" data-r="garage">To the garage ▶</button><button class="rc-sec" data-r="done">Done</button></div>`);
      this.o.sfx(pos === 1 ? 'cash' : 'good');
      const nv = this.el.querySelector('.rc-nova .jn-n'); if (nv && NB.TeacherController) new NB.TeacherController(nv).set(pos === 1 ? 'victory' : 'encouraging');
      if (pos > 2 && NB.Reward) NB.Reward.bad(this.el.querySelector('.rc-panel'));
      const pz = this.el.querySelector('.rc-prize'); if (pz && NB.FX) { pz.innerHTML = `<b>+$0</b> <small>+${res.xp || 0} XP</small>`; NB.FX.roll(pz.querySelector('b'), `+$${(res.cash || 0).toLocaleString('en-US')}`, { delay: 250 }); }
    }
    close(nav) {
      if (this.closed) return; this.closed = true;
      document.removeEventListener('keydown', this.onKey);
      this.view.dispose();
      this.el.remove(); document.body.classList.remove('nbl-open');
      this.o.onExit && this.o.onExit(nav, this.started);
    }
  }

  NB.Race = { BASE, MODS, LEAGUES, PER_LEVEL, MAX_LEVEL, stats, rating, charges, modCost, rivals, boost, missionLeague, missionRivalRating, RaceScreen, LOCK };
})(window.NB = window.NB || {});
