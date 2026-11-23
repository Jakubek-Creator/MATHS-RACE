/* Neon Bay Maths Missions — the game around the lessons.
   Seven districts in three areas. Every level is: mission brief (the big idea) → lesson (watch, together,
   less help, on your own) → job. Job questions come from the same method as the lesson, so a job only asks
   what its lesson taught. Answers are typed on the number pad. */
(function () {
'use strict';
/* ---------- helpers ---------- */
const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[R(0, a.length - 1)];
const money = n => '$' + Math.round(n).toLocaleString('en-US');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const FRAC = (n, d) => NB.fracHTML(`{f:${n}/${d}}`);
const $ = s => document.querySelector(s);

/* ---------- save ---------- */
let S = { cash: 0, lv: {}, read: {}, boss: false };
try { const t = localStorage.getItem('neonbay-maths'); if (t) S = Object.assign(S, JSON.parse(t)); } catch (e) {}
S.lv = S.lv || {}; S.read = S.read || {};
delete S.sel; delete S.prac; delete S.jobs;
function save() { try { localStorage.setItem('neonbay-maths', JSON.stringify(S)); } catch (e) {} }

/* ---------- sound ---------- */
let AC = null;
function sfx(kind) {
  if (S.sound === false) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const t = AC.currentTime;
    if (kind === 'click') {
      const o = AC.createOscillator(), g = AC.createGain(), o2 = AC.createOscillator(), g2 = AC.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(180, t + .09);
      g.gain.setValueAtTime(.16, t); g.gain.exponentialRampToValueAtTime(.0001, t + .11);
      o2.type = 'triangle'; o2.frequency.setValueAtTime(1800, t); g2.gain.setValueAtTime(.035, t); g2.gain.exponentialRampToValueAtTime(.0001, t + .03);
      o.connect(g); g.connect(AC.destination); o2.connect(g2); g2.connect(AC.destination); o.start(t); o.stop(t + .12); o2.start(t); o2.stop(t + .04); return;
    }
    if (kind === 'tick') {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(1500, t); o.frequency.exponentialRampToValueAtTime(900, t + .05);
      g.gain.setValueAtTime(.05, t); g.gain.exponentialRampToValueAtTime(.0001, t + .07);
      o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + .08); return;
    }
    const seq = kind === 'good' ? [660, 880, 1320] : kind === 'cash' ? [523, 659, 784, 1047] : kind === 'nitro' ? [440, 660, 880, 1175] : [196, 147];
    seq.forEach((f, i) => {
      const t0 = t + i * .075, o = AC.createOscillator(), g = AC.createGain();
      o.type = kind === 'bad' ? 'sawtooth' : kind === 'good' ? 'triangle' : 'square'; o.frequency.value = f;
      g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(kind === 'good' ? .12 : .09, t0 + .01); g.gain.exponentialRampToValueAtTime(.0001, t0 + .16);
      o.connect(g); g.connect(AC.destination); o.start(t0); o.stop(t0 + .18);
    });
  } catch (e) {}
}

/* ---------- emblems: one neon icon per district ---------- */
const EM = {
  add: '<path d="M14 54V16a4 4 0 0 1 4-4h18a4 4 0 0 1 4 4v38M10 54h34M40 24h6l6 8v16a3 3 0 0 1-6 0v-8h-6"/><path d="M27 21v14M20 28h14" class="hot"/>',
  mult: '<path d="M8 30 30 8h22v22L30 52a3 3 0 0 1-4 0L8 34a3 3 0 0 1 0-4Z"/><circle cx="43" cy="17" r="3"/><path d="M22 26l12 12M34 26 22 38" class="hot"/>',
  div: '<path d="M10 22h44M18 22c0 18 0 26-6 32"/><circle cx="36" cy="34" r="2.5" class="hot dot"/><circle cx="36" cy="48" r="2.5" class="hot dot"/><path d="M28 41h16" class="hot"/>',
  frac: '<path d="M32 8 54 52H10Z"/><path d="M14 44q18 6 36 0"/><circle cx="28" cy="32" r="3.5" class="hot"/><circle cx="38" cy="38" r="3" class="hot"/><circle cx="31" cy="22" r="2.5" class="hot"/>',
  alg: '<path d="M32 10v40M14 50h36M12 18h40M12 18l-6 14h12ZM52 18l-6 14h12Z"/><path d="M27 40l10-10M37 40 27 30" class="hot"/>',
  ang: '<path d="M8 50h48M8 50a24 24 0 0 1 48 0"/><path d="M32 50 46 22" class="hot"/><path d="M42 50a10 10 0 0 0-4-9" class="hot"/>',
  shp: '<path d="M10 10h22v20h22v24H10Z"/><path d="M10 30h22M21 10v44M43 30v24M10 42h44" class="thin"/><path d="M32 30v24" class="hot"/>',
  boss: '<path d="M14 58V8"/><path d="M14 10h36l-7 10 7 10H14" class="hot"/><path d="M24 10v20M34 10v20M14 20h36" class="thin"/>'
};
const emblem = (id, cls = '') => `<svg class="em ${cls}" viewBox="0 0 64 64" aria-hidden="true" fill="none">${EM[id]}</svg>`;

/* ---------- districts ---------- */
const DN = { N: 'North', E: 'East', S: 'South', W: 'West' };
const GROUPS = [
  { id: 'number', name: 'Number Row', sub: 'Adding, multiplying and dividing', topics: ['add', 'mult', 'div'] },
  { id: 'parts', name: 'The Code Quarter', sub: 'Fractions and algebra', topics: ['frac', 'alg'], needs: ['mult', 1, 'Clear Car Lot Deals level 1 to open'] },
  { id: 'geo', name: 'Shape Yard', sub: 'Angles and shapes', topics: ['ang', 'shp'] }
];
const T = {
  add: { name: 'Fuel Stop', skill: 'Adding & subtracting', accent: '#FFC53D',
    who: ['Ana', 'pump attendant', 'Litres in, litres out. Line them up and nothing gets spilt.'],
    blurb: 'Fuel goes in, fuel goes out. Keep the tanks and the till exactly right.',
    levels: [
      { title: 'Column addition', eg: '47 + 38', idea: 'Line the numbers up so units sit under units and tens under tens. Add the units first. If a column makes 10 or more, write the units digit and carry 1 to the next column.', watch: 'Only one digit fits in a column. 7 + 8 = 15: write 5, carry the 1 ten.' },
      { title: 'Adding big numbers', eg: '468 + 275', idea: 'Same columns, just more of them. Each column holds 0 to 9, so 10 of anything becomes 1 of the next place along.', watch: 'When you carry, add the carried 1 into the next column every time.' },
      { title: 'Subtracting with exchange', eg: '352 − 127', idea: 'Take away column by column, units first. If the top digit is too small, exchange: swap 1 from the next column for 10.', watch: 'Don\'t swap the digits round. For 2 − 7, the answer is not 7 − 2 = 5. Exchange instead.' }],
    story(id, q) {
      const { a, b } = q;
      if (id === 'add-3') return pick([`The tank held ${a} litres. ${b} litres went into cars. How many litres are left?`, `A car costs $${a}. Rico knocks $${b} off. What's the new price?`, `The rally is ${a} km. You've driven ${b} km. How far is left?`]);
      return pick([`Two fuel deliveries: ${a} litres and ${b} litres. How many litres altogether?`, `A car sold for $${a} and the extras cost $${b}. What's the total bill?`, `${a} cars filled up this morning and ${b} this afternoon. How many cars today?`]);
    } },
  mult: { name: 'Car Lot Deals', skill: 'Multiplying', accent: '#FF9D45',
    who: ['Rico', 'car lot owner', "My calculator's broken. You do the totals, you get paid."],
    blurb: 'Rico sells parts and paint jobs by the crate. Work out the totals so no deal comes up short.',
    levels: [
      { title: 'Two-digit × one-digit', eg: '47 × 6', idea: 'Split the big number into tens and units. Multiply each part, then add. 47 × 6 is 40 × 6 plus 7 × 6.', watch: 'Multiply both parts. 47 × 6 is not 40 × 6 + 7.' },
      { title: 'Two-digit × two-digit', eg: '34 × 26', idea: 'Split both numbers. Every part of one times every part of the other makes four small sums in a grid. Add all four.', watch: "Tens × tens and units × units isn't enough. That misses two parts of the grid." },
      { title: 'Three-digit × one-digit', eg: '324 × 6', idea: 'Hundreds, tens and units: three parts, each times the small number, then add the three answers.', watch: 'Keep the zeros. 300 × 6 is 1800, not 18.' }],
    story(id, q) { const { a, b } = q; return pick([`A set of underglow lights costs $${a}. Rico orders ${b} sets. What's the total bill?`, `Each tow-truck trip earns $${a}. The crew does ${b} trips. How much is that?`, `A crate holds ${a} spark plugs. The garage has ${b} crates. How many spark plugs?`, `A paint job costs $${a}. ${b} customers want one. How much does the lot make?`]); } },
  div: { name: 'Payday Split', skill: 'Dividing', accent: '#20D9D2',
    who: ['Mia', 'crew boss', 'The cash gets split equally, every time. Get it exactly right.'],
    blurb: 'Every payout gets split equally across the crew. Nobody gets short-changed.',
    levels: [
      { title: 'Two-digit ÷ one-digit', eg: '96 ÷ 4', idea: 'Dividing is sharing equally. Work left to right in the bus stop with four moves: Divide, Multiply, Subtract, Bring down.', watch: 'Always start with the left digit, the biggest place.' },
      { title: 'Three-digit ÷ one-digit', eg: '852 ÷ 4', idea: 'One more digit is one more round of the four moves. Each digit on top of the bus stop is one part of the answer.', watch: "If the number doesn't fit at all, write 0 on top and bring the next digit down." },
      { title: 'Four-digit ÷ one-digit', eg: '1365 ÷ 5', idea: 'If the first digit is too small to share, use the first two digits together. Then keep going round the four moves.', watch: 'What you subtract must leave less than the number you divide by. If not, your top digit is too small.' }],
    story(id, q) { const { N, d } = q; return pick([`The crew made $${N} on a delivery job. Split it equally between ${d}. How much does each get?`, `${N} litres of fuel are shared equally across ${d} cars. How many litres per car?`, `${N} tyres are loaded equally onto ${d} trucks. How many tyres on each truck?`, `A ${N} km road trip is split into ${d} equal days. How many km per day?`]); } },
  frac: { name: 'Slice Run', skill: 'Fractions', accent: '#C77DFF',
    who: ['Lu', 'pizza shop owner', "Every pizza's cut into equal slices. Get the slices right and the orders go out on time."],
    blurb: "Lu's pizza shop needs drivers who know their slices. Cut, share and add up the orders.",
    levels: [
      { title: 'Fraction of an amount', eg: '¾ of 20', idea: 'The bottom number cuts the whole into equal parts. The top number says how many parts you take. So: divide by the bottom, then times by the top.', watch: 'Divide by the bottom first, not the top.' },
      { title: 'Equivalent fractions', eg: '6/8 = 3/4', idea: 'Equivalent fractions are the same amount of pizza, cut differently. Whatever you times or divide the bottom by, do the same to the top.', watch: 'Adding the same number to top and bottom does not work. 1/2 is not 2/3.' },
      { title: 'Adding fractions', eg: '½ + ⅓', idea: 'You can only add slices of the same size. Find a common bottom number, convert both fractions, then add the tops.', watch: 'Never add the bottoms. 1/2 + 1/3 is not 2/5.' }],
    story(id, q) {
      if (id === 'frac-1') return pick([`${q.amt} pizzas are ready. ${FRAC(q.n, q.d)} of them go to the race track. How many pizzas is that?`, `The crew earned $${q.amt} in tips. Lu gets ${FRAC(q.n, q.d)} of it. How much does she get?`]);
      if (id === 'frac-2') return 'Lu re-cuts a pizza into different slices without changing how much there is. Fill in the matching fraction.';
      return 'Two drivers put their pizza orders together. How much pizza is that altogether?';
    } },
  alg: { name: 'Garage Code', skill: 'Algebra', accent: '#FF4F91',
    who: ['Dex', 'tech expert', 'Solve for x and the door opens.'],
    blurb: 'Every garage in Neon Bay has a keypad. Find x to get the doors open.',
    levels: [
      { title: 'One-step equations', eg: 'x + 4 = 11', idea: 'An equation is a balance. Do the opposite to both sides to get x on its own: take away undoes add, add undoes take away.', watch: 'Do it to both sides, or the balance tips.' },
      { title: 'Times equations', eg: '3x = 15', idea: '3x means 3 times x. Divide undoes times. Times undoes divide.', watch: '3x = 15 gives x = 5, not 12. Divide, don\'t take away.' },
      { title: 'Two-step equations', eg: '3x + 5 = 20', idea: 'Two things happened to x, so undo them in reverse: the + or − first, then the × or ÷. Then check by putting x back in.', watch: 'Undo the plus or minus first. The times waits until last.' }],
    story() { return pick(['The garage keypad flashes a code. Find x to open the door.', "The car's GPS is locked. Solve for x to unlock it.", 'The radio needs a secret frequency. Find x to tune in.', 'The car-wash gate has a puzzle lock. What is x?']); } },
  ang: { name: 'Drift Circuit', skill: 'Angles', accent: '#5EB8FF',
    who: ['Kai', 'drift champion', 'Every corner is an angle. Know your degrees and you never spin out.'],
    blurb: 'Turns, ramps and triangle signs. Measure every corner of the circuit in degrees.',
    levels: [
      { title: 'Turns and right angles', eg: 'N → S = 180°', idea: 'Turns are measured in degrees. A full turn is 360°, a half turn is 180° and a quarter turn, a right angle, is 90°.', watch: 'Clockwise and anticlockwise go opposite ways. North to East is 90° clockwise but 270° anticlockwise.', explore: 'angle' },
      { title: 'Lines and points', eg: '180 − 65 − 40', idea: 'Angles on a straight line add up to 180°. Angles all the way round a point add up to 360°. Take the angles you know away from the total.', watch: 'Check which it is first: a straight line (180°) or a full turn (360°).', explore: 'angle' },
      { title: 'Angles in a triangle', eg: '70° + 50° + x', idea: 'The three angles inside any triangle add up to 180°. Add the two you know, then take them away from 180.', watch: 'A triangle angle is always between 0° and 180°. If yours isn\'t, check your adding.' }],
    story(id, q) {
      if (id === 'ang-1') return `The car faces ${DN[q.from]} and spins ${q.anti ? 'anticlockwise' : 'clockwise'} to face ${DN[q.to]}. How many degrees did it turn?`;
      if (id === 'ang-2') return q.T === 180 ? 'A ramp leans on the straight track. Find the missing angle x.' : 'Roads meet at a roundabout. Find the missing angle x.';
      return 'A triangle warning sign has two angles marked. Find the third angle, x.';
    } },
  shp: { name: 'Paint Bay', skill: 'Shapes', accent: '#9DF26B',
    who: ['Zoe', 'sign painter', 'Tape goes round the edge, paint goes on the inside. Never mix them up.'],
    blurb: 'Neon tape round the edges, paint across the floors. Measure every shape before you start.',
    levels: [
      { title: 'Perimeter', eg: '9 cm × 5 cm', idea: 'Perimeter is the distance all the way round the edge. For a rectangle, add one length and one width, then double it.', watch: 'Perimeter is the edge, not the inside. Add the sides, don\'t multiply them.', explore: 'rect' },
      { title: 'Area', eg: '6 × 4 = 24 cm²', idea: 'Area is how many 1 cm squares cover the inside. Rows times squares in each row: length × width. It is measured in cm².', watch: 'Area multiplies and uses square units (cm²). Perimeter adds.', explore: 'rect' },
      { title: 'L-shaped areas', eg: 'A + B', idea: 'Cut the L-shape into two rectangles. Work out any missing sides, find each area, then add them.', watch: 'Use the sides of each small rectangle, not the sides of the whole shape.' }],
    story(id, q) {
      if (id === 'shp-1') return `Neon tape goes all the way round a ${q.l} cm by ${q.w} cm sign. How much tape is needed?`;
      if (id === 'shp-2') return `A ${q.l} cm by ${q.w} cm decal gets painted. What area does it cover?`;
      return 'An L-shaped garage floor needs painting. What is its area?';
    } }
};
const ORDER = GROUPS.flatMap(g => g.topics);
const groupOf = id => GROUPS.find(g => g.topics.includes(id));
const lvOf = id => S.lv[id] || 0;
const groupOpen = g => !g.needs || lvOf(g.needs[0]) >= g.needs[1];
const startedIn = id => lvOf(id) > 0 || [0, 1, 2].some(l => S.read[`${id}-${l}`]); // progress from before the new districts stays open
const districtOpen = id => { const g = groupOf(id), i = g.topics.indexOf(id); return startedIn(id) || (groupOpen(g) && (i === 0 || lvOf(g.topics[i - 1]) >= 1)); };
const lockReason = id => { const g = groupOf(id), i = g.topics.indexOf(id); if (!groupOpen(g)) return g.needs[2]; return `Clear ${T[g.topics[i - 1]].name} level 1 to open`; };
const bossOpen = () => ORDER.every(k => lvOf(k) >= 3);
const LEVELS = ORDER.length * 3;
const totalCleared = () => ORDER.reduce((t, k) => t + lvOf(k), 0) + (S.boss ? 1 : 0);
const rankName = t => t >= 22 ? 'Legend' : t >= 16 ? 'Ace' : t >= 11 ? 'Pro' : t >= 6 ? 'Driver' : t >= 2 ? 'Runner' : 'Rookie';
const starsOf = (id, l) => (S.stars && S.stars[`${id}-${l}`]) || 0;
const starsTotal = id => [0, 1, 2].reduce((t, l) => t + starsOf(id, l), 0);
const nextMission = () => ORDER.find(k => districtOpen(k) && lvOf(k) < 3) || (bossOpen() ? 'boss' : null);
const methodOf = (id, l) => NB.Methods[`${id}-${l + 1}`];
const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

/* ---------- cars ---------- */
const CARS = [
  { name: 'Old banger', type: 'banger', price: 0, c: '#9a8fbf' }, { name: 'Hatchback', type: 'hatch', price: 2500, c: '#2EE59D' }, { name: 'Pizza scooter', type: 'scooter', price: 6000, c: '#c77dff' },
  { name: 'Muscle car', type: 'muscle', price: 12000, c: '#FF9D45' }, { name: 'Sports coupe', type: 'coupe', price: 20000, c: '#20D9D2' }, { name: 'Hypercar', type: 'hyper', price: 30000, c: '#FF4F91' }];
const PAINTS = ['#FF4F91', '#20D9D2', '#FF9D45', '#FFC21A', '#9b5cff', '#2EE59D', '#f4f1ff', '#1c1a24'];
const carGot = i => S.cash >= CARS[i].price; // unlocks go by total cash earned, so spending on mods never re-locks a car
const wallet = () => Math.max(0, S.cash - (S.spent || 0));
const modsOf = i => (S.mods && S.mods[i]) || {};
const carStats = i => NB.Race.stats(CARS[i].type, modsOf(i));
function myCar() { let i = S.car; if (i == null || !carGot(i)) { i = 0; CARS.forEach((c, k) => { if (carGot(k)) i = k; }); } return { i, type: CARS[i].type, color: (S.carColor && S.carColor[i]) || CARS[i].c, name: CARS[i].name }; }
const carSVG = (c, got, type, mods) => NB.carArt(type || 'hatch', c, { locked: !got, mods });

/* ---------- icons ---------- */
const LOCK = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2.5" y="7" width="11" height="8" rx="1.5" fill="currentColor"/><path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="2" fill="none"/></svg>';
const LOCKOPEN = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2.5" y="7" width="11" height="8" rx="1.5" fill="currentColor"/><path d="M5 7V5a3 3 0 0 1 5.8-1" stroke="currentColor" stroke-width="2" fill="none"/></svg>';
const BILL = '<svg class="bill-ic" viewBox="0 0 26 18" aria-hidden="true"><rect x="3" y="1" width="22" height="12" rx="2" fill="#1a9c63"/><rect x="1" y="4" width="22" height="12" rx="2" fill="#2EE59D" stroke="#0c6b45"/><circle cx="12" cy="10" r="3" fill="#0c6b45"/></svg>';
const BULB = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#FFC21A" d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/><rect x="8.5" y="18" width="7" height="2" rx="1" fill="#fff"/><rect x="9.5" y="21" width="5" height="1.6" rx=".8" fill="#fff"/></svg>';
const CARIC = '<svg viewBox="0 0 30 18" aria-hidden="true"><path fill="currentColor" d="M2 13l2-5q1-2 3-2h4l3-3q1-1 3-1h5q2 0 3 2l2 3q3 .5 3 3v3H2z"/><circle cx="8" cy="14" r="3" fill="#171126" stroke="currentColor" stroke-width="1.5"/><circle cx="22" cy="14" r="3" fill="#171126" stroke="currentColor" stroke-width="1.5"/></svg>';
const FLAG = '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="4" width="3" height="58" fill="#ddd"/><g transform="skewY(-8) translate(0 6)">' + [0, 1, 2, 3].map(r => [0, 1, 2, 3, 4].map(c => `<rect x="${9 + c * 10}" y="${6 + r * 8}" width="10" height="8" fill="${(r + c) % 2 ? '#111' : '#fff'}"/>`).join('')).join('') + '</g></svg>';
const IC = {
  rank: '<svg class="ic" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2 28 7v9c0 7-5 12-12 14C9 28 4 23 4 16V7Z" fill="#FFC53D"/><path d="M16 5 25 9v7c0 5-4 9-9 11-5-2-9-6-9-11V9Z" fill="#0B0820"/><path d="m9 13 7 4 7-4M9 18l7 4 7-4" fill="none" stroke="#FFC53D" stroke-width="2.6" stroke-linejoin="round"/></svg>',
  coin: '<svg class="ic" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="17" r="13" fill="#b8801c"/><circle cx="16" cy="15" r="13" fill="#FFC53D"/><circle cx="16" cy="15" r="9.5" fill="none" stroke="#b8801c" stroke-width="2"/><path d="M19.5 11.5c-.8-1-2-1.5-3.5-1.5-2 0-3.4 1-3.4 2.5 0 3.4 7.3 1.7 7.3 5.2 0 1.5-1.6 2.6-3.7 2.6-1.6 0-3-.6-3.8-1.7M16 8v2m0 10.3v2" fill="none" stroke="#7a5310" stroke-width="2.2" stroke-linecap="round"/></svg>',
  play: '<svg class="ic" viewBox="0 0 32 32" aria-hidden="true"><path d="M10 6.5v19a1.5 1.5 0 0 0 2.3 1.3l15-9.5a1.5 1.5 0 0 0 0-2.6l-15-9.5A1.5 1.5 0 0 0 10 6.5Z" fill="currentColor"/></svg>',
  wrench: '<svg class="ic" viewBox="0 0 32 32" aria-hidden="true"><path d="M26.8 8.6 22 13.4l-3.4-.9-.9-3.4 4.8-4.8a7 7 0 0 0-9 8.7L5 21.5a2.9 2.9 0 1 0 4.1 4.1l8.5-8.5a7 7 0 0 0 9.2-8.5Z" fill="currentColor"/></svg>',
  trophy: '<svg class="ic" viewBox="0 0 32 32" aria-hidden="true"><path d="M9 4h14v7a7 7 0 0 1-14 0Z" fill="currentColor"/><path d="M9 7H4v2a5 5 0 0 0 5 5m14-7h5v2a5 5 0 0 1-5 5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M13 18h6v4h-6zM10 25h12v3H10z" fill="currentColor"/></svg>',
  star: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 3 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.8 5.7 21.4l1.5-7.1L1.8 9.4 9 8.6Z" fill="currentColor"/></svg>',
  back: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4 7 12l8 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  flag: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 22V3" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M6 4h13l-3 4.5 3 4.5H6Z" fill="currentColor"/></svg>'
};
const NOVA_HOLO = `<svg class="nova-holo" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="nhg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22E5E0" stop-opacity=".9"/><stop offset="1" stop-color="#22E5E0" stop-opacity=".15"/></linearGradient></defs>
  <ellipse cx="32" cy="60" rx="18" ry="3" fill="#22E5E0" opacity=".5"/><path d="M14 58 22 40h20l8 18Z" fill="#22E5E0" opacity=".12"/>
  <path d="M32 6c11 0 18 8 18 18 0 9-6 16-18 16S14 33 14 24C14 14 21 6 32 6Z" fill="url(#nhg)" stroke="#22E5E0" stroke-width="1.5"/>
  <path d="M18 18c4-6 10-8 14-8s10 2 14 8c-5-2-9-3-14-3s-9 1-14 3Z" fill="#FF3D8B" opacity=".8"/>
  <g class="nh-eyes"><rect x="22" y="22" width="7" height="5" rx="2.5" fill="#fff"/><rect x="35" y="22" width="7" height="5" rx="2.5" fill="#fff"/></g>
  <path d="M26 32q6 4 12 0" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
  <g stroke="#22E5E0" stroke-opacity=".25" stroke-width="1"><path d="M14 14h36M13 20h38M13 26h38M14 32h36M17 38h30"/></g></svg>`;
const GEAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.4 7.4 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5A3.5 3.5 0 1 1 13 8.5a3.5 3.5 0 0 1 0 7z"/></svg>';

/* ---------- HUD ---------- */
const XP_STEP = 1500;
let walletBusy = false, V = { view: 'lobby' }, J = null;
const app = document.getElementById('app');
function hud() {
  const xp = S.xp || 0, into = xp % XP_STEP, cashTxt = money(wallet());
  document.getElementById('hud').innerHTML =
    `<div class="pl-chip" title="Crew rank and XP">${IC.rank}<div><b>${rankName(totalCleared())}</b><div class="xpbar"><i style="width:${(into / XP_STEP * 100).toFixed(1)}%"></i></div><small>${into.toLocaleString('en-US')} / ${XP_STEP.toLocaleString('en-US')} XP</small></div></div>
    <div class="cash-chip" title="Cash to spend">${IC.coin}<b>${hud.pc || cashTxt}</b></div>
    <button class="gear" data-act="gear" aria-label="Settings" aria-expanded="${!!V.gear}">${GEAR}</button>
    ${V.gear ? `<div class="gear-pop"><button class="btn sm" data-act="sound">Sound effects: ${S.sound === false ? 'off' : 'on'}</button>
      <button class="btn sm" data-act="voice">Lesson voice: ${S.voice === false ? 'off' : 'on'}</button>
      ${NB.Voice.supported ? '<button class="btn sm" data-act="vopen">Change NOVA\'s voice</button>' : ''}
      <button class="btn sm" data-act="reset">Reset progress</button><p>Progress saves in this browser only.</p></div>` : ''}`;
  const cb = $('.cash-chip b');
  if (cb && !walletBusy) { if (hud.pc && hud.pc !== cashTxt && NB.FX) NB.FX.roll(cb, cashTxt); else cb.textContent = cashTxt; hud.pc = cashTxt; }
}
function payFx(fromEl) {
  if (!NB.FX || !fromEl) return;
  walletBusy = true;
  NB.FX.toWallet(fromEl, () => $('.cash-chip'), { count: 4 }).then(() => { walletBusy = false; hud(); });
}

/* ---------- daily challenge & race ---------- */
function daily() { if (!S.daily || S.daily.d !== today()) S.daily = { d: today(), n: 0, done: false }; return S.daily; }
function dailyTick() { const d = daily(); if (d.done) return; d.n++; if (d.n >= 5) { d.done = true; S.cash += 250; sfx('cash'); setTimeout(burst, 200); } save(); }
function untilMidnight() { const n = new Date(), m = new Date(n); m.setHours(24, 0, 0, 0); const s = Math.max(0, m - n) / 1000; return `${Math.floor(s / 3600)}h ${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}m`; }
function dailyHTML() {
  const d = daily();
  return `<div class="daily ${d.done ? 'done' : ''}"><span class="chk" aria-hidden="true" style="--p:${Math.min(d.n, 5) * 20}%">${d.done ? '✓' : `${Math.min(d.n, 5)}<small>/5</small>`}</span><div style="flex:1">
    <h4>Daily challenge</h4><p>${d.done ? 'Done for today. Come back tomorrow!' : 'Get 5 job answers right today. It also unlocks the race.'}</p>
    <div class="row2"><span class="pay">${d.done ? 'Paid' : '+' + money(250)}</span><span class="timer" id="dtimer">⏱ ${untilMidnight()}</span></div></div></div>`;
}
function raceState() { S.race = S.race || { league: 0, wins: 0, last: null }; return S.race; }
function dayNum() { const d = new Date(); return d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate(); }
function raceCard() {
  const r = raceState(), Rc = NB.Race, L = Rc.LEAGUES[Math.min(r.league, Rc.LEAGUES.length - 1)], d = daily(), c = myCar(), me = Rc.rating(carStats(c.i));
  const done = r.last && r.last.d === today();
  const riv = Rc.rivals(r.league, dayNum()), best = Math.max(...riv.map(x => Rc.rating(x.stats)));
  let body, btn = '', pips = '';
  if (done) body = `You came <b>${['1st', '2nd', '3rd', '4th'][r.last.place - 1]}</b> today. Next race in <span class="rc-cd">${untilMidnight()}</span>.`;
  else if (!d.done) { const n = Math.min(d.n, 5); body = 'Get 5 job answers right today to unlock it.'; pips = `<div class="rcd-pips" role="img" aria-label="${n} of 5 right answers">${[0, 1, 2, 3, 4].map(i => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}<span>${n}/5</span></div>`; }
  else { body = `Your ${c.name} has a rating of <b>${me}</b>. The fastest rival has <b>${best}</b>.`; btn = '<button class="rc-go" data-act="race">Race now ▶</button>'; }
  const state = done ? 'done' : !d.done ? 'locked' : 'ready';
  return `<section class="race-card ${state}" style="--lc:${L.color}">
    <div class="rcd-flag" aria-hidden="true">${state === 'locked' ? `<span class="rcd-lock">${LOCK}</span>` : ''}</div>
    <div class="rcd-t"><span class="rcd-l">${L.name}</span><h3>${done ? 'Race done for today' : !d.done ? 'Race locked' : 'Race ready'}</h3><p>${body}</p>${pips}
      <div class="rcd-meta"><span>🏆 ${r.wins || 0} win${r.wins === 1 ? '' : 's'}</span><span>League ${Math.min(r.league, 4) + 1} of 5</span><span>Winner gets ${money(L.prize)}</span></div></div>${btn}</section>`;
}
function openRace() {
  const r = raceState(), c = myCar();
  if (r.last && r.last.d === today()) return;
  new NB.Race.RaceScreen({ player: { name: c.name, type: c.type, color: c.color, stats: carStats(c.i), mods: modsOf(c.i) }, league: r.league, seed: dayNum(), sfx,
    onStart: () => { r.last = { d: today(), place: 4 }; save(); },
    onDone: ({ place }) => {
      const L = NB.Race.LEAGUES[Math.min(r.league, 4)], cash = Math.round(L.prize * [1, .4, .2, .1][place - 1]), xp = [80, 40, 25, 15][place - 1];
      r.last = { d: today(), place }; S.cash += cash; S.xp = (S.xp || 0) + xp; let promoted = '';
      if (place === 1) { r.wins = (r.wins || 0) + 1; if (r.league < 4) { r.league++; promoted = NB.Race.LEAGUES[r.league].name; } }
      save(); hud(); return { cash, xp, promoted };
    },
    onExit: nav => { if (nav === 'garage') go({ view: 'garage' }); else render(); }
  }).open();
}

/* ---------- voice picker ---------- */
NB.voicePref = S.voicePref || {};
const VSAMPLE = "Hi! I'm NOVA, your co-pilot. 47 times 6 is 282. Let's crack some maths!";
const cleanName = n => n.replace(/^(Microsoft|Google|Apple)\s+/i, '').replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+-\s+English.*$/i, '').trim();
function vpHTML() {
  const vs = NB.Voice.list(), cur = NB.voicePref.name || '', p = NB.voicePref;
  const row = (i, name, sub, on) => `<div class="vp-row ${on ? 'on' : ''}"><button class="vp-pick" data-act="vpick" data-v="${i}" aria-pressed="${on}"><span class="dot"></span><span><b>${esc(name)}</b><small>${sub}</small></span></button><button class="btn sm" data-act="vtry" data-v="${i}">▶ Try</button></div>`;
  return `<div class="vp-back" data-act="vclose"></div><div class="vp" role="dialog" aria-modal="true" aria-label="Choose NOVA's voice">
    <h3>Choose NOVA's voice</h3>
    <p>These are the voices built into this device, so the list is different on a phone, tablet or computer. Tap <b>Try</b> to hear one.</p>
    <div class="vp-list">${row(-1, 'Automatic', 'Best English voice on this device', !cur)}
      ${vs.length ? vs.map((v, i) => row(i, cleanName(v.name), NB.Voice.langLabel(v.lang) + (v.localService ? '' : ', needs internet'), cur === v.name)).join('') : '<p class="muted">No English voices found yet. They can take a moment to load.</p>'}</div>
    <div class="vp-sliders"><label for="vrate">Speed <output id="vrate-o">${(p.rate || .92).toFixed(2)}×</output></label><input type="range" id="vrate" min="0.6" max="1.4" step="0.02" value="${p.rate || .92}">
      <label for="vpitch">Pitch <output id="vpitch-o">${(p.pitch != null ? p.pitch : 1.05).toFixed(2)}</output></label><input type="range" id="vpitch" min="0.5" max="1.7" step="0.05" value="${p.pitch != null ? p.pitch : 1.05}"></div>
    <div class="actions"><button class="btn" data-act="vtry" data-v="cur">▶ Hear it</button><button class="btn" data-act="vreset">Reset</button><button class="btn primary" data-act="vclose">Done</button></div></div>`;
}
function vpRender() {
  let el = document.getElementById('vp'); if (!V.vp) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'vp'; document.body.appendChild(el); }
  const sc = el.querySelector('.vp-list') ? el.querySelector('.vp-list').scrollTop : 0; el.innerHTML = vpHTML(); el.querySelector('.vp-list').scrollTop = sc;
}
function vpSave() { S.voicePref = NB.voicePref; save(); }
NB.Voice.onChange(() => { if (V.vp) vpRender(); });

/* ---------- home ---------- */
function novaLines() {
  const n = nextMission(), h = new Date().getHours(), hi = h < 12 ? 'Morning' : h < 18 ? 'Hey' : 'Evening', d = daily(), r = raceState(), raced = r.last && r.last.d === today();
  const L = [];
  if (n && n !== 'boss') L.push(`${hi}, driver! ${T[n].name} level ${Math.min(lvOf(n), 2) + 1} is waiting. Tap Play.`);
  else if (n === 'boss') L.push(`${hi}! The Big Score is open. Time for the finale.`);
  else L.push(`${hi}, legend. Every mission cleared. Replays still pay!`);
  if (!d.done) L.push(`Daily challenge: ${Math.min(d.n, 5)} of 5 right answers. Finish it to unlock today's race.`);
  else if (!raced) L.push("Today's race is ready. Check your car in the Garage first.");
  else L.push('Race done for today. Upgrade your car for tomorrow.');
  L.push('Seven districts, three areas of Neon Bay. Every right answer earns cash for car upgrades.');
  return L;
}
function homeView() {
  const c = myCar(), rt = NB.Race.rating(carStats(c.i)), n = nextMission(), d = daily(), r = raceState(), raced = r.last && r.last.d === today();
  const sub = n === 'boss' ? 'The Big Score' : n ? `${T[n].name} · L${Math.min(lvOf(n), 2) + 1}` : 'Replay any mission';
  return `<section class="home2" aria-label="Neon Bay">
    <div class="h2-scene"></div>
    <button class="h2-nova" data-act="nova" aria-label="NOVA says">${NOVA_HOLO}<span class="h2-say" aria-live="polite"></span></button>
    <div class="h2-plate"><b>${c.name}</b><span>${IC.flag} Rating ${rt}</span></div>
    <nav class="h2-menu">
      <button class="jb jb-play" data-act="board">${IC.play}<span><b>Play</b><small>${sub}</small></span></button>
      <div class="h2-row">
        <button class="jb jb-garage" data-act="garage">${IC.wrench}<b>Garage</b>${d.done && !raced ? '<i class="jb-dot">Race!</i>' : ''}</button>
        <button class="jb jb-prog" data-act="progress">${IC.trophy}<b>Progress</b></button>
      </div></nav></section>`;
}
let HS = null;
function mountHome() {
  const host = $('.h2-scene'); if (!host) return;
  if (HS) HS.dispose(); const c = myCar(); HS = new NB.HomeScene(host, { car: { type: c.type, color: c.color, mods: modsOf(c.i) } });
  const say = $('.h2-say'), lines = novaLines(); let i = 0;
  const type = t => { if (!say) return; clearInterval(mountHome.ti); say.textContent = ''; let k = 0;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { say.textContent = t; return; }
    mountHome.ti = setInterval(() => { say.textContent = t.slice(0, ++k); if (k >= t.length) clearInterval(mountHome.ti); }, 22); };
  setTimeout(() => type(lines[0]), 450);
  mountHome.next = () => { i = (i + 1) % lines.length; type(lines[i]); };
}


/* ---------- circuit map: every district is a stop around the track, the finale is the finish line ---------- */
const TRACK = 'M70 470 L70 330 Q70 290 110 290 L150 290 Q190 290 190 250 L190 190 Q190 150 150 150 L100 150 Q60 150 60 110 L60 92 Q60 52 100 52 L262 52 Q302 52 302 92 L302 196 Q302 236 266 240 Q236 244 236 280 L236 330 Q236 368 274 372 Q302 376 302 412 L302 470 Q302 510 262 510 L110 510 Q70 510 70 470 Z';
const STOPS = [.05, .15, .25, .4, .5, .62, .74, .92];
function mapHTML(next) {
  const trees = [[24, 40], [140, 100], [128, 210], [30, 250], [26, 400], [140, 380], [180, 440], [340, 140], [344, 300], [262, 160], [210, 560], [120, 548]];
  const tyres = [[22, 160], [338, 250], [250, 420], [140, 470]];
  const ids = ORDER.concat('boss');
  return `<section class="cmap" aria-label="Neon Bay circuit map">
    <svg viewBox="0 0 360 560" class="cm-svg" aria-hidden="true">
      <rect width="360" height="560" fill="#62b14a"/>${Array.from({ length: 10 }, (_, i) => `<rect y="${i * 56}" width="360" height="28" fill="#6bbb52"/>`).join('')}
      <rect x="112" y="318" width="100" height="40" rx="4" fill="#c9cfd5" stroke="#2e3238" stroke-width="2"/><rect x="118" y="324" width="88" height="12" fill="#e84a4a"/><rect x="118" y="340" width="88" height="12" fill="#5EC3E8"/>
      <path d="${TRACK}" fill="none" stroke="#f1f3f5" stroke-width="38" stroke-linejoin="round"/>
      <path d="${TRACK}" fill="none" stroke="#e84a4a" stroke-width="38" stroke-dasharray="10 10" stroke-linejoin="round"/>
      <path d="${TRACK}" fill="none" stroke="#4a4f57" stroke-width="30" stroke-linejoin="round"/>
      <path d="${TRACK}" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="2" stroke-dasharray="9 9"/>
      <g transform="translate(55 486)">${Array.from({ length: 12 }, (_, i) => `<rect x="${(i % 6) * 5}" y="${Math.floor(i / 6) * 5}" width="5" height="5" fill="${(i + Math.floor(i / 6)) % 2 ? '#15181c' : '#fff'}"/>`).join('')}</g>
      ${tyres.map(([x, y]) => [0, 1, 2].map(k => `<circle cx="${x}" cy="${y + k * 9}" r="5" fill="#15181c"/><circle cx="${x}" cy="${y + k * 9}" r="2" fill="${k === 1 ? '#e84a4a' : '#5d646c'}"/>`).join('')).join('')}
      ${trees.map(([x, y], i) => `<circle cx="${x + 4}" cy="${y + 5}" r="13" fill="rgba(0,0,0,.18)"/><circle cx="${x}" cy="${y}" r="13" fill="${i % 2 ? '#3f9a3a' : '#4aa944'}"/><circle cx="${x - 4}" cy="${y - 4}" r="5" fill="#7cd16a"/>`).join('')}
      <path id="cm-track" d="${TRACK}" fill="none" stroke="none"/>
    </svg>
    ${ids.map((id, i) => {
      const boss = id === 'boss', open = boss ? bossOpen() : districtOpen(id), t = boss ? null : T[id], done = boss ? S.boss : lvOf(id) >= 3;
      return `<button class="cm-stop ${open ? '' : 'locked'} ${next === id ? 'next' : ''} ${done ? 'done' : ''}" data-at="${STOPS[i]}" style="--accent:${boss ? '#3DBE6E' : t.accent}"
        data-act="${open ? (boss ? 'job' : 'district') : 'locked'}" data-id="${id}" data-l="0" aria-label="${boss ? 'The Big Score' : t.name}${open ? '' : ', locked'}">
        <span class="cm-em">${open ? emblem(id) : LOCK}</span><span class="cm-lab">${boss ? 'Finale' : t.name}${boss ? '' : `<i>${[0, 1, 2].map(k => `<b class="${k < lvOf(id) ? 'on' : ''}"></b>`).join('')}</i>`}</span></button>`;
    }).join('')}
    <img class="cm-car" alt="" src="" hidden>
  </section>`;
}
function mountMap() {
  const sec = $('.cmap'), path = document.getElementById('cm-track'); if (!sec || !path) return;
  const len = path.getTotalLength(), place = (el, f) => { const p = path.getPointAtLength(len * f); el.style.left = (p.x / 360 * 100) + '%'; el.style.top = (p.y / 560 * 100) + '%'; return p; };
  sec.querySelectorAll('.cm-stop').forEach(b => place(b, +b.dataset.at));
  const nx = sec.querySelector('.cm-stop.next'), car = sec.querySelector('.cm-car'), c = myCar();
  if (nx) {
    const f = +nx.dataset.at - .035, p = path.getPointAtLength(len * f), q = path.getPointAtLength(len * (f + .01));
    car.src = NB.carArt(c.type, c.color, { mods: modsOf(c.i) }).match(/src="([^"]*)"/)[1]; car.hidden = false; place(car, f);
    car.style.setProperty('--rot', (Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI + 90) + 'deg');
  }
}

/* ---------- missions board: three areas, seven districts ---------- */
const ring = (v, max, color) => { const r = 19, c = 2 * Math.PI * r; return `<svg class="ring" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="${r}" class="ring-bg"/>${v ? '' : '<!--'}<circle cx="24" cy="24" r="${r}" class="ring-fg" style="stroke:${color};stroke-dasharray:${(c * v / max).toFixed(1)} ${c.toFixed(1)}"/>${v ? '' : '-->'}</svg>`; };
function districtCard(id, next) {
  const t = T[id], open = districtOpen(id), lv = lvOf(id), st = starsTotal(id);
  return `<button class="dcard ${open ? '' : 'locked'} ${next === id ? 'next' : ''}" style="--accent:${t.accent}" data-act="${open ? 'district' : 'locked'}" data-id="${id}" ${open ? '' : `aria-label="${t.name}, locked. ${lockReason(id)}"`}>
    <span class="dc-em">${emblem(id)}</span>
    <span class="dc-t"><small>${t.skill}</small><b>${t.name}</b>
      <span class="dc-lv">${[0, 1, 2].map(k => `<i class="${k < lv ? 'on' : ''}"></i>`).join('')}<em>${open ? (lv >= 3 ? 'All clear' : `Level ${lv + 1} next`) : `${LOCK} ${lockReason(id)}`}</em></span></span>
    <span class="dc-st">${ring(st, 15, t.accent)}<span>${st}<small>/15</small></span></span>
    ${next === id ? '<span class="dc-badge">Next up</span>' : ''}</button>`;
}
function board() {
  const next = nextMission();
  let h = `<div class="pg-top"><button class="btn" data-act="lobby">${IC.back} Home</button><h1>Missions</h1></div>${mapHTML(next)}`;
  if (next && next !== 'boss') {
    const t = T[next], l = Math.min(lvOf(next), 2);
    h += `<section class="nextup" style="--accent:${t.accent}"><span class="nu-em">${emblem(next)}</span><div class="nu-t"><span>Next up · ${t.name}</span><b>Level ${l + 1}: ${t.levels[l].title}</b><small>${t.levels[l].eg}</small></div>
      <button class="b-go" data-act="brief" data-id="${next}" data-l="${l}">${S.read[`${next}-${l}`] ? 'Continue ▶' : 'Start ▶'}</button></section>`;
  }
  h += dailyHTML();
  GROUPS.forEach((g, gi) => {
    const open = groupOpen(g), done = g.topics.reduce((t, k) => t + lvOf(k), 0);
    h += `<section class="area ${open ? '' : 'locked'}" aria-labelledby="ar-${g.id}"><header class="area-h"><span class="area-n">Area ${gi + 1}</span><h2 id="ar-${g.id}">${g.name}</h2><p>${g.sub}</p><span class="area-p">${done}/${g.topics.length * 3} levels</span></header>
      <div class="dcards">${g.topics.map(id => districtCard(id, next)).join('')}</div></section>`;
  });
  const bo = bossOpen();
  h += `<section class="area"><header class="area-h"><span class="area-n">Finale</span><h2>The Big Score</h2><p>One question from every district</p></header>
    <button class="dcard boss ${bo ? '' : 'locked'} ${next === 'boss' ? 'next' : ''}" style="--accent:#2EE59D" data-act="${bo ? 'job' : 'locked'}" data-id="boss" data-l="0">
      <span class="dc-em">${emblem('boss')}</span><span class="dc-t"><small>All skills</small><b>The Big Score</b><span class="dc-lv"><em>${bo ? (S.boss ? 'Replay for cash' : '7 questions, one per district') : `${LOCK} Clear level 3 in every district`}</em></span></span>
      <span class="dc-st">${ring((S.stars && S.stars.boss) || 0, 7, '#2EE59D')}<span>${(S.stars && S.stars.boss) || 0}<small>/7</small></span></span></button></section>`;
  h += `<h2 class="pg-h">Street racing</h2>${raceCard()}`;
  return h;
}

/* ---------- district: three levels, each lesson → job ---------- */
const starRow = (n, max) => `<span class="lv-stars" aria-label="${n} of ${max} stars">${'★'.repeat(n)}<span class="off">${'★'.repeat(max - n)}</span></span>`;
const backBtn = (act, label, id) => `<button class="btn" data-act="${act}" ${id ? `data-id="${id}"` : ''}>${IC.back} ${label}</button>`;
function district(id) {
  const t = T[id], cl = lvOf(id), [who, role, quote] = t.who;
  let h = `<div class="pg-top">${backBtn('board', 'Missions')}</div>
    <section class="dist2" style="--accent:${t.accent}">
    <header class="d-hero"><span class="d-em">${emblem(id, 'big')}</span><div><span class="d-tag">${groupOf(id).name} · ${t.skill}</span><h1>${t.name}</h1><p>${t.blurb}</p>
      <div class="d-who"><span class="av">${who[0]}</span><span><b>${who}, ${role}</b>“${quote}”</span></div></div></header><ol class="d-levels">`;
  t.levels.forEach((lv, i) => {
    const key = `${id}-${i}`, locked = i > cl, read = !!S.read[key], cleared = i < cl;
    const nextStep = cleared ? -1 : read ? 1 : 0;
    const step = (n, act, label, on) => `<button class="lv-step ${on ? 'done' : ''} ${n === nextStep ? 'next' : ''}" data-act="${act}" data-id="${id}" data-l="${i}"><i>${on ? '✓' : n + 1}</i><span>${label}</span></button>`;
    h += `<li class="lvrow ${locked ? 'locked' : ''} ${i === Math.min(cl, 2) && !locked ? 'cur' : ''}">
      <div class="lv-n">Level ${i + 1}</div><div class="lv-t"><b>${lv.title}</b><span>${lv.eg}</span></div>${starRow(starsOf(id, i), 5)}
      <div class="lv-acts">${locked ? `<span class="lockmsg">${LOCK} Pass the level ${i} job to unlock</span>`
        : `<div class="lv-track two">${step(0, 'brief', 'Brief & lesson', read)}${step(1, 'job', cleared ? 'Replay the job' : 'The job', cleared)}</div>`}</div></li>`;
  });
  return h + '</ol></section>';
}

/* ---------- mission brief: the big idea before the lesson ---------- */
function exampleSheet(id, l) {
  const c = NB.Content[`${id}-${l + 1}`], M = methodOf(id, l), q = c.handover.watch.q || { a: c.handover.watch.a, b: c.handover.watch.b, key: 'w' };
  return { S: M.build(q, 'watch'), q };
}
function bigPicture(id, l) {
  const { S: Sh } = exampleSheet(id, l), vals = {}; Sh.moves.forEach(m => { vals[m.key] = m.answer; });
  if (Sh.visual) return NB.StepRenderer.html(Sh.visual({ vals, mode: 'watch' }));
  return NB.StepRenderer.html({ type: 'area', props: { tens: Sh.t, ones: Sh.o, mult: Sh.b } });
}
function explorer(kind) {
  if (kind === 'angle') return `<div class="xp" data-x="angle"><div class="xp-h"><b>Try it: turn the angle</b><span id="xa-name">Acute</span></div>
    <svg viewBox="0 0 220 130" class="xa" aria-hidden="true"><path id="xa-arc" class="xa-arc"/><line x1="110" y1="110" x2="200" y2="110" class="xa-base"/><line id="xa-ray" x1="110" y1="110" x2="200" y2="110" class="xa-ray"/><circle cx="110" cy="110" r="4" class="xa-dot"/><text id="xa-deg" x="110" y="30" class="xa-deg">60°</text></svg>
    <label class="xp-row" for="xa-r">Angle <input type="range" id="xa-r" min="0" max="360" step="5" value="60"></label>
    <div class="xp-snap">${[45, 90, 180, 270, 360].map(v => `<button class="chip-b" data-snap="${v}">${v}°</button>`).join('')}</div></div>`;
  return `<div class="xp" data-x="rect"><div class="xp-h"><b>Try it: stretch the rectangle</b></div>
    <div class="xr" id="xr-g"></div>
    <div class="xp-two"><label class="xp-row" for="xr-l">Length <input type="range" id="xr-l" min="1" max="10" value="6"></label><label class="xp-row" for="xr-w">Width <input type="range" id="xr-w" min="1" max="6" value="3"></label></div>
    <div class="xr-out"><span><small>Perimeter (round the edge)</small><b id="xr-p">18 cm</b></span><span><small>Area (squares inside)</small><b id="xr-a">18 cm²</b></span></div></div>`;
}
function wireExplorers() {
  const ar = $('#xa-r');
  if (ar) {
    const draw = () => {
      const v = +ar.value, rad = v * Math.PI / 180, x = 110 + 90 * Math.cos(rad), y = 110 - 90 * Math.sin(rad);
      $('#xa-ray').setAttribute('x2', x.toFixed(1)); $('#xa-ray').setAttribute('y2', y.toFixed(1));
      const r = 34, ax = 110 + r * Math.cos(rad), ay = 110 - r * Math.sin(rad);
      $('#xa-arc').setAttribute('d', v >= 360 ? `M144 110 A34 34 0 1 0 76 110 A34 34 0 1 0 144 110` : v === 0 ? '' : `M110 110 L144 110 A${r} ${r} 0 ${v > 180 ? 1 : 0} 0 ${ax.toFixed(1)} ${ay.toFixed(1)} Z`);
      $('#xa-deg').textContent = `${v}°`;
      $('#xa-name').textContent = v === 0 ? 'No turn' : v < 90 ? 'Acute: less than a right angle' : v === 90 ? 'Right angle: a quarter turn' : v < 180 ? 'Obtuse: between 90° and 180°' : v === 180 ? 'Straight line: a half turn' : v < 360 ? 'Reflex: more than a half turn' : 'Full turn';
    };
    ar.addEventListener('input', draw); draw();
    document.querySelectorAll('[data-snap]').forEach(b => b.addEventListener('click', () => { ar.value = b.dataset.snap; draw(); sfx('tick'); }));
  }
  const xl = $('#xr-l');
  if (xl) {
    const xw = $('#xr-w');
    const draw = () => {
      const l = +xl.value, w = +xw.value;
      $('#xr-g').style.setProperty('--l', l); $('#xr-g').innerHTML = '<i></i>'.repeat(l * w);
      $('#xr-p').textContent = `${2 * (l + w)} cm`; $('#xr-a').textContent = `${l * w} cm²`;
    };
    xl.addEventListener('input', draw); xw.addEventListener('input', draw); draw();
  }
}
function brief(id, l) {
  const t = T[id], lv = t.levels[l], { S: Sh } = exampleSheet(id, l), read = !!S.read[`${id}-${l}`];
  return `<div class="pg-top">${backBtn('district', t.name, id)}</div>
  <section class="brief" style="--accent:${t.accent}">
    <header class="b-head"><span class="b-em">${emblem(id)}</span><div><span class="d-tag">${t.name} · Level ${l + 1}</span><h1>${lv.title}</h1></div></header>
    <div class="b-grid">
      <article class="b-idea"><h2>The big idea</h2><p>${lv.idea}</p>
        <h3>How it goes</h3><ol class="b-steps">${Sh.steps.map(s => `<li>${s}</li>`).join('')}</ol>
        <div class="b-watch"><b>Watch out</b><p>${lv.watch}</p></div></article>
      <figure class="b-pic"><div class="b-vis">${bigPicture(id, l)}</div><figcaption>The worked example you'll see: ${NB.fracHTML(esc(Sh.head.done))}</figcaption></figure>
      ${lv.explore ? explorer(lv.explore) : ''}
    </div>
    <div class="b-path"><span class="on">1 Watch NOVA</span><span>2 Together</span><span>3 Less help</span><span>4 On your own</span><span>5 The job</span></div>
    <div class="b-acts"><button class="b-go" data-act="lesson" data-id="${id}" data-l="${l}">${read ? 'Replay the lesson ▶' : 'Start the lesson ▶'}</button>
      ${read || l < lvOf(id) ? `<button class="b-sec" data-act="job" data-id="${id}" data-l="${l}">Go to the job</button>` : ''}</div>
  </section>`;
}

/* ---------- jobs: typed answers, questions from the lesson's own method ---------- */
function makeQ(id, l, tier, used, extra = {}) {
  const mid = `${id}-${l + 1}`, M = NB.Methods[mid], q = M.gen(tier, used); used.push(q.key);
  const Sh = M.build(q, 'alone');
  return Object.assign({ id, l, mid, q, S: Sh, answer: Sh.tot, story: T[id].story(mid, q) }, extra);
}
function startJob(id, l) {
  const used = [], qs = [];
  if (id === 'boss') ORDER.forEach(k => qs.push(makeQ(k, 2, 1, used, { tag: T[k].name })));
  else {
    [0, 0, 1, 1, 2].forEach((tier, i) => {
      // one question looks back at the level before: spaced retrieval keeps old methods fresh
      if (i === 2 && l > 0) qs.push(makeQ(id, l - 1, 2, used, { tag: `Review: level ${l}` }));
      else qs.push(makeQ(id, l, tier, used));
    });
  }
  J = { id, l, qs, i: 0, tries: 0, earned: 0, bonus: 0, streak: 0, best: 0, hint: false, fb: null, mood: 'idle', say: `${qs.length} questions. Type each answer on the pad.`, t0: 0, replay: id === 'boss' ? !!S.boss : l < lvOf(id), unlocked: [], wasOpen: ORDER.filter(districtOpen) };
  go({ view: 'job' });
}
function workedHTML(Sh) {
  const by = {}; Sh.moves.forEach(m => { (by[m.row] = by[m.row] || []).push(m.answer); });
  return `<ol class="worked">${Sh.rows.filter(r => by[r.id]).map(r => { let k = 0; return `<li><span>${r.label}</span><span class="w-ex">${NB.fracHTML(esc(r.tpl)).replace(/\[\]/g, () => `<b>${by[r.id][k++]}</b>`)}</span></li>`; }).join('')}
    <li class="w-fin"><span>Answer</span><span class="w-ex"><b>${NB.fracHTML(esc(Sh.head.done))}</b></span></li></ol>`;
}
function jobMeta() {
  if (J.id === 'boss') return { title: 'The Big Score', accent: '#2EE59D', back: ['board', 'Missions'] };
  const t = T[J.id]; return { title: `${t.name} · Level ${J.l + 1} job`, accent: t.accent, back: ['district', t.name] };
}
function job() {
  const m = jobMeta(), x = J.qs[J.i], Sh = x.S, done = x.res !== undefined, hot = J.streak >= 3;
  const dots = `<div class="dots" aria-label="Question ${J.i + 1} of ${J.qs.length}">${J.qs.map((y, k) => `<span class="${y.res === true ? (y.clean ? 'ok' : 'meh') : y.res === false ? 'no' : k === J.i ? 'now' : ''}"></span>`).join('')}</div>`;
  const sum = NB.fracHTML(esc(Sh.head.fin)).replace('[]', done ? `<span class="slot ${x.res ? 'right' : 'wrong'}">${x.res ? x.answer : x.given || '?'}</span>` : '<span class="slot target" id="jslot"></span>');
  const pic = Sh.always && Sh.visual ? `<div class="job-vis">${NB.StepRenderer.html(Sh.visual({ vals: {}, mode: 'alone' }))}</div>` : '';
  let h = `<div class="pg-top job-top" style="--accent:${m.accent}">${backBtn(m.back[0], m.back[1], J.id === 'boss' ? '' : J.id)}${dots}</div>
  <section class="runcard job2" style="--accent:${m.accent}">
    <div class="run-h"><span class="rh-em">${emblem(x.id)}</span><b>${x.tag ? esc(x.tag) : m.title}</b><span class="ct">${J.i + 1} / ${J.qs.length}</span></div>
    <div class="run-b">
      <div class="job-nova"><div class="jn-n"></div><p class="jn-say" aria-live="polite">${esc(J.say || '')}</p></div>
      <div class="run-meta"><span class="streak ${hot ? 'hot' : ''}">Nitro ${[0, 1, 2].map(i => `<i class="${i < J.streak ? 'on' : ''}"></i>`).join('')} <small>${hot ? 'Double cash!' : '3 in a row for double cash'}</small></span><span class="paid">${money(J.earned)} this job</span></div>
      <p class="run-story">${x.story}</p>${pic}
      <div class="run-q">${sum}</div>
      <div class="fb ${J.fb ? J.fb.cls : ''}" aria-live="polite">${J.fb ? J.fb.t : ''}</div>`;
  if (!done) {
    if (J.hint || J.tries) h += `<div class="job-help"><div class="jh-steps">${Sh.steps.map((s, k) => `<span>${k + 1}. ${s}</span>`).join('')}</div><p>${BULB}${esc(Sh.moves[0].hints[0])}</p></div>`;
    h += `<div class="job-kp" id="jkp"></div>
      <div class="run-acts one">${J.hint || J.tries ? '' : `<button class="b-hint" data-act="hint">${BULB} Show the steps</button>`}</div>`;
  } else {
    if (!x.clean) h += `<div class="job-worked"><h3>${x.res ? 'How it works' : "Here's how it works"}</h3>${workedHTML(Sh)}</div>`;
    h += `<div class="run-acts"><button class="b-go" style="grid-column:1/-1" data-act="next">${J.i < J.qs.length - 1 ? 'Next question ▶' : 'Finish the job ▶'}</button></div>`;
  }
  return h + '</div></section>';
}
let KP = null;
/* NOVA in jobs: her mood follows the answer; she speaks with the lesson voice when it is on. */
let JN = null, JV = null;
function novaSay(mood, text) {
  J.mood = mood; J.say = text;
  if (S.voice === false) return;
  JV = JV || new NB.AudioController({ lessonId: 'jobs', isMuted: () => S.voice === false,
    onState: st => { if (!JN) return; if (st === 'playing') JN.set('talking'); else if (st === 'ended' || st === 'stopped') JN.set('idle'); } });
  setTimeout(() => JV.play('react', text), 700);   // let the mood show first, then she talks
}
function mountJob() {
  const nv = $('.jn-n');
  if (nv) { JN = new NB.TeacherController(nv); if (J.mood !== 'idle') JN.flash(J.mood, 1600, 'idle'); }
  const fx = J.fx; J.fx = null;
  if (fx) setTimeout(() => { const el = $('.run-q .slot') || $('.run-q'); if (fx.good) { NB.Reward.good(el, fx.good); NB.Reward.combo(J.streak, $('.run-q')); } else NB.Reward.bad($('.run-q')); }, 30);
  const slot = $('#jslot'), host = $('#jkp');
  if (!slot || !host) return;
  if (!J.t0) J.t0 = performance.now();
  if (KP) KP.destroy();
  KP = new NB.Keypad(host, { sfx });
  KP.attach(slot, { onSubmit: v => jobAnswer(Number(v)) });
  if (matchMedia('(max-height: 520px)').matches) setTimeout(() => $('.run-q') && $('.run-q').scrollIntoView({ block: 'center' }), 60);
}
function jobAnswer(v) {
  const x = J.qs[J.i], secs = (performance.now() - J.t0) / 1000;
  if (v === x.answer) {
    const clean = J.tries === 0 && !J.hint, base = (J.id === 'boss' ? 300 : 150 + 50 * J.l) * (J.replay ? .5 : 1);
    J.streak = clean ? J.streak + 1 : 0; J.best = Math.max(J.best, J.streak);
    const nitro = clean && J.streak >= 3, pay = Math.round(clean ? base * (nitro ? 2 : 1) : base * .3);
    payFx($('#jslot'));
    const big = clean && J.streak >= 5 && J.streak % 5 === 0, xp = (clean ? 20 : 8) + (big ? 50 : 0);
    // a clean answer inside a few seconds per step counts as fast (feeds the race boost)
    x.res = true; x.clean = clean; x.hinted = J.hint; x.wrong = J.tries > 0; x.fast = clean && secs < 6 * x.S.moves.length;
    J.earned += pay; S.cash += pay; S.xp = (S.xp || 0) + xp; save(); dailyTick();
    J.fb = { cls: 'good', t: `${clean ? pick(['Correct!', 'Spot on!', 'Nailed it!']) : 'Got there!'} +${money(pay)}${nitro ? ' Nitro × 2!' : ''}${big ? ' Streak bonus!' : ''}` };
    J.fx = { good: `+${xp} XP` };
    const E = NB.AdaptiveLearningEngine;
    novaSay('celebrating', big ? E.phrase('bigStreak') : J.streak === 3 ? E.phrase('streak') : clean ? E.phrase('first') : E.phrase('assisted'));
    sfx(nitro || big ? 'nitro' : 'good');
    if (clean) { const at = J.i; setTimeout(() => { if (J && V.view === 'job' && J.i === at) nextQ(); }, 1700); }
  } else {
    J.streak = 0; sfx('bad'); J.fx = { bad: true };
    if (J.tries === 0) { J.tries = 1; J.fb = { cls: 'bad', t: `${v} isn't it. Here are the steps. Have another go.` }; novaSay('encouraging', NB.AdaptiveLearningEngine.phrase('hint')); }
    else { x.res = false; x.clean = false; x.wrong = true; x.given = v; J.fb = { cls: 'bad', t: `The answer is ${x.answer}. Read through the working below.` }; novaSay('encouraging', NB.AdaptiveLearningEngine.phrase('followUpWrong')); }
  }
  render();
}
function nextQ() {
  if (JV) JV.stop();
  if (J.i < J.qs.length - 1) { J.i++; J.tries = 0; J.hint = false; J.fb = null; J.t0 = 0; J.mood = 'idle'; J.say = ''; render(); window.scrollTo(0, 0); return; }
  const boss = J.id === 'boss', right = J.qs.filter(q => q.res).length, clean = J.qs.filter(q => q.clean).length, pass = right >= (boss ? 5 : 4);
  S.stars = S.stars || {}; const sk = boss ? 'boss' : `${J.id}-${J.l}`; S.stars[sk] = Math.max(S.stars[sk] || 0, clean);
  if (pass) {
    if (boss) { if (!S.boss) { J.bonus = 1500; S.boss = true; } }
    else if (J.l >= lvOf(J.id)) {
      J.bonus = 500 + 250 * J.l; S.lv[J.id] = J.l + 1;
      J.unlocked = [J.l < 2 ? [`Level ${J.l + 2}`, T[J.id].levels[J.l + 1].title] : ['Cleared', T[J.id].name]];
      if (J.l === 0) {
        ORDER.forEach(k => { if (k !== J.id && lvOf(k) === 0 && districtOpen(k) && !J.wasOpen.includes(k)) J.unlocked.push(['New district', T[k].name]); });
      }
      if (bossOpen() && !S.boss) J.unlocked.push(['Finale', 'The Big Score']);
    }
    S.cash += J.bonus; S.xp = (S.xp || 0) + 100; sfx('cash'); burst();
  }
  save(); go({ view: 'result' });
}
function result() {
  const boss = J.id === 'boss', right = J.qs.filter(q => q.res).length, clean = J.qs.filter(q => q.clean).length, need = boss ? 5 : 4, pass = right >= need;
  const nextAct = pass && !boss && J.l < 2 ? `data-act="brief" data-id="${J.id}" data-l="${J.l + 1}"` : boss ? 'data-act="board"' : `data-act="district" data-id="${J.id}"`;
  return `<section class="mcomp ${pass ? '' : 'fail'}"><div class="flags">${FLAG}${FLAG}</div>
    <h1 class="mc-title">${pass ? 'Mission<br>complete!' : 'Mission<br>failed'}</h1>
    <div class="earned"><span class="pill cashv">${BILL} <b class="cv" data-to="+${money(J.earned + J.bonus)}">+$0</b></span>
      <p class="mc-sub">${right} out of ${J.qs.length} right, ${clean} first time${pass ? '' : `. You need ${need} to pass. Watch the lesson again, then have another go`}${J.bonus ? `, plus a ${money(J.bonus)} first-clear bonus` : ''}.</p>
      <span class="pill stk">${starRow(clean, J.qs.length)}</span></div>
    ${J.unlocked.length ? `<ul class="mc-unlocks">${J.unlocked.map((u, i) => `<li style="--i:${i}"><span>${LOCKOPEN}${u[0]}</span><b>${u[1]}</b></li>`).join('')}</ul>` : ''}
    <div class="job-nova mc-nova"><div class="jn-n"></div><p class="jn-say">${pass ? `${NB.AdaptiveLearningEngine.phrase('mission')}${J.raced ? '' : ' Your answers have tuned your car for a bonus race.'}` : "Don't give up! Watch the lesson again and you'll get it."}</p></div>
    <img class="mc-car" src="img/complete.webp" alt="">
    <div class="mc-actions">
      ${pass && !J.raced ? `<button class="b-go mc-race" data-act="mrace">${CARIC} Race for a bonus ▶</button>` : ''}
      <button class="${pass && !J.raced ? 'b-sec' : 'b-go'}" ${pass ? nextAct : `data-act="job" data-id="${J.id}" data-l="${J.l}"`}>${pass ? (!boss && J.l < 2 ? 'Next level ▶' : 'Continue ▶') : 'Try again ▶'}</button>
      <div class="mc-row"><button class="b-sec" data-act="garage">${CARIC} Garage</button>${pass ? `<button class="b-sec" data-act="job" data-id="${J.id}" data-l="${J.l}">Replay</button>` : ''}</div>
      <div class="mc-links">${!boss ? `<button data-act="lesson" data-id="${J.id}" data-l="${J.l}">Watch the lesson again</button><button data-act="district" data-id="${J.id}">Back to ${T[J.id].name}</button>` : '<button data-act="board">Missions</button>'}</div>
    </div></section>`;
}

/* ---------- mission race: optional, after a passed job; the maths decides the boosts ---------- */
function missionPerf() {
  const q = J.qs, best = q.reduce((m, x) => { m.run = x.clean ? m.run + 1 : 0; m.best = Math.max(m.best, m.run); return m; }, { run: 0, best: 0 }).best;
  return { n: q.length, clean: q.filter(x => x.clean).length, fast: q.filter(x => x.fast).length, hinted: q.filter(x => x.hinted).length, wrong: q.filter(x => x.wrong).length, best };
}
function openMissionRace() {
  if (!J || J.raced) return;
  const p = missionPerf(), acc = J.qs.filter(x => x.res).length / p.n, league = NB.Race.missionLeague(totalCleared(), acc), c = myCar();
  const carsBefore = CARS.filter((k, i) => carGot(i)).length;
  J.raced = true;
  new NB.Race.RaceScreen({ player: { name: c.name, type: c.type, color: c.color, stats: carStats(c.i), mods: modsOf(c.i) }, league, seed: R(1, 99999), levels: totalCleared(), acc, sfx,
    mission: NB.Race.boost(p),
    onDone: ({ place, time }) => {
      const cash = Math.round((150 + 100 * league) * [1, .5, .3, .15][place - 1] / 10) * 10, xp = [60, 35, 20, 10][place - 1];
      const rs = S.raceStats = S.raceStats || { races: 0, wins: 0, podiums: 0, log: [] };
      rs.races++; if (place === 1) rs.wins++; if (place <= 3) rs.podiums++;
      rs.log = [{ d: today(), place, time: Math.round(time * 10) / 10, acc: Math.round(acc * 100), league }].concat(rs.log || []).slice(0, 10);
      S.cash += cash; S.xp = (S.xp || 0) + xp; save(); hud();
      const newCars = CARS.filter((k, i) => carGot(i)).slice(carsBefore).map(k => k.name);
      return { cash, xp, summary: `Mission: ${Math.round(acc * 100)}% right, ${p.clean} clean, best streak ${p.best}. Race: ${['1st', '2nd', '3rd', '4th'][place - 1]} in ${time.toFixed(1)}s.`,
        note: newCars.length ? `New car unlocked: ${newCars.join(', ')}! Check the garage.` : '' };
    },
    onExit: nav => { if (nav === 'garage') go({ view: 'garage' }); else render(); }
  }).open();
}

/* ---------- progress ---------- */
function progressView() {
  const r = raceState(), Rc = NB.Race, L = Rc.LEAGUES[Math.min(r.league, Rc.LEAGUES.length - 1)], owned = CARS.filter((c, i) => carGot(i)).length;
  const xp = S.xp || 0, lvl = Math.floor(xp / XP_STEP) + 1, into = xp % XP_STEP;
  let h = `<div class="pg-top">${backBtn('lobby', 'Home')}<h1>Progress</h1></div>
   <section class="pg-hero"><div class="pg-rank">${IC.rank}<div><b>${rankName(totalCleared())}</b><small>Crew level ${lvl}</small></div></div>
    <div class="pg-xp"><div class="xpbar"><i style="width:${(into / XP_STEP * 100).toFixed(1)}%"></i></div><small>${into.toLocaleString('en-US')} / ${XP_STEP.toLocaleString('en-US')} XP to level ${lvl + 1}</small></div>
    <div class="pg-stats"><div><b>${money(S.cash || 0)}</b><small>Earned</small></div><div><b>${totalCleared()} / ${LEVELS + 1}</b><small>Levels cleared</small></div><div><b>${owned} / ${CARS.length}</b><small>Cars</small></div></div></section>`;
  GROUPS.forEach(g => {
    h += `<h2 class="pg-h">${g.name}</h2><div class="pg-topics">`;
    g.topics.forEach(id => { const t = T[id], lv = lvOf(id), open = districtOpen(id);
      h += `<button class="pg-topic ${open ? '' : 'locked'}" style="--accent:${t.accent}" data-act="${open ? 'district' : 'locked'}" data-id="${id}">
        <span class="pt-em">${emblem(id)}</span><span class="pt-t"><b>${t.name}</b><small>${t.skill}</small>
        <span class="pt-lv">${[0, 1, 2].map(k => `<i class="${k < lv ? 'on' : ''}"></i>`).join('')}</span></span>
        <span class="pt-st">${IC.star}${starsTotal(id)}<small>/15</small></span></button>`; });
    h += '</div>';
  });
  h += `<h2 class="pg-h">Street racing</h2>
   <section class="pg-race" style="--lc:${L.color}"><div><b>${L.name}</b><small>League ${Math.min(r.league, 4) + 1} of 5</small></div><div><b>${r.wins || 0}</b><small>Daily wins</small></div><div><b>${(S.raceStats && S.raceStats.wins) || 0} / ${(S.raceStats && S.raceStats.races) || 0}</b><small>Mission races won</small></div>
    <div class="pg-lgs">${Rc.LEAGUES.map((g, k) => `<i class="${k < r.league ? 'done' : k === Math.min(r.league, 4) ? 'now' : ''}" title="${g.name}"></i>`).join('')}</div></section>
   <p class="reset-note">Sound, voice and reset are under the settings cog. Progress saves in this browser only.</p>`;
  return h;
}

/* ---------- garage ---------- */
function garageView() {
  const i = V.gi, c = CARS[i], got = carGot(i), mine = myCar().i === i, col = (S.carColor && S.carColor[i]) || c.c, need = Math.max(0, c.price - S.cash);
  return `<div class="pg-top">${backBtn('lobby', 'Home')}<h1>Garage</h1></div>
  <section class="garage3d">
    <div class="g3-stage"><div class="g3-flat ${V.gdir > 0 ? 'from-r' : V.gdir < 0 ? 'from-l' : ''}" data-k="${i}"><div class="g2-spot"></div><div class="g2-car">${carSVG(col, got, c.type, modsOf(i))}</div><div class="g2-ring"></div></div>
      <button class="g3-arrow l" data-act="gprev" aria-label="Previous car">‹</button><button class="g3-arrow r" data-act="gnext" aria-label="Next car">›</button>
      <div class="g3-tag ${got ? '' : 'locked'}">${got ? (mine ? 'Driving now' : 'Unlocked') : `${LOCK} ${money(c.price)}`}</div></div>
    <div class="g3-info"><div><h2>${c.name}</h2><p>${got ? 'Pick a paint job, then take it for a drive around Neon Bay.' : `Earn ${money(need)} more to unlock it. Replaying jobs pays too.`}</p>
      ${got ? '' : `<div class="g3-bar"><i style="width:${Math.min(100, S.cash / c.price * 100).toFixed(1)}%"></i></div>`}</div>
      ${got ? (mine ? '<span class="g3-mine">✓ Your ride</span>' : '<button class="b-go" data-act="drive">Drive this one ▶</button>') : ''}</div>
    ${got ? `<div class="g3-paint" role="group" aria-label="Paint colour">${PAINTS.map(p => `<button class="sw ${p === col ? 'on' : ''}" data-act="paint" data-c="${p}" style="--c:${p}" aria-label="Paint ${p}"></button>`).join('')}</div>` : ''}
    ${garageMods(i, got)}
    <div class="g3-row">${CARS.map((k, j) => `<button class="g3-chip ${j === i ? 'on' : ''} ${carGot(j) ? '' : 'locked'}" data-act="gpick" data-k="${j}">${carSVG((S.carColor && S.carColor[j]) || k.c, carGot(j), k.type)}<span>${k.name}</span></button>`).join('')}</div>
  </section>`;
}
function garageMods(i, got) {
  const Rc = NB.Race, st = carStats(i), base = Rc.stats(CARS[i].type, {}), m = modsOf(i), NM = { spd: 'Top speed', acc: 'Acceleration', han: 'Handling', nit: 'Nitro' }, SH = { spd: 'speed', acc: 'accel', han: 'handling', nit: 'nitro' };
  const bars = Rc.MODS.map(md => { const b = base[md.stat], v = st[md.stat];
    return `<div class="gs-row"><span>${NM[md.stat]}</span><div class="gs-bar" role="img" aria-label="${v} out of 100"><i style="width:${b}%"></i><em style="left:${b}%;width:${v - b}%"></em></div><b>${v}</b></div>`; }).join('');
  const rows = got ? Rc.MODS.map(md => { const lv = m[md.key] || 0, max = lv >= Rc.MAX_LEVEL, cost = max ? 0 : Rc.modCost(CARS[i].price, md, lv), can = !max && wallet() >= cost;
    const nl = NB.carArt.nextLook(md.key, lv);
    return `<div class="gm-row"><div class="gm-n"><b>${md.name}</b><small>${md.desc}. +${Rc.PER_LEVEL} ${SH[md.stat]}</small>${nl && CARS[i].type !== 'scooter' ? `<small class="gm-look">Level ${nl.level} adds: <b>${nl.name}</b></small>` : ''}</div>
      <div class="gm-pips" aria-label="Level ${lv} of ${Rc.MAX_LEVEL}">${Array.from({ length: Rc.MAX_LEVEL }, (_, k) => `<i class="${k < lv ? 'on' : ''}"></i>`).join('')}</div>
      <button class="gm-buy" data-act="mod" data-m="${md.key}" ${can ? '' : 'disabled'}>${max ? 'MAX' : `${BILL}${money(cost)}`}</button></div>`; }).join('') : '';
  return `<div class="g3-perf"><div class="gs"><div class="gs-h"><b>Performance</b><span class="gs-rt">Race rating <em>${Rc.rating(st)}</em></span></div>${bars}</div>
    ${got ? `<div class="gm"><div class="gs-h"><b>Mods shop</b><span class="gs-rt">Wallet <em>${money(wallet())}</em></span></div>${rows}</div>` : '<div class="gm gm-locked"><p>Unlock this car to fit mods. Its stats already beat most cars below it.</p></div>'}</div>`;
}
function buyMod(key) {
  const md = NB.Race.MODS.find(x => x.key === key), i = V.gi, m = modsOf(i), lv = m[md.key] || 0;
  if (lv >= NB.Race.MAX_LEVEL) return; const cost = NB.Race.modCost(CARS[i].price, md, lv); if (wallet() < cost) { sfx('bad'); return; }
  S.spent = (S.spent || 0) + cost; S.mods = S.mods || {}; S.mods[i] = Object.assign({}, m, { [md.key]: lv + 1 }); save(); sfx('nitro'); render();
  const k = NB.Race.MODS.indexOf(md), bar = document.querySelectorAll('.gs-bar')[k], num = document.querySelectorAll('.gs-row > b')[k], g = $('.g3-flat');
  if (g) { g.classList.remove('rev'); void g.offsetWidth; g.classList.add('rev'); }
  const look = CARS[i].type !== 'scooter' && (NB.carArt.MODLOOK[md.key] || []).find(([l]) => l === lv + 1);
  if (look && g) { g.insertAdjacentHTML('beforeend', `<div class="g2-new">New look: <b>${look[1]}</b></div>`); NB.FX.sparks(g, 24, 140); }
  if (bar) { const em = bar.querySelector('em'), w = em.style.width; em.style.width = Math.max(0, parseFloat(w) - NB.Race.PER_LEVEL) + '%'; em.classList.add('grow'); requestAnimationFrame(() => requestAnimationFrame(() => { em.style.width = w; })); NB.FX.sparks(bar, 12, 90); }
  if (num) { const v = num.textContent; num.dataset.v = String(Number(v) - NB.Race.PER_LEVEL); NB.FX.roll(num, v); }
  const pip = document.querySelectorAll('.gm-row')[k]; if (pip) { const on = pip.querySelectorAll('.gm-pips i.on'), last = on[on.length - 1]; if (last) last.classList.add('just'); }
}

/* ---------- lessons ---------- */
function openLesson(id, l) {
  const c = NB.Content[`${id}-${l + 1}`]; if (!c) return;
  const Ctrl = NB.SheetLessonController;
  new Ctrl(c, {
    getCash: () => wallet(), getXP: () => S.xp || 0, getRank: () => rankName(totalCleared()),
    addCash: n => { S.cash += n; save(); hud(); }, addXP: n => { S.xp = (S.xp || 0) + n; save(); hud(); },
    isMuted: () => S.voice === false, setMuted: m => { S.voice = !m; save(); },
    sfx, burst,
    markDone: cc => { S.read[`${cc.gameTopic}-${cc.gameLevel}`] = true; save(); },
    onExit: nav => { if (nav === 'job') startJob(c.gameTopic, c.gameLevel); else go({ view: 'district', id: c.gameTopic }); }
  }).open();
}
function burst() { const t = $('.mc-title,.rc-panel h2,.board-eq'); if (t && NB.FX) NB.FX.sparks(t, 14, 130); }

/* ---------- render & navigation ---------- */
function render() {
  hud();
  document.body.classList.toggle('on-home', V.view === 'lobby');
  if (V.view !== 'lobby' && HS) { HS.dispose(); HS = null; }
  if (V.view !== 'job' && KP) { KP.destroy(); KP = null; }
  const views = { lobby: homeView, progress: progressView, board, garage: garageView, district: () => district(V.id), brief: () => brief(V.id, V.l), job, result };
  app.innerHTML = (views[V.view] || board)();
  if (V.view === 'lobby') mountHome();
  if (V.view === 'brief') wireExplorers();
  if (V.view === 'board') mountMap();
  if (V.view === 'job') mountJob();
  if (V.view === 'result') { const mn = $('.mc-nova .jn-n'); if (mn) new NB.TeacherController(mn).set(J.qs.filter(q => q.res).length >= (J.id === 'boss' ? 5 : 4) ? 'excited' : 'encouraging'); }
  if (V.view === 'result') { const ti = $('.mcomp:not(.fail) .mc-title'); if (ti) setTimeout(() => NB.FX.sparks(ti, 14, 140), 420); const cv = $('.earned .cv'); if (cv) NB.FX.roll(cv, cv.dataset.to, { delay: 560 }); }
}
const DEPTH = { lobby: 0, board: 1, garage: 1, progress: 1, district: 2, brief: 3, job: 4, result: 5 };
let lastDepth = 0;
function go(v) {
  if (v.view === 'garage') { V.gi = myCar().i; V.gdir = 1; v.gi = V.gi; v.gdir = 1; }
  const changed = v.view !== V.view || v.id !== V.id || v.l !== V.l;
  V = Object.assign({}, v, { gi: v.gi != null ? v.gi : V.gi });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, dep = DEPTH[V.view] ?? 1, dir = dep >= lastDepth ? 'fwd' : 'back'; lastDepth = dep;
  const fn = () => { render(); window.scrollTo(0, 0); };
  if (!changed || reduce) return fn();
  document.documentElement.dataset.vt = dir;
  if (document.startViewTransition) { try { document.startViewTransition(fn); return; } catch (e) {} }
  fn(); app.classList.remove('view-in', 'fwd', 'back'); void app.offsetWidth; app.classList.add('view-in', dir);
}

/* juicy presses: squash, bounce, glow burst, click, buzz */
document.addEventListener('pointerdown', e => {
  const b = e.target.closest('button'); if (!b || b.disabled || b.dataset.k != null) return;
  b.classList.remove('boing'); b.classList.add('press');
  if (!b.closest('.nbl')) sfx('click');
  if (navigator.vibrate) try { navigator.vibrate(7); } catch (x) {}
  if ((b.classList.contains('jb') || b.classList.contains('b-go')) && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const r = b.getBoundingClientRect(), ringEl = document.createElement('span'); ringEl.className = 'jb-burst';
    ringEl.style.left = (e.clientX - r.left) + 'px'; ringEl.style.top = (e.clientY - r.top) + 'px'; b.appendChild(ringEl); setTimeout(() => ringEl.remove(), 520);
    NB.FX.sparks(b, 12, 110);
  }
}, { passive: true });
const up = () => document.querySelectorAll('button.press').forEach(b => { b.classList.remove('press'); void b.offsetWidth; b.classList.add('boing'); setTimeout(() => b.classList.remove('boing'), 420); });
document.addEventListener('pointerup', up, { passive: true }); document.addEventListener('pointercancel', up, { passive: true });

document.addEventListener('click', e => {
  if (e.target.closest('.nbl')) return;
  if (V.gear && !e.target.closest('#hud') && !e.target.closest('#vp')) { V.gear = false; hud(); }
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  const a = b.dataset.act, id = b.dataset.id, l = Number(b.dataset.l || 0);
  const A = {
    lobby: () => go({ view: 'lobby' }), board: () => go({ view: 'board' }), progress: () => go({ view: 'progress' }), garage: () => go({ view: 'garage' }),
    nova: () => mountHome.next && mountHome.next(),
    district: () => go({ view: 'district', id }),
    brief: () => go({ view: 'brief', id, l }),
    lesson: () => openLesson(id, l),
    job: () => startJob(id, l),
    locked: () => { sfx('bad'); NB.FX.shake(b); },
    hint: () => { J.hint = true; novaSay('thinking', NB.AdaptiveLearningEngine.phrase('think')); render(); },
    next: nextQ,
    gear: () => { V.gear = !V.gear; hud(); },
    sound: () => { S.sound = S.sound === false; save(); hud(); sfx('good'); },
    voice: () => { S.voice = S.voice === false; save(); hud(); },
    vopen: () => { V.gear = false; hud(); V.vp = true; vpRender(); },
    vclose: () => { V.vp = false; vpRender(); try { speechSynthesis.cancel(); } catch (x) {} },
    vpick: () => { const i = Number(b.dataset.v), v = NB.Voice.list()[i]; NB.voicePref.name = i < 0 || !v ? '' : v.name; vpSave(); vpRender(); NB.Voice.preview(VSAMPLE); },
    vtry: () => { const i = b.dataset.v; if (i === 'cur') NB.Voice.preview(VSAMPLE); else { const keep = NB.voicePref.name, v = NB.Voice.list()[Number(i)]; NB.voicePref.name = Number(i) < 0 || !v ? '' : v.name; NB.Voice.preview(VSAMPLE); NB.voicePref.name = keep; } },
    vreset: () => { NB.voicePref = {}; vpSave(); vpRender(); NB.Voice.preview(VSAMPLE); },
    gprev: () => { V.gdir = -1; V.gi = (V.gi + CARS.length - 1) % CARS.length; sfx('tick'); render(); V.gdir = 0; },
    gnext: () => { V.gdir = 1; V.gi = (V.gi + 1) % CARS.length; sfx('tick'); render(); V.gdir = 0; },
    gpick: () => { const k = Number(b.dataset.k); V.gdir = k > V.gi ? 1 : -1; V.gi = k; sfx('tick'); render(); },
    paint: () => { S.carColor = S.carColor || {}; S.carColor[V.gi] = b.dataset.c; save(); sfx('good'); render(); },
    drive: () => { S.car = V.gi; save(); sfx('cash'); burst(); render(); },
    mod: () => buyMod(b.dataset.m),
    race: openRace,
    mrace: openMissionRace,
    reset: () => {
      if (b.dataset.armed) { const v = S.voice, s = S.sound; S = { cash: 0, lv: {}, read: {}, boss: false, voice: v, sound: s }; save(); V.gear = false; go({ view: 'board' }); }
      else { b.dataset.armed = '1'; b.textContent = 'Tap again to wipe everything'; }
    }
  };
  if (A[a]) A[a]();
});
document.addEventListener('input', e => {
  if (e.target.id === 'vrate') { NB.voicePref.rate = Number(e.target.value); document.getElementById('vrate-o').textContent = NB.voicePref.rate.toFixed(2) + '×'; vpSave(); }
  if (e.target.id === 'vpitch') { NB.voicePref.pitch = Number(e.target.value); document.getElementById('vpitch-o').textContent = NB.voicePref.pitch.toFixed(2); vpSave(); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && V.vp) { V.vp = false; vpRender(); } });
setInterval(() => { document.querySelectorAll('.rc-cd').forEach(x => { x.textContent = untilMidnight(); }); const t = document.getElementById('dtimer'); if (t) t.textContent = '⏱ ' + untilMidnight(); }, 30000);

render();
try { const a = NB.ProgressManager.active(); if (a && NB.Content[a]) { const c = NB.Content[a]; openLesson(c.gameTopic, c.gameLevel); } } catch (e) {}
})();
