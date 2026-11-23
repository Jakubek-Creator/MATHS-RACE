/* TeacherController — NOVA, the hologram co-pilot.
   Pure SVG + CSS, so there is no 3D model to fail to load.
   States: idle, talking, explaining, pointing, thinking, celebrating, encouraging. */
(function (NB) {
  const STATES = ['idle', 'talking', 'explaining', 'pointing', 'thinking', 'celebrating', 'encouraging'];

  const star = (x, y, s) => `<path d="M${x} ${y - s} L${x + s * .3} ${y - s * .3} L${x + s} ${y} L${x + s * .3} ${y + s * .3} L${x} ${y + s} L${x - s * .3} ${y + s * .3} L${x - s} ${y} L${x - s * .3} ${y - s * .3} Z"/>`;

  const SVG = `
<svg class="nova" viewBox="0 0 200 232" role="img" aria-label="NOVA, your hologram co-pilot">
  <defs>
    <radialGradient id="nvHead" cx="50%" cy="38%" r="65%">
      <stop offset="0" stop-color="#9ffaf6" stop-opacity=".6"/>
      <stop offset="1" stop-color="#20D9D2" stop-opacity=".14"/>
    </radialGradient>
    <linearGradient id="nvBeam" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#20D9D2" stop-opacity=".5"/>
      <stop offset="1" stop-color="#20D9D2" stop-opacity="0"/>
    </linearGradient>
    <pattern id="nvScan" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="1.2" fill="#fff" opacity=".13"/>
    </pattern>
  </defs>
  <polygon class="nv-beam" points="72,214 128,214 172,36 28,36" fill="url(#nvBeam)"/>
  <ellipse cx="100" cy="216" rx="48" ry="10" fill="#171126" stroke="#20D9D2" stroke-width="2"/>
  <ellipse class="nv-ring" cx="100" cy="214" rx="34" ry="5.5" fill="none" stroke="#FF4F91" stroke-width="2"/>
  <g class="nv-float">
    <g class="nv-holo">
      <path d="M58 176 Q100 146 142 176 L136 196 Q100 184 64 196 Z" fill="url(#nvHead)" stroke="#20D9D2" stroke-width="2"/>
      <g class="nv-head">
        <path class="nv-fin" d="M46 84 L30 58 L52 70 Z"/>
        <path class="nv-fin" d="M154 84 L170 58 L148 70 Z"/>
        <rect x="44" y="40" width="112" height="106" rx="46" fill="url(#nvHead)" stroke="#20D9D2" stroke-width="3"/>
        <rect x="44" y="40" width="112" height="106" rx="46" fill="url(#nvScan)"/>
        <rect x="58" y="66" width="84" height="46" rx="21" fill="#171126" opacity=".78" stroke="#20D9D2" stroke-opacity=".6"/>
        <g class="eyes e-normal"><rect x="75" y="78" width="13" height="20" rx="6.5"/><rect x="112" y="78" width="13" height="20" rx="6.5"/></g>
        <g class="eyes e-happy"><path d="M73 94 Q81.5 78 90 94"/><path d="M110 94 Q118.5 78 127 94"/></g>
        <g class="eyes e-think"><rect x="80" y="74" width="12" height="15" rx="6"/><rect x="116" y="74" width="12" height="15" rx="6"/></g>
        <g class="eyes e-soft"><path d="M73 86 Q81.5 96 90 86"/><path d="M110 86 Q118.5 96 127 86"/></g>
        <g class="mouth m-smile"><path d="M84 126 Q100 137 116 126"/></g>
        <g class="mouth m-talk">
          <rect x="81" y="120" width="5" height="12" rx="2.5"/><rect x="89" y="120" width="5" height="12" rx="2.5"/>
          <rect x="97" y="120" width="5" height="12" rx="2.5"/><rect x="105" y="120" width="5" height="12" rx="2.5"/>
          <rect x="113" y="120" width="5" height="12" rx="2.5"/>
        </g>
        <g class="mouth m-open"><ellipse cx="100" cy="127" rx="9" ry="7"/></g>
        <g class="mouth m-hmm"><path d="M90 128 L110 125"/></g>
      </g>
      <circle class="nv-hand nv-hand-l" cx="36" cy="158" r="9"/>
      <g class="nv-hand-r">
        <line class="nv-ray" x1="168" y1="150" x2="198" y2="128"/>
        <circle class="nv-hand" cx="164" cy="158" r="9"/>
      </g>
    </g>
    <g class="nv-dots"><circle cx="152" cy="36" r="4"/><circle cx="165" cy="25" r="5"/><circle cx="180" cy="13" r="6"/></g>
    <g class="nv-spark">${star(28, 40, 9)}${star(176, 50, 7)}${star(20, 120, 6)}${star(184, 112, 9)}${star(100, 14, 7)}</g>
    <g class="nv-heart"><path d="M172 96 c-4 -7 -14 -4 -12 4 c1 5 12 12 12 12 c0 0 11 -7 12 -12 c2 -8 -8 -11 -12 -4z"/></g>
  </g>
</svg>`;

  class TeacherController {
    constructor(el) {
      this.el = el;
      el.innerHTML = SVG;
      this.svg = el.querySelector('.nova');
      this.base = 'idle';
      this.timer = null;
      this.set('idle');
    }
    set(state) {
      if (!STATES.includes(state)) state = 'idle';
      clearTimeout(this.timer);
      this.state = state;
      this.svg.setAttribute('data-state', state);
    }
    /* Show a state briefly, then return to `then` (default idle). */
    flash(state, ms = 1800, then = 'idle') {
      this.set(state);
      this.timer = setTimeout(() => this.set(then), ms);
    }
  }
  TeacherController.prototype.dispose = function () { clearTimeout(this.timer); };
  TeacherController.STATES = STATES;
  NB.TeacherController = TeacherController;
})(window.NB = window.NB || {});
