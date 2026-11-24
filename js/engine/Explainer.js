/* Explainer — the animated worked example that opens every lesson, laid out like a page from a school maths book:
   a big picture that animates each step (blocks, columns, bars, shapes), a "Step 2 of 4" heading, the working
   written the way school writes it, and a "Remember" box at the end. NOVA reads each step aloud.

   A script is NB.Explain[lessonId] = q => ({ view: [w, h], steps: [{ title, math, say, run: async S => {} }], remember }).
   run() draws on S, the stage. Going to step k replays steps 0..k-1 instantly, then animates step k, so Back,
   Replay and Next always land on a correct picture. Reduced motion: every step is drawn instantly. */
(function (NB) {
  const NS = 'http://www.w3.org/2000/svg', STOP = { stop: true };
  const still = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const C = { tens: '#5EC3E8', units: '#F8C537', hund: '#3DBE6E', carry: '#FF9D45', good: '#3DBE6E', ink: '#1d2126', text: '#ffffff', mute: '#aab4bd', red: '#E8423F', pink: '#FF3D8B', panel: '#2b3137' };

  /* The stage: every call draws or moves one named thing. In instant mode nothing animates and waits are skipped. */
  class Stage {
    constructor(ex, tok, instant, replay) { this.ex = ex; this.svg = ex.svg; this.tok = tok; this.instant = instant; this.replay = !!replay; this.C = C; }
    ok() { if (this.tok !== this.ex.tok) throw STOP; }
    wait(ms) { this.ok(); if (this.instant) return Promise.resolve(); return new Promise((res, rej) => setTimeout(() => (this.tok === this.ex.tok ? res() : rej(STOP)), ms)); }
    get(id) { return this.ex.ids[id]; }
    el(tag, id, attrs, o = {}) {
      this.ok();
      const old = this.ex.ids[id]; if (old) old.remove();
      const e = document.createElementNS(NS, tag);
      for (const k in attrs) e.setAttribute(k, attrs[k]);
      e.classList.add('xe'); if (o.cls) e.classList.add(...o.cls.split(' '));
      const host = o.parent ? this.get(o.parent) : this.svg; (o.under ? host.insertBefore(e, host.firstChild) : host.appendChild(e)); this.ex.ids[id] = e;
      const start = `${o.from ? `translate(${o.from[0]}px,${o.from[1]}px)` : ''}${o.pop ? ' scale(.2)' : ''}`;
      if (o.draw) { const L = e.getTotalLength ? e.getTotalLength() : 300; e.style.strokeDasharray = L; e.style.strokeDashoffset = this.instant ? 0 : L; }
      if (this.instant) { if (o.op != null) e.style.opacity = o.op; return e; }
      e.style.opacity = 0; if (start) e.style.transform = start;
      e.getBoundingClientRect();
      const go = () => { e.style.opacity = o.op == null ? 1 : o.op; e.style.transform = ''; if (o.draw) e.style.strokeDashoffset = 0; };
      if (o.delay) setTimeout(go, o.delay); else requestAnimationFrame(go);
      return e;
    }
    /* text: big numbers use the display font, labels the body font */
    t(id, x, y, str, o = {}) {
      const e = this.el('text', id, { x, y, 'text-anchor': o.anchor || 'middle', 'dominant-baseline': 'central', fill: o.fill || C.text, 'font-size': o.size || 26,
        'font-weight': o.weight || 800, class: o.label ? 'xl' : 'xn' }, o);
      e.textContent = str; return e;
    }
    r(id, x, y, w, h, o = {}) { return this.el('rect', id, { x, y, width: w, height: h, rx: o.rx ?? 3, fill: o.fill || 'none', stroke: o.stroke || 'none', 'stroke-width': o.sw || 2, ...(o.dash ? { 'stroke-dasharray': o.dash } : {}) }, o); }
    c(id, cx, cy, r, o = {}) { return this.el('circle', id, { cx, cy, r, fill: o.fill || 'none', stroke: o.stroke || 'none', 'stroke-width': o.sw || 2 }, o); }
    l(id, x1, y1, x2, y2, o = {}) { return this.el('line', id, { x1, y1, x2, y2, stroke: o.stroke || C.text, 'stroke-width': o.sw || 3, 'stroke-linecap': 'round', ...(o.dash ? { 'stroke-dasharray': o.dash } : {}) }, o); }
    p(id, d, o = {}) { return this.el('path', id, { d, fill: o.fill || 'none', stroke: o.stroke || C.text, 'stroke-width': o.sw || 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, o); }
    /* move a thing by (dx, dy) from where it was drawn */
    to(id, dx, dy, o = {}) { this.ok(); const e = this.get(id); if (!e) return; if (this.instant) e.style.transition = 'none'; e.style.transform = `translate(${dx}px,${dy}px)${o.scale ? ` scale(${o.scale})` : ''}`; if (this.instant) { e.getBoundingClientRect(); e.style.transition = ''; } }
    fade(id, op = 0) { this.ok(); const e = this.get(id); if (e) e.style.opacity = op; }
    paint(id, fill) { this.ok(); const e = this.get(id); if (e) e.style.fill = fill; }
    del(id) { this.ok(); const e = this.get(id); if (e) { e.remove(); delete this.ex.ids[id]; } }
    /* a pulsing yellow box around the part we are talking about */
    hl(x, y, w, h) { if (x == null) return this.del('hl'); return this.r('hl', x, y, w, h, { stroke: C.units, sw: 3, rx: 8, fill: 'rgba(248,197,55,.10)', cls: 'xhl', under: true }); }
    /* base-ten blocks: tens rods and unit cubes, side by side. Returns the ids so steps can move them. */
    blocks(pre, x, y, tens, ones, o = {}) {
      const s = o.s || 7, gap = 3, ids = { rods: [], cubes: [] };
      for (let i = 0; i < tens; i++) { const id = `${pre}t${i}`; this.r(id, x + i * (s + gap), y, s, s * 10, { fill: o.tc || C.tens, stroke: C.ink, sw: 1, rx: 1.5, delay: (o.d || 0) + i * 60, pop: true, cls: 'rod' }); ids.rods.push(id); }
      const cx = x + tens * (s + gap) + (tens ? 4 : 0);
      for (let i = 0; i < ones; i++) { const id = `${pre}o${i}`; this.r(id, cx + (i % 2) * (s + 2), y + s * 10 - (Math.floor(i / 2) + 1) * (s + 2) + 2, s, s, { fill: o.oc || C.units, stroke: C.ink, sw: 1, rx: 1.5, delay: (o.d || 0) + tens * 60 + i * 50, pop: true }); ids.cubes.push(id); }
      return ids;
    }
    g(id, o = {}) { return this.el('g', id, {}, o); }
    clear() { this.ok(); this.svg.innerHTML = ''; this.ex.ids = {}; }
    /* ---------- hands-on: the child does the step on the picture ----------
       ask(setup): setup(done, S) wires taps and drags and calls done() when the child has finished.
       Resolves 'done', or 'shown' if NOVA did it (Show me). Replays resolve at once; code after
       ask() must then put everything in its finished place. */
    ask(setup) {
      this.ok(); if (this.replay) return Promise.resolve('replay');
      const ex = this.ex;
      return new Promise(res => {
        let over = false;
        let cleanup = null;
        const finish = how => { if (over || this.tok !== ex.tok) return; over = true; ex.waiting = null; if (cleanup) cleanup(); if (ex.o.onWait) ex.o.onWait(false); res(how || 'done'); };
        ex.waiting = { show: () => finish('shown') }; if (ex.o.onWait) ex.o.onWait(true);
        cleanup = setup(finish, this) || null;
      });
    }
    /* predict-then-reveal: a question with answer buttons under the picture. A wrong pick says why, and the
       child tries again. c = { q, opts, ans, why }. Resolves when answered right (or Show me). */
    choose(c) {
      if (this.replay) return Promise.resolve('replay');
      const box = this.ex.host.querySelector('.ex-choice');
      return this.ask(done => {
        box.innerHTML = `<p>${c.q}</p><div>${c.opts.map(o => `<button class="nbl-btn" data-c="${o}">${o}</button>`).join('')}</div>`; box.hidden = false;
        box.onclick = e => {
          const b = e.target.closest('[data-c]'); if (!b || b.disabled) return;
          if (b.dataset.c === String(c.ans)) { b.classList.add('ok'); this.sfx('good'); box.querySelectorAll('button').forEach(x => (x.disabled = true)); setTimeout(() => done(), 650); }
          else { b.classList.add('no'); b.disabled = true; this.sfx('bad'); this.say(c.why); }
        };
        return () => { box.hidden = true; box.onclick = null; box.innerHTML = ''; };
      });
    }
    say(text) { if (!this.replay && this.ex.o.hint) this.ex.o.hint(text); }
    /* tap: fn(e) runs on each tap while this step is live */
    tap(id, fn) {
      const e = this.get(id); if (!e) return; e.classList.add('xtap');
      const h = ev => { ev.preventDefault(); if (this.tok !== this.ex.tok) return; fn(e); };
      e.addEventListener('pointerup', h); return () => { e.classList.remove('xtap'); e.removeEventListener('pointerup', h); };
    }
    untap(id) { const e = this.get(id); if (e) e.classList.remove('xtap'); }
    pt(ev) { const p = this.svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; return p.matrixTransform(this.svg.getScreenCTM().inverse()); }
    /* drag: zones [[x, y, w, h], ...]; drop(zoneIndex) returns true to accept, else the thing springs back */
    drag(id, zones, drop) {
      const e = this.get(id); if (!e) return; e.classList.add('xdrag');
      let st = null;
      e.addEventListener('pointerdown', ev => {
        if (this.tok !== this.ex.tok) return; ev.preventDefault(); try { e.setPointerCapture(ev.pointerId); } catch (x) {}
        const p = this.pt(ev); st = { x: p.x, y: p.y, base: e.style.transform || '' }; e.style.transition = 'none'; e.classList.add('held');
      });
      e.addEventListener('pointermove', ev => { if (!st) return; const p = this.pt(ev); e.style.transform = `translate(${p.x - st.x}px,${p.y - st.y}px) ${st.base}`; });
      const up = ev => {
        if (!st) return; const p = this.pt(ev), base = st.base; st = null; e.style.transition = ''; e.classList.remove('held');
        const zi = zones.findIndex(([x, y, w, h]) => p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h);
        if (!(zi >= 0 && drop(zi))) { e.style.transform = base; this.sfx('bad'); }
      };
      e.addEventListener('pointerup', up); e.addEventListener('pointercancel', up);
    }
    /* sound effect hook (ticks, pops) */
    sfx(k) { if (!this.instant && this.ex.o.sfx) this.ex.o.sfx(k); }
  }

  class Explainer {
    constructor(host, script, o = {}) {
      this.host = host; this.S = script; this.o = o; this.tok = 0; this.ids = {}; this.k = -1;
      const [w, h] = script.view || [360, 240];
      host.innerHTML = `<div class="ex"><div class="ex-stage"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Worked example picture"></svg></div>
        <div class="ex-book" aria-live="polite"><div class="ex-head"><span class="ex-n"></span><b class="ex-title"></b></div><div class="ex-math"></div></div>
        <div class="ex-choice" hidden></div>
        <div class="ex-dots">${script.steps.map((_, i) => `<i data-i="${i}"></i>`).join('')}</div></div>`;
      this.svg = host.querySelector('svg'); this.book = host.querySelector('.ex-book');
    }
    get count() { return this.S.steps.length; }
    get last() { return this.k >= this.count - 1; }
    /* draw steps 0..k-1 instantly, animate step k, read it aloud */
    async go(k) {
      k = Math.max(0, Math.min(this.count - 1, k));
      const tok = ++this.tok; this.k = k;
      this.svg.innerHTML = ''; this.ids = {}; this.svg.classList.add('inst');
      try {
        this.waiting = null; if (this.o.onWait) this.o.onWait(false);
        const cb = this.host.querySelector('.ex-choice'); if (cb) { cb.hidden = true; cb.innerHTML = ''; cb.onclick = null; }
        for (let i = 0; i < k; i++) await this.S.steps[i].run(new Stage(this, tok, true, true));
        this.svg.getBoundingClientRect(); this.svg.classList.remove('inst');
        const st = this.S.steps[k];
        this.book.querySelector('.ex-n').textContent = `Step ${k + 1} of ${this.count}`;
        this.book.querySelector('.ex-title').textContent = st.title;
        const mathEl = this.book.querySelector('.ex-math');   // with a question, the working stays hidden until it is answered
        mathEl.innerHTML = st.choices ? '<span class="ex-wait">Answer the question below…</span>' : (st.math || '');
        this.book.classList.remove('in'); void this.book.offsetWidth; this.book.classList.add('in');
        this.host.querySelectorAll('.ex-dots i').forEach((d, i) => { d.className = i < k ? 'done' : i === k ? 'now' : ''; });
        if (this.o.onStep) this.o.onStep(k);
        const talk = this.o.speak ? this.o.speak(st, k) : Promise.resolve();
        await st.run(new Stage(this, tok, still(), false));
        if (st.choices && tok === this.tok) { mathEl.innerHTML = st.math || ''; mathEl.classList.remove('in'); void mathEl.offsetWidth; mathEl.classList.add('in'); }
        await talk;
        if (tok === this.tok && this.o.onStepDone) this.o.onStepDone(k);
      } catch (e) { if (e !== STOP) throw e; }
    }
    stop() { this.tok++; }
  }
  Explainer.C = C;
  NB.Explainer = Explainer;
  NB.Explain = NB.Explain || {};
})(window.NB = window.NB || {});
