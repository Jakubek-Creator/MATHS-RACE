/* InteractionController — answer controls: big tappable choices or a number pad input.
   Keyboard: 1–4 pick a choice, Enter submits a typed answer. */
(function (NB) {
  class InteractionController {
    constructor(el) {
      this.el = el;
      this.keyHandler = null;
      this.onKey = e => { if (this.keyHandler) this.keyHandler(e); };
      document.addEventListener('keydown', this.onKey);
    }
    destroy() { document.removeEventListener('keydown', this.onKey); }
    clear(html = '') { this.el.innerHTML = html; this.keyHandler = null; }

    /* opts: {prompt, label, options[], tried[], highlight, onPick} */
    choices({ prompt, label, options, tried = [], highlight = null, onPick }) {
      this.el.innerHTML = `
        ${label ? `<div class="q-label">${label}</div>` : ''}
        <div class="q-prompt">${prompt}</div>
        <div class="q-choices">${options.map((o, k) => `
          <button class="q-choice ${tried.includes(o) ? 'tried' : ''} ${highlight === o ? 'glow' : ''}" data-v="${o}"
            ${tried.includes(o) || (highlight && highlight !== o) ? 'disabled' : ''}>
            <small>${k + 1}</small>${o}</button>`).join('')}</div>`;
      this.el.querySelectorAll('.q-choice').forEach(b => b.addEventListener('click', () => onPick(b.dataset.v, b)));
      this.keyHandler = e => {
        if (e.target.tagName === 'INPUT' || e.metaKey || e.ctrlKey) return;
        const n = Number(e.key); if (!n) return;
        const b = this.el.querySelectorAll('.q-choice')[n - 1];
        if (b && !b.disabled) b.click();
      };
    }

    /* opts: {prompt, label, onSubmit(value)} */
    number({ prompt, label, onSubmit, reveal }) {
      this.el.innerHTML = `
        ${label ? `<div class="q-label">${label}</div>` : ''}
        <div class="q-prompt">${prompt}</div>
        ${reveal ? `<div class="q-reveal">${reveal}</div>` : ''}
        <form class="q-form"><input id="nbl-ans" type="text" inputmode="numeric" autocomplete="off" aria-label="Your answer">
        <button class="nbl-btn primary" type="submit">Check</button></form>`;
      const f = this.el.querySelector('form'), inp = f.querySelector('input');
      f.addEventListener('submit', e => { e.preventDefault(); const v = inp.value.trim(); if (v) onSubmit(v); });
      this.keyHandler = null;
      setTimeout(() => { try { inp.focus({ preventScroll: true }); } catch (e) {} }, 50);
    }
  }
  NB.InteractionController = InteractionController;
})(window.NB = window.NB || {});
