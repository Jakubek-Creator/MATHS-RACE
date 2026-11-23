/* StepRenderer — draws the maths board from a {type, props} spec.
   Visual types are registered by name so new topics add their own without touching the engine. */
(function (NB) {
  const V = {};
  const WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const rod = () => '<span class="b-rod"></span>';
  const vrod = () => '<span class="b-rod v"></span>';
  const cube = () => '<span class="b-cube"></span>';
  const crate = `<svg viewBox="0 0 64 52" aria-hidden="true"><path d="M6 14 L32 4 L58 14 L58 44 L32 50 L6 44 Z" fill="#542A83" stroke="#FF9D45" stroke-width="2.5"/><path d="M6 14 L32 22 L58 14 M32 22 L32 50" stroke="#FF9D45" stroke-width="2.5" fill="none"/><path d="M14 26 L24 29 M14 32 L24 35" stroke="#20D9D2" stroke-width="2.5"/></svg>`;

  V.packages = ({ count, price }) => `
    <div class="v-packages">${Array.from({ length: count }, (_, i) => `
      <div class="pkg" style="--d:${i * 90}ms">${crate}<b>$${price}</b><span>Pack ${i + 1}</span></div>`).join('')}
    </div><div class="v-note">${count} packages × $${price} each</div>`;

  V.split = ({ number, highlight }) => {
    const t = Math.floor(number / 10), o = number % 10;
    return `<div class="v-split">
      <div class="big-num"><span class="dt ${highlight === 'tens' ? 'ping' : ''}">${t}</span><span class="du">${o}</span></div>
      <div class="split-arrows" aria-hidden="true"><i></i><i></i></div>
      <div class="split-parts">
        <div class="part tens" style="--d:250ms"><div class="blocks">${vrod().repeat(t)}</div><b>${t * 10}</b><span>${cap(WORD[t])} tens</span></div>
        <div class="plus">+</div>
        <div class="part units" style="--d:550ms"><div class="blocks">${cube().repeat(o)}</div><b>${o}</b><span>${cap(WORD[o])} units</span></div>
      </div></div>`;
  };

  V.rows = ({ rows, per, kind, label, done }) => {
    const unit = kind === 'rod' ? 'tens' : 'units', blk = kind === 'rod' ? rod : cube;
    const total = rows * per;
    return `<div class="v-rows ${kind}">${Array.from({ length: rows }, (_, i) => `
      <div class="r" style="--d:${i * 110}ms"><span class="rl">${label}</span><div class="blocks">${blk().repeat(per)}</div></div>`).join('')}
    </div><div class="v-note">${rows} rows of ${per} ${unit}${done ? ` = <b>${total} ${unit}</b>${kind === 'rod' ? ` = <b class="ok">${total * 10}</b>` : ''}` : ` = <b>?</b>`}</div>`;
  };

  V.money = ({ tens, ones }) => `
    <div class="v-money">
      <div class="m-grp">${'<span class="note10">$10</span>'.repeat(tens)}<b>${tens} × $10 = $${tens * 10}</b></div>
      <div class="m-grp">${'<span class="coin1">$1</span>'.repeat(ones)}<b>${ones} × $1 = $${ones}</b></div>
    </div><div class="v-note">$${tens * 10 + ones} = <b class="ok">$${tens * 10}</b> + $${ones}</div>`;

  V.skip = ({ step, count, labels }) => `
    <div class="v-skip">${Array.from({ length: count }, (_, i) => `
      <div class="hop" style="--d:${i * 380}ms"><b>${step * (i + 1)}</b>${labels ? `<span>${labels[i]}</span>` : ''}</div>`).join('<i class="arrow">›</i>')}
    </div>`;

  V.demo = ({ lines, slow }) => `
    <div class="v-demo">${lines.map((l, i) => `<div class="dl" style="--d:${i * (slow ? 1400 : 700)}ms">${l}</div>`).join('')}</div>`;

  V.columnAdd = ({ a, b, done, slot }) => `
    <div class="v-col">
      <span>${a}</span><span>+ ${b}</span><span class="rule"></span>
      ${slot && !done ? `<span class="slot boxes" data-len="${String(a + b).length}"></span>` : `<span class="${done ? 'ok' : 'q'}">${done ? a + b : '?'}</span>`}
    </div>${slot && !done ? '<div class="v-note small">Units first, then tens, then hundreds</div>' : ''}`;

  V.area = ({ tens, ones, mult, fill = [true, true, true], unknown = '?', slot }) => {
    const [ft, fo, fs] = fill, S = '<span class="slot"></span>';
    const cell = (on, val, lbl, isSlot) => isSlot ? `<small>${lbl}</small>${S}` : on ? val : lbl;
    return `<div class="v-area">
      <span></span><span class="hd">${tens}</span><span class="hd">${ones}</span>
      <span class="sd">× ${mult}</span>
      <div class="cell big ${ft ? 'on' : ''} ${slot === 'tens' ? 'act' : ''}">${cell(ft, tens * mult, `${tens} × ${mult}`, slot === 'tens')}</div>
      <div class="cell ${fo ? 'on' : ''} ${slot === 'ones' ? 'act' : ''}">${cell(fo, ones * mult, `${ones} × ${mult}`, slot === 'ones')}</div>
    </div>
    <div class="v-total">${ft ? tens * mult : '?'} + ${fo ? ones * mult : '?'} = ${slot === 'total' ? S : `<b class="${fs ? 'ok' : ''}">${fs ? (tens + ones) * mult : unknown}</b>`}</div>`;
  };

  V.practice = ({ a, b, reveal }) => {
    const t = a - (a % 10), o = a % 10;
    if (!reveal) return `<div class="v-plan">
      <div class="pl"><b>1</b>Split ${a} into tens and units</div>
      <div class="pl"><b>2</b>Times each part by ${b}</div>
      <div class="pl"><b>3</b>Add the two answers</div></div>`;
    return V.area({ tens: t, ones: o, mult: b });
  };

  V.summary = ({ rows, title }) => `
    <div class="v-summary"><div class="trophy" aria-hidden="true">★</div><h3>${title}</h3>
      <div class="sum-grid">${rows.map(r => `<div class="sg"><b>${r[1]}</b><span>${r[0]}</span></div>`).join('')}</div></div>`;

  NB.StepRenderer = {
    register(name, fn) { V[name] = fn; },
    html(spec) { const fn = spec && V[spec.type]; return fn ? fn(spec.props || {}) : ''; },
    render(el, spec) {
      el.innerHTML = this.html(spec);
      el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter');
    }
  };
})(window.NB = window.NB || {});
