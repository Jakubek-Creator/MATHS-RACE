/* Methods — one step-by-step worksheet method per level (4 topics × 3 levels).
   Each method can:
     gen(tier, used)  → a fresh question {key, tier, ...numbers}
     build(q, mode)   → the worksheet: rows (lines of working with [] answer boxes), moves (one per box,
                        in order, each with what NOVA says when she does it, the short cue and hints),
                        the header sum, and an optional 2D picture that grows as the child works.
   Every answer is worked out in code. Every box takes a whole number, so the number pad is all a child needs.
   Fractions are written {f:top/bottom} in templates; a [] inside a fraction is an answer box. */
(function (NB) {
  const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[R(0, a.length - 1)];
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const lcm = (a, b) => a / gcd(a, b) * b;
  const fr = (n, d) => `{f:${n}/${d}}`;
  const FN = ['', 'whole', 'half', 'third', 'quarter', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth'];
  const frSay = (n, d) => { const w = FN[d]; if (!w) return `${n} over ${d}`; return n === 1 ? `one ${w}` : `${n} ${w === 'half' ? 'halves' : w + 's'}`; };
  const fresh = (make, used) => { for (let i = 0; i < 40; i++) { const q = make(); if (!used.includes(q.key)) return q; } return make(); };

  /* A worksheet under construction. */
  function Sheet(steps) {
    const S = { rows: [], moves: [], steps };
    S.row = (id, step, label, tpl, extra = {}) => { S.rows.push(Object.assign({ id, step, label, tpl }, extra)); return S; };
    // one move per [] in the row, in order: key is row:index (or 'final' for the header box)
    S.box = (row, idx, step, answer, o) => { S.moves.push(Object.assign({ key: row === 'final' ? 'final' : `${row}:${idx}`, row, step, answer, kind: o.kind || row }, o)); return S; };
    return S;
  }
  const H = (ask, fin, done) => ({ ask, fin, done });

  /* =========================================================== MULTIPLYING */
  const multSay = q => `${q.a} times ${q.b}`;

  // Level 2: two-digit × two-digit, by splitting both numbers into tens and units (grid method).
  const mult2 = {
    steps: ['Split', 'Big parts', 'Small parts', 'Add', 'Answer'],
    gen(tier, used) {
      const rng = [[12, 29, 11, 19], [21, 49, 12, 29], [31, 89, 21, 49]][tier];
      return fresh(() => { let a, b; do { a = R(rng[0], rng[1]); b = R(rng[2], rng[3]); } while (a % 10 === 0 || b % 10 === 0); return { a, b, tier, key: `${a}x${b}` }; }, used);
    },
    build(q) {
      const { a, b } = q, at = a - a % 10, ao = a % 10, bt = b - b % 10, bo = b % 10;
      const p1 = at * bt, p2 = at * bo, p3 = ao * bt, p4 = ao * bo, tot = a * b;
      const S = Sheet(this.steps);
      S.row('sa', 1, 'Split', `${a} = [] + []`).row('sb', 1, 'Split', `${b} = [] + []`)
        .row('p1', 2, 'Tens × tens', `${at} × ${bt} = []`).row('p2', 2, 'Tens × units', `${at} × ${bo} = []`)
        .row('p3', 3, 'Units × tens', `${ao} × ${bt} = []`).row('p4', 3, 'Units × units', `${ao} × ${bo} = []`)
        .row('add', 4, 'Add', `${p1} + ${p2} + ${p3} + ${p4} = []`);
      S.box('sa', 0, 1, at, { prompt: `Split ${a}. What are its tens worth?`, short: `Split ${a} and ${b}.`, show: `First split both numbers. ${a} is ${at} plus ${ao}.`, hints: [`The first digit of ${a} is tens. ${at / 10} tens is ${at}.`, `${a} = ${at} + ${ao}. Type ${at}.`] })
        .box('sa', 1, 1, ao, { prompt: `And the units of ${a}?`, short: 'Now its units.', show: `So the units part is ${ao}.`, hints: [`The units are the last digit of ${a}.`] })
        .box('sb', 0, 1, bt, { prompt: `Now split ${b}. Its tens are worth?`, short: `Split ${b}.`, show: `${b} is ${bt} plus ${bo}.`, hints: [`${bt / 10} tens is ${bt}.`] })
        .box('sb', 1, 1, bo, { prompt: `And the units of ${b}?`, short: 'Its units.', show: `The units part of ${b} is ${bo}.`, hints: [`The last digit of ${b}.`] })
        .box('p1', 0, 2, p1, { kind: 'tensTens', prompt: `Multiply the tens: ${at} × ${bt}`, short: 'Tens times tens.', show: `${at / 10} times ${bt / 10} is ${at / 10 * bt / 10}. Both are tens, so add two zeros: ${p1}.`, hints: [`Do ${at / 10} × ${bt / 10} first, then add two zeros.`, `${at / 10} × ${bt / 10} = ${at / 10 * bt / 10}. Add two zeros.`] })
        .box('p2', 0, 2, p2, { prompt: `${at} × ${bo}`, short: 'Tens times units.', show: `${at / 10} times ${bo} is ${at / 10 * bo}. One zero for the tens: ${p2}.`, hints: [`Do ${at / 10} × ${bo}, then add one zero.`, `${at / 10} × ${bo} = ${at / 10 * bo}. Add one zero.`] })
        .box('p3', 0, 3, p3, { prompt: `${ao} × ${bt}`, short: 'Units times tens.', show: `${ao} times ${bt / 10} is ${ao * bt / 10}. One zero for the tens: ${p3}.`, hints: [`Do ${ao} × ${bt / 10}, then add one zero.`, `${ao} × ${bt / 10} = ${ao * bt / 10}. Add one zero.`] })
        .box('p4', 0, 3, p4, { kind: 'unitsTimes', prompt: `${ao} × ${bo}`, short: 'Units times units.', show: `${ao} times ${bo} is ${p4}.`, hints: [`Count up in ${bo}s, ${ao} times.`, `${ao} × ${bo}: ${Array.from({ length: ao }, (_, i) => bo * (i + 1)).join(', ')}.`] })
        .box('add', 0, 4, tot, { prompt: `Add all four parts.`, short: 'Add the four parts.', show: `Add the four parts: ${p1} plus ${p2} plus ${p3} plus ${p4} is ${tot}.`, hints: [`Add the two big ones first: ${p1} + ${p2} = ${p1 + p2}. Then add the rest.`, `${p1 + p2} + ${p3} = ${p1 + p2 + p3}. Now add ${p4}.`] })
        .box('final', 0, 5, tot, { prompt: `Write the answer: ${a} × ${b}`, short: 'Write the answer.', show: `So ${a} times ${b} is ${tot}.`, hints: ['The total of the four parts.'] });
      S.head = H(`${a} × ${b} = ?`, `${a} × ${b} = []`, `${a} × ${b} = ${tot}`);
      S.say = multSay(q); S.tot = tot;
      S.visual = c => ({ type: 'grid', props: { a: [at, ao], b: [bt, bo], v: [c.vals['p1:0'], c.vals['p2:0'], c.vals['p3:0'], c.vals['p4:0']] } });
      return S;
    }
  };

  // Level 3: three-digit × one-digit: hundreds, tens and units.
  const mult3 = {
    steps: ['Split', 'Hundreds', 'Tens & units', 'Add', 'Answer'],
    gen(tier, used) {
      const rng = [[112, 299, 2, 4], [123, 499, 3, 7], [234, 899, 4, 9]][tier];
      return fresh(() => { let a; do { a = R(rng[0], rng[1]); } while (a % 10 === 0 || Math.floor(a / 10) % 10 === 0); const b = R(rng[2], rng[3]); return { a, b, tier, key: `${a}x${b}` }; }, used);
    },
    build(q) {
      const { a, b } = q, h = a - a % 100, t = a % 100 - a % 10, o = a % 10, ph = h * b, pt = t * b, po = o * b, tot = a * b;
      const S = Sheet(this.steps);
      S.row('split', 1, 'Split', `${a} = [] + [] + []`).row('h', 2, 'Hundreds', `${h} × ${b} = []`)
        .row('t', 3, 'Tens', `${t} × ${b} = []`).row('u', 3, 'Units', `${o} × ${b} = []`).row('add', 4, 'Add', `${ph} + ${pt} + ${po} = []`);
      S.box('split', 0, 1, h, { prompt: `Split ${a}. What are the hundreds worth?`, short: `Split ${a}.`, show: `Split ${a} into hundreds, tens and units. The hundreds are worth ${h}.`, hints: [`The first digit is hundreds: ${h / 100} hundreds.`, `${h / 100} hundreds is ${h}.`] })
        .box('split', 1, 1, t, { prompt: 'The tens are worth?', short: 'Now the tens.', show: `The tens are worth ${t}.`, hints: [`The middle digit is tens: ${t / 10} tens.`] })
        .box('split', 2, 1, o, { prompt: 'And the units?', short: 'And the units.', show: `And the units are ${o}.`, hints: ['The last digit.'] })
        .box('h', 0, 2, ph, { prompt: `Multiply the hundreds: ${h} × ${b}`, short: 'Multiply the hundreds.', show: `${h / 100} times ${b} is ${h / 100 * b}. Hundreds get two zeros: ${ph}.`, hints: [`${h / 100} × ${b}, then add two zeros.`, `${h / 100} × ${b} = ${h / 100 * b}. Now two zeros.`] })
        .box('t', 0, 3, pt, { kind: 'tensTimes', prompt: `Multiply the tens: ${t} × ${b}`, short: 'Multiply the tens.', show: `${t / 10} times ${b} is ${t / 10 * b}. Tens get one zero: ${pt}.`, hints: [`${t / 10} × ${b}, then add one zero.`, `${t / 10} × ${b} = ${t / 10 * b}. Add a zero.`] })
        .box('u', 0, 3, po, { kind: 'unitsTimes', prompt: `Multiply the units: ${o} × ${b}`, short: 'Multiply the units.', show: `${o} times ${b} is ${po}.`, hints: [`Count up in ${b}s, ${o} times.`] })
        .box('add', 0, 4, tot, { prompt: 'Add the three parts.', short: 'Add the parts.', show: `${ph} plus ${pt} plus ${po} is ${tot}.`, hints: [`${ph} + ${pt} = ${ph + pt}. Then add ${po}.`] })
        .box('final', 0, 5, tot, { prompt: `Write the answer: ${a} × ${b}`, short: 'Write the answer.', show: `So ${a} times ${b} is ${tot}.`, hints: ['The total of the three parts.'] });
      S.head = H(`${a} × ${b} = ?`, `${a} × ${b} = []`, `${a} × ${b} = ${tot}`);
      S.say = multSay(q); S.tot = tot;
      S.visual = c => ({ type: 'parts', props: { parts: [[`${h} × ${b}`, c.vals['h:0']], [`${t} × ${b}`, c.vals['t:0']], [`${o} × ${b}`, c.vals['u:0']]] } });
      return S;
    }
  };

  /* =========================================================== LONG DIVISION */
  // Bus stop method: divide, multiply, subtract, bring down. Works for any number of digits, no remainders.
  function divMethod(nDigits, ranges) {
    return {
      steps: ['Divide', 'Multiply', 'Subtract', 'Bring down', 'Answer'],
      gen(tier, used) {
        const [d0, d1] = ranges[tier], lo = Math.pow(10, nDigits - 1), hi = Math.pow(10, nDigits) - 1;
        return fresh(() => { let d, qv, N; do { d = R(d0, d1); qv = R(Math.ceil(lo / d), Math.floor(hi / d)); N = qv * d; } while (N < lo || N > hi || qv < 10 || String(qv).includes('0') && tier === 0); return { N, d, tier, key: `${N}/${d}` }; }, used);
      },
      build(q) {
        const { N, d } = q, D = String(N).split('').map(Number), ans = N / d;
        const S = Sheet(this.steps); let i = 0, cur = D[0], round = 0, qd = [];
        // the first number to divide may need two digits (e.g. 13 in 1365)
        while (cur < d && i < D.length - 1) { i++; cur = cur * 10 + D[i]; }
        const first = cur;
        for (;;) {
          const qq = Math.floor(cur / d), m = qq * d, r = cur - m, id = `r${round}`;
          qd.push(qq);
          S.row(`${id}d`, 1, 'Divide', `${cur} ÷ ${d} = []`).row(`${id}m`, 2, 'Multiply', `${qq} × ${d} = []`).row(`${id}s`, 3, 'Subtract', `${cur} − ${m} = []`);
          const fits = Array.from({ length: Math.min(qq + 1, 9) }, (_, k) => d * (k + 1)).join(', ');
          S.box(`${id}d`, 0, 1, qq, { prompt: round === 0 && first !== D[0] ? `${D[0]} is too small for ${d}, so use ${first}. How many ${d}s fit in ${first}?` : `How many ${d}s fit in ${cur}?`, short: 'Divide.',
            show: round === 0 && first !== D[0] ? `${D[0]} is smaller than ${d}, so we use the first two digits, ${first}. ${d} goes into ${first} ${qq} times.` : `How many ${d}s fit into ${cur}? ${qq}. That digit goes on top of the bus stop.`,
            hints: [`Count up in ${d}s and stop before you pass ${cur}: ${fits}…`, `${qq} × ${d} = ${m}, and ${qq + 1} × ${d} = ${(qq + 1) * d} is too big.`] })
            .box(`${id}m`, 0, 2, m, { kind: 'unitsTimes', prompt: `Multiply: ${qq} × ${d}`, short: 'Multiply.', show: `Multiply back: ${qq} times ${d} is ${m}.`, hints: [`Count up in ${d}s, ${qq} times.`] })
            .box(`${id}s`, 0, 3, r, { prompt: `Subtract: ${cur} − ${m}. What's left?`, short: 'Subtract.', show: `Subtract to see what's left: ${cur} minus ${m} is ${r}.`, hints: [`Count up from ${m} to ${cur}.`, `${m} + ? = ${cur}`] });
          i++;
          if (i >= D.length) break;
          const nxt = r * 10 + D[i];
          S.row(`${id}b`, 4, 'Bring down', `${r} and ${D[i]} make []`);
          S.box(`${id}b`, 0, 4, nxt, { prompt: `Bring down the ${D[i]}. Put it next to the ${r}. What number is that?`, short: 'Bring down the next digit.', show: `Bring down the next digit, ${D[i]}. With the ${r} left over, that makes ${nxt}.`, hints: [`Write ${r} then ${D[i]} next to it.`, r === 0 ? `0 and ${D[i]} make just ${D[i]}.` : `${r} tens and ${D[i]} units.`] });
          cur = nxt; round++;
        }
        S.box('final', 0, 5, ans, { prompt: `Read the answer off the top: ${N} ÷ ${d}`, short: 'Write the answer.', show: `Read the digits along the top: ${N} divided by ${d} is ${ans}.`, hints: ['Put the digits you found together, in order.', `The top digits read ${ans}.`] });
        S.head = H(`${N} ÷ ${d} = ?`, `${N} ÷ ${d} = []`, `${N} ÷ ${d} = ${ans}`);
        S.say = `${N} divided by ${d}`; S.tot = ans;
        const lead = String(N).length - String(ans).length;
        S.visual = c => ({ type: 'busstop', props: { N, d, lead, q: qd.map((v, k) => c.vals[`r${k}d:0`] != null ? v : null) } });
        return S;
      }
    };
  }

  /* =========================================================== ALGEBRA */
  // A balance: whatever you do to one side, do to the other. Undo + or − first, then × or ÷.
  const alg1 = {
    steps: ['Undo', 'Work it out', 'Check', 'Answer'],
    gen(tier, used) {
      return fresh(() => { const minus = tier === 1 || (tier === 2 && R(0, 1)); const x = R(minus ? 6 : 2, 15 + tier * 5), p = R(2, minus ? x - 1 : 12); return { x, p, op: minus ? '-' : '+', tier, key: `x${minus ? '-' : '+'}${p}=${minus ? x - p : x + p}` }; }, used);
    },
    build(q) {
      const { x, p, op } = q, plus = op === '+', rhs = plus ? x + p : x - p, inv = plus ? '−' : '+', sym = plus ? '+' : '−';
      const S = Sheet(this.steps);
      S.row('undo', 1, 'Undo', `x = ${rhs} ${inv} []`).row('work', 2, 'Work out', `${rhs} ${inv} ${p} = []`).row('chk', 3, 'Check', `${x} ${sym} ${p} = []`);
      S.box('undo', 0, 1, p, { prompt: `x has ${p} ${plus ? 'added' : 'taken away'}. Undo it: ${plus ? 'take away' : 'add'} the same from ${rhs}.`, short: `Undo the ${sym} ${p}.`, show: `x has ${p} ${plus ? 'added to it' : 'taken off'}. To get x alone, do the opposite to both sides: ${plus ? 'take away' : 'add'} ${p}.`, hints: [`The opposite of ${sym} ${p} is ${inv} ${p}. So type ${p}.`] })
        .box('work', 0, 2, x, { prompt: `Work it out: ${rhs} ${inv} ${p}`, short: 'Work it out.', show: `${rhs} ${plus ? 'take away' : 'plus'} ${p} is ${x}.`, hints: [plus ? `Count back ${p} from ${rhs}.` : `Count on ${p} from ${rhs}.`] })
        .box('chk', 0, 3, rhs, { prompt: `Check it: put ${x} back in. ${x} ${sym} ${p} = ?`, short: 'Check your x.', show: `Check: ${x} ${plus ? 'plus' : 'minus'} ${p} is ${rhs}. It matches, so x is right.`, hints: [`Work out ${x} ${sym} ${p}. It should match ${rhs}.`] })
        .box('final', 0, 4, x, { prompt: 'So what is x?', short: 'Write x.', show: `So x is ${x}. The door code is cracked!`, hints: ['The number you worked out in step 2.'] });
      S.head = H(`x ${sym} ${p} = ${rhs}`, 'x = []', `x = ${x}`); S.say = `x ${plus ? 'plus' : 'minus'} ${p} equals ${rhs}`; S.tot = x;
      S.visual = c => ({ type: 'balance', props: { left: c.vals['undo:0'] != null ? 'x' : `x ${sym} ${p}`, right: c.vals['work:0'] != null ? String(x) : c.vals['undo:0'] != null ? `${rhs} ${inv} ${p}` : String(rhs), ok: c.vals['chk:0'] != null } });
      return S;
    }
  };
  const alg2 = {
    steps: ['Undo', 'Work it out', 'Check', 'Answer'],
    gen(tier, used) {
      return fresh(() => { const div = tier === 2 && R(0, 1); const a = R(2, tier ? 9 : 5), x = R(2, 12); return { a, x, div, tier, key: div ? `x/${a}=${x}` : `${a}x=${a * x}` }; }, used);
    },
    build(q) {
      const { a, div } = q, x = div ? q.x * a : q.x, rhs = div ? q.x : a * q.x;
      const S = Sheet(this.steps);
      if (!div) {
        S.row('undo', 1, 'Undo', `x = ${rhs} ÷ []`).row('work', 2, 'Work out', `${rhs} ÷ ${a} = []`).row('chk', 3, 'Check', `${a} × ${x} = []`);
        S.box('undo', 0, 1, a, { prompt: `${a}x means ${a} times x. Undo it by dividing both sides by?`, short: `Undo the × ${a}.`, show: `${a}x means ${a} times x. The opposite of times is divide, so divide both sides by ${a}.`, hints: [`The opposite of × ${a} is ÷ ${a}.`] })
          .box('work', 0, 2, x, { prompt: `${rhs} ÷ ${a}`, short: 'Work it out.', show: `${rhs} divided by ${a} is ${x}.`, hints: [`How many ${a}s make ${rhs}? Count up in ${a}s.`, `${a} × ? = ${rhs}`] })
          .box('chk', 0, 3, rhs, { kind: 'unitsTimes', prompt: `Check: ${a} × ${x}`, short: 'Check your x.', show: `Check: ${a} times ${x} is ${rhs}. It matches.`, hints: [`Count up in ${a}s, ${x} times.`] });
        S.head = H(`${a}x = ${rhs}`, 'x = []', `x = ${x}`); S.say = `${a} x equals ${rhs}`;
      } else {
        S.row('undo', 1, 'Undo', `x = ${rhs} × []`).row('work', 2, 'Work out', `${rhs} × ${a} = []`).row('chk', 3, 'Check', `${x} ÷ ${a} = []`);
        S.box('undo', 0, 1, a, { prompt: `x is divided by ${a}. Undo it by multiplying both sides by?`, short: `Undo the ÷ ${a}.`, show: `x is divided by ${a}. The opposite of divide is times, so multiply both sides by ${a}.`, hints: [`The opposite of ÷ ${a} is × ${a}.`] })
          .box('work', 0, 2, x, { kind: 'unitsTimes', prompt: `${rhs} × ${a}`, short: 'Work it out.', show: `${rhs} times ${a} is ${x}.`, hints: [`Count up in ${a}s, ${rhs} times.`] })
          .box('chk', 0, 3, rhs, { prompt: `Check: ${x} ÷ ${a}`, short: 'Check your x.', show: `Check: ${x} divided by ${a} is ${rhs}. It matches.`, hints: [`How many ${a}s in ${x}?`] });
        S.head = H(`x ÷ ${a} = ${rhs}`, 'x = []', `x = ${x}`); S.say = `x divided by ${a} equals ${rhs}`;
      }
      S.box('final', 0, 4, x, { prompt: 'So what is x?', short: 'Write x.', show: `So x is ${x}. Door open!`, hints: ['The number from step 2.'] });
      S.tot = x;
      const opS = div ? `x ÷ ${a}` : `${a}x`;
      S.visual = c => ({ type: 'balance', props: { left: c.vals['undo:0'] != null ? 'x' : opS, right: c.vals['work:0'] != null ? String(x) : c.vals['undo:0'] != null ? (div ? `${rhs} × ${a}` : `${rhs} ÷ ${a}`) : String(rhs), ok: c.vals['chk:0'] != null } });
      return S;
    }
  };
  const alg3 = {
    steps: ['Undo + or −', 'Undo ×', 'Check', 'Answer'],
    gen(tier, used) {
      return fresh(() => { const minus = tier === 2 && R(0, 1); const a = R(2, [4, 6, 9][tier]), x = R(2, 10), p = R(1, minus ? Math.min(12, a * x - 1) : 12); return { a, x, p, minus, tier, key: `${a}x${minus ? '-' : '+'}${p}=${a * x + (minus ? -p : p)}` }; }, used);
    },
    build(q) {
      const { a, x, p, minus } = q, ax = a * x, rhs = minus ? ax - p : ax + p, sym = minus ? '−' : '+', inv = minus ? '+' : '−';
      const S = Sheet(this.steps);
      S.row('u1', 1, 'Undo ' + sym, `${a}x = ${rhs} ${inv} []`).row('w1', 1, 'Work out', `${rhs} ${inv} ${p} = []`)
        .row('u2', 2, 'Undo ×', `x = ${ax} ÷ []`).row('w2', 2, 'Work out', `${ax} ÷ ${a} = []`)
        .row('chk', 3, 'Check', `${a} × ${x} ${sym} ${p} = []`);
      S.box('u1', 0, 1, p, { prompt: `First undo the ${sym} ${p}: ${minus ? 'add' : 'take away'} it from both sides.`, short: `Undo the ${sym} ${p} first.`, show: `Two things happen to x: times ${a}, then ${sym} ${p}. Undo them backwards. First ${minus ? 'add' : 'take away'} ${p} from both sides.`, hints: [`The opposite of ${sym} ${p} is ${inv} ${p}.`] })
        .box('w1', 0, 1, ax, { prompt: `${rhs} ${inv} ${p}`, short: 'Work it out.', show: `${rhs} ${minus ? 'plus' : 'minus'} ${p} is ${ax}. Now ${a}x equals ${ax}.`, hints: [minus ? `Count on ${p} from ${rhs}.` : `Count back ${p} from ${rhs}.`] })
        .box('u2', 0, 2, a, { prompt: `Now ${a}x = ${ax}. Undo the × ${a}: divide both sides by?`, short: `Undo the × ${a}.`, show: `Now undo the times ${a}: divide both sides by ${a}.`, hints: [`The opposite of × ${a} is ÷ ${a}.`] })
        .box('w2', 0, 2, x, { prompt: `${ax} ÷ ${a}`, short: 'Work it out.', show: `${ax} divided by ${a} is ${x}.`, hints: [`How many ${a}s make ${ax}?`, `${a} × ? = ${ax}`] })
        .box('chk', 0, 3, rhs, { prompt: `Check: ${a} × ${x} ${sym} ${p}`, short: 'Check your x.', show: `Check: ${a} times ${x} is ${ax}, ${minus ? 'minus' : 'plus'} ${p} is ${rhs}. It matches!`, hints: [`${a} × ${x} = ${ax}. Then ${sym} ${p}.`] })
        .box('final', 0, 4, x, { prompt: 'So what is x?', short: 'Write x.', show: `So x is ${x}. Code cracked!`, hints: ['The number from step 2.'] });
      S.head = H(`${a}x ${sym} ${p} = ${rhs}`, 'x = []', `x = ${x}`); S.say = `${a} x ${minus ? 'minus' : 'plus'} ${p} equals ${rhs}`; S.tot = x;
      S.visual = c => { const v = k => c.vals[k] != null; return { type: 'balance', props: { left: v('u2:0') ? 'x' : v('u1:0') ? `${a}x` : `${a}x ${sym} ${p}`, right: v('w2:0') ? String(x) : v('u2:0') ? `${ax} ÷ ${a}` : v('w1:0') ? String(ax) : v('u1:0') ? `${rhs} ${inv} ${p}` : String(rhs), ok: v('chk:0') } }; };
      return S;
    }
  };

  /* =========================================================== FRACTIONS */
  const frac1 = {
    steps: ['One slice', 'Your slices', 'Answer'],
    gen(tier, used) {
      const ds = [[2, 3, 4, 5], [3, 4, 5, 6, 8], [4, 5, 6, 8, 10]][tier];
      return fresh(() => { const d = pick(ds), n = R(1, d - 1), k = R(2, [6, 9, 12][tier]); return { n, d, amt: d * k, tier, key: `${n}/${d}of${d * k}` }; }, used);
    },
    build(q) {
      const { n, d, amt } = q, one = amt / d, ans = one * n;
      const S = Sheet(this.steps);
      S.row('one', 1, 'One slice', `${amt} ÷ ${d} = []`).row('many', 2, 'Your slices', `${one} × ${n} = []`);
      S.box('one', 0, 1, one, { prompt: `The bottom number says cut ${amt} into ${d} equal slices. ${amt} ÷ ${d}?`, short: 'Divide by the bottom.', show: `The bottom number, ${d}, means cut it into ${d} equal slices. ${amt} divided by ${d} is ${one}, so one slice is ${one}.`, hints: [`Share ${amt} into ${d} equal groups. How many in each?`, `${d} × ? = ${amt}`] })
        .box('many', 0, 2, ans, { kind: 'unitsTimes', prompt: `The top number says take ${n} slice${n > 1 ? 's' : ''}. ${one} × ${n}?`, short: 'Times by the top.', show: `The top number, ${n}, says how many slices we take. ${one} times ${n} is ${ans}.`, hints: [`One slice is ${one}. You want ${n} of them.`] })
        .box('final', 0, 3, ans, { prompt: `So ${frSay(n, d)} of ${amt} is?`, short: 'Write the answer.', show: `So ${frSay(n, d)} of ${amt} is ${ans}.`, hints: ['The number from step 2.'] });
      S.head = H(`${fr(n, d)} of ${amt} = ?`, `${fr(n, d)} of ${amt} = []`, `${fr(n, d)} of ${amt} = ${ans}`);
      S.say = `${frSay(n, d)} of ${amt}`; S.tot = ans;
      S.visual = c => ({ type: 'fracbar', props: { d, n, amt, each: c.vals['one:0'] != null ? one : null, take: c.vals['many:0'] != null } });
      return S;
    }
  };
  const frac2 = {
    steps: ['Compare bottoms', 'Same to the top', 'Answer'],
    gen(tier, used) {
      return fresh(() => {
        const d = pick([2, 3, 4, 5, 6]), n = R(1, d - 1), k = R(2, tier ? 4 : 3);
        const down = tier === 1 || (tier === 2 && R(0, 1));
        return { n, d, k, down, tier, key: `${n}/${d}*${k}${down ? 'd' : 'u'}` };
      }, used);
    },
    build(q) {
      const { n, d, k, down } = q, N = n * k, D = d * k;
      const S = Sheet(this.steps);
      if (!down) { // 2/3 = ?/12 : scale up
        S.row('cmp', 1, 'Bottoms', `${D} ÷ ${d} = []`).row('top', 2, 'Tops', `${n} × ${k} = []`);
        S.box('cmp', 0, 1, k, { prompt: `How many times bigger is ${D} than ${d}?`, short: 'Compare the bottoms.', show: `Compare the bottoms: ${D} is ${k} times ${d}. Each slice was cut into ${k}.`, hints: [`${d} × ? = ${D}`] })
          .box('top', 0, 2, N, { kind: 'unitsTimes', prompt: `Do the same to the top: ${n} × ${k}`, short: 'Do the same to the top.', show: `Whatever you do to the bottom, do to the top: ${n} times ${k} is ${N}.`, hints: [`The bottom was multiplied by ${k}. Multiply the top by ${k} too.`] })
          .box('final', 0, 3, N, { prompt: 'Fill in the matching fraction.', short: 'Write the fraction.', show: `So ${frSay(n, d)} is the same as ${N} over ${D}.`, hints: ['The top number you just worked out.'] });
        S.head = H(`${fr(n, d)} = ${fr('?', D)}`, `${fr(n, d)} = ${fr('[]', D)}`, `${fr(n, d)} = ${fr(N, D)}`); S.say = `${frSay(n, d)} is how many ${FN[D] ? FN[D] + 's' : D + 'ths'}`; S.tot = N;
        S.visual = c => ({ type: 'fracpair', props: { a: [n, d], b: [c.vals['top:0'] != null ? N : null, D] } });
      } else { // 6/8 = ?/4 : scale down
        S.row('cmp', 1, 'Bottoms', `${D} ÷ ${d} = []`).row('top', 2, 'Tops', `${N} ÷ ${k} = []`);
        S.box('cmp', 0, 1, k, { prompt: `${D} slices down to ${d}. ${D} ÷ ${d}?`, short: 'Compare the bottoms.', show: `Compare the bottoms: ${D} divided by ${d} is ${k}. So the slices get ${k} times bigger.`, hints: [`${d} × ? = ${D}`] })
          .box('top', 0, 2, n, { prompt: `Do the same to the top: ${N} ÷ ${k}`, short: 'Do the same to the top.', show: `Do the same to the top: ${N} divided by ${k} is ${n}.`, hints: [`The bottom was divided by ${k}. Divide the top by ${k} too.`] })
          .box('final', 0, 3, n, { prompt: 'Fill in the matching fraction.', short: 'Write the fraction.', show: `So ${N} over ${D} is the same as ${frSay(n, d)}.`, hints: ['The top number you just worked out.'] });
        S.head = H(`${fr(N, D)} = ${fr('?', d)}`, `${fr(N, D)} = ${fr('[]', d)}`, `${fr(N, D)} = ${fr(n, d)}`); S.say = `${N} over ${D} is how many ${d === 2 ? 'halves' : FN[d] + 's'}`; S.tot = n;
        S.visual = c => ({ type: 'fracpair', props: { a: [N, D], b: [c.vals['top:0'] != null ? n : null, d] } });
      }
      return S;
    }
  };
  const frac3 = {
    steps: ['Common bottom', 'Convert', 'Add', 'Answer'],
    gen(tier, used) {
      const pairs = [[[2, 4], [2, 6], [3, 6], [4, 8], [2, 8]], [[2, 3], [3, 4], [2, 5], [4, 6]], [[3, 4], [2, 3], [4, 6], [3, 8], [5, 10], [2, 5]]][tier];
      return fresh(() => {
        let d1, d2, n1, n2, L; do { [d1, d2] = pick(pairs); L = lcm(d1, d2); n1 = R(1, d1 - 1); n2 = R(1, d2 - 1); } while (n1 * L / d1 + n2 * L / d2 >= L);
        return { n1, d1, n2, d2, tier, key: `${n1}/${d1}+${n2}/${d2}` };
      }, used);
    },
    build(q) {
      const { n1, d1, n2, d2 } = q, L = lcm(d1, d2), k1 = L / d1, k2 = L / d2, a = n1 * k1, b = n2 * k2, s = a + b;
      const S = Sheet(this.steps);
      S.row('lcd', 1, 'Bottom', `Smallest number both ${d1} and ${d2} go into: []`)
        .row('c1', 2, 'Convert', `${fr(n1, d1)} = ${fr('[]', L)}`).row('c2', 2, 'Convert', `${fr(n2, d2)} = ${fr('[]', L)}`)
        .row('add', 3, 'Add the tops', `${fr(a, L)} + ${fr(b, L)} = ${fr('[]', L)}`);
      const mults = Array.from({ length: 4 }, (_, i) => d2 * (i + 1)).join(', ');
      const conv = (n, d, k, v) => k === 1
        ? { prompt: `${fr(n, d).replace(/[{}f:]/g, '')} already has ${L} slices. The top stays the same: ?`, short: `Convert ${n}/${d}.`, show: `This one already has ${L} slices, so it stays ${n} over ${L}.`, hints: [`The bottom is already ${L}, so the top doesn't change.`] }
        : { prompt: `${d} × ${k} = ${L}. Do the same to the top: ${n} × ${k}`, short: `Convert ${n}/${d}.`, show: `${d} times ${k} makes ${L}, so do the same to the top: ${n} times ${k} is ${v}.`, hints: [`The bottom went × ${k}. Do × ${k} to the top too.`] };
      S.box('lcd', 0, 1, L, { prompt: `The bottoms don't match. What's the smallest number both ${d1} and ${d2} go into?`, short: 'Find a common bottom.', show: `You can't add different slices. Find a bottom that ${d1} and ${d2} both fit into: ${L}.`, hints: [`Count in ${d2}s: ${mults}… Which one does ${d1} also go into?`, `${d1} × ${k1} = ${L} and ${d2} × ${k2} = ${L}.`] })
        .box('c1', 0, 2, a, conv(n1, d1, k1, a))
        .box('c2', 0, 2, b, conv(n2, d2, k2, b))
        .box('add', 0, 3, s, { prompt: `Now the bottoms match. Add the tops: ${a} + ${b}`, short: 'Add the tops.', show: `Now the slices are the same size, just add the tops: ${a} plus ${b} is ${s}. The bottom stays ${L}.`, hints: ['Only add the tops. The bottom stays the same.'] })
        .box('final', 0, 4, s, { prompt: 'Write the answer.', short: 'Write the answer.', show: `So the answer is ${s} over ${L}.`, hints: ['The top you just added.'] });
      S.head = H(`${fr(n1, d1)} + ${fr(n2, d2)} = ?`, `${fr(n1, d1)} + ${fr(n2, d2)} = ${fr('[]', L)}`, `${fr(n1, d1)} + ${fr(n2, d2)} = ${fr(s, L)}`);
      S.say = `${frSay(n1, d1)} plus ${frSay(n2, d2)}`; S.tot = s;
      S.visual = c => ({ type: 'fracadd', props: { L, a: c.vals['c1:0'] != null ? a : null, b: c.vals['c2:0'] != null ? b : null, f1: [n1, d1], f2: [n2, d2] } });
      return S;
    }
  };

  NB.Methods = Object.assign(NB.Methods || {}, {
    'mult-2': mult2, 'mult-3': mult3,
    'div-1': divMethod(2, [[2, 4], [3, 6], [4, 9]]), 'div-2': divMethod(3, [[2, 4], [3, 6], [5, 9]]), 'div-3': divMethod(4, [[2, 5], [3, 7], [4, 9]]),
    'alg-1': alg1, 'alg-2': alg2, 'alg-3': alg3,
    'frac-1': frac1, 'frac-2': frac2, 'frac-3': frac3
  });

  /* ---------- lesson descriptors for every level ---------- */
  const D = {
    mult: { district: 'Car Lot Deals', topic: 'Multiplying', board: "Let's Multiply!" },
    div: { district: 'Payday Split', topic: 'Long division', board: 'Split the Cash!' },
    alg: { district: 'Garage Code', topic: 'Algebra', board: 'Crack the Code!' },
    frac: { district: 'Slice Run', topic: 'Fractions', board: 'Slice it Up!' }
  };
  const L = (id, topic, lv, title, watch, together, intros) => {
    NB.Content = NB.Content || {};
    NB.Content[id] = Object.assign({ id, engine: 'sheet', method: id, gameTopic: topic, gameLevel: lv - 1, level: lv, title, mission: `${D[topic].district}: level ${lv}`, boardTitle: D[topic].board }, { district: D[topic].district, topic: D[topic].topic },
      { handover: { startTier: 1, watch: Object.assign({ q: watch }, { intro: intros[0] }), together: { q: together, intro: intros[1] }, less: { count: 2, intro: '{q}. This time I only tell you which step comes next. Tap Hint if you need more.' }, alone: { count: 3, intro: intros[2] } } });
  };
  L('mult-2', 'mult', 2, 'Two-digit × two-digit', { a: 34, b: 26, key: '34x26' }, { a: 23, b: 14, key: '23x14' }, [
    "Rico's selling 26 cars at 34 hundred each. 34 times 26. Two big numbers! The trick: split both into tens and units, multiply every pair, then add. Watch me, and tap Show me for each step.",
    'Your turn: 23 times 14. Split both, four multiplications, then add. I give you a tip for each one.',
    "Three on your own: split, multiply the four pairs, add. I'll stay quiet unless you get stuck."]);
  L('mult-3', 'mult', 3, 'Three-digit × one-digit', { a: 324, b: 6, key: '324x6' }, { a: 213, b: 4, key: '213x4' }, [
    "Big deal: 6 sports cars at 324 thousand each. 324 times 6. Split it into hundreds, tens and units, multiply each, then add. Watch me.",
    'Your turn: 213 times 4. Same steps. You type every number, I give you tips.',
    "Three big deals on your own. Split, multiply each part, add. I'll only step in if you get stuck."]);
  L('div-1', 'div', 1, 'Two-digit ÷ one-digit', { N: 96, d: 4, key: '96/4' }, { N: 84, d: 3, key: '84/3' }, [
    "Mia's splitting 96 dollars between 4 of the crew. 96 divided by 4. We use the bus stop: divide, multiply, subtract, bring down. Watch me do it.",
    'Your turn: 84 divided by 3. Same four moves. I give you a tip for each one.',
    "Three splits on your own. Divide, multiply, subtract, bring down. I'll stay quiet unless you get stuck."]);
  L('div-2', 'div', 2, 'Three-digit ÷ one-digit', { N: 852, d: 4, key: '852/4' }, { N: 735, d: 5, key: '735/5' }, [
    "Payday! 852 dollars split between 4. Same bus stop, just one more round. Watch me.",
    'Your turn: 735 divided by 5. Divide, multiply, subtract, bring down, again and again.',
    "Three payouts on your own. I'll only step in if you get stuck."]);
  L('div-3', 'div', 3, 'Four-digit ÷ one-digit', { N: 1365, d: 5, key: '1365/5' }, { N: 2148, d: 4, key: '2148/4' }, [
    "Big payout: 1365 split 5 ways. 1 is too small for 5, so we start with 13. Watch me.",
    'Your turn: 2148 divided by 4. Same rounds. Tips for every step.',
    "Three big payouts on your own. You've got this."]);
  L('alg-1', 'alg', 1, 'One-step equations', { x: 7, p: 4, op: '+', key: 'x+4=11' }, { x: 9, p: 5, op: '-', key: 'x-5=4' }, [
    "Dex's door code: x plus 4 equals 11. Think of a balance. Whatever you do to one side, do to the other, until x is alone. Watch me.",
    'Your turn: x minus 5 equals 4. Undo the minus, work it out, check. Tips for every step.',
    "Three codes on your own. Undo, work out, check. I'll stay quiet unless you get stuck."]);
  L('alg-2', 'alg', 2, 'Times equations', { a: 3, x: 5, div: false, key: '3x=15' }, { a: 4, x: 7, div: false, key: '4x=28' }, [
    "New keypad: 3x equals 15. 3x means 3 times x. To undo times, we divide. Watch me.",
    'Your turn: 4x equals 28. Undo the times, work it out, check.',
    "Three codes on your own. You know the moves."]);
  L('alg-3', 'alg', 3, 'Two-step equations', { a: 3, x: 5, p: 5, minus: false, key: '3x+5=20' }, { a: 2, x: 6, p: 3, minus: false, key: '2x+3=15' }, [
    "The vault: 3x plus 5 equals 20. Two things happened to x, so we undo them backwards. Plus first, then times. Watch me.",
    'Your turn: 2x plus 3 equals 15. Undo the plus, then the times, then check.',
    "Three vault codes on your own. Undo plus or minus first, then times."]);
  L('frac-1', 'frac', 1, 'Fraction of an amount', { n: 3, d: 4, amt: 20, key: '3/4of20' }, { n: 2, d: 3, amt: 12, key: '2/3of12' }, [
    "Lu has 20 slices of garlic bread and three quarters go out for delivery. Three quarters of 20. Divide by the bottom, times by the top. Watch me.",
    'Your turn: two thirds of 12. Divide by the bottom, then times by the top.',
    "Three orders on your own. Bottom first, then top."]);
  L('frac-2', 'frac', 2, 'Equivalent fractions', { n: 3, d: 4, k: 2, down: true, key: '3/4*2d' }, { n: 2, d: 3, k: 4, down: false, key: '2/3*4u' }, [
    "6 eighths of a pizza is the same as how many quarters? Matching fractions: whatever you do to the bottom, do to the top. Watch me.",
    'Your turn: two thirds is how many twelfths? Compare the bottoms, then do the same to the top.',
    "Three on your own. Bottoms first, then the same to the top."]);
  L('frac-3', 'frac', 3, 'Adding fractions', { n1: 1, d1: 2, n2: 1, d2: 3, key: '1/2+1/3' }, { n1: 1, d1: 3, n2: 1, d2: 4, key: '1/3+1/4' }, [
    "Half a pizza plus a third. You can't add different slices, so we cut them the same size first. Watch me.",
    'Your turn: a third plus a quarter. Common bottom, convert both, then add the tops.',
    "Three mixed orders on your own. Match the bottoms, then add the tops."]);

  /* ---------- 2D pictures ---------- */
  const SR = NB.StepRenderer, esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  SR.register('grid', ({ a, b, v }) => `<div class="v-grid"><span></span><b>${b[0]}</b><b>${b[1]}</b>
    <b>${a[0]}</b><span class="g big ${v[0] != null ? 'on' : ''}">${v[0] ?? ''}</span><span class="g ${v[1] != null ? 'on' : ''}">${v[1] ?? ''}</span>
    <b>${a[1]}</b><span class="g ${v[2] != null ? 'on' : ''}">${v[2] ?? ''}</span><span class="g small ${v[3] != null ? 'on' : ''}">${v[3] ?? ''}</span></div>
    <div class="v-note">Every part of one number times every part of the other</div>`);
  SR.register('parts', ({ parts }) => `<div class="v-parts">${parts.map(([l, v]) => `<div class="${v != null ? 'on' : ''}"><span>${l}</span><b>${v ?? '?'}</b></div>`).join('<i>+</i>')}</div>`);
  SR.register('busstop', ({ N, d, lead, q }) => {
    const ds = String(N).split('');
    const top = ds.map((_, i) => { const k = i - lead; return `<span class="${k >= 0 && q[k] != null ? 'on' : ''}">${k >= 0 && q[k] != null ? q[k] : ''}</span>`; }).join('');
    return `<div class="v-bus" style="--n:${ds.length}"><div class="bq"><span></span>${top}</div><div class="bn"><span class="bd">${d}</span>${ds.map(x => `<span>${x}</span>`).join('')}</div></div>
      <div class="v-note">The answer builds up along the top</div>`;
  });
  SR.register('balance', ({ left, right, ok }) => `<div class="v-bal ${ok ? 'ok' : ''}"><div class="pans"><div class="pan">${esc(left)}</div><div class="pan">${esc(right)}</div></div>
    <div class="beam"></div><div class="post"></div></div><div class="v-note">${ok ? 'Balanced. x is right!' : 'Keep both sides equal'}</div>`);
  const bar = (d, fill, cls = '') => `<div class="v-fbar ${cls}" style="--d:${d}">${Array.from({ length: d }, (_, i) => `<span class="${i < fill ? 'on' : ''}"></span>`).join('')}</div>`;
  SR.register('fracbar', ({ d, n, amt, each, take }) => `<div class="v-fwrap"><div class="v-fbar big" style="--d:${d}">${Array.from({ length: d }, (_, i) => `<span class="${take && i < n ? 'on' : ''}">${each != null ? each : ''}</span>`).join('')}</div>
    <div class="v-note">${amt} cut into ${d} equal slices${each != null ? `, ${each} in each` : ''}${take ? `. ${n} slice${n > 1 ? 's' : ''} = ${each * n}` : ''}</div></div>`);
  SR.register('fracpair', ({ a, b }) => `<div class="v-fwrap">${bar(a[1], a[0])}<div class="v-eq">=</div>${bar(b[1], b[0] ?? 0, b[0] == null ? 'ghost' : '')}
    <div class="v-note">Same amount of pizza, different slices</div></div>`);
  SR.register('fracadd', ({ L, a, b, f1, f2 }) => `<div class="v-fwrap">${a == null ? bar(f1[1], f1[0]) : bar(L, a)}<div class="v-eq">+</div>${b == null ? bar(f2[1], f2[0], 'alt') : bar(L, b, 'alt')}
    ${a != null && b != null ? `<div class="v-eq">=</div><div class="v-fbar" style="--d:${L}">${Array.from({ length: L }, (_, i) => `<span class="${i < a ? 'on' : i < a + b ? 'on alt' : ''}"></span>`).join('')}</div>` : ''}
    <div class="v-note">${a != null && b != null ? 'Same size slices, so the tops add up' : 'Different slice sizes: make them match first'}</div></div>`);

  NB.fracHTML = t => t.replace(/\{f:([^/}]+)\/([^}]+)\}/g, '<span class="fr"><span>$1</span><span>$2</span></span>');
})(window.NB = window.NB || {});
