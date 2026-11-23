/* Keypad — a neon number pad that types into an answer slot on the board.
   Slot types:
     <span class="slot"></span>                     one glowing box in a sum
     <span class="slot boxes" data-len="3"></span>  digit boxes for column sums, filled right-to-left (units first)
   The physical keyboard works too: digits, Backspace, Enter. */
(function (NB) {
  class Keypad {
    constructor(host, { sfx } = {}) {
      this.host = host; this.sfx = sfx || (() => {});
      this.slot = null; this.val = ''; this.onSubmit = null; this.max = 5; this.boxes = 0; this.ghost = '';
      this.onKey = e => {
        if (!this.slot || !document.body.contains(this.slot) || e.metaKey || e.ctrlKey || e.altKey) return;
        if (e.target && e.target.tagName === 'INPUT') return;
        if (/^\d$/.test(e.key)) { e.preventDefault(); this.press(e.key); }
        else if (e.key === 'Backspace') { e.preventDefault(); this.press('del'); }
        else if (e.key === 'Enter') { e.preventDefault(); this.press('ok'); }
      };
      document.addEventListener('keydown', this.onKey);
    }
    destroy() { document.removeEventListener('keydown', this.onKey); }

    /* Show the pad and connect it to a slot element. opts: {prompt, label, ghost, onSubmit} */
    attach(slot, { prompt = '', label = '', ghost = '', onSubmit }) {
      this.slot = slot; this.onSubmit = onSubmit; this.val = ''; this.ghost = ghost;
      this.boxes = slot && slot.classList.contains('boxes') ? Number(slot.dataset.len) : 0;
      this.auto = !!(slot && slot.dataset.max);
      this.max = this.boxes || (slot && Number(slot.dataset.max)) || 5;
      if (slot) { slot.classList.add('live'); slot.setAttribute('role', 'textbox'); slot.setAttribute('aria-label', 'Answer'); }
      this.host.innerHTML = `
        ${label ? `<div class="q-label">${label}</div>` : ''}
        ${prompt ? `<div class="q-prompt">${prompt}</div>` : ''}
        <div class="kp" role="group" aria-label="Number pad">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button class="k" data-k="${n}">${n}</button>`).join('')}
          <button class="k k-del" data-k="del" aria-label="Delete">⌫</button>
          <button class="k" data-k="0">0</button>
          <button class="k k-ok" data-k="ok" aria-label="Check answer">✓</button>
        </div>`;
      this.host.querySelectorAll('.k').forEach(b => b.addEventListener('click', () => this.press(b.dataset.k)));
      this.paint();
    }
    detach() { if (this.slot) this.slot.classList.remove('live'); this.slot = null; this.onSubmit = null; }
    clear() { this.val = ''; this.paint(); }
    setGhost(g) { this.ghost = g; this.paint(); }

    press(k) {
      if (!this.slot) return;
      if (k === 'del') { this.val = this.val.slice(0, -1); this.sfx('tick'); }
      else if (k === 'ok') { if (this.val) this.submit(); else NB.FX.shake(this.slot); return; }
      else if (this.val.length < this.max) { this.val += k; this.fresh = true; this.sfx('tick'); NB.FX.buzz(8); }
      this.paint();
      if ((this.boxes || this.auto) && this.val.length === this.max) setTimeout(() => this.submit(), 220);
    }
    /* The number the child means. Column boxes are typed units-first, so reverse them. */
    value() { return this.boxes ? this.val.split('').reverse().join('').replace(/^0+(?=\d)/, '') : this.val; }
    submit() { const v = this.value(); if (this.onSubmit && v) this.onSubmit(v); }

    paint() {
      const s = this.slot; if (!s) return;
      if (this.boxes) {
        const typed = this.val.split('');
        const ghost = String(this.ghost || '').padStart(this.boxes, ' ').split('').reverse();
        let cells = '';
        for (let i = this.boxes - 1; i >= 0; i--) {
          const d = typed[i];
          const next = i === typed.length;
          cells += `<i class="${d != null ? 'f' : ''} ${next ? 'nx' : ''}">${d != null ? d : (ghost[i] && ghost[i] !== ' ' ? `<em>${ghost[i]}</em>` : '')}</i>`;
        }
        s.innerHTML = cells;
      } else {
        const digits = this.val.split('').map((d, i, a) => `<span class="kd ${this.fresh && i === a.length - 1 ? 'in' : ''}">${d}</span>`).join('');
        this.fresh = false;
        s.innerHTML = this.val ? `<span class="sv">${digits}</span><span class="caret"></span>`
          : (this.ghost ? `<em class="gh">${this.ghost}</em><span class="caret"></span>` : '<span class="caret"></span>');
      }
    }
  }
  NB.Keypad = Keypad;
})(window.NB = window.NB || {});
