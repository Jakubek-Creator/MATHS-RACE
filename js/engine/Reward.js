/* Reward — how answers feel. Animation only: callers decide what is right or wrong, this just shows it.
   Everything is CSS transforms and opacity, pointer-events:none, and removes itself.
   Reduced motion: no shake, no particles, no flying text; the colour change and tick stay.
   NB.Reward.good(el, text)   green/gold glow, tick, floating "+XP", sparks, a small nudge of the screen
   NB.Reward.bad(el)          gentle sideways shake, orange glow
   NB.Reward.combo(n, host)   2: small pop, 3: streak badge, 5 and every 5 after: big celebration */
(function (NB) {
  const still = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const temp = (el, cls, ms) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms); };
  function float(el, html, cls) {
    if (!el) return;
    const r = el.getBoundingClientRect(), f = document.createElement('div');
    f.className = 'rw-float ' + (cls || ''); f.innerHTML = html;
    f.style.left = (r.left + r.width / 2) + 'px'; f.style.top = r.top + 'px';
    document.body.appendChild(f); setTimeout(() => f.remove(), 1300);
  }
  const Reward = {
    good(el, text) {
      temp(el, 'rw-good', 900);
      if (still()) return;
      if (text) float(el, text, 'xp');
      if (NB.FX) NB.FX.sparks(el, 12, 80);
      temp(document.body, 'rw-nudge', 260);
    },
    bad(el) { temp(el, 'rw-bad', 600); },
    combo(n, host) {
      if (n < 2 || !host) return;
      const big = n >= 5 && n % 5 === 0;
      float(host, big ? `${n} in a row!<small>Bonus!</small>` : n >= 3 ? `🔥 ${n} streak` : 'x2 Nice!', big ? 'combo big' : n >= 3 ? 'combo hot' : 'combo');
      if (big && !still() && NB.FX) { NB.FX.sparks(host, 28, 160); temp(document.body, 'rw-nudge', 260); }
    }
  };
  NB.Reward = Reward;
})(window.NB = window.NB || {});
