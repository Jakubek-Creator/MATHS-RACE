/* Methods for the newer districts: Adding & subtracting, Angles, Shapes.
   Same contract as methods.js: gen(tier, used) → question, build(q) → worksheet.
   Every answer box takes a whole number, worked out in code.
   S.always = true keeps the picture on screen in every stage, because for angles and
   shapes the picture IS the question (the known angles and side lengths live on it). */
(function (NB) {
  const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[R(0, a.length - 1)];
  const fresh = (make, used) => { for (let i = 0; i < 60; i++) { const q = make(); if (!used.includes(q.key)) return q; } return make(); };
  const Sheet = steps => {
    const S = { rows: [], moves: [], steps };
    S.row = (id, step, label, tpl, extra = {}) => { S.rows.push(Object.assign({ id, step, label, tpl }, extra)); return S; };
    S.box = (row, idx, step, answer, o) => { S.moves.push(Object.assign({ key: row === 'final' ? 'final' : `${row}:${idx}`, row, step, answer, kind: o.kind || row }, o)); return S; };
    return S;
  };
  const H = (ask, fin, done) => ({ ask, fin, done });
  const PL = ['units', 'tens', 'hundreds', 'thousands'];
  const SG = ['unit', 'ten', 'hundred', 'thousand'];
  const CAP = s => s.charAt(0).toUpperCase() + s.slice(1);
  const digitsRev = n => String(n).split('').reverse().map(Number);
  const has = (c, k) => c.vals[k] != null;

  /* =========================================================== ADDING (column addition) */
  function addMethod(genFn) {
    return {
      steps: ['Units', 'Tens', 'Hundreds', 'Answer'],
      gen(tier, used) { return fresh(() => { const [a, b] = genFn(tier); return { a, b, tier, key: `${a}+${b}` }; }, used); },
      build(q) {
        const { a, b } = q, A = digitsRev(a), B = digitsRev(b), n = Math.max(A.length, B.length), tot = a + b;
        const steps = PL.slice(0, n).map(CAP).concat('Answer');
        const S = Sheet(steps);
        let carry = 0; const cols = [];
        for (let k = 0; k < n; k++) {
          const x = A[k] || 0, y = B[k], s = x + (y || 0) + carry, last = k === n - 1;
          const parts = [x].concat(y != null ? [y] : []).concat(carry ? [1] : []);
          const sum = parts.join(' + ');
          S.row(`c${k}`, k + 1, CAP(PL[k]), `${sum} = []`);
          const carryTxt = carry ? ` Don't forget the 1 you carried.` : '';
          S.box(`c${k}`, 0, k + 1, s, {
            kind: 'add',
            prompt: k === 0 ? `Start with the units column: ${sum}` : `Now the ${PL[k]} column: ${sum}`,
            short: `Add the ${PL[k]}.`,
            show: k === 0 ? `Always start on the right, with the units. ${sum} is ${s}.` : `Next, the ${PL[k]} column: ${sum} is ${s}.${carryTxt}`,
            hints: [parts.length > 1 ? `Add the digits in the ${PL[k]} column: ${sum}.${carryTxt}` : `Only one digit here, so it comes straight down.`, `${sum} = ${s}`]
          });
          if (s >= 10 && !last) {
            S.row(`x${k}`, k + 1, 'Carry', `${s} ${PL[k]} = 1 ${SG[k + 1]} + [] ${PL[k]}`);
            S.box(`x${k}`, 0, k + 1, s - 10, {
              kind: 'exchange',
              prompt: `${s} is too big for one column. ${s} ${PL[k]} is 1 ${SG[k + 1]} and how many ${PL[k]}?`,
              short: 'Write a digit, carry the 1.',
              show: `${s} won't fit in one column. ${s} ${PL[k]} is 1 ${SG[k + 1]} and ${s - 10} ${PL[k]}. Write the ${s - 10}, and carry the 1 over to the ${PL[k + 1]}.`,
              hints: [`Take 10 away from ${s}. That's what stays in this column.`, `${s} − 10 = ${s - 10}`]
            });
            cols.push({ k, digit: s - 10, carry: true });
            carry = 1;
          } else { cols.push({ k, digit: s, carry: false }); carry = 0; }
        }
        S.box('final', 0, n + 1, tot, { prompt: `Read the answer along the bottom: ${a} + ${b}`, short: 'Write the answer.', show: `Read the bottom row from left to right: ${a} plus ${b} is ${tot}.`, hints: ['Read the digits you wrote, from left to right.', `It's ${tot}.`] });
        S.head = H(`${a} + ${b} = ?`, `${a} + ${b} = []`, `${a} + ${b} = ${tot}`);
        S.say = `${a} plus ${b}`; S.tot = tot;
        S.visual = c => ({ type: 'colsum', props: { a, b, op: '+', n: String(tot).length,
          ans: cols.map(o => (has(c, o.carry ? `x${o.k}:0` : `c${o.k}:0`) ? o.digit : null)),
          carries: cols.map(o => o.carry && has(c, `x${o.k}:0`)) } });
        return S;
      }
    };
  }
  const noZero = (lo, hi) => { let v; do { v = R(lo, hi); } while (String(v).includes('0')); return v; };
  const add1 = addMethod(tier => {
    for (;;) {
      if (tier === 0) { const a = noZero(12, 78), b = noZero(11, 89 - a); if (a % 10 + b % 10 < 10 && a + b < 100) return [a, b]; }
      else if (tier === 1) { const a = noZero(15, 69), b = noZero(15, 79); if (a % 10 + b % 10 >= 10 && a + b < 100) return [a, b]; }
      else { const a = noZero(115, 789), b = noZero(15, 89); if (a % 10 + b % 10 >= 10) return [a, b]; }
    }
  });
  const add2 = addMethod(tier => {
    for (;;) {
      const a = noZero(112, 689), b = noZero(112, 789), A = digitsRev(a), B = digitsRev(b);
      const c0 = A[0] + B[0] >= 10, c1 = A[1] + B[1] + (c0 ? 1 : 0) >= 10;
      if (tier === 0 && c0 + c1 === 1 && a + b < 1000) return [a, b];
      if (tier === 1 && c0 && c1 && a + b < 1000) return [a, b];
      if (tier === 2 && c0 && c1 && a + b >= 1000) return [a, b];
    }
  });

  /* =========================================================== SUBTRACTING (column subtraction with exchange) */
  const sub1 = {
    steps: ['Units', 'Tens', 'Hundreds', 'Answer'],
    gen(tier, used) {
      return fresh(() => {
        for (;;) {
          let a, b;
          if (tier === 0) { a = noZero(31, 98); b = noZero(12, a - 10); }
          else if (tier === 1) { a = noZero(211, 989); b = noZero(12, 89); }
          else { a = noZero(311, 989); b = noZero(112, a - 100); }
          const A = digitsRev(a), B = digitsRev(b), ex = (A[0] < B[0] ? 1 : 0) + ((B[1] || 0) > A[1] - (A[0] < B[0] ? 1 : 0) ? 1 : 0);
          if (String(a - b).length !== String(a).length) continue;
          if (tier === 0 && ex === 1) return { a, b, tier, key: `${a}-${b}` };
          if (tier === 1 && ex >= 1) return { a, b, tier, key: `${a}-${b}` };
          if (tier === 2 && ex === 2) return { a, b, tier, key: `${a}-${b}` };
        }
      }, used);
    },
    build(q) {
      const { a, b } = q, A = digitsRev(a), B = digitsRev(b), n = A.length, tot = a - b;
      const S = Sheet(PL.slice(0, n).map(CAP).concat('Answer'));
      const top = A.slice(), cols = [];
      for (let k = 0; k < n; k++) {
        let t = top[k]; const y = B[k] || 0, ex = t < y;
        if (ex) {
          S.row(`x${k}`, k + 1, 'Exchange', `${t} ${PL[k]} + 10 ${PL[k]} = []`);
          S.box(`x${k}`, 0, k + 1, t + 10, {
            kind: 'exchange',
            prompt: `${t} take away ${y} won't work. Swap 1 ${SG[k + 1]} for 10 ${PL[k]}. ${t} + 10 = ?`,
            short: 'Exchange first.',
            show: `You can't take ${y} from ${t}. So swap 1 ${SG[k + 1]} from next door for 10 ${PL[k]}. The ${top[k + 1]} becomes ${top[k + 1] - 1}, and the ${t} becomes ${t + 10}.`,
            hints: [`Borrow 10 from the next column: ${t} + 10.`, `${t} + 10 = ${t + 10}`]
          });
          top[k + 1] -= 1; t += 10;
        }
        S.row(`c${k}`, k + 1, CAP(PL[k]), `${t} − ${y} = []`);
        S.box(`c${k}`, 0, k + 1, t - y, {
          kind: 'sub',
          prompt: k === 0 ? `Start with the units: ${t} − ${y}` : `Now the ${PL[k]}: ${t} − ${y}`,
          short: `Take away the ${PL[k]}.`,
          show: `${CAP(PL[k])} column: ${t} take away ${y} is ${t - y}.`,
          hints: [`Count up from ${y} to ${t}.`, `${y} + ? = ${t}`]
        });
        cols.push({ k, ex, digit: t - y });
      }
      S.box('final', 0, n + 1, tot, { prompt: `Read the answer along the bottom: ${a} − ${b}`, short: 'Write the answer.', show: `Read the bottom row: ${a} take away ${b} is ${tot}. Check: ${tot} + ${b} = ${a}.`, hints: ['Read the digits you wrote, left to right.', `It's ${tot}.`] });
      S.head = H(`${a} − ${b} = ?`, `${a} − ${b} = []`, `${a} − ${b} = ${tot}`);
      S.say = `${a} take away ${b}`; S.tot = tot;
      S.visual = c => ({ type: 'colsum', props: { a, b, op: '−', n,
        ans: cols.map(o => has(c, `c${o.k}:0`) ? o.digit : null),
        exch: cols.map(o => o.ex && has(c, `x${o.k}:0`)) } });
      return S;
    }
  };

  /* =========================================================== ANGLES */
  const DIRS = ['N', 'E', 'S', 'W'], DNAME = { N: 'North', E: 'East', S: 'South', W: 'West' };
  const TURN = k => ['', 'a quarter turn', 'a half turn', 'a three-quarter turn', 'a full turn'][k];
  const ang1 = {
    steps: ['Right angle', 'Count turns', 'Times by 90', 'Answer'],
    gen(tier, used) {
      return fresh(() => {
        const fi = tier === 0 ? 0 : R(0, 3), k = R(1, tier === 0 ? 2 : 3), anti = tier === 2 && R(0, 1) === 1;
        const ti = (fi + (anti ? -k : k) + 8) % 4;
        return { from: DIRS[fi], to: DIRS[ti], k, anti, tier, key: `${DIRS[fi]}${anti ? '<' : '>'}${DIRS[ti]}` };
      }, used);
    },
    build(q) {
      const { from, to, k, anti } = q, way = anti ? 'anticlockwise' : 'clockwise', deg = k * 90;
      const S = Sheet(this.steps);
      S.always = true;
      S.row('rt', 1, 'Right angle', '1 quarter turn = []°')
        .row('cnt', 2, 'Count', `${DNAME[from]} to ${DNAME[to]}, ${way} = [] quarter turns`)
        .row('deg', 3, 'Degrees', `${k} × 90 = []`);
      S.box('rt', 0, 1, 90, { kind: 'right', prompt: 'A quarter turn is a right angle. How many degrees is that?', short: 'How big is a right angle?', show: 'A quarter turn makes a right angle, like the corner of a page. That is 90 degrees.', hints: ['A full turn is 360°. A quarter of it is…', 'A right angle is 90°.'] })
        .box('cnt', 0, 2, k, { kind: 'count', prompt: `Turn ${way} from ${DNAME[from]} to ${DNAME[to]}. How many quarter turns?`, short: 'Count the quarter turns.', show: `Start facing ${DNAME[from]} and turn ${way}. Count each quarter turn: that's ${k}, which is ${TURN(k)}.`, hints: [`Follow the arrow ${way} and count each compass point you pass.`, anti ? 'Anticlockwise goes N, W, S, E.' : 'Clockwise goes N, E, S, W.'] })
        .box('deg', 0, 3, deg, { kind: 'unitsTimes', prompt: `Each quarter turn is 90°. ${k} × 90 = ?`, short: 'Times by 90.', show: `Each quarter turn is 90 degrees, so ${k} quarter turns is ${k} times 90: ${deg} degrees.`, hints: [`Count in 90s: ${Array.from({ length: k }, (_, i) => 90 * (i + 1)).join(', ')}.`] })
        .box('final', 0, 4, deg, { prompt: 'How many degrees did the car turn?', short: 'Write the answer.', show: `So ${DNAME[from]} to ${DNAME[to]} ${way} is a turn of ${deg} degrees.`, hints: ['The number from the last step.'] });
      S.head = H(`${from} → ${to} = ?°`, `Turn = []°`, `${from} → ${to} = ${deg}°`);
      S.say = `${DNAME[from]} to ${DNAME[to]}, ${way}`; S.tot = deg;
      S.visual = c => ({ type: 'compass', props: { from, to, k, anti, counted: has(c, 'cnt:0'), deg: has(c, 'deg:0') ? deg : null } });
      return S;
    }
  };
  const m5 = (lo, hi) => 5 * R(Math.ceil(lo / 5), Math.floor(hi / 5));
  const ang2 = {
    steps: ['Total', 'Add the known', 'Take away', 'Answer'],
    gen(tier, used) {
      return fresh(() => {
        let T, known;
        if (tier === 0) { T = 180; known = [m5(25, 155)]; }
        else if (tier === 1) { T = 180; for (;;) { known = [m5(20, 110), m5(20, 110)]; if (known[0] + known[1] <= 155) break; } }
        else { T = 360; for (;;) { known = [m5(40, 150), m5(40, 150), m5(40, 120)]; const s = known.reduce((p, v) => p + v, 0); if (s >= 200 && s <= 320) break; } }
        return { T, known, tier, key: `${T}:${known.join(',')}` };
      }, used);
    },
    build(q) {
      const { T, known } = q, sum = known.reduce((p, v) => p + v, 0), x = T - sum, line = T === 180;
      const S = Sheet(this.steps); S.always = true;
      S.row('tot', 1, 'Total', line ? 'Angles on a straight line = []°' : 'Angles around a point = []°');
      S.box('tot', 0, 1, T, { kind: 'total', prompt: line ? 'Angles on a straight line always add up to?' : 'Angles all the way around a point add up to?', short: 'What do they add up to?', show: line ? 'These angles sit on a straight line. A straight line is a half turn, so they add up to 180 degrees.' : 'These angles go all the way round a point. That is a full turn, so they add up to 360 degrees.', hints: [line ? 'A straight line is a half turn: two right angles.' : 'All the way round is a full turn: four right angles.', line ? '90 + 90 = 180' : '4 × 90 = 360'] });
      if (known.length > 1) {
        S.row('add', 2, 'Add', `${known.join(' + ')} = []`);
        S.box('add', 0, 2, sum, { kind: 'add', prompt: `Add the angles you know: ${known.join(' + ')}`, short: 'Add the known angles.', show: `Add up the angles you know: ${known.join(' plus ')} is ${sum}.`, hints: [`Add two at a time: ${known[0]} + ${known[1]} = ${known[0] + known[1]}.`] });
      }
      S.row('sub', 3, 'Take away', `${T} − ${sum} = []`);
      S.box('sub', 0, 3, x, { kind: 'sub', prompt: `What's left for x? ${T} − ${sum}`, short: 'Take away from the total.', show: `x is whatever is left over: ${T} take away ${sum} is ${x}.`, hints: [`Count up from ${sum} to ${T}.`, `${sum} + ? = ${T}`] })
        .box('final', 0, 4, x, { prompt: 'So how big is angle x?', short: 'Write x.', show: `So x is ${x} degrees. Check: ${known.join(' + ')} + ${x} = ${T}.`, hints: ['The number from the last step.'] });
      S.head = H('x = ?°', 'x = []°', `x = ${x}°`);
      S.say = line ? 'the missing angle on a straight line' : 'the missing angle around a point'; S.tot = x;
      S.visual = c => ({ type: 'angles', props: { T, known, x: has(c, 'sub:0') ? x : null, total: has(c, 'tot:0') } });
      return S;
    }
  };
  const ang3 = {
    steps: ['Total', 'Add the two', 'Take away', 'Answer'],
    gen(tier, used) {
      return fresh(() => {
        let A, B;
        for (;;) {
          if (tier === 0) { A = 10 * R(3, 8); B = 10 * R(3, 8); }
          else if (tier === 1) { A = m5(25, 95); B = m5(25, 95); }
          else { A = m5(20, 125); B = m5(15, 70); }
          const C = 180 - A - B; if (C >= 20 && C <= 130) break;
        }
        return { A, B, tier, key: `${A},${B}` };
      }, used);
    },
    build(q) {
      const { A, B } = q, s = A + B, x = 180 - s;
      const S = Sheet(this.steps); S.always = true;
      S.row('tot', 1, 'Total', 'Angles in a triangle = []°')
        .row('add', 2, 'Add', `${A} + ${B} = []`)
        .row('sub', 3, 'Take away', `180 − ${s} = []`);
      S.box('tot', 0, 1, 180, { kind: 'total', prompt: 'The three angles in any triangle add up to?', short: 'Triangle total?', show: 'Here is a fact about every triangle ever drawn: its three angles add up to 180 degrees. Tear off the corners and they make a straight line.', hints: ['Same as a straight line.', '180°'] })
        .box('add', 0, 2, s, { kind: 'add', prompt: `Add the two angles you know: ${A} + ${B}`, short: 'Add the two you know.', show: `Add the two angles we know: ${A} plus ${B} is ${s}.`, hints: [`Add the tens first, then the rest.`] })
        .box('sub', 0, 3, x, { kind: 'sub', prompt: `What's left? 180 − ${s}`, short: 'Take away from 180.', show: `The third angle gets whatever is left: 180 take away ${s} is ${x}.`, hints: [`Count up from ${s} to 180.`, `${s} + ? = 180`] })
        .box('final', 0, 4, x, { prompt: 'So how big is angle x?', short: 'Write x.', show: `So x is ${x} degrees. Check: ${A} + ${B} + ${x} = 180.`, hints: ['The number from the last step.'] });
      S.head = H('x = ?°', 'x = []°', `x = ${x}°`);
      S.say = 'the missing angle in a triangle'; S.tot = x;
      S.visual = c => ({ type: 'triangle', props: { A, B, x: has(c, 'sub:0') ? x : null } });
      return S;
    }
  };

  /* =========================================================== SHAPES */
  const shp1 = {
    steps: ['Half way round', 'Double it', 'Answer'],
    gen(tier, used) {
      return fresh(() => {
        const r = [[3, 9, 2, 8], [6, 15, 3, 12], [12, 35, 5, 25]][tier];
        let l, w; do { l = R(r[0], r[1]); w = R(r[2], r[3]); } while (w >= l);
        return { l, w, tier, key: `P${l}x${w}` };
      }, used);
    },
    build(q) {
      const { l, w } = q, h = l + w, p = 2 * h;
      const S = Sheet(this.steps); S.always = true;
      S.row('half', 1, 'Half way', `${l} + ${w} = []`).row('dbl', 2, 'Double', `${h} × 2 = []`);
      S.box('half', 0, 1, h, { kind: 'add', prompt: `Walk half way round: one long side and one short side. ${l} + ${w}`, short: 'Half way round.', show: `Perimeter is the distance all the way round the edge. Half way round is one long side plus one short side: ${l} plus ${w} is ${h}.`, hints: ['Add one length and one width.', `${l} + ${w} = ${h}`] })
        .box('dbl', 0, 2, p, { kind: 'double', prompt: `The other half is the same. Double it: ${h} × 2`, short: 'Double it.', show: `The other half of the way round is exactly the same, so double it: ${h} times 2 is ${p}.`, hints: [`${h} + ${h}`, `Double the tens, then double the units.`] })
        .box('final', 0, 3, p, { prompt: 'So the perimeter is?', short: 'Write the perimeter.', show: `The perimeter is ${p} centimetres. Check: ${l} + ${w} + ${l} + ${w} = ${p}.`, hints: ['The number from step 2.'] });
      S.head = H('Perimeter = ? cm', 'Perimeter = [] cm', `Perimeter = ${p} cm`);
      S.say = `the perimeter of a ${l} by ${w} rectangle`; S.tot = p;
      S.visual = c => ({ type: 'rect', props: { l, w, half: has(c, 'half:0'), all: has(c, 'dbl:0'), p } });
      return S;
    }
  };
  const shp2 = {
    steps: ['Count', 'Multiply', 'Answer'],
    gen(tier, used) {
      return fresh(() => {
        const r = [[3, 6, 2, 5], [4, 9, 3, 8], [6, 12, 4, 9]][tier];
        const l = R(r[0], r[1]), w = R(r[2], Math.min(r[3], l));
        return { l, w, tier, key: `A${l}x${w}` };
      }, used);
    },
    build(q) {
      const { l, w } = q, a = l * w;
      const S = Sheet(this.steps); S.always = true;
      S.row('row', 1, 'One row', 'Squares in one row = []').row('rows', 1, 'Rows', 'Number of rows = []').row('mul', 2, 'Multiply', `${l} × ${w} = []`);
      S.box('row', 0, 1, l, { kind: 'count', prompt: 'Each little square is 1 cm². How many squares fit along one row?', short: 'Squares in a row.', show: `Area is how many 1 centimetre squares cover the shape. One row along the length holds ${l} squares.`, hints: ['Count the squares along the bottom edge.', `The length is ${l} cm.`] })
        .box('rows', 0, 1, w, { kind: 'count', prompt: 'How many rows are there?', short: 'Count the rows.', show: `The width is ${w} cm, so there are ${w} rows.`, hints: ['Count up the side.', `The width is ${w} cm.`] })
        .box('mul', 0, 2, a, { kind: 'unitsTimes', prompt: `${w} rows of ${l} squares: ${l} × ${w}`, short: 'Length × width.', show: `${w} rows of ${l} is ${l} times ${w}: ${a} squares. No need to count them all.`, hints: [`Count in ${l}s, ${w} times.`] })
        .box('final', 0, 3, a, { prompt: 'So the area is?', short: 'Write the area.', show: `The area is ${a} square centimetres. Length times width, every time.`, hints: ['The number from step 2.'] });
      S.head = H('Area = ? cm²', 'Area = [] cm²', `Area = ${a} cm²`);
      S.say = `the area of a ${l} by ${w} rectangle`; S.tot = a;
      S.visual = c => ({ type: 'sqgrid', props: { l, w, row: has(c, 'row:0'), rows: has(c, 'rows:0'), all: has(c, 'mul:0'), a } });
      return S;
    }
  };
  const shp3 = {
    steps: ['Missing sides', 'Shape A', 'Shape B', 'Add', 'Answer'],
    gen(tier, used) {
      return fresh(() => {
        const r = [[6, 9, 5, 8], [7, 12, 6, 10], [9, 15, 8, 12]][tier];
        const W = R(r[0], r[1]), Hh = R(r[2], r[3]), nw = R(2, W - 3), nh = R(2, Hh - 2);
        return { W, H: Hh, nw, nh, tier, key: `L${W}x${Hh}-${nw}x${nh}` };
      }, used);
    },
    build(q) {
      const { W, H: Hh, nw, nh } = q, ah = Hh - nh, bw = W - nw, A = W * ah, B = bw * nh, tot = A + B;
      const S = Sheet(this.steps); S.always = true;
      S.row('ms', 1, 'Missing', `${Hh} − ${nh} = []   and   ${W} − ${nw} = []`)
        .row('a', 2, 'Shape A', `${W} × ${ah} = []`).row('b', 3, 'Shape B', `${bw} × ${nh} = []`).row('add', 4, 'Add', `${A} + ${B} = []`);
      S.box('ms', 0, 1, ah, { kind: 'sub', prompt: `Cut the L into two rectangles. Shape A's height is missing: ${Hh} − ${nh}`, short: 'Find the missing sides.', show: `Cut the L-shape into two rectangles, A and B. Shape A's height isn't written on, but the whole side is ${Hh} and the top part is ${nh}, so it is ${Hh} take away ${nh}: ${ah}.`, hints: [`The whole left side is ${Hh}. Take off the part that belongs to B.`] })
        .box('ms', 1, 1, bw, { kind: 'sub', prompt: `Shape B's width: ${W} − ${nw}`, short: "Shape B's width.", show: `Shape B's width: the bottom is ${W} wide, minus the ${nw} cut out of the corner, is ${bw}.`, hints: [`The whole bottom is ${W}. Take away the ${nw} gap.`] })
        .box('a', 0, 2, A, { kind: 'unitsTimes', prompt: `Area of A: ${W} × ${ah}`, short: 'Area of A.', show: `Shape A is ${W} by ${ah}, so its area is ${A}.`, hints: [`Length × width: ${W} × ${ah}.`] })
        .box('b', 0, 3, B, { kind: 'unitsTimes', prompt: `Area of B: ${bw} × ${nh}`, short: 'Area of B.', show: `Shape B is ${bw} by ${nh}, so its area is ${B}.`, hints: [`Length × width: ${bw} × ${nh}.`] })
        .box('add', 0, 4, tot, { kind: 'add', prompt: `Add the two areas: ${A} + ${B}`, short: 'Add the areas.', show: `Add the two parts: ${A} plus ${B} is ${tot}.`, hints: ['Add the tens, then the units.'] })
        .box('final', 0, 5, tot, { prompt: 'So the area of the L-shape is?', short: 'Write the area.', show: `The whole L-shape covers ${tot} square centimetres.`, hints: ['The number from step 4.'] });
      S.head = H('Area = ? cm²', 'Area = [] cm²', `Area = ${tot} cm²`);
      S.say = 'the area of the L-shape'; S.tot = tot;
      S.visual = c => ({ type: 'lshape', props: { W, H: Hh, nw, nh, ah: has(c, 'ms:0') ? ah : null, bw: has(c, 'ms:1') ? bw : null, A: has(c, 'a:0') ? A : null, B: has(c, 'b:0') ? B : null } });
      return S;
    }
  };

  NB.Methods = Object.assign(NB.Methods || {}, {
    'add-1': add1, 'add-2': add2, 'add-3': sub1,
    'ang-1': ang1, 'ang-2': ang2, 'ang-3': ang3,
    'shp-1': shp1, 'shp-2': shp2, 'shp-3': shp3
  });

  /* ---------- lesson descriptors ---------- */
  const D = {
    add: { district: 'Fuel Stop', topic: 'Adding & subtracting', board: 'Add it Up!' },
    ang: { district: 'Drift Circuit', topic: 'Angles', board: 'Turn it!' },
    shp: { district: 'Paint Bay', topic: 'Shapes', board: 'Measure it!' }
  };
  const L = (id, topic, lv, title, watch, together, intros) => {
    NB.Content = NB.Content || {};
    NB.Content[id] = { id, engine: 'sheet', method: id, gameTopic: topic, gameLevel: lv - 1, level: lv, title, mission: `${D[topic].district}: level ${lv}`, boardTitle: D[topic].board,
      district: D[topic].district, topic: D[topic].topic,
      handover: { startTier: 1, watch: { q: watch, intro: intros[0] }, together: { q: together, intro: intros[1] }, less: { count: 2, intro: '{q}. This time I only tell you which step comes next. Tap Hint if you need more.' }, alone: { count: 3, intro: intros[2] } } };
  };
  L('add-1', 'add', 1, 'Column addition', { a: 47, b: 38, key: '47+38' }, { a: 56, b: 27, key: '56+27' }, [
    "Two fill-ups: 47 litres and 38 litres. 47 plus 38. Line the numbers up in columns and start with the units. Watch me.",
    'Your turn: 56 plus 27. Units first, carry if it gets to 10 or more. I give you a tip for each step.',
    "Three on your own. Units, carry, tens, answer. I'll stay quiet unless you get stuck."]);
  L('add-2', 'add', 2, 'Adding big numbers', { a: 468, b: 275, key: '468+275' }, { a: 357, b: 286, key: '357+286' }, [
    "Big order: 468 dollars plus 275. Same columns, just one more. Watch out, we carry twice. Watch me.",
    'Your turn: 357 plus 286. Units, tens, hundreds. Carry when a column hits 10.',
    "Three big totals on your own. You know the moves."]);
  L('add-3', 'add', 3, 'Subtracting with exchange', { a: 352, b: 127, key: '352-127' }, { a: 463, b: 238, key: '463-238' }, [
    "The tank had 352 litres and 127 went into the cars. 352 take away 127. When the top digit is too small, we exchange. Watch me.",
    'Your turn: 463 take away 238. Check each column: is the top big enough? If not, exchange.',
    "Three on your own. Exchange when the top is too small, then take away."]);
  L('ang-1', 'ang', 1, 'Turns and right angles', { from: 'N', to: 'S', k: 2, anti: false, key: 'N>S' }, { from: 'N', to: 'E', k: 3, anti: true, key: 'N<E' }, [
    "Turning on the drift circuit. The car faces North and spins clockwise to South. How far did it turn? We measure turns in degrees. Watch me.",
    'Your turn: North to East, but anticlockwise, the long way round. Count the quarter turns, then times by 90.',
    "Three turns on your own. Count quarter turns, times by 90."]);
  L('ang-2', 'ang', 2, 'Lines and points', { T: 180, known: [65, 40], key: '180:65,40' }, { T: 360, known: [120, 95, 70], key: '360:120,95,70' }, [
    "A ramp leans on the straight track. The angles on a straight line always add up to 180 degrees. Use that to find the missing one. Watch me.",
    'Your turn: these angles go all the way around a point. A full turn is 360 degrees. Find x.',
    "Three on your own. Straight line: 180. All the way round: 360."]);
  L('ang-3', 'ang', 3, 'Angles in a triangle', { A: 70, B: 50, key: '70,50' }, { A: 35, B: 85, key: '35,85' }, [
    "Every triangle's three angles add up to 180 degrees. Know two, and you can find the third. Watch me.",
    'Your turn: 35 degrees and 85 degrees. Find the third angle.',
    "Three triangles on your own. Total, add, take away."]);
  L('shp-1', 'shp', 1, 'Perimeter', { l: 9, w: 5, key: 'P9x5' }, { l: 12, w: 7, key: 'P12x7' }, [
    "We're putting neon tape all round the edge of a parking bay. The distance round the edge is called the perimeter. Watch me.",
    'Your turn: a bay 12 by 7. Half way round, then double.',
    "Three bays on your own. Half way round, double it."]);
  L('shp-2', 'shp', 2, 'Area', { l: 6, w: 4, key: 'A6x4' }, { l: 7, w: 5, key: 'A7x5' }, [
    "Now we're painting the floor. Area is how many squares cover the inside. Watch me count smart, not one by one.",
    'Your turn: a 7 by 5 floor. Squares in a row, how many rows, then multiply.',
    "Three floors on your own. Length times width."]);
  L('shp-3', 'shp', 3, 'L-shaped areas', { W: 9, H: 7, nw: 4, nh: 3, key: 'L9x7-4x3' }, { W: 10, H: 8, nw: 3, nh: 5, key: 'L10x8-3x5' }, [
    "An L-shaped garage floor. It's not a rectangle, so cut it into two rectangles, find each area, then add. Watch me.",
    'Your turn: find the missing sides first, then each area, then add.',
    "Three L-shapes on your own. Split, multiply, add."]);

  /* ---------- 2D pictures ---------- */
  const SR = NB.StepRenderer;
  SR.register('colsum', ({ a, b, op, n, ans, carries, exch }) => {
    const A = String(a).padStart(n, ' ').split(''), B = String(b).padStart(n, ' ').split('');
    const cell = (d, cls = '') => `<span class="cc ${cls}">${d === ' ' || d == null ? '' : d}</span>`;
    const carryRow = Array.from({ length: n }, (_, i) => { const k = n - 1 - i; return cell(carries && carries[k - 1] ? '1' : '', 'carry'); }).join('');
    const topRow = A.map((d, i) => { const k = n - 1 - i; if (exch && d !== ' ' && (exch[k] || exch[k - 1])) return `<span class="cc ex"><s>${d}</s><em>${+d - (exch[k - 1] ? 1 : 0) + (exch[k] ? 10 : 0)}</em></span>`; return cell(d); }).join('');
    const ansRow = Array.from({ length: n }, (_, i) => { const k = n - 1 - i; const v = ans[k]; return cell(v == null ? '' : v, v == null ? 'blank' : 'got'); }).join('');
    return `<div class="v-colsum" style="--n:${n}"><span class="cs"></span>${op === '+' ? carryRow : Array(n).fill('<span class="cc carry"></span>').join('')}
      <span class="cs"></span>${topRow}<span class="cs op">${op}</span>${B.map(d => cell(d)).join('')}
      <span class="cs"></span><span class="crule" style="grid-column:2/span ${n}"></span><span class="cs"></span>${ansRow}</div>
      <div class="v-note">${op === '+' ? 'Units first. A column of 10 or more carries 1 to the left' : 'Top digit too small? Exchange 1 from the next column'}</div>`;
  });
  const ANG = { N: 0, E: 90, S: 180, W: 270 };
  SR.register('compass', ({ from, to, k, anti, counted, deg }) => {
    const a0 = ANG[from], sweep = (anti ? -1 : 1) * k * 90, a1 = a0 + (counted ? sweep : 0);
    const P = (ang, r) => [100 + r * Math.sin(ang * Math.PI / 180), 100 - r * Math.cos(ang * Math.PI / 180)];
    let arc = '';
    if (counted) {
      const steps = Math.max(2, k * 8); let d = '';
      for (let i = 0; i <= steps; i++) { const [x, y] = P(a0 + sweep * i / steps, 52); d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)} `; }
      arc = `<path d="${d}" class="c-arc"/>`;
    }
    const ticks = Array.from({ length: 4 }, (_, i) => { const [x1, y1] = P(i * 90 + 45, 78), [x2, y2] = P(i * 90 + 45, 86); return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="c-tick"/>`; }).join('');
    const lab = DIRS.map(d => { const [x, y] = P(ANG[d], 92); return `<text x="${x}" y="${y + 5}" class="c-lab ${d === from ? 'from' : ''} ${counted && d === to ? 'to' : ''}">${d}</text>`; }).join('');
    return `<svg class="v-compass" viewBox="-6 -6 212 212" role="img" aria-label="Compass: ${DNAME[from]} to ${DNAME[to]}">
      <circle cx="100" cy="100" r="80" class="c-ring"/><line x1="100" y1="20" x2="100" y2="180" class="c-cross"/><line x1="20" y1="100" x2="180" y2="100" class="c-cross"/>${ticks}${arc}
      <g class="c-needle" style="transform:rotate(${a1}deg)"><path d="M100 30 L110 100 L100 92 L90 100 Z" class="c-head"/><circle cx="100" cy="100" r="6" class="c-hub"/></g>${lab}
</svg>
      <div class="v-note">${counted ? `${CAP(TURN(k))} ${anti ? 'anticlockwise' : 'clockwise'}${deg != null ? ` = ${deg}°` : ''}` : `Start facing ${DNAME[from]}, turn ${anti ? 'anticlockwise' : 'clockwise'} to ${DNAME[to]}`}</div>`;
  });
  /* Angles that share a vertex: on a straight line (rays above the line) or around a point. */
  SR.register('angles', ({ T, known, x, total }) => {
    const all = known.concat([T - known.reduce((p, v) => p + v, 0)]), cx = 120, cy = T === 180 ? 118 : 100, R0 = 88;
    const P = (deg, r) => [cx + r * Math.cos(-deg * Math.PI / 180), cy + r * Math.sin(-deg * Math.PI / 180)];
    let start = 0, h = '';
    all.forEach((v, i) => {
      const end = start + v, unk = i === all.length - 1, r = unk ? 30 : 24 + (i % 2) * 8;
      let d = ''; const st = Math.max(4, Math.round(v / 6));
      for (let j = 0; j <= st; j++) { const [x2, y2] = P(start + v * j / st, r); d += `${j ? 'L' : 'M'}${x2.toFixed(1)} ${y2.toFixed(1)} `; }
      h += `<path d="M${cx} ${cy} ${d.replace('M', 'L')} Z" class="a-sec ${unk ? 'unk' : ''} k${i % 3}"/>`;
      const [lx, ly] = P(start + v / 2, unk ? 56 : 52 + (v < 40 ? 14 : 0));
      h += `<text x="${lx.toFixed(1)}" y="${(ly + 5).toFixed(1)}" class="a-lab ${unk ? 'unk' : ''}">${unk ? (x != null ? `${x}°` : 'x') : `${v}°`}</text>`;
      start = end;
    });
    let rays = '';
    let acc = 0; all.forEach((v, i) => { if (T === 360 || (i > 0)) { const [x2, y2] = P(acc, R0); rays += `<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="a-ray"/>`; } acc += v; });
    const base = T === 180 ? `<line x1="${cx - R0 - 14}" y1="${cy}" x2="${cx + R0 + 14}" y2="${cy}" class="a-line"/>` : '';
    return `<svg class="v-angles" viewBox="0 ${T === 180 ? 14 : 0} 240 ${T === 180 ? 118 : 200}" role="img" aria-label="Angles adding to ${T} degrees">${h}${base}${rays}<circle cx="${cx}" cy="${cy}" r="3.5" class="a-dot"/></svg>
      <div class="v-note">${total ? (T === 180 ? 'A straight line is a half turn: 180°' : 'All the way round is a full turn: 360°') : 'Drawn to scale. Find the angle marked x'}</div>`;
  });
  SR.register('triangle', ({ A, B, x }) => {
    const ra = A * Math.PI / 180, rb = B * Math.PI / 180;
    // base from (0,0) to (1,0); apex where the two sides meet
    const ax = Math.tan(rb) / (Math.tan(ra) + Math.tan(rb)), ay = ax * Math.tan(ra);
    const pts = [[0, 0], [1, 0], [ax, ay]], minX = Math.min(0, ax), maxX = Math.max(1, ax), s = 200 / Math.max(maxX - minX, ay * 1.15);
    const M = ([px, py]) => [16 + (px - minX) * s, 20 + ay * s - py * s];
    const [p0, p1, p2] = pts.map(M), poly = [p0, p1, p2].map(p => p.map(v => v.toFixed(1)).join(',')).join(' ');
    const lab = (p, q, r, txt, cls) => { const mx = (q[0] + r[0]) / 2, my = (q[1] + r[1]) / 2, dx = mx - p[0], dy = my - p[1], L = Math.hypot(dx, dy) || 1, k = Math.min(34, L * .45); return `<text x="${(p[0] + dx / L * k).toFixed(1)}" y="${(p[1] + dy / L * k + 5).toFixed(1)}" class="t-lab ${cls}">${txt}</text>`; };
    const W = 32 + (maxX - minX) * s, Ht = 40 + ay * s;
    return `<svg class="v-tri" viewBox="0 0 ${W.toFixed(0)} ${Ht.toFixed(0)}" role="img" aria-label="Triangle with angles ${A} and ${B} degrees"><polygon points="${poly}" class="t-shape"/>
      ${lab(p0, p1, p2, `${A}°`, '')}${lab(p1, p0, p2, `${B}°`, '')}${lab(p2, p0, p1, x != null ? `${x}°` : 'x', 'unk')}</svg>
      <div class="v-note">Drawn to scale: the three corners make 180°</div>`;
  });
  SR.register('rect', ({ l, w, half, all, p }) => {
    const sc = Math.min(220 / l, 120 / w), W = l * sc, Hh = w * sc, x0 = 34, y0 = 26;
    const halfPath = `M${x0} ${y0 + Hh} L${x0 + W} ${y0 + Hh} L${x0 + W} ${y0}`;
    return `<svg class="v-rect" viewBox="0 0 ${(W + 68).toFixed(0)} ${(Hh + 56).toFixed(0)}" role="img" aria-label="Rectangle ${l} cm by ${w} cm">
      <rect x="${x0}" y="${y0}" width="${W.toFixed(1)}" height="${Hh.toFixed(1)}" class="r-shape ${all ? 'lit' : ''}"/>
      ${half && !all ? `<path d="${halfPath}" class="r-trace"/>` : ''}
      <text x="${(x0 + W / 2).toFixed(1)}" y="${(y0 + Hh + 22).toFixed(1)}" class="r-lab">${l} cm</text>
      <text x="${(x0 + W / 2).toFixed(1)}" y="${y0 - 8}" class="r-lab dim">${l} cm</text>
      <text x="${(x0 + W + 8).toFixed(1)}" y="${(y0 + Hh / 2 + 5).toFixed(1)}" class="r-lab" text-anchor="start">${w}</text>
      <text x="${x0 - 8}" y="${(y0 + Hh / 2 + 5).toFixed(1)}" class="r-lab dim" text-anchor="end">${w}</text></svg>
      <div class="v-note">${all ? `All the way round: ${p} cm` : half ? `Half way round: ${l} + ${w}` : 'Perimeter: the distance all the way round the edge'}</div>`;
  });
  SR.register('sqgrid', ({ l, w, row, rows, all, a }) => {
    const cells = [];
    for (let r = 0; r < w; r++) for (let c = 0; c < l; c++) {
      const on = all || (row && r === w - 1) || (rows && c === 0);
      cells.push(`<i class="${on ? 'on' : ''} ${all ? '' : (row && r === w - 1) ? 'rowon' : ''}" style="--d:${all ? (r * l + c) * 12 : 0}ms"></i>`);
    }
    return `<div class="v-sqgrid"><div class="ag" style="--l:${l};--w:${w}">${cells.join('')}</div><div class="ag-l">${l} cm</div><div class="ag-w">${w} cm</div></div>
      <div class="v-note">${all ? `${w} rows of ${l} = ${a} squares` : 'Each square is 1 cm by 1 cm'}</div>`;
  });
  SR.register('lshape', ({ W, H: Hh, nw, nh, ah, bw, A, B }) => {
    const sc = Math.min(200 / W, 150 / Hh), x0 = 40, y0 = 20, X = v => (x0 + v * sc).toFixed(1), Y = v => (y0 + v * sc).toFixed(1);
    // L: full width at the bottom, notch cut from the top-right corner
    const outline = `M${X(0)} ${Y(0)} L${X(W - nw)} ${Y(0)} L${X(W - nw)} ${Y(nh)} L${X(W)} ${Y(nh)} L${X(W)} ${Y(Hh)} L${X(0)} ${Y(Hh)} Z`;
    return `<svg class="v-lsh" viewBox="0 0 ${(W * sc + 90).toFixed(0)} ${(Hh * sc + 56).toFixed(0)}" role="img" aria-label="L-shape">
      <rect x="${X(0)}" y="${Y(nh)}" width="${(W * sc).toFixed(1)}" height="${((Hh - nh) * sc).toFixed(1)}" class="l-a ${A != null ? 'on' : ''}"/>
      <rect x="${X(0)}" y="${Y(0)}" width="${((W - nw) * sc).toFixed(1)}" height="${(nh * sc).toFixed(1)}" class="l-b ${B != null ? 'on' : ''}"/>
      <path d="${outline}" class="l-out"/><line x1="${X(0)}" y1="${Y(nh)}" x2="${X(W - nw)}" y2="${Y(nh)}" class="l-cut"/>
      <text x="${X(W / 2)}" y="${(+Y(Hh) + 20).toFixed(1)}" class="r-lab">${W}</text>
      <text x="${(+X(0) - 8).toFixed(1)}" y="${Y(Hh / 2)}" class="r-lab" text-anchor="end">${Hh}</text>
      <text x="${X(W - nw / 2)}" y="${(+Y(nh) - 8).toFixed(1)}" class="r-lab">${nw}</text>
      <text x="${(+X(W) + 8).toFixed(1)}" y="${Y(nh / 2 + 0.3)}" class="r-lab" text-anchor="start">${nh}</text>
      <text x="${X(W / 2)}" y="${Y(nh + (Hh - nh) / 2 + 0.3)}" class="l-n">A${A != null ? ` = ${A}` : ''}</text>
      <text x="${X((W - nw) / 2)}" y="${Y(nh / 2 + 0.3)}" class="l-n">B${B != null ? ` = ${B}` : ''}</text>
      ${ah != null ? `<text x="${(+X(W) + 8).toFixed(1)}" y="${Y(nh + (Hh - nh) / 2 + 0.3)}" class="r-lab got" text-anchor="start">${ah}</text>` : ''}
      ${bw != null ? `<text x="${X((W - nw) / 2)}" y="${(+Y(0) - 6).toFixed(1)}" class="r-lab got">${bw}</text>` : ''}</svg>
      <div class="v-note">Lengths in cm. Split it into two rectangles</div>`;
  });
})(window.NB = window.NB || {});
