/* CarArt — flat top-down cars, drawn once into a canvas sprite (front = up).
   Flat vector look: solid paint, darker flanks, dark glass, a lighter roof, racing stripes,
   number roundels and a hard outline. The same sprite is used in races (canvas) and in the
   UI (as an image), so a car looks identical everywhere. Mods show on the car.
   NB.carTop(type, color, mods, {locked}) → canvas, 40 px per world unit
   NB.carArt(type, color, {locked, mods}) → <img> HTML for the UI */
(function (NB) {
  const hex = c => { c = String(c).replace('#', ''); if (c.length === 3) c = c.split('').map(x => x + x).join(''); return [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16)); };
  const mix = (c, to, t) => { const a = hex(c), b = hex(to); return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  if (window.CanvasRenderingContext2D && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r); this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath(); };
  }
  const LINE = '#1c2026', GLASS = '#2d3743', GLINT = '#6f8394', HEAD = '#fff3c4', TAIL = '#e8423f', TYRE = '#15181c';

  // Mods change the car's look at these levels (shown in the garage).
  const LOOKS = {
    eng: [[2, 'Hood scoop'], [4, 'Supercharger through the hood'], [5, 'Side pipes']],
    turbo: [[1, 'Side vents'], [3, 'Twin exhausts'], [4, 'Front splitter'], [5, 'Race livery']],
    tyre: [[1, 'Coloured rims'], [2, 'Wide tyres'], [3, 'Lip spoiler'], [5, 'GT wing']],
    nos: [[1, 'NOS decals'], [3, 'Underglow'], [5, 'Exhaust flames']]
  };
  /* Plan-view shape per car. L × W in world units. nose/tail: corner taper. cab: windscreen → rear glass
     (fractions of length). stripes: livery. num: race number on the roof. */
  const TOP = {
    banger: { L: 4.6, W: 2.2, nose: .1, tail: .08, cab: [.34, .76], round: .14, stripes: 0, num: 0 },
    hatch: { L: 4.0, W: 2.1, nose: .16, tail: .06, cab: [.3, .9], round: .34, stripes: 0, num: 12 },
    muscle: { L: 4.9, W: 2.3, nose: .08, tail: .1, cab: [.44, .76], round: .18, stripes: 2, num: 7 },
    coupe: { L: 4.7, W: 2.2, nose: .22, tail: .14, cab: [.38, .78], round: .42, stripes: 1, num: 24 },
    hyper: { L: 4.7, W: 2.4, nose: .34, tail: .12, cab: [.32, .64], round: .55, stripes: 2, num: 1 },
    scooter: { L: 2.6, W: 1.0 }
  };
  const PX = 40;

  function scooter(x, color, L, W, m, locked) {
    const dark = mix(color, '#000', .3);
    x.fillStyle = 'rgba(0,0,0,.28)'; x.beginPath(); x.ellipse(5, 7, W * .7, L * .48, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = TYRE; x.beginPath(); x.roundRect(-6, -L / 2 - 2, 12, 24, 5); x.roundRect(-6, L / 2 - 22, 12, 24, 5); x.fill();
    x.lineWidth = 3; x.strokeStyle = LINE;
    x.fillStyle = locked ? '#3b444c' : color; x.beginPath(); x.ellipse(0, -2, W / 2 + 2, L * .36, 0, 0, Math.PI * 2); x.fill(); x.stroke();
    if (locked) return;
    x.fillStyle = dark; x.beginPath(); x.ellipse(0, 10, W * .32, L * .2, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#FFC53D'; x.beginPath(); x.roundRect(-W / 2 - 6, 14, W + 12, 30, 5); x.fill(); x.stroke();
    x.fillStyle = TAIL; x.fillRect(-W / 2 - 6, 26, W + 12, 6);
    x.strokeStyle = '#d8dde2'; x.lineWidth = 5; x.lineCap = 'round'; x.beginPath(); x.moveTo(-W / 2 - 10, -L * .32); x.lineTo(W / 2 + 10, -L * .32); x.stroke();
    x.fillStyle = HEAD; x.beginPath(); x.arc(0, -L / 2 + 8, 6, 0, 7); x.fill();
    if (m.tyre >= 5) { x.fillStyle = dark; x.fillRect(-W / 2 - 10, 46, W + 20, 7); }
  }

  NB.carTop = function (type, color, md, { locked = false } = {}) {
    const m = Object.assign({ eng: 0, turbo: 0, tyre: 0, nos: 0 }, md || {}), D = TOP[type] || TOP.hatch;
    const L = D.L * PX, W = D.W * PX, pad = 1.2 * PX;
    const cv = document.createElement('canvas'); cv.width = Math.ceil(W + pad * 2); cv.height = Math.ceil(L + pad * 2);
    const x = cv.getContext('2d'); x.translate(cv.width / 2, cv.height / 2); x.lineJoin = 'round';
    if (type === 'scooter') { scooter(x, color, L, W, m, locked); return cv; }
    const paint = locked ? '#3b444c' : color, flank = mix(paint, '#000', .22), roofC = mix(paint, '#fff', .16), trim = mix(paint, '#000', .45);
    const hw = W / 2, hl = L / 2, nose = D.nose * W, tail = D.tail * W, r = D.round * W * .5;
    const outline = (g = x, grow = 0) => {
      const a = hw + grow, b = hl + grow;
      g.beginPath();
      g.moveTo(-a + nose, -b); g.lineTo(a - nose, -b); g.quadraticCurveTo(a, -b, a, -b + nose + r);
      g.lineTo(a, b - tail - r * .6); g.quadraticCurveTo(a, b, a - tail, b); g.lineTo(-a + tail, b); g.quadraticCurveTo(-a, b, -a, b - tail - r * .6);
      g.lineTo(-a, -b + nose + r); g.quadraticCurveTo(-a, -b, -a + nose, -b); g.closePath();
    };
    // underglow (NOS 3+) and a soft drop shadow
    if (m.nos >= 3 && !locked) { const ug = x.createRadialGradient(0, 0, W * .2, 0, 0, L * .62); ug.addColorStop(0, '#b36bffcc'); ug.addColorStop(1, '#b36bff00'); x.fillStyle = ug; x.beginPath(); x.ellipse(0, 0, W * .95, L * .62, 0, 0, Math.PI * 2); x.fill(); }
    x.save(); x.translate(6, 8); x.fillStyle = 'rgba(0,0,0,.3)'; outline(); x.fill(); x.restore();
    // tyres poke out at the corners; wider with the grip upgrades
    const tw = W * (.2 + (m.tyre >= 2 ? .06 : 0)), tl = L * .18, ty = [-hl + L * .2, hl - L * .2];
    ty.forEach(yy => [-1, 1].forEach(s => { x.fillStyle = TYRE; x.beginPath(); x.roundRect(s * (hw + tw * .12) - tw / 2, yy - tl / 2, tw, tl, 5); x.fill();
      if (m.tyre >= 1 && !locked) { x.fillStyle = '#FFC53D'; x.fillRect(s * (hw + tw * .38) - 2, yy - tl * .28, 4, tl * .56); } }));
    if (m.turbo >= 4 && !locked) { x.fillStyle = LINE; x.beginPath(); x.roundRect(-hw * .92, -hl - 6, W * .92, 8, 3); x.fill(); }
    // body
    outline(); x.fillStyle = paint; x.fill();
    x.save(); outline(); x.clip();
    x.fillStyle = flank; x.fillRect(-hw, -hl, W * .13, L); x.fillRect(hw - W * .13, -hl, W * .13, L);
    if (!locked) {
      // hood shine and panel lines
      x.fillStyle = 'rgba(255,255,255,.18)'; x.beginPath(); x.moveTo(-hw * .5, -hl + 4); x.lineTo(-hw * .2, -hl + 4); x.lineTo(-hw * .32, -hl + L * D.cab[0] - 6); x.lineTo(-hw * .6, -hl + L * D.cab[0] - 6); x.closePath(); x.fill();
      x.strokeStyle = trim; x.lineWidth = 2; [-1, 1].forEach(s => { x.beginPath(); x.moveTo(s * hw * .62, -hl + 8); x.lineTo(s * hw * .58, -hl + L * D.cab[0] - 4); x.stroke(); });
      // livery
      const n = D.stripes + (m.turbo >= 5 && !D.stripes ? 2 : 0), stripe = m.turbo >= 5 ? '#FFC53D' : '#ffffff';
      x.fillStyle = stripe;
      if (n === 1) x.fillRect(-W * .09, -hl, W * .18, L);
      if (n >= 2) { x.fillRect(-W * .2, -hl, W * .12, L); x.fillRect(W * .08, -hl, W * .12, L); }
      if (type === 'banger') { x.fillStyle = '#9aa3ab'; x.fillRect(hw - W * .38, -hl + L * .52, W * .38, L * .2); x.fillStyle = '#8a5a3c'; x.beginPath(); x.arc(-hw * .45, hl * .62, 6, 0, 7); x.arc(-hw * .25, hl * .7, 4, 0, 7); x.fill(); }
      if (m.turbo >= 1) { x.fillStyle = LINE; [-1, 1].forEach(s => { for (let k = 0; k < 3; k++) x.fillRect(s * hw - (s > 0 ? W * .1 : 0), -hl + L * (.32 + k * .05), W * .1, 3); }); }
      if (m.nos >= 1) { x.fillStyle = '#5ec3e8'; [-1, 1].forEach(s => { x.beginPath(); x.moveTo(s * hw, hl - L * .3); x.lineTo(s * (hw - W * .12), hl - L * .22); x.lineTo(s * hw, hl - L * .14); x.closePath(); x.fill(); }); }
    }
    x.restore();
    outline(); x.lineWidth = 3; x.strokeStyle = LINE; x.stroke();
    // cabin: windscreen, roof, rear glass
    const c0 = -hl + L * D.cab[0], c1 = -hl + L * D.cab[1], gw = W * .8;
    x.fillStyle = locked ? '#2a3138' : GLASS; x.beginPath(); x.roundRect(-gw / 2, c0, gw, c1 - c0, W * .16); x.fill(); x.lineWidth = 2; x.strokeStyle = LINE; x.stroke();
    const roof0 = c0 + (c1 - c0) * .3, roof1 = c1 - (c1 - c0) * (type === 'hatch' ? .1 : .2);
    x.fillStyle = locked ? '#3b444c' : roofC; x.beginPath(); x.roundRect(-gw * .42, roof0, gw * .84, Math.max(8, roof1 - roof0), W * .1); x.fill(); x.stroke();
    if (!locked) {
      x.save(); x.beginPath(); x.roundRect(-gw * .42, roof0, gw * .84, Math.max(8, roof1 - roof0), W * .1); x.clip();
      const n = D.stripes + (m.turbo >= 5 && !D.stripes ? 2 : 0); x.fillStyle = m.turbo >= 5 ? '#FFC53D' : '#ffffff';
      if (n === 1) x.fillRect(-W * .09, roof0, W * .18, L); if (n >= 2) { x.fillRect(-W * .2, roof0, W * .12, L); x.fillRect(W * .08, roof0, W * .12, L); }
      x.restore();
      if (D.num) {
        const cy = (roof0 + roof1) / 2, rr = Math.min(W * .19, (roof1 - roof0) * .42);
        x.fillStyle = '#fff'; x.beginPath(); x.arc(0, cy, rr, 0, 7); x.fill(); x.lineWidth = 2.5; x.strokeStyle = LINE; x.stroke();
        x.fillStyle = LINE; x.font = `italic 900 ${Math.round(rr * 1.15)}px "Exo 2", Arial, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(D.num), 0, cy + 1);
      }
      x.fillStyle = GLINT; x.beginPath(); x.moveTo(-gw * .32, c0 + 5); x.lineTo(-gw * .12, c0 + 5); x.lineTo(-gw * .22, roof0 - 3); x.lineTo(-gw * .4, roof0 - 3); x.closePath(); x.fill();
      // mirrors
      x.fillStyle = paint; [-1, 1].forEach(s => { x.beginPath(); x.roundRect(s * (hw + 2) - 5, c0 + 2, 10, 7, 3); x.fill(); x.lineWidth = 2; x.stroke(); });
      // lights
      x.fillStyle = HEAD; [-1, 1].forEach(s => { x.beginPath(); x.roundRect(s * hw * .6 - W * .12, -hl + 3, W * .24, 7, 3); x.fill(); });
      x.fillStyle = TAIL; [-1, 1].forEach(s => { x.beginPath(); x.roundRect(s * hw * .6 - W * .13, hl - 8, W * .26, 5, 2); x.fill(); });
      // engine mods
      const hood = (-hl + c0) / 2;
      if (m.eng >= 4) {
        x.fillStyle = '#c9ced3'; x.beginPath(); x.roundRect(-W * .17, hood - W * .17, W * .34, W * .34, 5); x.fill(); x.lineWidth = 2; x.strokeStyle = LINE; x.stroke();
        x.fillStyle = LINE; x.beginPath(); x.roundRect(-W * .11, hood - W * .11, W * .22, W * .22, 3); x.fill();
      } else if (m.eng >= 2) { x.fillStyle = trim; x.beginPath(); x.roundRect(-W * .13, hood - W * .14, W * .26, W * .28, 5); x.fill(); x.fillStyle = LINE; x.fillRect(-W * .09, hood - W * .14, W * .18, 5); }
      if (m.eng >= 5) { x.fillStyle = '#c9ced3'; [-1, 1].forEach(s => x.fillRect(s * (hw + 3) - 3, -hl + L * .45, 6, L * .25)); }
      if (m.turbo >= 3) { x.fillStyle = '#c9ced3'; [-1, 1].forEach(s => { x.beginPath(); x.roundRect(s * W * .22 - 5, hl - 2, 10, 8, 3); x.fill(); }); }
      if (m.tyre >= 5) { x.fillStyle = trim; x.beginPath(); x.roundRect(-hw - 10, hl - 16, W + 20, 13, 4); x.fill(); x.lineWidth = 2; x.strokeStyle = LINE; x.stroke(); }
      else if (m.tyre >= 3) { x.fillStyle = trim; x.beginPath(); x.roundRect(-hw + 5, hl - 13, W - 10, 8, 3); x.fill(); }
      if (m.nos >= 5) { x.fillStyle = '#FF9D45'; [-1, 1].forEach(s => { x.beginPath(); x.moveTo(s * W * .22 - 5, hl + 6); x.lineTo(s * W * .22, hl + 22); x.lineTo(s * W * .22 + 5, hl + 6); x.closePath(); x.fill(); }); }
    }
    return cv;
  };
  NB.carTop.PX = PX; NB.carTop.SIZE = TOP;

  /* UI image: the same sprite as a data URL, cached per look. */
  const cache = new Map();
  NB.carArt = function (type, color, { locked = false, mods = null } = {}) {
    const key = [type, color, locked, JSON.stringify(mods || {})].join('|');
    let src = cache.get(key);
    if (!src) { try { src = NB.carTop(type, color, mods, { locked }).toDataURL('image/png'); } catch (e) { src = ''; } cache.set(key, src); }
    return `<img class="car-top" src="${src}" alt="" draggable="false">`;
  };
  NB.carArt.MODLOOK = LOOKS;
  NB.carArt.nextLook = (key, lvl) => { const n = (LOOKS[key] || []).find(([l]) => l > lvl); return n ? { level: n[0], name: n[1] } : null; };
})(window.NB = window.NB || {});
