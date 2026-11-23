/* SheetLesson — step-by-step worksheets where the child does every step.
   Nothing is explained or filled in ahead of time. Each line of working appears only
   after the previous one is done, and every number is typed by the child on the board.
   NOVA gives the instruction, praise, hints and tip cards, never the answer up front.

   Flow (gradual handover): NOVA shows 47 × 6 → together 32 × 4 (tips shown) → less help ×2 (step names only)
   → on your own ×3 (NOVA quiet) → summary.
   Built on LessonController (shell, NOVA, voice, keypad, rewards, saving). */
(function (NB) {
  const PM = () => NB.ProgressManager;
  const QG = () => NB.QuestionGenerator;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const digits = (n, len) => String(n).padStart(len, ' ').split('').map(d => (d === ' ' ? null : Number(d)));
  const PLACE = ['units', 'tens', 'hundreds', 'thousands'];

  /* ---------- the worksheet for a × b (2-digit × 1-digit) ---------- */
  function buildSheet(a, b, mode) {
    const t = a - (a % 10), o = a % 10, td = t / 10, tp = t * b, op = o * b, tot = a * b;
    const full = mode === 'watch' || mode === 'together';
    const rows = [], moves = [];
    const mv = m => { moves.push(m); return m; };

    if (full) mv({ type: 'tap', key: 'tap', step: 1, prompt: `Tap ${a} to split it into tens and units.`, short: `Tap ${a} to split it` });

    rows.push({ id: 'split', step: 1, label: 'Split', tpl: `${a} = [] + []` });
    mv({ key: 'split:0', row: 'split', step: 1, answer: t, kind: 'placeValue', prompt: `How much are the tens in ${a} worth?`,
      hints: [`The ${td} is in the tens place, so it means ${td} tens. How much is that?`],
      alt: { say: `Think of money: ${td} ten-dollar notes. How much is that?`, board: { type: 'money', props: { tens: td, ones: 0 } } },
      easier: { say: `In 23, the 2 means 2 tens, which is 20. Do the same for the ${td} in ${a}.`, board: { type: 'demo', props: { slow: true, lines: ['23 = 20 + 3', `${a} = ? + ${o}`] } } } });
    mv({ key: 'split:1', row: 'split', step: 1, answer: o, kind: 'units', prompt: `And how many units?`,
      hints: [`The units are the last digit of ${a}.`],
      alt: { say: `${a} take away ${t} leaves the units.`, board: { type: 'demo', props: { lines: [`${a} − ${t} = ?`] } } } });

    if (full) {
      rows.push({ id: 'tdig', step: 2, label: 'Tens', tpl: `${td} × ${b} = []` });
      mv({ key: 'tdig:0', row: 'tdig', step: 2, answer: td * b, kind: 'unitsTimes', prompt: `Multiply the tens digit: ${td} × ${b}`,
        hints: [`Count up in ${b}s, ${td} times.`],
        alt: { say: `Count in ${b}s and keep going.`, board: { type: 'demo', props: { lines: [Array.from({ length: Math.max(1, td - 1) }, (_, i) => b * (i + 1)).join(', ') + ', ?'] } } },
        easier: { say: `Start from a smaller one: ${td - 1} × ${b} is ${(td - 1) * b}. Add one more ${b}.`, board: { type: 'demo', props: { slow: true, lines: [`${td - 1} × ${b} = ${(td - 1) * b}`, `+ ${b} = ?`] } } } });
      rows.push({ id: 'tval', step: 2, label: 'Tens', tpl: `${td * b} tens = []`, result: `So ${t} × ${b} = ${tp}` });
      mv({ key: 'tval:0', row: 'tval', step: 2, answer: tp, kind: 'tensValue', prompt: `Those are tens. What are ${td * b} tens worth?`,
        hints: [`1 ten is 10. So ${td * b} tens is ${td * b} lots of 10.`],
        alt: { say: 'Count how tens grow.', board: { type: 'demo', props: { lines: ['1 ten = 10', '10 tens = 100', `${td * b} tens = ?`] } } },
        easier: { say: `2 tens is 20. 3 tens is 30. The tens number gets a zero on the end.`, board: { type: 'demo', props: { slow: true, lines: ['2 tens = 20', '3 tens = 30', `${td * b} tens = ?`] } } } });
    } else {
      rows.push({ id: 'tens', step: 2, label: 'Tens', tpl: `${t} × ${b} = []` });
      mv({ key: 'tens:0', row: 'tens', step: 2, answer: tp, kind: 'tensTimes', prompt: `Multiply the tens: ${t} × ${b}`,
        hints: [`Do ${td} × ${b} first, then put a zero on the end.`],
        alt: { say: `${td} × ${b} first. Then make it tens.`, board: { type: 'demo', props: { lines: [`${td} × ${b} = ?`, 'then × 10'] } } } });
    }

    rows.push({ id: 'units', step: 3, label: 'Units', tpl: `${o} × ${b} = []` });
    mv({ key: 'units:0', row: 'units', step: 3, answer: op, kind: 'unitsTimes', prompt: `Now the units: ${o} × ${b}`,
      hints: [`Count up in ${b}s, ${o} times.`],
      alt: { say: `Count in ${b}s.`, board: { type: 'demo', props: { lines: [Array.from({ length: Math.max(1, o - 1) }, (_, i) => b * (i + 1)).join(', ') + ', ?'] } } },
      easier: o > 5
        ? { say: `5 × ${b} is ${5 * b}. Then add ${o - 5} more ${b}s.`, board: { type: 'demo', props: { slow: true, lines: [`5 × ${b} = ${5 * b}`, `${o - 5} × ${b} = ?`, 'add them'] } } }
        : { say: `${o - 1 || 1} × ${b} is ${(o - 1 || 1) * b}. ${o > 1 ? `Add one more ${b}.` : ''}`, board: { type: 'demo', props: { slow: true, lines: [`${o - 1 || 1} × ${b} = ${(o - 1 || 1) * b}`, o > 1 ? `+ ${b} = ?` : '? '] } } } });

    // Add the parts: column by column (when no carrying is needed) on worked/guided sheets.
    const len = String(tot).length, A = digits(tp, len), B = digits(op, len), T = digits(tot, len);
    const noCarry = A.every((d, i) => ((d || 0) + (B[i] || 0)) < 10);
    if (full && noCarry) {
      rows.push({ id: 'col', step: 4, label: 'Add', type: 'column', a: tp, b: op, len });
      for (let k = 0; k < len; k++) {
        const i = len - 1 - k, da = A[i], db = B[i], place = PLACE[k];
        const sum = db != null ? `${da || 0} + ${db}` : `${da}`;
        mv({ key: `col:${i}`, row: 'col', step: 4, answer: T[i], kind: 'digit', digit: true,
          prompt: k === 0 ? `Add in columns. Start with the units: ${sum}` : db != null ? `Now the ${place} column: ${sum}` : `The ${place} column: just bring down the ${da}.`,
          hints: [db != null ? `Just add the two digits in the ${place} column: ${sum}.` : `Nothing to add here. Bring the ${da} straight down.`] });
      }
    } else {
      rows.push({ id: 'add', step: 4, label: 'Add', tpl: `${tp} + ${op} = []` });
      mv({ key: 'add:0', row: 'add', step: 4, answer: tot, kind: 'add', prompt: `Add the two parts: ${tp} + ${op}`,
        hints: [`Add ${op - (op % 10)} first, then the last ${op % 10}.`],
        alt: { say: 'Break it into two jumps.', board: { type: 'demo', props: { lines: [`${tp} + ${op - (op % 10)} = ?`, `then + ${op % 10}`] } } } });
    }
    mv({ key: 'final', row: 'final', step: 5, answer: tot, kind: 'final', prompt: `Write the answer: ${a} × ${b}`,
      hints: ['It\'s the number you got when you added the two parts.'] });

    // What NOVA says when she does the step herself (watch), and the short "what to do" cue (less help).
    moves.forEach(m => {
      const k = m.key, col = k.startsWith('col:') ? Number(k.slice(4)) : -1;
      if (m.type === 'tap') { m.show = `First, split ${a} into tens and units. Small pieces are easier to multiply.`; m.short = `Split ${a}`; return; }
      if (k === 'split:0') { m.show = `The ${td} in ${a} sits in the tens place, so it's worth ${t}.`; m.short = `Split ${a}. What are the tens worth?`; }
      if (k === 'split:1') { m.show = `The ${o} is the units. So ${a} is ${t} plus ${o}.`; m.short = 'Now the units.'; }
      if (k === 'tdig:0') { m.show = `Multiply the tens digit: ${td} times ${b} is ${td * b}.`; }
      if (k === 'tval:0') { m.show = `Those are tens, so ${td * b} tens are worth ${tp}. Just add a zero.`; }
      if (k === 'tens:0') { m.short = 'Multiply the tens.'; }
      if (k === 'units:0') { m.show = `Now the units: ${o} times ${b} is ${op}.`; m.short = 'Multiply the units.'; }
      if (col >= 0) { const p = len - 1 - col; m.show = A[col] != null && B[col] != null ? `Add the ${PLACE[p]} column: ${A[col] || 0} plus ${B[col]} is ${T[col]}.` : `Nothing to add in the ${PLACE[p]} column, so the ${T[col]} comes straight down.`; }
      if (k === 'add:0') { m.show = `Add the two parts: ${tp} plus ${op} is ${tot}.`; m.short = 'Add the two parts.'; }
      if (k === 'final') { m.show = `So ${a} times ${b} is ${tot}. That's the answer!`; m.short = 'Write the answer.'; }
    });
    return { a, b, mode, t, o, td, tp, op, tot, rows, moves, steps: ['Split', 'Tens', 'Units', 'Add', 'Answer'] };
  }

  /* The handover: NOVA shows one, you do one together, then less help, then on your own. */
  const STAGES = [
    { mode: 'watch', name: 'Learn it step by step', short: 'Learn' },
    { mode: 'together', name: 'Together', short: 'Together' },
    { mode: 'less', name: 'Less help', short: 'Less help' },
    { mode: 'alone', name: 'On your own', short: 'Solo' }
  ];

  class SheetLessonController extends NB.LessonController {
    open() {
      const L = PM().ensure(this.id);
      if (L.v !== 4) { const R = PM().restart(this.id); R.v = 4; R.phase = 'sheet'; R.si = 0; R.cur = null; PM().update(this.id, () => {}); }
      const H = this.c.handover;
      this.M = (this.c.method && NB.Methods[this.c.method]) || MULT1;
      const qOf = x => x.q || { a: x.a, b: x.b, key: `${x.a}x${x.b}` };
      this.seq = [{ stage: 0, q: qOf(H.watch) }, { stage: 1, q: qOf(H.together) }]
        .concat(Array.from({ length: H.less.count }, () => ({ stage: 2 })), Array.from({ length: H.alone.count }, () => ({ stage: 3 })));
      super.open();
      this.root.classList.add('handover');
      this.root.addEventListener('click', e => {
        const x = e.target.closest('[data-ex]'); if (x && this.ex) { this.exAct(x.dataset.ex); return; }
        const b = e.target.closest('[data-a="tap"],[data-a="show"]'); if (!b || b.disabled) return;
        if (b.dataset.a === 'tap') { const mv = this.sheet && this.sheet.moves[this.L.cur.mi]; if (this.mode() === 'watch' && mv && mv.type === 'tap') this.showMove(); else this.doTap(b); }
        else this.showMove();
      });
    }
    get total() { return this.seq.length; }
    get deals() { return this.c.handover.less.count + this.c.handover.alone.count; }
    stageOf(si) { return STAGES[this.seq[Math.min(si, this.seq.length - 1)].stage]; }
    mode() { return this.L.cur ? this.L.cur.mode : this.stageOf(this.L.si).mode; }

    /* ---------- routing ---------- */
    enterPhase() { this.L.phase === 'summary' ? this.enterSummary(false) : this.enterSheet(true); }
    restart() { this.audio.stop(); this.token++; const R = PM().restart(this.id); R.v = 4; R.phase = 'sheet'; R.si = 0; R.cur = null; this.L = R; this.save(); this.engine = new NB.AdaptiveLearningEngine(this.L.stats); this.enterSheet(true); }
    next() {
      const L = this.L;
      try { this.root.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
      if (L.phase !== 'sheet' || !this.sheetDone()) return;
      L.si++; L.cur = null; this.save();
      if (L.si >= this.total) { L.phase = 'summary'; this.save(); this.enterSummary(true); }
      else this.enterSheet(true);
    }
    sheetDone() { const c = this.L.cur; return c && this.sheet && c.mi >= this.sheet.moves.length; }

    /* ---------- a sheet ---------- */
    newCur() {
      const L = this.L, si = L.si, sq = this.seq[si], mode = STAGES[sq.stage].mode;
      if (sq.q) return { id: mode, q: sq.q, mode };
      L.prac = L.prac || { tier: this.c.handover.startTier, streak: 0, used: [this.seq[0].q.key, this.seq[1].q.key], results: [] };
      const q = this.M.gen(L.prac.tier, L.prac.used); L.prac.used.push(q.key);
      return { id: `d${si}`, q, mode, tier: q.tier };
    }
    enterSheet(intro) {
      const L = this.L;
      if (!L.cur) { L.cur = Object.assign(this.newCur(), { mi: 0, att: 0, vals: {}, fu: null, clean: true, hintsShown: 0 }); this.save(); }
      const c = L.cur;
      this.sheet = this.M.build(c.q, c.mode);
      this.token = (this.token || 0) + 1;
      if (this.ex) { this.ex.stop(); this.ex = null; }
      this.root.classList.remove('learning');
      if (c.mode === 'watch' && NB.Explain && NB.Explain[this.c.method || this.c.id]) return this.enterLearn();
      this.feedback(''); this.helpClear(); this.reveal = '';
      this.renderSheet(true);
      this.renderProgress();
      if (this.sheetDone()) return this.finishSheet(false);
      this.canContinue(false, this.nextLabel());
      const mv = this.sheet.moves[c.mi];
      const H = this.c.handover, first = L.si === 0 || this.seq[L.si - 1].stage !== this.seq[L.si].stage;
      const say = this.sheet.say, cap = say.charAt(0).toUpperCase() + say.slice(1);
      const lead = !intro || c.mi > 0 ? '' : first ? H[c.mode].intro.replace('{q}', cap)
        : c.mode === 'alone' ? '' : `Next one: ${say}.`;
      this.renderMeter();
      this.askMove(lead);
    }
    /* ---------- Learn: the animated worked example replaces "NOVA shows you" ---------- */
    enterLearn() {
      const c = this.L.cur, S = this.sheet, script = NB.Explain[this.c.method || this.c.id](c.q), story = this.c.handover.watch.intro.replace(/\s*(Watch me|Watch out|Tap Show me|tap Show me)[^.]*\./g, '').trim();
      this.root.classList.add('learning'); this.script = script;
      this.feedback(''); this.helpClear(); this.renderProgress(); this.renderMeter();
      this.$('.board-eq').innerHTML = NB.fracHTML(esc(S.head.ask)).replace('?', '<span class="qm">?</span>');
      this.$('.board-visual').innerHTML = '';
      this.$('#nbl-hint').disabled = true;
      this.canContinue(false, this.nextLabel());
      this.ex = new NB.Explainer(this.$('.board-visual'), script, {
        sfx: k => this.h.sfx(k),
        speak: (st, k) => this.say(`learn-${k}`, k === 0 && !this.exSaidIntro ? `${story} ${st.say}` : st.say, { state: 'explaining' }),
        onStep: () => { this.exSaidIntro = true; this.exControls(); },
        onStepDone: () => { this.teacher.set('pointing'); if (this.ex && this.ex.last) this.learnDone(); }
      });
      this.ex.go(this.sheetDone() ? script.steps.length - 1 : 0);
    }
    exControls(done) {
      const ex = this.ex, last = ex && ex.last;
      this.qclear(`${done ? `<div class="ex-remember"><b>Remember</b>${esc(this.script.remember)}</div>` : ''}
        <div class="ex-ctl"><button class="nbl-btn" data-ex="back" aria-label="Previous step" ${ex && ex.k > 0 ? '' : 'disabled'}>◀</button>
        <button class="nbl-btn" data-ex="replay" aria-label="Replay this step">↻ Replay</button>
        ${done ? '<button class="nbl-btn primary" data-ex="mine">My turn ▶</button>' : `<button class="nbl-btn primary" data-ex="next">${last ? 'Finish ▶' : 'Next step ▶'}</button>`}</div>`);
    }
    exAct(a) {
      const ex = this.ex; if (!ex) return;
      this.audio.stop(); this.h.sfx('tick');
      if (a === 'back') ex.go(ex.k - 1);
      else if (a === 'replay') ex.go(ex.k);
      else if (a === 'next') { if (ex.last) this.learnDone(); else ex.go(ex.k + 1); }
      else if (a === 'mine') this.next();
    }
    learnDone() {
      const c = this.L.cur, S = this.sheet;
      if (!this.sheetDone()) { S.moves.forEach(m => { if (m.answer != null) c.vals[m.key] = m.answer; }); c.mi = S.moves.length; this.save(); }
      this.exControls(true); this.canContinue(true, this.nextLabel());
      this.teacher.set('celebrating'); this.h.sfx('good');
      this.say('learn-remember', `Remember: ${this.script.remember} Now you try one, and I'll help with every step.`, { state: 'explaining' });
    }
    nextLabel() {
      const si = this.L.si; if (si + 1 >= this.total) return 'Finish mission ▶';
      const a = this.seq[si].stage, b = this.seq[si + 1].stage;
      return a === b ? 'Next deal ▶' : ['', 'My turn ▶', 'Less help ▶', 'On my own ▶'][b];
    }
    /* The "how much help" meter on the board: four steps from NOVA doing it to you doing it. */
    renderMeter() {
      let m = this.$('.help-meter');
      if (!m) { m = document.createElement('div'); m.className = 'help-meter'; this.$('.a-board').insertBefore(m, this.$('.board-eq')); }
      const st = this.L.phase === 'summary' ? 4 : this.seq[this.L.si].stage;
      m.innerHTML = STAGES.map((S, k) => `<span class="${k < st ? 'done' : k === st ? 'now' : ''}"><i></i>${S.short}</span>`).join('');
      m.setAttribute('aria-label', st < 4 ? `Help level: ${STAGES[st].name}` : 'Mission complete');
    }

    /* Draw the worksheet: only the lines reached so far. */
    renderSheet(fresh) {
      const c = this.L.cur, S = this.sheet, mv = S.moves[c.mi], done = c.mi >= S.moves.length;
      const firstMove = id => S.moves.findIndex(m => m.row === id);
      // header sum
      const eq = this.$('.board-eq');
      const f = t => NB.fracHTML(esc(t));
      if (mv && mv.type === 'tap') { eq.innerHTML = `<button class="tapnum" data-a="tap" aria-label="Tap ${c.q.a} to split it">${c.q.a}</button> × ${c.q.b} = <span class="qm">?</span>`; NB.FX.ignite(eq.querySelector('.tapnum'), 300); }
      else if (mv && mv.key === 'final') eq.innerHTML = f(S.head.fin).replace('[]', this.slot('final', c));
      else if (done) eq.innerHTML = `<span class="eq-done">${f(S.head.done)}</span>`;
      else eq.innerHTML = f(S.head.ask).replace('?', '<span class="qm">?</span>');
      eq.classList.toggle('long', S.head.ask.length > 14);
      // rows
      let h = '';
      S.rows.forEach(r => {
        const fm = firstMove(r.id);
        if (!done && fm > c.mi) return;
        const isNew = fm === c.mi && !fresh;
        const filled = S.moves.filter(m => m.row === r.id).every(m => c.vals[m.key] != null);
        const cur = mv && mv.row === r.id;
        h += `<div class="sh-row ${cur ? 'cur' : ''} ${filled ? 'done' : ''} ${isNew ? 'new' : ''}"><span class="sh-lbl"><i>${r.step}</i>${r.label}</span>`;
        if (r.type === 'column') h += this.columnHTML(r, c);
        else { let k = 0; h += `<span class="sh-ex">${NB.fracHTML(esc(r.tpl)).replace(/\[\]/g, () => this.slot(`${r.id}:${k++}`, c))}</span>`; }
        if (filled && r.result) h += `<span class="sh-res">✓ ${r.result}</span>`;
        h += '</div>';
      });
      if (c.fu) h += `<div class="sh-row check cur new"><span class="sh-lbl"><i>✓</i>Quick check</span><span class="sh-ex">${esc(c.fu.eq).replace('[]', this.slot('fu', c))}</span></div>`;
      const vis = S.visual ? ((c.mode === 'less' || c.mode === 'alone') && !done && !S.always ? null : S.visual(c)) : this.visualSpec();
      this.$('.board-visual').innerHTML = `<div class="sheet"><div class="sh-rows">${h}</div>${vis ? `<div class="sh-vis">${NB.StepRenderer.html(vis)}</div>` : ''}</div>`;
      this.working([]);
    }
    slot(key, c) {
      const v = c.vals[key];
      if (v != null) return `<span class="slot right">${v}</span>`;
      const mv = this.sheet.moves[c.mi];
      const live = (key === 'fu' && c.fu) || (!c.fu && mv && mv.key === key);
      const dig = key.startsWith('col:');
      return `<span class="slot ${live ? 'target' : 'idle'} ${dig ? 'digit' : ''}" data-key="${key}" ${dig ? 'data-max="1"' : ''}></span>`;
    }
    columnHTML(r, c) {
      const A = digits(r.a, r.len), B = digits(r.b, r.len);
      const cell = d => `<span class="cd">${d == null ? '' : d}</span>`;
      let h = `<span class="sh-col" style="--n:${r.len}"><span class="cs"></span>${A.map(cell).join('')}<span class="cs">+</span>${B.map(cell).join('')}<span class="cr"></span>`;
      h += `<span class="cs"></span>${A.map((_, i) => this.slot(`col:${i}`, c)).join('')}</span>`;
      return h;
    }
    /* Pictures appear only AFTER the child has worked something out, to confirm it. */
    visualSpec() {
      const c = this.L.cur, S = this.sheet, has = k => c.vals[k] != null;
      if (c.mode === 'less' || c.mode === 'alone') return c.mi >= S.moves.length ? { type: 'area', props: { tens: S.t, ones: S.o, mult: S.b } } : null;
      if (c.mi >= S.moves.length || has('col:0')) return { type: 'area', props: { tens: S.t, ones: S.o, mult: S.b } };
      if (has('units:0')) return { type: 'rows', props: { rows: S.b, per: S.o, kind: 'cube', label: String(S.o), done: true } };
      if (has('tval:0')) return { type: 'rows', props: { rows: S.b, per: S.td, kind: 'rod', label: String(S.t), done: true } };
      if (has('split:1')) return { type: 'blocks', props: { number: S.a } };
      if (c.mi > 0) return { type: 'blocks', props: { number: S.a } };
      return { type: 'packages', props: { count: S.b, price: S.a } };
    }

    /* ---------- asking ---------- */
    promptFor(mv, c) {
      if (c.fu) return c.fu.prompt;
      if (c.mode === 'less') return mv.short || mv.prompt;
      if (c.mode === 'alone') return mv.type === 'tap' ? mv.prompt : 'Your turn. Fill in the glowing box.';
      return mv.prompt;
    }
    askMove(lead = '') {
      const c = this.L.cur, S = this.sheet, mv = S.moves[c.mi], tok = this.token;
      this.$('#nbl-hint').disabled = !mv || mv.type === 'tap' || c.mode === 'watch';
      if (!mv) return;
      this.rest = 'pointing';
      const label = `Step ${mv.step} of ${S.steps.length}: ${S.steps[mv.step - 1]}`;
      if (c.mode === 'watch') return this.askWatch(lead, label);
      if (mv.type === 'tap') {
        this.qclear(`<div class="q-task"><div class="q-label">${label}</div><div class="q-instr">Tap <b class="pink">${c.q.a}</b> on the board to split it</div></div>`);
      } else if (c.fu) {
        const sl = this.$('[data-key="fu"]');
        this.kp.attach(sl, { label: 'Quick check on your own', prompt: esc(c.fu.prompt), onSubmit: v => this.answerFollowUp(v) });
      } else {
        const sl = this.$(`[data-key="${mv.key}"]`);
        this.kp.attach(sl, { label: c.mode === 'alone' ? 'On your own' : label, prompt: esc(this.promptFor(mv, c)), ghost: this.reveal, onSubmit: v => this.answerMove(v) });
        // Together: the tip is on screen from the start. Later stages only get it when asked or stuck.
        if (c.mode === 'together' && !c.att && mv.hints) this.feedback(`<b>Tip:</b> ${esc(mv.hints[0])}`, 'tip');
        const row = sl && sl.closest('.sh-row');
        if (row || sl) setTimeout(() => (row || sl).scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 80);
      }
      const text = this.promptFor(mv, c);
      if (c.mode === 'alone' && !c.fu) { if (lead) this.say(`${c.id}-lead`, lead, { state: 'explaining' }); else this.caption(''); return; } // NOVA stays quiet on solo deals
      this.say(`${c.id}-${mv.key}`, lead ? `${lead} ${text}` : text, { state: lead ? 'explaining' : 'pointing' }).then(() => { if (tok === this.token) this.teacher.set('pointing'); });
    }
    /* Watch: NOVA explains the step, the child taps "Show me" and NOVA writes it in. */
    askWatch(lead, label) {
      const c = this.L.cur, mv = this.sheet.moves[c.mi], tok = this.token;
      const last = c.mi === this.sheet.moves.length - 1;
      this.qclear(`<div class="q-task watch"><div class="q-label">${label}</div><div class="q-instr">${esc(mv.show)}</div>
        <button class="nbl-btn primary show-btn" data-a="show">${mv.type === 'tap' ? `Split ${c.q.a} ▶` : last ? 'Show the answer ▶' : 'Show me ▶'}</button></div>`);
      const sl = mv.type === 'tap' ? this.$('.tapnum') : this.$(`[data-key="${mv.key}"]`);
      if (sl) { sl.classList.add('watching'); setTimeout(() => (sl.closest('.sh-row') || sl).scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 80); }
      this.say(`${c.id}-${mv.key}-show`, lead ? `${lead} ${mv.show}` : mv.show, { state: 'explaining' }).then(() => { if (tok === this.token) this.teacher.set('pointing'); });
    }
    showMove() {
      const c = this.L.cur, mv = this.sheet && this.sheet.moves[c.mi]; if (!c || c.mode !== 'watch' || !mv || this.writing) return;
      const btn = this.$('.show-btn'); if (btn) btn.disabled = true;
      if (mv.type === 'tap') { const t = this.$('.tapnum'); if (t) { t.disabled = true; NB.FX.sparks(t, 10, 80); } this.h.sfx('good'); return this.advance(true); }
      const sl = this.$(`[data-key="${mv.key}"]`), ans = String(mv.answer), tok = this.token;
      this.writing = true; this.teacher.set('pointing');
      const write = i => {
        if (tok !== this.token) { this.writing = false; return; }
        if (sl) { sl.innerHTML = ans.slice(0, i).split('').map((d, k) => `<span class="kd ${k === i - 1 ? 'in' : ''}">${d}</span>`).join(''); }
        this.h.sfx('tick');
        if (i < ans.length) return setTimeout(() => write(i + 1), 220);
        setTimeout(() => {
          this.writing = false; if (tok !== this.token) return;
          if (sl) { sl.classList.add('right'); this.lastSlot = sl; NB.FX.ignite(sl, 0); }
          c.vals[mv.key] = mv.answer; this.advance(true);
        }, 380);
      };
      write(1);
    }
    doTap(btn) {
      const c = this.L.cur, mv = this.sheet.moves[c.mi];
      if (!mv || mv.type !== 'tap') return;
      btn.disabled = true; NB.FX.sparks(btn, 10, 80); NB.FX.buzz(25); this.h.sfx('good');
      this.teacher.flash('celebrating', 900, 'pointing');
      this.advance(true);
    }
    advance(clean) {
      const c = this.L.cur;
      c.mi++; c.att = 0; c.hintsShown = 0; this.reveal = ''; this.save();
      this.token++;
      this.helpClear();
      this.renderSheet(false);
      this.renderProgress();
      if (this.sheetDone()) return this.finishSheet(true);
      this.askMove();
    }
    answerMove(v) {
      const c = this.L.cur, mv = this.sheet.moves[c.mi], E = this.engine, tok = this.token;
      const rec = { attempts: c.att };
      const act = E.assess(rec, Number(v) === mv.answer); c.att = rec.attempts;
      if (act.type !== 'correct-first') c.clean = false;
      this.save();
      if (act.type === 'correct-first' || act.type === 'correct-assisted') {
        this.L.stats.checkpoints++; this.h.sfx('good');
        this.teacher.flash('celebrating', 1100, 'pointing');
        this.win(v).then(() => {
          if (tok !== this.token) return;
          c.vals[mv.key] = Number(v);
          if (act.type === 'correct-first') {
            if (c.mode === 'together') this.pay('move', `${c.id}:${mv.key}`);
            const n = this.streak = (this.streak || 0) + 1, big = n >= 5 && n % 5 === 0;
            NB.Reward.combo(n, this.$('.board-eq'));
            if (big) this.h.addXP(25);
            this.feedback(big ? `${NB.AdaptiveLearningEngine.phrase('bigStreak')} +25 XP` : n === 3 ? NB.AdaptiveLearningEngine.phrase('streak') : E.phrase('first'), 'good');
            this.advance(true);
          } else {
            this.streak = 0;
            const fu = QG().similar(mv.kind);
            if (fu && c.mode === 'together') {
              c.mi++; c.att = 0; c.hintsShown = 0; this.reveal = '';
              c.fu = fu; this.L.stats.followUps++; this.save();
              const msg = `${E.phrase('assisted')} ${E.phrase('followUp')}`;
              this.token++; this.helpClear(); this.renderSheet(true); this.feedback(msg, 'good');
              this.askMove(msg);
            } else { this.feedback(E.phrase('assisted'), 'good'); this.advance(false); }
          }
        });
        return;
      }
      this.h.sfx('bad'); this.miss(); this.streak = 0;
      if (act.type === 'hint') {
        this.feedback(mv.hints[0], 'hint');
        this.say(`${c.id}-${mv.key}-hint`, mv.hints[0], { state: 'encouraging' }).then(() => { if (tok === this.token) this.teacher.set('pointing'); });
      } else if ((act.type === 'reexplain' && mv.alt) || (act.type === 'easier' && (mv.easier || mv.alt))) {
        const part = act.type === 'easier' ? (mv.easier || mv.alt) : mv.alt, lead = E.phrase(act.type);
        this.feedback(lead, 'hint');
        this.help(part.board, act.type === 'easier' ? "Let's try an easier one" : 'Another way to see it');
        this.say(`${c.id}-${mv.key}-${act.type}`, `${lead} ${part.say}`, { rate: act.type === 'easier' ? 0.8 : 1, state: 'explaining' }).then(() => { if (tok === this.token) this.teacher.set('pointing'); });
      } else if (act.type === 'reexplain' || act.type === 'easier') {
        const hint = mv.hints[act.type === 'easier' ? mv.hints.length - 1 : Math.min(1, mv.hints.length - 1)];
        this.feedback(hint, 'hint');
        this.say(`${c.id}-${mv.key}-hint2`, hint, { state: 'encouraging' });
      } else {
        this.reveal = String(mv.answer); this.kp.setGhost(this.reveal);
        const t = `Let's do this one together. It's ${mv.answer}. Type ${mv.answer} to carry on.`;
        this.feedback(t, 'hint');
        this.say(`${c.id}-${mv.key}-demo`, t, { rate: 0.85, state: 'explaining' });
      }
    }
    answerFollowUp(v) {
      const c = this.L.cur, q = c.fu, E = this.engine, tok = this.token;
      if (String(v) === q.answer) {
        this.L.stats.followUpsCorrect++; this.h.sfx('good');
        this.win(v).then(() => {
          if (tok !== this.token) return;
          this.pay('independent', `${c.id}:fu:${this.sheet.moves[c.mi - 1] ? this.sheet.moves[c.mi - 1].key : c.mi}`);
          c.fu = null; this.save();
          this.feedback(E.phrase('followUpRight'), 'good');
          this.token++; this.renderSheet(true); this.renderProgress();
          if (this.sheetDone()) this.finishSheet(true); else this.askMove();
        });
      } else {
        this.h.sfx('bad'); this.miss();
        c.fu = null; this.save();
        this.feedback(`${E.phrase('followUpWrong')} ${q.explain}`, 'hint');
        this.say('fu-help', `${E.phrase('followUpWrong')} ${q.explain}`, { state: 'encouraging' });
        this.token++; this.renderSheet(true); this.renderProgress();
        if (this.sheetDone()) this.finishSheet(true); else setTimeout(() => this.askMove(), 300);
      }
    }
    finishSheet(fresh) {
      const L = this.L, c = L.cur;
      const solo = c.mode === 'less' || c.mode === 'alone';
      this.qclear(`<div class="q-done"><b>✓</b> ${NB.fracHTML(esc(this.sheet.head.done))}. ${c.mode === 'watch' ? 'That\'s the method.' : solo ? (c.clean ? 'No help needed!' : 'Deal done!') : 'You did every step!'}</div>`);
      this.canContinue(true, this.nextLabel());
      this.$('#nbl-hint').disabled = true;
      this.rest = 'celebrating'; this.teacher.set('celebrating');
      if (!fresh) return;
      NB.FX.sweep(this.$('.a-board')); NB.FX.ignite(this.$('.board-eq b'));
      if (solo) {
        const p = L.prac; p.results.push({ q: c.q.key, clean: c.clean, tier: c.tier, mode: c.mode });
        this.engine.nextTier(p, c.clean); this.save();
        this.pay('practiceCorrect', null);
      } else if (c.mode === 'together') this.pay('guidedDone', 'guided');
      const nx = this.seq[L.si + 1], changes = nx && nx.stage !== this.seq[L.si].stage;
            const msg = c.mode === 'watch' ? `That's how it's done. Now you do one, and I'll help with every step.`
        : c.mode === 'together' ? `You did every step yourself! Next, I'll give you less help.`
        : changes ? `${c.clean ? 'No hints needed!' : 'Done!'} You're ready. The next ones are all yours. I'll only step in if you get stuck.`
        : !nx ? (c.clean ? 'Perfect, no help at all!' : 'Done. You finished on your own!')
        : c.clean ? 'Perfect deal, no help needed!' : 'Deal done. Nice work sticking with it!';
      this.feedback(msg, 'good');
      this.say(`${c.id}-done`, msg, { state: 'celebrating' });
      this.renderProgress();
    }

    hint() {
      const c = this.L.cur; if (!c || this.L.phase !== 'sheet') return;
      const mv = this.sheet.moves[c.mi]; if (!mv || mv.type === 'tap') return;
      c.hintsShown = (c.hintsShown || 0) + 1; c.clean = false; this.L.stats.hints++; this.save();
      this.teacher.flash('thinking', 2600, 'pointing');
      if (c.fu) { this.feedback('Use the same method as before.', 'hint'); return; }
      if (c.hintsShown === 1 || !mv.alt) { this.feedback(mv.hints[0], 'hint'); this.say(`${c.id}-${mv.key}-hint`, mv.hints[0], { state: 'encouraging' }); }
      else { this.help(mv.alt.board, 'Another way to see it'); this.feedback(mv.alt.say, 'hint'); this.say(`${c.id}-${mv.key}-alt`, mv.alt.say, { state: 'explaining' }); }
    }
    replay() {
      if (this.L.phase !== 'sheet') return this.say('summary', this.summaryText || '');
      const c = this.L.cur, mv = this.sheet.moves[c.mi];
      if (mv) this.say(`${c.id}-${mv.key}`, c.mode === 'watch' ? mv.show : this.promptFor(mv, c), { state: 'pointing' });
    }

    /* ---------- progress panel ---------- */
    renderProgress() {
      const L = this.L, si = L.si || 0, sum = L.phase === 'summary', c = L.cur, S = this.sheet;
      const cur = sum ? 4 : this.seq[si].stage, res = (L.prac && L.prac.results) || [];
      const stepState = k => { if (!S || !c) return ''; const mv = S.moves[c.mi]; const at = mv ? mv.step : 6; return k < at ? 'done' : k === at ? 'cur' : ''; };
      const steps = () => S ? `<li class="sub">${S.steps.map((s, k) => `<span class="${stepState(k + 1)}">${k + 1}. ${s}</span>`).join('')}</li>` : '';
      const H = this.c.handover;
      let h = STAGES.map((st, k) => {
        const done = cur > k, now = cur === k;
        const nm = i => { const t = this.M.build(this.seq[i].q, 'watch').head.ask.replace(/ = \?$/, ''); return NB.fracHTML(esc(t)); };
        let extra = k === 0 ? `: ${nm(0)}` : k === 1 ? `: ${nm(1)}` : '';
        if (k >= 2) {
          const n = k === 2 ? H.less.count : H.alone.count, off = k === 2 ? 0 : H.less.count;
          extra = `<span class="pips">${Array.from({ length: n }, (_, j) => { const r = res[off + j]; return `<em class="${r ? (r.clean ? 'ok' : 'no') : now && si - 2 === off + j ? 'now' : ''}"></em>`; }).join('')}</span>`;
        }
        return `<li class="${done ? 'done' : ''} ${now ? 'cur' : ''}"><button disabled><i>${done ? '✓' : k + 1}</i>${st.name}${extra}</button></li>` + (now && k < 2 ? steps() : '');
      }).join('');
      h += `<li class="${sum ? 'done cur' : ''}"><button disabled><i>★</i>Mission complete</button></li>`;
      this.$('.prog-list').innerHTML = h;
      if (this.$('.help-meter')) this.renderMeter();
    }

    /* ---------- summary ---------- */
    enterSummary(first) {
      const L = this.L, st = L.stats, res = (L.prac && L.prac.results) || [];
      const clean = res.filter(r => r.clean).length;
      if (!L.completed) { L.completed = true; L.completions++; this.save(); this.h.markDone(this.c); }
      const bonus = this.pay('lessonComplete', 'complete');
      this.setEq('Mission complete');
      this.board({ type: 'summary', props: { title: `${this.c.district}, level ${this.c.level}`, rows: [
        ['Steps right first time', `${st.firstTry} / ${st.checkpoints}`],
        ['Deals with no help', `${clean} / ${this.deals}`],
        ['Solved on your own after help', `${st.followUpsCorrect} / ${st.followUps}`],
        ['Hints used', st.hints],
        ['Shown another way', st.explanations + st.easier],
        ['Earned in this lesson', `$${L.rewards.cash} and ${L.rewards.xp} XP`]
      ] } });
      this.working([]); this.helpClear();
      this.feedback(bonus ? `Mission bonus: +$${bonus.cash} and +${bonus.xp} XP!` : '', 'good');
      this.qclear(`<div class="q-actions"><button class="nbl-btn primary" data-a="job">Start the Level ${this.c.level} job</button>
        <button class="nbl-btn" data-a="restart">Replay lesson</button><button class="nbl-btn" data-a="board">Back to the district</button></div>`);
      this.canContinue(false, 'Done ✓');
      this.$('#nbl-hint').disabled = true;
      this.renderProgress();
      this.rest = 'excited'; this.teacher.set('excited');
      this.summaryText = NB.AdaptiveLearningEngine.phrase('mission') + ' ' + (clean >= this.deals - 1 ? `${clean} out of ${this.deals} deals with no help at all. You're ready for the job.`
        : `You worked through every step. Replay it to make it stick, or try the job.`);
      if (first) { this.h.burst(); this.say('summary', this.summaryText, { state: 'excited' }); } else this.caption(this.summaryText);
    }
  }
  NB.buildMultSheet = buildSheet;
  // Level 1 multiplying keeps its own detailed sheet (with the tap-to-split start).
  const MULT1 = {
    gen: (tier, used) => QG().practice(tier, used),
    build(q, mode) {
      const S = buildSheet(q.a, q.b, mode);
      S.head = { ask: `${q.a} × ${q.b} = ?`, fin: `${q.a} × ${q.b} = []`, done: `${q.a} × ${q.b} = ${S.tot}` };
      S.say = `${q.a} times ${q.b}`;
      return S;
    }
  };
  NB.SheetLessonController = SheetLessonController;
  NB.Methods = Object.assign(NB.Methods || {}, { 'mult-1': MULT1 });
})(window.NB = window.NB || {});
