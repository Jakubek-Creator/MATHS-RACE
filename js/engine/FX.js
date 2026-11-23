/* FX — the motion language of Neon Bay. Garage and dashboard, not app-store confetti:
     roll()      odometer digits that wind to a new number
     ignite()    a neon tube flickering on
     misfire()   a damped judder, like an engine catching wrong
     sparks()    a few short streaks off a point of impact (replaces confetti)
     toWallet()  bills fly from where money was earned into the wallet, which then rolls
     sweep()     one pass of light across a surface
   Old names (burst, shake, stamp, pop, countUp) map onto these so every call site gets the new look.
   Everything collapses to an instant change when reduced motion is requested. */
(function (NB) {
  const reduced = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

  /* A real damped spring sampled into a CSS linear() easing, with a cubic-bezier fallback. */
  function spring(stiffness = 170, damping = 18, samples = 40) {
    let ok = false; try { ok = CSS.supports('animation-timing-function', 'linear(0, 1)'); } catch (e) {}
    if (!ok) return 'cubic-bezier(.2,.9,.25,1.12)';
    const w0 = Math.sqrt(stiffness), z = damping / (2 * Math.sqrt(stiffness)), pts = [];
    const wd = w0 * Math.sqrt(Math.max(1e-6, 1 - z * z)), T = 1.1;
    for (let i = 0; i <= samples; i++) {
      const t = (i / samples) * T;
      const v = z < 1 ? 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t)) : 1 - Math.exp(-w0 * t) * (1 + w0 * t);
      pts.push(+v.toFixed(4));
    }
    pts[pts.length - 1] = 1;
    return `linear(${pts.join(', ')})`;
  }
  const SPRING = spring(220, 20), SOFT = spring(120, 17), OUT = 'cubic-bezier(.16,.84,.3,1)';
  const NEON = ['#FF4F91', '#20D9D2', '#fff4e6'];
  const center = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r }; };
  const BILL = '<svg viewBox="0 0 26 18" aria-hidden="true"><rect x="1" y="2" width="24" height="14" rx="2" fill="#2EE59D" stroke="#0c6b45"/><circle cx="13" cy="9" r="3.4" fill="#0c6b45"/></svg>';

  const FX = {
    reduced, spring, SPRING, SOFT, OUT,
    wait: ms => new Promise(r => setTimeout(r, reduced() ? Math.min(ms, 40) : ms)),
    buzz(ms = 20) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} },

    /* Neon tube ignition: two uneven flickers, then steady. */
    ignite(el, delay = 0) {
      if (!el || reduced()) return;
      el.animate([{ opacity: .15, filter: 'brightness(.6)' }, { opacity: 1, filter: 'brightness(1.8)', offset: .1 }, { opacity: .25, offset: .18 },
                  { opacity: .9, filter: 'brightness(1.4)', offset: .34 }, { opacity: .5, offset: .44 }, { opacity: 1, filter: 'brightness(1)' }],
        { duration: 520, delay, easing: 'linear', fill: 'backwards' });
    },

    /* Engine misfire: a quick sideways judder that dies away, tinted red for a beat. */
    misfire(el) {
      if (!el || reduced()) return;
      el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-7px)', offset: .12 }, { transform: 'translateX(6px)', offset: .26 },
                  { transform: 'translateX(-3px)', offset: .44 }, { transform: 'translateX(1.5px)', offset: .64 }, { transform: 'translateX(0)' }],
        { duration: 360, easing: 'ease-out' });
    },

    /* A handful of short streaks thrown from an impact point. */
    sparks(el, n = 10, reach = 70) {
      if (!el || reduced()) return;
      const { x, y } = center(el);
      for (let i = 0; i < Math.min(n, 18); i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * .5, d = reach * (.55 + Math.random() * .6), len = 10 + Math.random() * 12;
        const s = document.createElement('i'); s.className = 'fx-spark';
        s.style.cssText = `left:${x}px;top:${y}px;width:${len}px;background:${NEON[i % 3]};transform:translate(-50%,-50%) rotate(${a}rad)`;
        document.body.appendChild(s);
        s.animate([{ transform: `translate(-50%,-50%) rotate(${a}rad) translateX(6px) scaleX(1)`, opacity: 1 },
                   { transform: `translate(-50%,-50%) rotate(${a}rad) translateX(${d}px) scaleX(.15)`, opacity: 0 }],
          { duration: 380 + Math.random() * 160, easing: OUT }).onfinish = () => s.remove();
      }
    },

    /* Odometer: digits wind to the new value right-to-left. Works on any text like "$7,900" or "1,240". */
    roll(el, text, { delay = 0 } = {}) {
      if (!el) return;
      text = String(text);
      const prev = el.dataset.v != null ? el.dataset.v : el.textContent;
      el.dataset.v = text;
      if (reduced() || prev === text || !/\d/.test(text)) { el.textContent = text; return; }
      const pd = prev.replace(/\D/g, '').padStart(text.replace(/\D/g, '').length, '0').split('');
      let di = 0;
      const total = text.replace(/\D/g, '').length;
      el.setAttribute('aria-label', text);
      el.innerHTML = text.split('').map(ch => {
        if (!/\d/.test(ch)) return `<span class="odo-s">${ch}</span>`;
        const from = Number(pd[pd.length - total + di] || 0), to = Number(ch); di++;
        return `<span class="odo"><span class="odo-strip" data-f="${from}" data-t="${to}">${'0123456789'.split('').map(d => `<span>${d}</span>`).join('')}</span></span>`;
      }).join('');
      const strips = [...el.querySelectorAll('.odo-strip')];
      let last;
      strips.forEach((s, k) => {
        const f = Number(s.dataset.f), t = Number(s.dataset.t), turns = t < f ? t + 10 - f : t - f;
        const stagger = (strips.length - 1 - k) * 45;
        s.style.transform = `translateY(-${t}em)`;
        last = s.animate([{ transform: `translateY(-${f}em)` }, { transform: `translateY(-${f + turns}em)` }],
          { duration: 420 + turns * 40, delay: delay + stagger, easing: SPRING, fill: 'backwards' });
        if (f + turns > 9) s.innerHTML += '0123456789'.split('').map(d => `<span>${d}</span>`).join('');
      });
      el.querySelectorAll('.odo, .odo-s').forEach(x => x.setAttribute('aria-hidden', 'true'));
      if (last) last.onfinish = () => { if (el.dataset.v === text) { el.textContent = text; el.removeAttribute('aria-label'); } };
    },

    /* Bills fly in an arc from where money was earned into the wallet. Resolves as the last one lands. */
    toWallet(from, to, { count = 5 } = {}) {
      return new Promise(res => {
        const target = typeof to === 'function' ? to : () => to;
        if (!from || !target() || reduced()) return res();
        const a = center(from), b = center(target());
        let landed = 0;
        for (let i = 0; i < count; i++) {
          const bill = document.createElement('i'); bill.className = 'fx-bill'; bill.innerHTML = BILL;
          const jx = (Math.random() - .5) * 30, jy = (Math.random() - .5) * 20;
          bill.style.cssText = `left:${a.x + jx}px;top:${a.y + jy}px`;
          document.body.appendChild(bill);
          const dx = b.x - a.x - jx, dy = b.y - a.y - jy, lift = -Math.min(160, 60 + Math.abs(dx) * .25);
          bill.animate([{ transform: 'translate(-50%,-50%) scale(.6) rotate(0)', opacity: 0 },
                        { transform: `translate(calc(-50% + ${dx * .35}px), calc(-50% + ${dy * .35 + lift}px)) scale(1.05) rotate(${(Math.random() - .5) * 40}deg)`, opacity: 1, offset: .45 },
                        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.45) rotate(0)`, opacity: .9 }],
            { duration: 640, delay: i * 70, easing: 'cubic-bezier(.45,.05,.4,1)', fill: 'backwards' })
            .onfinish = () => {
              bill.remove(); landed++;
              const t = target(); if (t) t.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.07)' }, { transform: 'scale(1)' }], { duration: 220, easing: 'ease-out' });
              if (landed === count) res();
            };
        }
      });
    },

    /* One pass of light across a surface. */
    sweep(el) {
      if (!el || reduced()) return;
      const s = document.createElement('i'); s.className = 'fx-sweep';
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      el.appendChild(s);
      s.animate([{ transform: 'translateX(-120%) skewX(-18deg)' }, { transform: 'translateX(260%) skewX(-18deg)' }], { duration: 700, easing: OUT }).onfinish = () => s.remove();
    },

    /* Settle into place with weight, used when something new arrives because of an action. */
    settle(el, delay = 0) {
      if (!el || reduced()) return;
      el.animate([{ transform: 'translateY(.35em) scale(.94)', opacity: .2 }, { transform: 'none', opacity: 1 }], { duration: 320, delay, easing: SPRING, fill: 'backwards' });
    },

    fly(from, to, ms = 520) {
      return new Promise(res => {
        if (!from || !to || reduced()) return res();
        const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
        const ghost = from.cloneNode(true);
        ghost.classList.add('fx-ghost');
        ghost.style.cssText = `position:fixed;left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${a.height}px;margin:0;z-index:90;pointer-events:none`;
        document.body.appendChild(ghost);
        const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
        ghost.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${dx * .4}px,${dy * .4 - 50}px) scale(.95)`, offset: .45 },
                       { transform: `translate(${dx}px,${dy}px) scale(.5)`, opacity: .3 }], { duration: ms, easing: 'cubic-bezier(.45,.05,.4,1)' })
          .onfinish = () => { ghost.remove(); res(); };
      });
    },

    countUp(el, to, ms, fmt = v => v) { FX.roll(el, fmt(to)); }
  };
  // legacy names → new behaviour
  FX.burst = (el, n = 10, reach = 70) => FX.sparks(el, Math.min(n, 12), Math.min(reach, 90));
  FX.shake = FX.misfire;
  FX.stamp = el => FX.ignite(el);
  FX.pop = (el, delay) => FX.settle(el, delay);
  NB.FX = FX;
})(window.NB = window.NB || {});
