/* LessonController — the lesson shell: backdrop, NOVA, board, captions, voice, number pad, rewards.
   SheetLessonController (SheetLesson.js) runs the actual lesson flow on top of it.
   Content comes from NB.Content[id]; the game passes in hooks for cash, XP, sound and navigation. */
(function (NB) {
  const PM = () => NB.ProgressManager;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const spoken = t => String(t).replace(/<[^>]+>/g, '').replace(/×/g, ' times ').replace(/÷/g, ' divided by ')
    .replace(/\s=\s\?/g, ' equals what').replace(/\?\s\+/g, 'what plus').replace(/=/g, ' equals ').replace(/\+/g, ' plus ').replace(/\s+/g, ' ').trim();
  const eqHTML = t => esc(t).replace(/\[\]/g, '<span class="slot"></span>').replace(/\?/g, '<span class="qm">?</span>');

  /* Backdrop: a top-down circuit corner seen from above, grass, kerbs, tyres and trees. Built once as SVG. */
  function sceneSVG() {
    let seed = 11; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const road = 'M-60 560 Q300 560 420 420 Q560 260 820 250 L1300 250';
    let s = `<svg viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="1200" height="700" fill="#62b14a"/>`;
    for (let i = 0; i < 14; i++) s += `<rect y="${i * 50}" width="1200" height="25" fill="#6bbb52"/>`;
    s += `<path d="${road}" fill="none" stroke="#f1f3f5" stroke-width="150"/><path d="${road}" fill="none" stroke="#e84a4a" stroke-width="150" stroke-dasharray="26 26"/>`;
    s += `<path d="${road}" fill="none" stroke="#4a4f57" stroke-width="124"/><path d="${road}" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="5" stroke-dasharray="30 30"/>`;
    for (let i = 0; i < 26; i++) {
      const x = rnd() * 1200, y = rnd() * 700; if (Math.abs(y - (x < 420 ? 560 : x < 820 ? 560 - (x - 420) * .78 : 250)) < 130) continue;
      const r = 22 + rnd() * 20; s += `<circle cx="${x + 8}" cy="${y + 10}" r="${r}" fill="rgba(0,0,0,.18)"/><circle cx="${x}" cy="${y}" r="${r}" fill="${rnd() < .5 ? '#3f9a3a' : '#4aa944'}"/><circle cx="${x - r * .3}" cy="${y - r * .3}" r="${r * .38}" fill="#7cd16a"/>`;
    }
    for (let k = 0; k < 5; k++) s += `<circle cx="${560 + k * 22}" cy="180" r="10" fill="#15181c"/><circle cx="${560 + k * 22}" cy="180" r="4" fill="${k % 2 ? '#e84a4a' : '#5d646c'}"/>`;
    return s + '</svg>';
  }

  class LessonController {
    constructor(content, hooks) {
      this.c = content; this.h = hooks; this.id = content.id;
      this.opts = []; this.tried = []; this.highlight = null; this.reveal = '';
    }

    /* ---------- lifecycle ---------- */
    open() {
      this.L = PM().ensure(this.id);
      PM().setActive(this.id);
      this.engine = new NB.AdaptiveLearningEngine(this.L.stats);
      this.rewards = new NB.RewardManager(this.h, this.id);
      this.build();
      this.teacher = new NB.TeacherController(this.$('.nova-wrap'));
      this.audio = new NB.AudioController({
        lessonId: this.id, onWord: k => this.capWord(k), onState: s => this.audioState(s), isMuted: () => this.h.isMuted()
      });
      this.ui = new NB.InteractionController(this.$('.a-question .qbox'));
      this.kp = new NB.Keypad(this.$('.a-question .qbox'), { sfx: k => this.h.sfx(k) });
      this.onKey = e => {
        if (e.key === 'Escape') this.close();
        if (e.key === 'Enter' && !this.kp.slot && e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON' && !this.$('#nbl-continue').disabled) this.next();
      };
      document.addEventListener('keydown', this.onKey);
      document.body.classList.add('nbl-open');
      this.refreshTop();
      this.enterPhase(true);
    }
    close(nav) {
      this.audio.stop(); this.ui.destroy(); this.kp.destroy(); this.token++;
      try { this.teacher.dispose(); } catch (e) {}
      document.removeEventListener('keydown', this.onKey);
      document.body.classList.remove('nbl-open');
      this.root.remove();
      PM().setActive(null);
      this.h.onExit(nav);
    }
    save() { PM().update(this.id, () => {}); }
    $(sel) { return this.root.querySelector(sel); }

    build() {
      const c = this.c, r = document.createElement('div');
      r.className = 'nbl'; r.setAttribute('role', 'dialog'); r.setAttribute('aria-label', `${c.district} lesson`);
      r.innerHTML = `
        <div class="nbl-bg">${sceneSVG()}</div>
        <div class="nbl-shell">
          <header class="nbl-top">
            <button class="nbl-btn ghost" data-a="exit" aria-label="Back to the mission board">✕ <span>Board</span></button>
            <div class="nbl-where"><span>${esc(c.district)}</span><b>Level ${c.level} lesson</b></div>
            <div class="nbl-stats">
              <div class="pl-chip" title="Crew rank and XP"><img src="img/avatar.webp" alt=""><div><b id="nbl-rank"></b><div class="xpbar"><i id="nbl-xpbar"></i></div><small><span id="nbl-xp"></span> XP</small></div></div>
              <div class="cash-chip" id="nbl-wallet" title="Cash to spend"><svg class="bill-ic" viewBox="0 0 26 18" aria-hidden="true"><rect x="3" y="1" width="22" height="12" rx="2" fill="#1a9c63"/><rect x="1" y="4" width="22" height="12" rx="2" fill="#2EE59D" stroke="#0c6b45"/><circle cx="12" cy="10" r="3" fill="#0c6b45"/></svg><b id="nbl-cash"></b></div>
            </div>
          </header>
          <div class="nbl-grid">
            <aside class="a-teacher glass"><div class="nova-wrap"></div><div class="nova-name">NOVA</div></aside>
            <section class="a-board glass" aria-label="Maths board">
              ${c.boardTitle ? `<div class="board-title">${esc(c.boardTitle)}</div>` : ''}
              <div class="board-eq" aria-live="polite"></div>
              <div class="board-visual"></div>
              <div class="board-help glass" hidden><div class="bh-h"><span class="bh-t">NOVA's tip</span><button class="bh-x" data-a="helpx" aria-label="Close tip">✕</button></div><div class="bh-v"></div></div>
              <div class="board-working" aria-label="Working so far"></div>
            </section>
            <aside class="a-progress glass"><h3>Mission progress</h3><ol class="prog-list"></ol></aside>
            <div class="a-caption glass"><span class="who">NOVA</span><p class="cap" aria-live="polite"></p></div>
            <div class="a-question glass"><div class="qbox"></div><div class="feedback" aria-live="assertive"></div></div>
            <div class="a-controls">
              <button class="nbl-btn" data-a="pause" id="nbl-pause">❚❚ Pause</button>
              <button class="nbl-btn" data-a="mute" id="nbl-mute"></button>
              <button class="nbl-btn" data-a="hint" id="nbl-hint">Hint</button>
              <button class="nbl-btn" data-a="replay">↻ Replay</button>
              <button class="nbl-btn primary" data-a="next" id="nbl-continue">Continue ▶</button>
            </div>
          </div>
        </div>
        <div class="nbl-toast" aria-live="polite"></div>`;
      document.body.appendChild(r);
      this.root = r;
      r.addEventListener('click', e => {
        const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
        const a = b.dataset.a;
        if (a === 'exit') this.close();
        else if (a === 'pause') this.togglePause();
        else if (a === 'mute') this.toggleMute();
        else if (a === 'hint') this.hint();
        else if (a === 'replay') this.replay();
        else if (a === 'next') this.next();
        else if (a === 'job') this.close('job');
        else if (a === 'restart') this.restart();
        else if (a === 'board') this.close();
        else if (a === 'helpx') this.helpClear();
      });
      this.muteLabel();
    }

    /* ---------- shared UI ---------- */
    refreshTop() {
      NB.FX.roll(this.$('#nbl-cash'), '$' + this.h.getCash().toLocaleString('en-US'));
      NB.FX.roll(this.$('#nbl-xp'), (this.h.getXP() % 1500).toLocaleString('en-US') + ' / 1,500');
      this.$('#nbl-rank').textContent = this.h.getRank();
      const xp = this.h.getXP(), step = 1500; this.$('#nbl-xpbar').style.width = ((xp % step) / step * 100).toFixed(1) + '%';
    }
    toast(amt) {
      if (!amt) return;
      const from = (this.lastSlot && document.body.contains(this.lastSlot)) ? this.lastSlot : this.$('.board-eq');
      if (amt.cash) NB.FX.toWallet(from, () => this.$('#nbl-wallet'), { count: Math.min(6, 2 + Math.round(amt.cash / 50)) }).then(() => this.refreshTop());
      else this.refreshTop();
    }
    pay(kind, key) { const a = this.rewards.award(kind, key); if (a) { this.toast(a); setTimeout(() => this.h.sfx('cash'), 600); } return a; }
    feedback(text, cls = '') { const f = this.$('.feedback'); f.className = 'feedback ' + cls; f.innerHTML = text || ''; }
    setEq(t) { const e = this.$('.board-eq'); e.innerHTML = eqHTML(t); e.classList.remove('pulse'); void e.offsetWidth; e.classList.add('pulse'); }
    board(spec) { NB.StepRenderer.render(this.$('.board-visual'), spec); }
    working(facts) {
      const label = f => {
        const steps = this.c.steps.filter(s => s.checkpoint);
        const k = steps.findIndex(s => s.checkpoint.fact === f);
        if (k >= 0) return `Step ${k + 1}: ${steps[k].title}`;
        const g = (this.c.guided ? this.c.guided.steps : []).findIndex(s => s.fact === f);
        return g >= 0 ? `Your step ${g + 1}` : 'Done';
      };
      this.$('.board-working').innerHTML = facts.map(f => `<span class="wk"><em>${esc(label(f))}</em><span>✓ ${esc(f)}</span></span>`).join('');
    }
    canContinue(on, label) {
      const b = this.$('#nbl-continue'); b.disabled = !on; b.classList.toggle('ready', !!on);
      if (label) b.textContent = label;
    }
    caption(text) {
      this.capWords = NB.AudioController.words(text);
      this.$('.cap').innerHTML = this.capWords.map(w => `<span>${esc(w.w)}</span>`).join(' ');
    }
    capWord(k) {
      const spans = this.$('.cap').children;
      for (let i = 0; i < spans.length; i++) spans[i].className = i < k ? 'said' : i === k ? 'now' : '';
    }
    audioState(s) {
      const b = this.$('#nbl-pause'); if (!b) return;
      b.textContent = s === 'paused' ? '▶ Resume' : '❚❚ Pause';
      b.disabled = !(s === 'playing' || s === 'paused');
      if ((s === 'ended' || s === 'stopped') && ['talking', 'explaining'].includes(this.teacher.state)) this.teacher.set(this.rest || 'idle');
    }
    togglePause() { if (this.audio.paused) { this.audio.resume(); this.teacher.set('talking'); } else { this.audio.pause(); this.teacher.set(this.rest || 'idle'); } }
    muteLabel() { this.$('#nbl-mute').textContent = this.h.isMuted() ? '🔇 Voice off' : '🔊 Voice on'; }
    toggleMute() { this.h.setMuted(!this.h.isMuted()); this.muteLabel(); if (this.h.isMuted()) this.audio.stop(); }

    /* Speak a line with captions. Resolves false if interrupted. */
    say(clip, text, { rate = 1, state = 'talking' } = {}) {
      this.caption(text);
      this.teacher.set(state);
      return this.audio.play(clip, spoken(text), { rate }).then(r => {
        if (r !== 'stopped' && ['talking', 'explaining'].includes(this.teacher.state)) this.teacher.set(this.rest || 'idle');
        return r !== 'stopped';
      });
    }

    /* ---------- answer boxes on the board ---------- */
    qclear(html) { this.kp.detach(); this.ui.clear(html); }
    /* Stamp the right answer into its box with a burst. Resolves after the moment lands. */
    win(v) {
      const slot = this.kp.slot;
      this.kp.detach();
      if (slot) {
        if (slot.classList.contains('boxes')) slot.innerHTML = String(v).split('').map(d => `<i class="f">${d}</i>`).join('');
        else slot.textContent = v;
        slot.classList.add('right'); NB.FX.sparks(slot, 8, 56); this.lastSlot = slot;
      }
      NB.FX.buzz(30);
      return NB.FX.wait(650);
    }
    miss() { const s = this.kp.slot; if (s) { s.classList.add('wrong'); NB.FX.shake(s); setTimeout(() => s.classList.remove('wrong'), 450); } NB.FX.buzz([30, 40, 30]); this.kp.clear(); }
    help(spec, title = "NOVA's tip") {
      const h = this.$('.board-help'); h.hidden = false;
      h.querySelector('.bh-t').textContent = title;
      NB.StepRenderer.render(h.querySelector('.bh-v'), spec);
      NB.FX.pop(h);
    }
    helpClear() { const h = this.$('.board-help'); if (h) h.hidden = true; }

  }
  NB.LessonController = LessonController;
})(window.NB = window.NB || {});
