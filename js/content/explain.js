/* Worked examples for every lesson, written like a school maths book: show it with something you can picture
   (blocks, place-value counters, bars, a balance, shapes), then write it the school way, one step at a time.
   Each lesson uses its fixed "watch" example, so the words never change and can be recorded later.
   Colours stay the same everywhere: units yellow, tens blue, hundreds green, carried/exchanged orange. */
(function (NB) {
  const E = NB.Explain = NB.Explain || {};
  const C = NB.Explainer.C;
  const b = s => `<b>${s}</b>`, k = s => `<b class="kw">${s}</b>`;
  const PL = ['U', 'T', 'H', 'Th'], PLC = [C.units, C.tens, C.hund, C.pink], WORD = ['units', 'tens', 'hundreds', 'thousands'];
  const dig = (n, i) => Math.floor(n / 10 ** i) % 10, len = n => String(n).length;
  /* a predict-first question: options in a fixed, mixed order; why = what NOVA says after a wrong pick */
  const Q = (q, opts, ans, why) => ({ q, opts: [...new Set(opts.map(String))].sort((x, y) => (x.length - y.length) || (x < y ? -1 : 1)), ans: String(ans), why });
  /* every fixed line a step can speak besides its say (for recording): choices' whys and hints */
  const lines = st => { st.extra = [...(st.choices || []).map(c => c.why), ...(st.hints || [])]; return st; };
  const hitR = (S, id, x, y, w, h) => S.r(id, x, y, w, h, { fill: 'rgba(255,255,255,.001)', rx: 6 });

  /* ---------- the written column method: headers, two numbers, a line, answer and carry rows ---------- */
  function columns(S, { x, a, b: bb, op = '+', n, top = 14, cw = 32, size = 30 }) {
    const g = { X: i => x - i * cw, yH: top, yK: top + 22, yA: top + 48, yB: top + 88, yL: top + 110, yR: top + 136 };
    for (let i = 0; i < n; i++) S.t(`hd${i}`, g.X(i), g.yH, PL[i], { size: 14, fill: PLC[i], label: true });
    for (let i = 0; i < len(a); i++) S.t(`a${i}`, g.X(i), g.yA, String(dig(a, i)), { size });
    for (let i = 0; i < len(bb); i++) S.t(`b${i}`, g.X(i), g.yB, String(dig(bb, i)), { size });
    S.t('op', g.X(n) + 6, g.yB, op === '-' ? '−' : op, { size: 26, fill: C.red });
    S.l('line', g.X(n - 1) - 18, g.yL, x + 18, g.yL, { sw: 3, draw: true });
    return g;
  }
  const colHL = (S, g, i, rows = 'all') => S.hl(g.X(i) - 16, rows === 'all' ? g.yK - 12 : g.yA - 20, 32, rows === 'all' ? g.yR - g.yK + 30 : g.yR - g.yA + 38);
  const write = (S, g, i, d, o = {}) => S.t(`r${i}`, g.X(i), g.yR, String(d), { size: 30, fill: C.good, pop: true, ...o });
  const carry = (S, g, i, d, from) => S.t(`k${i}`, g.X(i), g.yK, String(d), { size: 16, fill: C.carry, from: from || [32, 110], pop: true });

  /* ---------- place-value counters: a small H/T/U chart ---------- */
  function chart(S, { x = 10, y = 10, h = 236, places = 3, w = 52 }) {
    const g = { x, w, cols: places, cx: p => x + (places - 1 - p) * w };
    for (let p = 0; p < places; p++) {
      S.r(`ch${p}`, g.cx(p), y, w - 4, h, { fill: 'rgba(255,255,255,.04)', stroke: 'rgba(255,255,255,.12)', sw: 1, rx: 6, under: true });
      S.t(`chh${p}`, g.cx(p) + (w - 4) / 2, y + 12, PL[p], { size: 13, fill: PLC[p], label: true });
    }
    g.pos = (p, i, y0) => [g.cx(p) + 10 + (i % 3) * 14, y0 + Math.floor(i / 3) * 14];
    return g;
  }
  function counters(S, g, pre, n, y0, o = {}) {
    for (let p = 0; p < 3; p++) for (let i = 0; i < dig(n, p); i++) { const [cx, cy] = g.pos(p, i, y0); S.c(`${pre}${p}_${i}`, cx, cy, 5.5, { fill: PLC[p], stroke: C.ink, sw: 1, pop: true, delay: (o.d || 0) + (p * 4 + i) * 35 }); }
  }

  /* ======================= ADDING & SUBTRACTING ======================= */
  E['add-1'] = () => {   // hands-on: the child moves the blocks; the column method fills in beside them
    const a = 47, bb = 38; let g, A, B;
    const tray = [118, 92, 120, 36], slotU = i => [122 + (i % 8) * 14, 96 + Math.floor(i / 8) * 15];
    const moveCube = (S, id, i) => { const e = S.get(id), [tx, ty] = slotU(i); S.to(id, tx - +e.getAttribute('x'), ty - +e.getAttribute('y')); };
    const hit = (S, id, x, y, w, h) => S.r(id, x, y, w, h, { fill: 'rgba(255,255,255,.001)', rx: 6 });
    return { view: [360, 250], remember: 'Start with the units. If a column makes 10 or more, swap 10 units for 1 ten: write the units, carry the ten.',
      steps: [
        { title: 'Set it out', math: `Line up the ${k('tens')} and the ${k('units')}.`, say: "Here are 47 and 38 as blocks. The long rods are tens and the little cubes are units. In columns we line them up: units under units, tens under tens.",
          run: async S => { A = S.blocks('A', 14, 10, 4, 7); S.t('la', 14, 92, '47', { size: 15, label: true, fill: C.mute, anchor: 'start' });
            B = S.blocks('B', 14, 150, 3, 8, { d: 300 }); S.t('lb', 14, 232, '38', { size: 15, label: true, fill: C.mute, anchor: 'start' }); await S.wait(500); g = columns(S, { x: 320, a, b: bb, n: 2 }); await S.wait(600); } },
        { title: 'Put the units together', math: `7 + 8 = ${b('15')} units`, say: 'Always start with the units. Drag the units from 47, and then the units from 38, into the units box.',
          run: async S => {
            colHL(S, g, 0); S.r('trayBox', ...tray, { stroke: C.units, sw: 2, dash: '5 4', rx: 6, pop: true }); S.t('trayL', tray[0] + tray[2] / 2, tray[1] - 9, 'units box', { size: 11, label: true, fill: C.units });
            hit(S, 'hA', 50, 20, 30, 64); hit(S, 'hB', 40, 160, 30, 64);
            const into = (S, cubes, from) => cubes.forEach((id, i) => moveCube(S, id, from + i));
            let gotA = false, gotB = false;
            await S.ask((done, S) => {
              S.drag('hA', [tray], () => { gotA = true; S.del('hA'); into(S, A.cubes, 0); S.sfx('tick'); if (gotB) setTimeout(done, 600); return true; });
              S.drag('hB', [tray], () => { gotB = true; S.del('hB'); into(S, B.cubes, 7); S.sfx('tick'); if (gotA) setTimeout(done, 600); return true; });
            });
            S.del('hA'); S.del('hB'); into(S, A.cubes, 0); into(S, B.cubes, 7);
            S.t('u15', tray[0] + tray[2] / 2, tray[1] + tray[3] + 14, '15 units', { size: 14, label: true, fill: C.units, pop: true }); await S.wait(400);
          } },
        { title: 'Swap 10 units for 1 ten', math: `15 = ${b('1 ten')} + ${b('5 units')}<br>Write ${k('5')}, carry ${k('1')}`, say: "15 units is too many for one column. Tap the units box to bundle 10 units into 1 ten. Then drag the new ten over to the tens.",
          run: async S => {
            colHL(S, g, 0); const cs = [...A.cubes, ...B.cubes];
            const bundle = () => { cs.slice(0, 10).forEach(id => S.del(id)); cs.slice(10).forEach((id, i) => moveCube(S, id, i)); S.r('newrod', 200, 60, 7, 70, { fill: C.carry, stroke: C.ink, sw: 1, rx: 1.5, pop: true }); S.del('u15'); S.sfx('good'); };
            const toTens = () => { S.to('newrod', 54 - 200, 10 - 60); write(S, g, 0, 5); carry(S, g, 1, 1); };
            let stage = 0;
            await S.ask((done, S) => {
              hit(S, 'hT', ...tray);
              S.tap('hT', () => { if (stage) return; stage = 1; S.del('hT'); bundle(); hit(S, 'hR', 192, 56, 24, 80); S.drag('hR', [[10, 4, 80, 92]], () => { S.del('hR'); toTens(); S.sfx('tick'); setTimeout(done, 700); return true; }); });
            });
            S.del('hT'); S.del('hR'); if (stage === 0 || !S.get('r0')) { if (!S.get('newrod')) bundle(); toTens(); } await S.wait(400);
          } },
        { title: 'Add the tens', math: `4 + 3 + ${k('1')} = ${b('8')} tens`, say: 'Now the tens. Drag the 3 tens from 38 up to join the others. 4 tens, plus 3 tens, plus the 1 we carried.',
          run: async S => {
            colHL(S, g, 1); S.paint('newrod', C.tens); hit(S, 'hBt', 10, 146, 34, 80);
            const join = () => { B.rods.forEach((id, i) => S.to(id, 64 + i * 10 - (14 + i * 10), -140)); S.del('lb'); S.del('la'); S.t('t8', 140, 46, '8 tens', { size: 15, label: true, fill: C.tens, pop: true }); write(S, g, 1, 8); };
            await S.ask((done, S) => S.drag('hBt', [[4, 0, 110, 100]], () => { S.del('hBt'); join(); S.sfx('good'); setTimeout(done, 600); return true; }));
            S.del('hBt'); if (!S.get('t8')) join(); await S.wait(300);
          } },
        { title: 'Read the answer', math: `47 + 38 = ${b('85')}`, say: 'Read the answer row from left to right: 8 tens and 5 units. 85. So 47 plus 38 is 85.',
          run: async S => { S.hl(g.X(1) - 18, g.yR - 20, 70, 40); S.t('ans', 180, 226, '47 + 38 = 85', { size: 22, fill: C.good, pop: true }); S.sfx('good'); await S.wait(400); } }
      ] };
  };

  function addBig(a, bb) {   // column addition with counters, carrying as needed
    let g, ch; const n = Math.max(len(a), len(bb)), steps = [];
    let ks = [0], cur = [];   // carries into each place
    steps.push({ title: 'Set it out', math: `Line up ${k('H')}, ${k('T')} and ${k('U')}: units under units.`,
      say: `${a} plus ${bb}. On the left are counters: yellow for units, blue for tens, green for hundreds. In columns, line up hundreds, tens and units, then always start with the units.`,
      run: async S => { ch = chart(S, {}); counters(S, ch, 'A', a, 34); counters(S, ch, 'B', bb, 150, { d: 400 }); S.l('mid', 14, 134, 160, 134, { stroke: 'rgba(255,255,255,.25)', sw: 1, dash: '4 4' }); await S.wait(500); g = columns(S, { x: 322, a, b: bb, n }); await S.wait(600); } });
    for (let p = 0; p < n; p++) {
      const da = dig(a, p), db = dig(bb, p), kin = ks[p] || 0, tot = da + db + kin, out = tot % 10, up = Math.floor(tot / 10); ks[p + 1] = up;
      const sum = `${da} + ${db}${kin ? ` + ${k(kin)}` : ''} = ${b(tot)}`;
      const cq = Q(`${da} + ${db}${kin ? ' + 1' : ''}: do we need to carry?`, ['Yes', 'No'], up ? 'Yes' : 'No', `${da} plus ${db}${kin ? ' plus 1' : ''} is ${tot}. ${up ? 'That is 10 or more, so we carry.' : 'That is less than 10, so no carrying this time.'}`);
      const swapLine = `Tap the ${WORD[p]} counters to swap 10 of them for 1 of the ${WORD[p + 1]}.`;
      steps.push(lines({ title: `Add the ${WORD[p]}`, math: up ? `${sum}<br>Write ${k(out)}, carry ${k(1)} to the ${WORD[p + 1]}` : `${sum} ${WORD[p]}. Write ${k(out)}`, choices: [cq], hints: up ? [swapLine] : [],
        say: `The ${WORD[p]} column: ${da} plus ${db}${kin ? `, plus the 1 we carried` : ''}. Do we need to carry?`,
        run: async S => {
          colHL(S, g, p);
          await S.choose(cq);
          // bring the bottom counters up beside the top ones
          for (let i = 0; i < db; i++) { const id = `B${p}_${i}`, e = S.get(id); if (!e) continue; const [tx, ty] = ch.pos(p, da + kin + i, 34); S.to(id, tx - +e.getAttribute('cx'), ty - +e.getAttribute('cy')); }
          await S.wait(600);
          if (up) {   // the child taps the column: ten counters become one, which moves into the next column
            hitR(S, 'hc', ch.cx(p), 24, ch.w - 4, 116); S.say(swapLine);
            await S.ask((done, S) => S.tap('hc', () => { S.del('hc'); done(); })); S.del('hc');
            const ten = []; for (let i = 0; i < da; i++) ten.push(`A${p}_${i}`); for (let i = 0; i < kin; i++) ten.push(`K${p}_${i}`); for (let i = 0; i < db; i++) ten.push(`B${p}_${i}`);
            ten.slice(0, 10).forEach(id => S.fade(id, .15)); await S.wait(500);
            const [tx, ty] = ch.pos(p + 1, dig(a, p + 1), 34), [fx, fy] = ch.pos(p, 4, 34);
            S.c(`K${p + 1}_0`, tx, ty, 5.5, { fill: PLC[p + 1], stroke: C.carry, sw: 2.5, from: [fx - tx, fy - ty], pop: true }); S.sfx('good');
            ten.slice(0, 10).forEach(id => S.del(id));
          }
          write(S, g, p, out); if (up) { await S.wait(250); carry(S, g, p + 1, 1); }
          await S.wait(500);
        } }));
    }
    const tot = a + bb;
    if (tot >= 10 ** n) steps[steps.length - 1].math += `<br>Bring the ${k(1)} down: ${b(Math.floor(tot / 10 ** n))}`;
    steps.push({ title: 'Read the answer', math: `${a} + ${bb} = ${b(tot)}`, say: `Read the answer from left to right: ${tot}. So ${a} plus ${bb} is ${tot}.`,
      run: async S => { S.hl(g.X(n - 1) - 18, g.yR - 20, n * 32 + 4, 40); S.t('ans', 255, 236, `${a} + ${bb} = ${tot}`, { size: 20, fill: C.good, pop: true }); S.sfx('good'); await S.wait(300); } });
    return { view: [360, 252], steps, remember: 'Units first, then tens, then hundreds. Every time a column makes 10 or more, carry 1 to the next column.' };
  }
  E['add-2'] = () => addBig(468, 275);

  E['add-3'] = () => {   // 352 − 127 with an exchange
    const a = 352, bb = 127; let g, ch;
    return { view: [360, 252], remember: 'Units first. If the top digit is smaller, exchange: take 1 from the next column and make 10 more here.',
      steps: [
        { title: 'Set it out', math: `The bigger number goes on ${k('top')}.`, say: '352 take away 127. The counters show 352: 3 hundreds, 5 tens and 2 units. Write the bigger number on top, line up the columns, and start with the units.',
          run: async S => { ch = chart(S, {}); counters(S, ch, 'A', a, 40); await S.wait(500); g = columns(S, { x: 322, a, b: bb, n: 3, op: '-' }); await S.wait(500); } },
        lines({ title: 'Units: not enough', math: `2 − 7? We only have ${b('2')} units.`, choices: [Q('Can we take 7 units away from 2 units?', ['Yes', 'No'], 'No', "2 is less than 7, so there aren't enough units. We need more units first.")],
          say: 'Units first: 2 take away 7. Can we take 7 units away from 2 units?',
          run: async function (S) { colHL(S, g, 0); await S.choose(this.choices[0]); S.t('no', 120, 200, '2 − 7 ✗', { size: 16, fill: C.red, label: true, pop: true }); await S.wait(400); } }),
        lines({ title: 'Exchange a ten', math: `5 tens → ${k('4')} tens. 2 units → ${k('12')} units`, hints: ['Drag a blue ten into the units column.'],
          say: 'So we exchange. Drag one blue ten into the units column. It breaks into 10 units. The tens go down from 5 to 4, and the units go up from 2 to 12.',
          run: async S => { S.del('no'); colHL(S, g, 1);
            const [fx, fy] = ch.pos(1, 4, 40);
            const swap = () => { S.del('A1_4'); for (let i = 0; i < 10; i++) { const [tx, ty] = ch.pos(0, 2 + i, 40); S.c(`X0_${i}`, tx, ty, 5.5, { fill: C.units, stroke: C.carry, sw: 2, from: [fx - tx, fy - ty], pop: true, delay: i * 40 }); } S.sfx('good');
              S.l('x5', g.X(1) - 9, g.yA + 9, g.X(1) + 9, g.yA - 9, { stroke: C.red, sw: 2.5, draw: true }); S.t('k1', g.X(1) + 2, g.yK, '4', { size: 16, fill: C.carry, pop: true }); S.t('k0', g.X(0) - 14, g.yA - 4, '1', { size: 15, fill: C.carry, pop: true }); };
            S.c('grab', fx, fy, 13, { fill: 'rgba(255,255,255,.001)' });
            await S.ask((done, S) => S.drag('grab', [[ch.cx(0), 10, ch.w, 236]], () => { S.del('grab'); swap(); setTimeout(done, 700); return true; }));
            S.del('grab'); if (S.get('A1_4')) swap(); await S.wait(400); } }),
        lines({ title: 'Take away the units', math: `12 − 7 = ${b('5')}`, choices: [Q('12 − 7 = ?', [5, 6, 9], 5, '12 take away 7 is 5. Count back 7 from 12: 11, 10, 9, 8, 7, 6, 5.')],
          say: 'Now we have 12 units. What is 12 take away 7?',
          run: async function (S) { colHL(S, g, 0); await S.choose(this.choices[0]); const gone = ['A0_0', 'A0_1', ...Array.from({ length: 5 }, (_, i) => `X0_${i}`)]; gone.forEach(id => S.fade(id, .12)); await S.wait(600); write(S, g, 0, 5); await S.wait(300); } }),
        lines({ title: 'Take away the tens', math: `4 − 2 = ${b('2')}`, choices: [Q('Tens: how many is it now?', ['5 − 2 = 3', '4 − 2 = 2'], '4 − 2 = 2', 'We swapped one ten for units, so there are only 4 tens now, not 5. 4 take away 2 is 2.')],
          say: 'The tens column. Careful: how many tens do we have now?',
          run: async function (S) { colHL(S, g, 1); await S.choose(this.choices[0]); ['A1_2', 'A1_3'].forEach(id => S.fade(id, .12)); await S.wait(500); write(S, g, 1, 2); await S.wait(300); } }),
        lines({ title: 'Take away the hundreds', math: `3 − 1 = ${b('2')}`, choices: [Q('3 − 1 = ?', [2, 4, 1], 2, '3 take away 1 is 2.')], say: 'The hundreds: 3 take away 1.',
          run: async function (S) { colHL(S, g, 2); await S.choose(this.choices[0]); S.fade('A2_2', .12); await S.wait(400); write(S, g, 2, 2); await S.wait(300); } }),
        { title: 'Read and check', math: `352 − 127 = ${b('225')}<br>Check: 225 + 127 = 352 ✓`, say: 'Read the answer: 225. Check it by adding back: 225 plus 127 is 352. It matches, so we got it right.',
          run: async S => { S.hl(g.X(2) - 18, g.yR - 20, 100, 40); S.t('ans', 255, 236, '352 − 127 = 225', { size: 20, fill: C.good, pop: true }); S.sfx('good'); await S.wait(300); } }
      ] };
  };

  /* ======================= MULTIPLYING (area model) ======================= */
  function areaModel(S, parts, m, { x = 20, y = 46, W = 320, H = 110, labels = true } = {}) {
    const sum = parts.reduce((s, p) => s + p, 0), g = { cells: [] }; let cx = x;
    parts.forEach((p, i) => { const w = Math.max(44, (W - (parts.length - 1) * 4) * p / sum); g.cells.push({ x: cx, w }); cx += w + 4; });
    const sc = W / (cx - 4 - x); g.cells.forEach(c => { c.x = x + (c.x - x) * sc; c.w *= sc; });
    g.cells.forEach((c, i) => { S.r(`cell${i}`, c.x, y, c.w, H, { stroke: 'rgba(255,255,255,.5)', sw: 2, rx: 4, dash: '5 4', pop: true, delay: i * 120 }); if (labels) S.t(`top${i}`, c.x + c.w / 2, y - 16, String(parts[i]), { size: 20, fill: [C.hund, C.tens, C.units][i + 3 - parts.length], pop: true, delay: i * 120 }); });
    S.t('side', x - 10, y + H / 2, String(m), { size: 20, fill: C.pink, anchor: 'end', pop: true });
    g.fill = (i, val, col) => { const c = g.cells[i]; S.r(`fill${i}`, c.x, y, c.w, H, { fill: col, rx: 4, op: .35, pop: true, under: false }); S.t(`val${i}`, c.x + c.w / 2, y + H / 2, String(val), { size: c.w < 60 ? 18 : 24, pop: true }); };
    return g;
  }
  function multBy1(a, m) {   // 47 × 6, 324 × 6: split, multiply each part, add
    const ps = String(a).split('').map((d, i, arr) => Number(d) * 10 ** (arr.length - 1 - i)).filter(Boolean), prods = ps.map(p => p * m), tot = a * m;
    const cols = [C.hund, C.tens, C.units].slice(3 - ps.length); let g;
    const steps = [{ title: 'Split the number', math: `${a} = ${ps.map(p => b(p)).join(' + ')}`, say: `${a} times ${m}. Big numbers are easier in pieces. Split ${a} into ${ps.join(' and ')}. The box shows ${m} rows of ${a}, cut into parts.`,
      run: async S => { S.t('q', 180, 14, `${a} × ${m}`, { size: 20, fill: C.mute, label: true }); g = areaModel(S, ps, m, { x: 34, y: 54, W: 310, H: 104 }); await S.wait(700); } }];
    ps.forEach((p, i) => {
      const d = p / 10 ** (String(p).length - 1), z = String(p).length - 1, place = ['units', 'tens', 'hundreds'][z];
      const cq = z ? Q(`${p} × ${m} = ?`, [prods[i], d * m, prods[i] * 10], prods[i], `${d} times ${m} is ${d * m}. But these are ${place}, so ${p} times ${m} is ${prods[i]}.`)
        : Q(`${p} × ${m} = ?`, [prods[i], p + m, prods[i] + m], prods[i], `${p} times ${m} means ${m} lots of ${p}. That is ${prods[i]}.`);
      steps.push(lines({ title: `Multiply the ${place}`, math: z ? `${d} × ${m} = ${d * m}, so ${p} × ${m} = ${b(prods[i])}` : `${p} × ${m} = ${b(prods[i])}`, choices: [cq], hints: [`Tap the ${p} part of the box.`],
        say: z ? `Tap the ${p} part. ${p} times ${m}: think ${d} times ${m}, and remember they are ${place}.` : `Now tap the ${p} part. What is ${p} times ${m}?`,
        run: async S => { S.hl(g.cells[i].x - 4, 34, g.cells[i].w + 8, 132);
          hitR(S, 'hp', g.cells[i].x, 54, g.cells[i].w, 104); await S.ask((done, S) => S.tap('hp', () => done())); S.del('hp');
          await S.choose(cq); g.fill(i, prods[i], cols[i]); S.sfx('good'); await S.wait(500); } }));
    });
    const tq = Q(`${prods.join(' + ')} = ?`, [tot, tot - 10, tot + 100], tot, `${prods.join(' plus ')} is ${tot}. Add the biggest parts first.`);
    steps.push(lines({ title: 'Add the parts', math: `${prods.map(p => b(p)).join(' + ')} = ${b(tot)}`, choices: [tq], say: `Now add the parts together. What is ${prods.join(' plus ')}?`,
      run: async S => { S.hl(null); await S.choose(tq); S.t('sum', 180, 196, `${prods.join(' + ')} = ${tot}`, { size: 22, fill: C.good, pop: true }); S.sfx('good'); await S.wait(500); } }));
    steps.push({ title: 'The answer', math: `${a} × ${m} = ${b(tot)}`, say: `So ${a} times ${m} is ${tot}. Split, multiply each part, then add.`,
      run: async S => { S.t('ans', 180, 228, `${a} × ${m} = ${tot}`, { size: 24, fill: C.units, pop: true }); await S.wait(300); } });
    return { view: [360, 244], steps, remember: 'Split the big number into hundreds, tens and units. Multiply each part, then add the answers.' };
  }
  E['mult-1'] = () => multBy1(47, 6);
  E['mult-3'] = () => multBy1(324, 6);
  E['mult-2'] = () => {   // 34 × 26 with the grid method
    const A = [30, 4], B = [20, 6], P = [[600, 80], [180, 24]]; const x = 70, y = 50, W = 270, H = 150, w1 = 200, h1 = 100;
    const box = (r, c) => [c ? x + w1 + 4 : x, r ? y + h1 + 4 : y, c ? W - w1 - 4 : w1, r ? H - h1 - 4 : h1];
    const tapCell = (S, r, c) => { hitR(S, 'hc', ...box(r, c)); return S.ask((done, S) => S.tap('hc', () => done())).then(() => S.del('hc')); };
    const cell = (S, r, c, col) => { const cx = c ? x + w1 + 4 : x, cy = r ? y + h1 + 4 : y, cw = c ? W - w1 - 4 : w1, chh = r ? H - h1 - 4 : h1; S.r(`f${r}${c}`, cx, cy, cw, chh, { fill: col, op: .35, rx: 4, pop: true }); S.t(`v${r}${c}`, cx + cw / 2, cy + chh / 2, String(P[r][c]), { size: cw < 60 || chh < 50 ? 17 : 24, pop: true }); };
    return { view: [360, 250], remember: 'Split both numbers into tens and units. Multiply every part by every part, then add all four answers.',
      steps: [
        { title: 'Split both numbers', math: `34 = ${b(30)} + ${b(4)} &nbsp; 26 = ${b(20)} + ${b(6)}`, say: '34 times 26. Split both numbers: 34 is 30 and 4, and 26 is 20 and 6. Draw a grid with a box for every pair.',
          run: async S => { S.t('q', 180, 14, '34 × 26', { size: 18, fill: C.mute, label: true });
            [[x, y, w1, h1], [x + w1 + 4, y, W - w1 - 4, h1], [x, y + h1 + 4, w1, H - h1 - 4], [x + w1 + 4, y + h1 + 4, W - w1 - 4, H - h1 - 4]].forEach(([a, bb, c, d], i) => S.r(`g${i}`, a, bb, c, d, { stroke: 'rgba(255,255,255,.5)', sw: 2, dash: '5 4', rx: 4, pop: true, delay: i * 100 }));
            S.t('a0', x + w1 / 2, y - 14, '30', { size: 19, fill: C.tens, pop: true }); S.t('a1', x + w1 + 4 + (W - w1 - 4) / 2, y - 14, '4', { size: 19, fill: C.units, pop: true });
            S.t('b0', x - 14, y + h1 / 2, '20', { size: 19, fill: C.tens, anchor: 'end', pop: true }); S.t('b1', x - 14, y + h1 + 4 + (H - h1 - 4) / 2, '6', { size: 19, fill: C.units, anchor: 'end', pop: true }); await S.wait(700); } },
        lines({ title: 'Tens × tens', math: `30 × 20 → 3 × 2 = 6, two zeros: ${b(600)}`, choices: [Q('30 × 20 = ?', [600, 60, 6000], 600, '3 times 2 is 6. 30 and 20 each have a zero, so put two zeros on: 600.')],
          say: 'Tap the big box. 30 times 20: do 3 times 2, then put the zeros back on.', run: async function (S) { S.hl(x - 3, y - 3, w1 + 6, h1 + 6); await tapCell(S, 0, 0); await S.choose(this.choices[0]); cell(S, 0, 0, C.hund); S.sfx('good'); await S.wait(400); } }),
        lines({ title: 'Units × tens', math: `4 × 20 = ${b(80)} &nbsp; 30 × 6 = ${b(180)}`, choices: [Q('4 × 20 = ?', [80, 8, 800], 80, '4 times 2 is 8, with one zero: 80.'), Q('30 × 6 = ?', [180, 18, 1800], 180, '3 times 6 is 18, with one zero: 180.')],
          say: 'Now the two middle boxes. Tap the top right box first: 4 times 20.', run: async function (S) { S.hl(null); await tapCell(S, 0, 1); await S.choose(this.choices[0]); cell(S, 0, 1, C.tens); S.say('Now tap the bottom left box: 30 times 6.'); await tapCell(S, 1, 0); await S.choose(this.choices[1]); cell(S, 1, 0, C.tens); S.sfx('good'); await S.wait(400); }, hints: ['Now tap the bottom left box: 30 times 6.'] }),
        lines({ title: 'Units × units', math: `4 × 6 = ${b(24)}`, choices: [Q('4 × 6 = ?', [24, 10, 20], 24, '4 times 6 is 24. Count in 6s: 6, 12, 18, 24.')], say: 'The last box. Tap it: 4 times 6.', run: async function (S) { S.hl(x + w1 + 1, y + h1 + 1, W - w1 + 2, H - h1 + 2); await tapCell(S, 1, 1); await S.choose(this.choices[0]); cell(S, 1, 1, C.units); S.sfx('good'); await S.wait(400); } }),
        lines({ title: 'Add all four', math: `600 + 80 + 180 + 24 = ${b(884)}`, choices: [Q('600 + 80 + 180 + 24 = ?', [884, 784, 874], 884, '600 plus 180 is 780. Plus 80 is 860. Plus 24 is 884.')], say: 'Add all four answers. What is 600 plus 80 plus 180 plus 24?',
          run: async function (S) { S.hl(null); await S.choose(this.choices[0]); S.t('sum', 180, 226, '600 + 80 + 180 + 24 = 884', { size: 19, fill: C.good, pop: true }); S.sfx('good'); await S.wait(400); } })
      ] };
  };

  /* ======================= DIVIDING (long division, "bus stop") ======================= */
  function longDiv(N, d) {
    const ds = String(N).split('').map(Number), steps = [], q = String(Math.floor(N / d)), cw = 26, x0 = 130, top = 40;
    const X = i => x0 + i * cw;   // digit i of N
    let rem = 0, i = 0, cur = ds[0], row = 0;
    while (cur < d && i < ds.length - 1) { i++; cur = cur * 10 + ds[i]; }
    const ladder = (S, hit) => {   // the times-table ladder textbooks put beside a division
      for (let m = 1; m <= 9; m++) { const id = `lad${m}`, on = m === hit; S.t(id, 334, 10 + m * 21, `${m}×${d}=${m * d}`, { size: 12, fill: on ? C.units : C.mute, label: true, weight: on ? 800 : 600 }); }
      if (hit) S.hl(296, 10 + hit * 21 - 10, 62, 20); else S.hl(null);
    };
    steps.push({ title: 'Set it out', math: `${N} ÷ ${d}: ${k(N)} goes inside, ${k(d)} outside`, say: `${N} divided by ${d}. Write ${N} inside the bus stop and ${d} outside. Then work from left to right. On the side is the ${d} times table to help.`,
      run: async S => {
        S.t('d', x0 - 34, top + 30, String(d), { size: 28, fill: C.pink });
        S.p('bus', `M ${x0 - 16} ${top + 52} Q ${x0 - 10} ${top + 30} ${x0 - 16} ${top + 8} L ${X(ds.length - 1) + 18} ${top + 8}`, { sw: 3, draw: true });
        ds.forEach((v, j) => S.t(`n${j}`, X(j), top + 30, String(v), { size: 28 }));
        ladder(S, 0); await S.wait(700);
      } });
    const qStart = i;
    while (i < ds.length) {
      const rr = row, qq = Math.floor(cur / d), prod = qq * d, left = cur - prod, ii = i, cc = cur, y = top + 64 + row * 64, first = row === 0, nextDigit = ds[i + 1];
      const x = X(ii);
      const dq = Q(`How many ${d}s in ${cc}?`, [qq - 1, qq, qq + 1].filter(v => v >= 0), qq, `${qq} times ${d} is ${prod}, which fits in ${cc}. ${qq + 1} times ${d} is ${(qq + 1) * d}, which is too big.`);
      steps.push(lines({ title: `Divide${first ? '' : ' again'}`, math: `How many ${d}s in ${b(cc)}? ${k(qq)}<br>${qq} × ${d} = ${prod}`, choices: [dq], say: `${first && ii > 0 ? `${ds[0]} is too small to share by ${d}, so we use ${cc}. ` : ''}How many ${d}s go into ${cc}? Use the times table on the side.`,
        run: async S => { ladder(S, 0); await S.choose(dq); ladder(S, qq || 0); S.t(`q${ii}`, x, top - 14, String(qq), { size: 28, fill: C.good, pop: true }); S.sfx('tick'); await S.wait(300);
          S.t(`m${rr}`, x + 9, y, String(prod), { size: 24, fill: C.tens, pop: true, anchor: 'end' }); S.t(`mm${rr}`, x - 9 - String(prod).length * 15, y, '−', { size: 20, fill: C.red, pop: true }); await S.wait(500); } }));
      steps.push(lines({ title: nextDigit != null ? 'Subtract and bring down' : 'Subtract', hints: nextDigit != null ? [`Tap the ${nextDigit} in ${N} to bring it down.`] : [], math: `${cc} − ${prod} = ${b(left)}${nextDigit != null ? `<br>Bring down the ${k(nextDigit)}: ${b(left * 10 + nextDigit)}` : left ? `` : `<br>Nothing left over`}`,
        say: `Take ${prod} away from ${cc}: that leaves ${left}.` + (nextDigit != null ? ` Now tap the next digit, ${nextDigit}, to bring it down and make ${left * 10 + nextDigit}.` : left ? ` ${left} is left over.` : ' Nothing is left over, so we are finished.'),
        run: async S => { ladder(S, 0); S.l(`ln${rr}`, x - 24, y + 16, x + 14, y + 16, { sw: 2.5, draw: true }); await S.wait(300);
          S.t(`l${rr}`, x + 9, y + 36, String(left), { size: 24, fill: C.units, anchor: 'end', pop: true }); await S.wait(300);
          if (nextDigit != null) { hitR(S, 'hd', X(ii + 1) - 14, top + 10, 28, 40); await S.ask((done, S) => S.tap('hd', () => done())); S.del('hd'); }
          if (nextDigit != null) { S.t(`bd${rr}`, X(ii + 1), y + 36, String(nextDigit), { size: 24, fill: C.carry, from: [0, -(y + 36 - top - 30)], pop: false }); S.l(`ar${rr}`, X(ii + 1), top + 50, X(ii + 1), y + 18, { stroke: C.carry, sw: 1.5, dash: '3 4', draw: true }); }
          await S.wait(500); } }));
      rem = left; i++; if (i < ds.length) cur = left * 10 + ds[i]; row++;
    }
    const ans = Math.floor(N / d);
    steps.push({ title: 'Read the answer', math: `${N} ÷ ${d} = ${b(ans)}${rem ? ` r ${rem}` : ''}<br>Check: ${ans} × ${d} = ${ans * d} ✓`, say: `The answer is on top of the bus stop: ${ans}. Check by multiplying back: ${ans} times ${d} is ${ans * d}.`,
      run: async S => { ladder(S, 0); S.hl(X(qStart) - 16, top - 30, (ds.length - qStart) * cw + 6, 32); S.sfx('good'); await S.wait(300); } });
    return { view: [360, 70 + (row + 1) * 64], steps, remember: 'Divide, multiply, subtract, bring down. Then do it again until every digit is used.' };
  }
  E['div-1'] = () => {   // hands-on sharing first (what dividing means), then the written method
    const sc = longDiv(96, 4), plateX = p => 52 + p * 85, PY = 220, s = 5;
    const rodPos = (p, j) => [plateX(p) - 26 + j * 8, PY - 58], cubePos = (p, j) => [plateX(p) + (j % 2) * 9, PY - 50 + Math.floor(j / 2) * 9];
    const toPos = (S, id, [tx, ty]) => { const e = S.get(id); S.to(id, tx - +e.getAttribute('x'), ty - +e.getAttribute('y')); };
    const share = [
      { title: 'Share the tens', math: `9 tens shared by 4: ${b('2 tens')} each, ${k('1')} left`, say: "96 dollars shared between 4 of the crew. Dividing means sharing fairly. Here are 9 tens and 6 units. Tap the tens to give one ten to each person. Keep going while everyone can get one.",
        run: async S => {
          for (let p = 0; p < 4; p++) { S.el('ellipse', `pl${p}`, { cx: plateX(p), cy: PY, rx: 36, ry: 10, fill: '#6b737b' }, { pop: true }); S.t(`pn${p}`, plateX(p), PY + 22, ['Mia', 'Rico', 'Lu', 'Dex'][p], { size: 12, label: true, fill: C.mute }); }
          for (let i = 0; i < 9; i++) S.r(`rd${i}`, 16 + i * 9, 14, s, 50, { fill: C.tens, stroke: C.ink, sw: 1, rx: 1, pop: true, delay: i * 40 });
          for (let i = 0; i < 6; i++) S.r(`cb${i}`, 110 + (i % 3) * 9, 40 + Math.floor(i / 3) * 9, s + 2, s + 2, { fill: C.units, stroke: C.ink, sw: 1, rx: 1, pop: true });
          S.r('hRods', 10, 8, 90, 62, { fill: 'rgba(255,255,255,.001)' });
          let given = 0; const round = () => { for (let p = 0; p < 4; p++) toPos(S, `rd${given++}`, rodPos(p, Math.floor((given - 1) / 4))); };
          await S.ask((done, S) => S.tap('hRods', () => { if (given >= 8) { S.say('Only 1 ten is left. That is not enough for everyone, so stop sharing the tens.'); return; } round(); S.sfx('tick'); if (given >= 8) setTimeout(done, 700); }));
          while (given < 8) round(); S.del('hRods'); S.t('left', 60, 80, '1 ten left', { size: 13, label: true, fill: C.carry, pop: true }); await S.wait(300);
        } },
      { title: 'Swap the last ten', math: `1 ten = 10 units. 10 + 6 = ${b('16')} units`, say: 'One ten is left over. Tap it to swap it for 10 units. Now we have 16 units to share.',
        run: async S => {
          const swap = () => { S.del('rd8'); S.del('left'); for (let i = 0; i < 10; i++) S.r(`cb${6 + i}`, 110 + ((6 + i) % 3) * 9, 40 + Math.floor((6 + i) / 3) * 9 - 18, s + 2, s + 2, { fill: C.units, stroke: C.carry, sw: 1.5, rx: 1, pop: true, delay: i * 30 }); S.t('u16', 180, 40, '16 units', { size: 13, label: true, fill: C.units, pop: true }); S.sfx('good'); };
          S.r('h8', 74, 6, 36, 66, { fill: 'rgba(255,255,255,.001)' });
          await S.ask((done, S) => S.tap('h8', () => { if (!S.get('rd8')) return; swap(); setTimeout(done, 700); }));
          S.del('h8'); if (S.get('rd8')) swap(); await S.wait(300);
        } },
      { title: 'Share the units', math: `16 ÷ 4 = ${b(4)} each`, say: 'Now tap the units to share them, one to each person, until they are all gone.',
        run: async S => {
          S.r('hCubes', 104, 10, 90, 80, { fill: 'rgba(255,255,255,.001)' });
          let given = 0; const round = () => { for (let p = 0; p < 4; p++) { toPos(S, `cb${given}`, cubePos(p, Math.floor(given / 4))); given++; } };
          await S.ask((done, S) => S.tap('hCubes', () => { if (given >= 16) return; round(); S.sfx('tick'); if (given >= 16) setTimeout(done, 700); }));
          while (given < 16) round(); S.del('hCubes'); S.del('u16');
          for (let p = 0; p < 4; p++) S.t(`e${p}`, plateX(p), PY - 74, '24', { size: 18, fill: C.good, pop: true, delay: p * 120 });
          S.t('each', 180, 30, 'Everyone gets 2 tens and 4 units: 24', { size: 14, label: true, fill: C.good, pop: true }); await S.wait(600);
        } }
    ];
    const first = sc.steps[0], run0 = first.run;
    first.title = 'Now write it the school way'; first.say = 'That is exactly what the bus stop method writes down. ' + first.say;
    first.run = async S => { S.clear(); await run0(S); };
    sc.steps = share.concat(sc.steps); return sc;
  };
  E['div-2'] = () => longDiv(852, 4);
  E['div-3'] = () => longDiv(1365, 5);

  /* ======================= ALGEBRA (a balance) ======================= */
  function balance(S) {   // beam + two pans; things on a pan live in its group, so the pan can tip
    S.p('stand', 'M 180 214 L 165 240 L 195 240 Z', { fill: '#6b737b', stroke: '#6b737b', sw: 2 });
    S.l('beam', 40, 214, 320, 214, { stroke: '#aab4bd', sw: 6 }); S.g('Lg'); S.g('Rg');
    S.r('panL', 40, 206, 120, 8, { fill: '#8f969d', rx: 3, parent: 'Lg' }); S.r('panR', 200, 206, 120, 8, { fill: '#8f969d', rx: 3, parent: 'Rg' });
  }
  /* tip the balance: the heavier side goes down (weights in cubes) */
  function tilt(S, left, right) {
    const a = Math.max(-10, Math.min(10, (right - left) * 1.6)), dy = Math.sin(a * Math.PI / 180) * 140;
    const bm = S.get('beam'); bm.style.transformBox = 'view-box'; bm.style.transformOrigin = '180px 214px'; bm.style.transform = `rotate(${a}deg)`;
    S.get('Lg').style.transform = `translateY(${-dy}px)`; S.get('Rg').style.transform = `translateY(${dy}px)`;
  }
  const cube = (S, id, side, i, o = {}) => { const x = (side ? 210 : 50) + (i % 8) * 13, y = 192 - Math.floor(i / 8) * 13; return S.r(id, x, y, 11, 11, { fill: C.units, stroke: C.ink, sw: 1, rx: 2, pop: true, delay: (o.d || 0) + i * 30, parent: side ? 'Rg' : 'Lg' }); };
  const bag = (S, id, i, o = {}) => { const x = 46 + i * 31, y = 160; S.r(id, x, y, 28, 32, { fill: C.pink, stroke: C.ink, sw: 1.5, rx: 8, pop: true, delay: o.d || 0, parent: 'Lg' }); return S.t(id + 't', x + 14, y + 17, 'x', { size: 20, delay: o.d || 0, pop: true, parent: 'Lg' }); };
  /* the child taps cubes off each pan; the balance tips until both sides lose the same */
  async function takeBoth(S, Lids, Rids, n, xw) {
    let l = 0, r = 0; const gone = new Set(), lw = () => xw + Lids.length - l, rw = () => Rids.length - r;
    const off = id => { gone.add(id); S.to(id, 0, -120); S.fade(id, 0); };
    await S.ask((done, S) => {
      Lids.forEach(id => S.tap(id, () => { if (gone.has(id)) return; if (l >= n) return S.say(`Only ${n} came off the left.`); off(id); l++; tilt(S, lw(), rw()); S.sfx('tick'); if (l === n && r === n) setTimeout(done, 600); }));
      Rids.forEach(id => S.tap(id, () => { if (gone.has(id)) return; if (r >= n) return S.say(`That's ${n} already. Take the same from both sides.`); off(id); r++; tilt(S, lw(), rw()); S.sfx('tick'); if (l === n && r === n) setTimeout(done, 600); }));
    });
    Lids.slice(0, n).forEach(id => { if (!gone.has(id)) off(id); }); Rids.slice(-n).forEach(id => { if (!gone.has(id) && [...gone].filter(g => Rids.includes(g)).length < n) off(id); });
    tilt(S, xw, xw);
  }
  async function shareInto(S, ids, groups) {   // tap the pile: one cube to each bag's group per tap
    let given = 0; const place = i => { const gi = i % groups, j = Math.floor(i / groups), e = S.get(ids[i]); S.to(ids[i], 214 + gi * 36 + (j % 2) * 13 - +e.getAttribute('x'), 150 + Math.floor(j / 2) * 13 - +e.getAttribute('y')); };
    hitR(S, 'hpile', 200, 120, 130, 96);
    await S.ask((done, S) => S.tap('hpile', () => { if (given >= ids.length) return; for (let q = 0; q < groups; q++) place(given++); S.sfx('tick'); if (given >= ids.length) setTimeout(done, 600); }));
    S.del('hpile'); while (given < ids.length) place(given++);
  }
  const eqTop = (S, id, str, o = {}) => S.t(id, 180, 28, str, { size: 26, pop: true, ...o });
  E['alg-1'] = () => {
    const L = [0, 1, 2, 3].map(i => `L${i}`), R = Array.from({ length: 11 }, (_, i) => `R${i}`);
    return { view: [360, 246], remember: 'An equation is a balance. Do the same thing to both sides until x is on its own.',
    steps: [
      { title: 'Picture a balance', math: `x + 4 = 11`, say: 'x plus 4 equals 11. Think of a balance. On the left is a bag with x cubes inside, plus 4 cubes. On the right are 11 cubes. Both sides weigh the same.',
        run: async S => { balance(S); bag(S, 'x', 0); for (let i = 0; i < 4; i++) cube(S, `L${i}`, 0, i + 3); for (let i = 0; i < 11; i++) cube(S, `R${i}`, 1, i, { d: 300 }); eqTop(S, 'e1', 'x + 4 = 11'); await S.wait(800); } },
      lines({ title: 'Undo the + 4', math: `Take ${k('4')} from both sides`, hints: ['Only 4 came off the left.', "That's 4 already. Take the same from both sides."],
        say: 'To get x on its own, undo the plus 4. Tap 4 cubes off the left pan. Watch the balance tip. Then tap 4 cubes off the right pan to make it level again.',
        run: async S => { await takeBoth(S, L, R, 4, 7); eqTop(S, 'e1', 'x + 4 − 4 = 11 − 4', { size: 22 }); S.sfx('good'); await S.wait(500); } }),
      lines({ title: 'Work it out', math: `x = 11 − 4 = ${b(7)}`, choices: [Q('So what is x?', [7, 11, 15], 7, 'The bag is on its own now, and it balances the 7 cubes left on the right. So x is 7.')], say: 'Now the bag is on its own. What does x equal?',
        run: async function (S) { S.hl(204, 140, 112, 66); await S.choose(this.choices[0]); eqTop(S, 'e1', 'x = 7', { fill: C.good }); S.sfx('good'); await S.wait(500); } }),
      { title: 'Check', math: `7 + 4 = 11 ✓`, say: 'Check by putting 7 back in: 7 plus 4 is 11. It matches, so x equals 7.',
        run: async S => { S.hl(null); S.t('chk', 180, 64, '7 + 4 = 11 ✓', { size: 20, fill: C.good, pop: true }); await S.wait(400); } }
    ] };
  };
  E['alg-2'] = () => {
    const R = Array.from({ length: 15 }, (_, i) => `R${i}`);
    return { view: [360, 246], remember: '3x means 3 lots of x. To undo times, divide both sides.',
    steps: [
      { title: 'Picture a balance', math: `3x = 15`, say: '3x equals 15. 3x means 3 times x: three bags, each with the same number of cubes. They balance 15 cubes.',
        run: async S => { balance(S); for (let i = 0; i < 3; i++) bag(S, `x${i}`, i, { d: i * 150 }); for (let i = 0; i < 15; i++) cube(S, `R${i}`, 1, i, { d: 300 }); eqTop(S, 'e1', '3x = 15'); await S.wait(800); } },
      { title: 'Undo the × 3', math: `Share both sides into ${k('3')} equal groups`, say: 'To undo times 3, divide by 3. Tap the cubes to share them into 3 equal groups, one group for each bag.',
        run: async S => { await shareInto(S, R, 3); eqTop(S, 'e1', '3x ÷ 3 = 15 ÷ 3', { size: 22 }); S.sfx('good'); await S.wait(500); } },
      lines({ title: 'Work it out', math: `x = 15 ÷ 3 = ${b(5)}`, choices: [Q('How many cubes in each bag?', [5, 3, 12], 5, 'Each group got 5 cubes, so each bag holds 5. 15 divided by 3 is 5.')], say: 'Each bag matches one group. How many cubes is x?',
        run: async function (S) { await S.choose(this.choices[0]); eqTop(S, 'e1', 'x = 5', { fill: C.good }); S.sfx('good'); await S.wait(500); } }),
      { title: 'Check', math: `3 × 5 = 15 ✓`, say: 'Check: 3 times 5 is 15. It matches.', run: async S => { S.t('chk', 180, 64, '3 × 5 = 15 ✓', { size: 20, fill: C.good, pop: true }); await S.wait(400); } }
    ] };
  };
  E['alg-3'] = () => {
    const L = [0, 1, 2, 3, 4].map(i => `L${i}`), R = Array.from({ length: 20 }, (_, i) => `R${i}`);
    return { view: [360, 246], remember: 'Two steps: undo the + or − first, then undo the ×. Always do the same to both sides.',
    steps: [
      { title: 'Picture a balance', math: `3x + 5 = 20`, say: '3x plus 5 equals 20. On the left: 3 bags of x and 5 cubes. On the right: 20 cubes. Two things were done to x, so we undo them, last one first.',
        run: async S => { balance(S); for (let i = 0; i < 3; i++) bag(S, `x${i}`, i, { d: i * 120 }); for (let i = 0; i < 5; i++) S.r(`L${i}`, 142 + (i % 2) * 13, 192 - Math.floor(i / 2) * 13, 11, 11, { fill: C.units, stroke: C.ink, sw: 1, rx: 2, pop: true, delay: i * 30, parent: 'Lg' }); for (let i = 0; i < 20; i++) cube(S, `R${i}`, 1, i, { d: 300 }); eqTop(S, 'e1', '3x + 5 = 20'); await S.wait(800); } },
      lines({ title: 'Undo the + 5', math: `Take ${k(5)} from both sides: 3x = ${b(15)}`, hints: ['Only 5 came off the left.', "That's 5 already. Take the same from both sides."],
        say: 'First undo the plus 5. Tap the 5 cubes off the left pan, then 5 cubes off the right pan so it balances again.',
        run: async S => { await takeBoth(S, L, R, 5, 15); eqTop(S, 'e1', '3x = 15'); S.sfx('good'); await S.wait(500); } }),
      lines({ title: 'Undo the × 3', math: `x = 15 ÷ 3 = ${b(5)}`, choices: [Q('So what is x?', [5, 3, 15], 5, 'The 15 cubes shared into 3 groups make 5 in each group. So each bag holds 5.')], say: 'Now undo times 3. Tap the cubes to share them into 3 groups. Then tell me what x is.',
        run: async function (S) { await shareInto(S, R.filter(id => S.get(id) && S.get(id).style.opacity !== '0'), 3); await S.choose(this.choices[0]); eqTop(S, 'e1', 'x = 5', { fill: C.good }); S.sfx('good'); await S.wait(500); } }),
      { title: 'Check', math: `3 × 5 + 5 = 20 ✓`, say: 'Check: 3 times 5 is 15, plus 5 is 20. It matches.', run: async S => { S.hl(null); S.t('chk', 180, 64, '3 × 5 + 5 = 20 ✓', { size: 20, fill: C.good, pop: true }); await S.wait(400); } }
    ] };
  };

  /* ======================= FRACTIONS (bar model) ======================= */
  function bar(S, pre, x, y, w, h, parts, shade, col, o = {}) {
    const pw = w / parts;
    for (let i = 0; i < parts; i++) S.r(`${pre}${i}`, x + i * pw, y, pw, h, { fill: i < shade ? col : 'rgba(255,255,255,.06)', stroke: '#fff', sw: 2, rx: 2, pop: !o.still, delay: (o.d || 0) + i * 70 });
  }
  E['frac-1'] = () => {   // hands-on: cut the tray into quarters, deal 20 slices fairly, take 3 parts
    const X = 30, Y = 120, W = 300, Hh = 60, pw = W / 4, slot = (p, j) => [X + p * pw + 18 + (j % 3) * 19, Y + 18 + Math.floor(j / 3) * 24];
    const bread = (S, i) => S.c(`br${i}`, 52 + (i % 10) * 28, 30 + Math.floor(i / 10) * 26, 9, { fill: '#f3c87a', stroke: '#b07a2a', sw: 2, pop: true, delay: i * 25 });
    const dealTo = (S, i) => { const e = S.get(`br${i}`), [tx, ty] = slot(i % 4, Math.floor(i / 4)); S.to(`br${i}`, tx - +e.getAttribute('cx'), ty - +e.getAttribute('cy')); };
    return { view: [360, 236], remember: 'To find a fraction of an amount: divide by the bottom number, then times by the top number.',
      steps: [
        { title: 'Cut it into 4 equal parts', math: `${NB.fracHTML('{f:3/4}')} of 20: the bottom number ${k(4)} means 4 equal parts`, say: "Lu has 20 slices of garlic bread, and three quarters go out for delivery. The bottom number, 4, means 4 equal parts. Tap the 3 dotted lines to cut the tray into 4 equal parts.",
          run: async S => {
            S.r('tray', X, Y, W, Hh, { fill: 'rgba(255,255,255,.06)', stroke: '#fff', sw: 2, rx: 4, pop: true });
            for (let i = 0; i < 20; i++) bread(S, i);
            for (let c = 1; c < 4; c++) { S.l(`g${c}`, X + c * pw, Y - 8, X + c * pw, Y + Hh + 8, { stroke: C.units, sw: 2, dash: '4 5' }); S.r(`gh${c}`, X + c * pw - 16, Y - 12, 32, Hh + 24, { fill: 'rgba(0,0,0,0)' }); }
            const cut = c => { S.l(`cut${c}`, X + c * pw, Y - 8, X + c * pw, Y + Hh + 8, { stroke: '#fff', sw: 3, draw: true }); S.del(`g${c}`); S.del(`gh${c}`); };
            await S.ask((done, S) => { let n = 0; for (let c = 1; c < 4; c++) S.tap(`gh${c}`, () => { if (!S.get(`gh${c}`)) return; cut(c); S.sfx('tick'); if (++n === 3) setTimeout(done, 400); }); });
            for (let c = 1; c < 4; c++) if (!S.get(`cut${c}`)) cut(c);
            S.sfx('good'); await S.wait(300);
          } },
        { title: 'Share them out fairly', math: `20 ÷ ${k(4)} = ${b(5)} in each part`, say: 'Now share the 20 slices out fairly. Tap the pile to give one slice to every part. Keep going until the pile is empty.',
          run: async S => {
            S.r('pileHit', 36, 14, 288, 70, { fill: 'rgba(0,0,0,0)' });
            let dealt = 0;
            const round = () => { for (let q = 0; q < 4 && dealt < 20; q++, dealt++) dealTo(S, dealt); };
            await S.ask((done, S) => { S.tap('pileHit', () => { if (dealt >= 20) return; round(); S.sfx('tick'); if (dealt >= 20) setTimeout(done, 600); }); });
            while (dealt < 20) round();
            S.del('pileHit'); for (let p = 0; p < 4; p++) S.t(`n${p}`, X + p * pw + pw / 2, Y + Hh + 22, '5', { size: 22, fill: C.good, pop: true, delay: p * 120 });
            await S.wait(500);
          } },
        { title: 'Take 3 parts', math: `5 × ${k(3)} = ${b(15)}`, say: 'Three quarters means we take 3 of the 4 parts. Tap 3 parts.',
          run: async S => {
            for (let p = 0; p < 4; p++) S.r(`part${p}`, X + p * pw + 3, Y + 3, pw - 6, Hh - 6, { fill: 'rgba(0,0,0,0)', rx: 3, under: false });
            const on = new Set(), shade = p => { S.r(`sh${p}`, X + p * pw + 2, Y + 2, pw - 4, Hh - 4, { fill: C.carry, op: .8, rx: 3, pop: true }); const e = S.get(`sh${p}`); e.parentNode.insertBefore(e, S.get('tray').nextSibling); };
            await S.ask((done, S) => { for (let p = 0; p < 4; p++) S.tap(`part${p}`, () => { if (on.has(p)) { on.delete(p); S.del(`sh${p}`); return; } if (on.size >= 3) { S.say('Three quarters is just 3 parts. Tap one again to put it back.'); return; } on.add(p); shade(p); S.sfx('tick'); if (on.size === 3) setTimeout(done, 500); }); });
            for (let p = 0; p < 3; p++) if (!on.has(p) && on.size < 3) { on.add(p); shade(p); }
            S.sfx('good'); S.t('sum', 180, 228, '5 + 5 + 5 = 15', { size: 18, fill: C.good, pop: true }); await S.wait(500);
          } },
        { title: 'The answer', math: `${NB.fracHTML('{f:3/4}')} of 20 = ${b(15)}`, say: 'So three quarters of 20 is 15. Divide by the bottom number, then times by the top.', run: async S => { S.del('sum'); S.t('ans', 180, 228, '¾ of 20 = 15', { size: 24, fill: C.units, pop: true }); await S.wait(300); } }
      ] };
  };
  E['frac-2'] = () => ({ view: [360, 230], remember: 'Equivalent fractions: whatever you do to the bottom, do the same to the top.',
    steps: [
      { title: 'Same amount, different slices', math: `${NB.fracHTML('{f:6/8}')} = ${NB.fracHTML('{f:?/4}')}`, say: '6 eighths is the same as how many quarters? Here is 6 eighths: a bar cut into 8 slices with 6 coloured.',
        run: async S => { bar(S, 'e', 30, 40, 300, 46, 8, 6, C.carry); S.t('l8', 180, 20, '6 eighths', { size: 15, label: true, fill: C.mute }); await S.wait(800); } },
      lines({ title: 'Join the slices in pairs', math: `8 ÷ ${k(2)} = 4: every 2 eighths make 1 quarter`, hints: ['Tap each pair of slices to join them.'],
        say: 'Quarters are twice as big as eighths. Tap each pair of slices to join them into one quarter.',
        run: async S => {
          bar(S, 'q', 30, 130, 300, 46, 4, 0, C.carry); S.t('l4', 180, 110, 'quarters', { size: 15, label: true, fill: C.mute });
          const join = i => { S.p(`br${i}`, `M ${34 + i * 75} 92 Q ${67 + i * 75} 112 ${101 + i * 75} 92`, { stroke: C.units, sw: 3, draw: true }); if (i < 3) S.r(`qs${i}`, 30 + i * 75, 130, 75, 46, { fill: C.carry, rx: 2, pop: true }); S.del(`hj${i}`); };
          for (let i = 0; i < 4; i++) hitR(S, `hj${i}`, 30 + i * 75, 36, 75, 56);
          let n = 0; await S.ask((done, S) => { for (let i = 0; i < 4; i++) S.tap(`hj${i}`, () => { if (!S.get(`hj${i}`)) return; join(i); S.sfx('tick'); if (++n === 4) setTimeout(done, 500); }); });
          for (let i = 0; i < 4; i++) if (S.get(`hj${i}`)) join(i); await S.wait(300);
        } }),
      lines({ title: 'Same to the top', math: `6 ÷ ${k(2)} = ${b(3)}`, choices: [Q('6 eighths = how many quarters?', [3, 6, 4], 3, 'Every 2 eighths joined into 1 quarter. 6 eighths make 3 pairs, so 3 quarters. The bottom halved, so the top halves too.')],
        say: 'Look at the bottom bar. How many quarters are coloured?', run: async function (S) { await S.choose(this.choices[0]); S.sfx('good'); await S.wait(300); } }),
      { title: 'The answer', math: `${NB.fracHTML('{f:6/8}')} = ${b(NB.fracHTML('{f:3/4}'))}`, say: 'So 6 eighths is the same as 3 quarters. Whatever you do to the bottom, do the same to the top.', run: async S => { S.t('ans', 180, 208, '6/8 = 3/4', { size: 24, fill: C.units, pop: true }); await S.wait(300); } }
    ] });
  E['frac-3'] = () => ({ view: [360, 250], remember: 'You can only add fractions with the same bottom number. Make the bottoms match, then add the tops.',
    steps: [
      lines({ title: 'Different slices', math: `${NB.fracHTML('{f:1/2}')} + ${NB.fracHTML('{f:1/3}')}`, choices: [Q('Is ½ + ⅓ the same as 2/5?', ['Yes', 'No'], 'No', "No. Adding the tops and the bottoms doesn't work: 2 fifths is less than a half on its own! The slices are different sizes, so first we make them match.")],
        say: 'A half plus a third. Some people think the answer is 2 fifths. Is it?',
        run: async function (S) { bar(S, 'h', 30, 30, 300, 40, 2, 1, C.carry); bar(S, 't', 30, 100, 300, 40, 3, 1, C.tens, { d: 300 }); S.t('lh', 345, 50, '½', { size: 20, fill: C.carry }); S.t('lt', 345, 120, '⅓', { size: 20, fill: C.tens }); await S.wait(600); await S.choose(this.choices[0]); } }),
      lines({ title: 'Cut them into sixths', math: `2 and 3 both go into ${k(6)}`, hints: ['Tap each bar to cut it into sixths.'], say: '2 and 3 both go into 6. Tap each bar to cut it into sixths.',
        run: async S => {
          const cutH = () => { for (let i = 1; i < 6; i++) if (i % 3) S.l(`ch${i}`, 30 + i * 50, 30, 30 + i * 50, 70, { stroke: '#fff', sw: 1.5, dash: '3 3', draw: true }); S.t('h6', 345, 50, '3⁄6', { size: 16, fill: C.carry, pop: true }); S.del('hh'); };
          const cutT = () => { for (let i = 1; i < 6; i++) if (i % 2) S.l(`ct${i}`, 30 + i * 50, 100, 30 + i * 50, 140, { stroke: '#fff', sw: 1.5, dash: '3 3', draw: true }); S.t('t6', 345, 120, '2⁄6', { size: 16, fill: C.tens, pop: true }); S.del('ht'); };
          hitR(S, 'hh', 30, 26, 300, 48); hitR(S, 'ht', 30, 96, 300, 48); let n = 0;
          await S.ask((done, S) => { S.tap('hh', () => { if (!S.get('hh')) return; cutH(); S.sfx('tick'); if (++n === 2) setTimeout(done, 500); }); S.tap('ht', () => { if (!S.get('ht')) return; cutT(); S.sfx('tick'); if (++n === 2) setTimeout(done, 500); }); });
          if (S.get('hh')) cutH(); if (S.get('ht')) cutT(); await S.wait(300);
        } }),
      lines({ title: 'Add the tops', math: `${NB.fracHTML('{f:3/6}')} + ${NB.fracHTML('{f:2/6}')} = ${b(NB.fracHTML('{f:5/6}'))}`, choices: [Q('3 sixths + 2 sixths = ?', ['5/6', '5/12', '6/6'], '5/6', 'The slices are all sixths now, so we just count them: 3 plus 2 is 5 sixths. The bottom stays 6.')],
        say: 'Now the slices match. What is 3 sixths plus 2 sixths?',
        run: async function (S) { await S.choose(this.choices[0]); for (let i = 0; i < 6; i++) S.r(`s${i}`, 30 + i * 50, 170, 50, 40, { fill: i < 3 ? C.carry : i < 5 ? C.tens : 'rgba(255,255,255,.06)', stroke: '#fff', sw: 2, rx: 2, pop: true, delay: i * 120 }); S.sfx('good'); await S.wait(900); S.t('ans', 180, 234, '½ + ⅓ = 5⁄6', { size: 22, fill: C.units, pop: true }); await S.wait(300); } })
    ] });

  /* ======================= ANGLES ======================= */
  E['ang-1'] = () => {
    const cx = 120, cy = 124, R = 86;
    const arrow = (S, deg) => { S.get('arr') || S.p('arr', `M ${cx} ${cy} L ${cx} ${cy - R + 14} M ${cx - 9} ${cy - R + 28} L ${cx} ${cy - R + 12} L ${cx + 9} ${cy - R + 28}`, { stroke: C.units, sw: 5 }); const e = S.get('arr'); e.style.transformOrigin = `${cx}px ${cy}px`; e.style.transformBox = 'view-box'; e.style.transform = `rotate(${deg}deg)`; };
    const arc = (S, id, d0, d1, col) => { const p = d => [cx + Math.sin(d * Math.PI / 180) * 46, cy - Math.cos(d * Math.PI / 180) * 46], [x0, y0] = p(d0), [x1, y1] = p(d1); S.p(id, `M ${x0} ${y0} A 46 46 0 0 1 ${x1} ${y1}`, { stroke: col, sw: 4, draw: true }); };
    const turnTaps = async (S, from, n, after) => {   // the child taps the compass to turn the arrow a quarter turn at a time
      hitR(S, 'hcomp', cx - R - 10, cy - R - 10, 2 * R + 20, 2 * R + 20); let t = 0;
      await S.ask((done, S) => S.tap('hcomp', () => { if (t >= n) return; t++; arrow(S, from + t * 90); after(t); S.sfx('tick'); if (t === n) setTimeout(done, 700); }));
      while (t < n) { t++; arrow(S, from + t * 90); after(t); } S.del('hcomp');
    };
    return { view: [360, 236], remember: 'A quarter turn is a right angle: 90°. Count the quarter turns and times by 90.',
      steps: [
        lines({ title: 'A quarter turn', math: `1 quarter turn = ${b('90°')} (a right angle)`, hints: ['Tap the compass to turn the arrow.'], say: 'The arrow faces North. Tap the compass to make a quarter turn clockwise, the way a clock’s hands go.',
          run: async S => { S.c('ring', cx, cy, R, { stroke: 'rgba(255,255,255,.3)', sw: 2, pop: true }); [['N', 0], ['E', 90], ['S', 180], ['W', 270]].forEach(([l, d]) => S.t(`c${l}`, cx + Math.sin(d * Math.PI / 180) * (R + 16), cy - Math.cos(d * Math.PI / 180) * (R + 16), l, { size: 18, fill: '#fff', pop: true }));
            arrow(S, 0); await turnTaps(S, 0, 1, () => { arc(S, 'a1', 0, 90, C.tens); S.r('sq', cx, cy - 16, 16, 16, { stroke: C.tens, sw: 2 }); S.t('l90', 280, 90, 'quarter turn = 90°', { size: 15, label: true, fill: C.tens, pop: true }); });
            await S.wait(600); arrow(S, 0); S.del('a1'); S.del('sq'); await S.wait(300); } }),
        lines({ title: 'Count the quarter turns', math: `North → South, clockwise: ${k(2)} quarter turns`, hints: ['Keep tapping until the arrow points South.'], say: 'Now turn from North all the way to South. Tap the compass for each quarter turn, and count them.',
          run: async S => { S.del('l90'); await turnTaps(S, 0, 2, t => { arc(S, `a${t}`, (t - 1) * 90, t * 90, C.units); S.t(`n${t}`, cx + (t === 1 ? 62 : 62), cy + (t === 1 ? -62 : 62), String(t), { size: 20, fill: C.units, pop: true }); }); await S.wait(300); } }),
        lines({ title: 'Times by 90', math: `2 × 90° = ${b('180°')}`, choices: [Q('2 quarter turns = how many degrees?', ['90°', '180°', '360°'], '180°', 'Each quarter turn is 90 degrees. 90 plus 90 is 180 degrees.')], say: 'Each quarter turn is 90 degrees. How many degrees are 2 quarter turns?',
          run: async function (S) { await S.choose(this.choices[0]); S.t('m', 280, 90, '90° + 90°', { size: 20, pop: true }); await S.wait(300); S.t('r', 280, 130, '= 180°', { size: 26, fill: C.good, pop: true }); S.sfx('good'); await S.wait(400); } }),
        { title: 'The answer', math: `North to South clockwise = ${b('180°')}, a half turn`, say: 'So turning from North to South is a turn of 180 degrees. That is a half turn.', run: async S => { S.t('ans', 280, 176, 'half turn', { size: 16, label: true, fill: C.units, pop: true }); await S.wait(300); } }
      ] };
  };
  E['ang-2'] = () => {
    const ox = 180, oy = 170, R = 130, ray = (S, id, d, col, o = {}) => S.l(id, ox, oy, ox + Math.cos(d * Math.PI / 180) * R, oy - Math.sin(d * Math.PI / 180) * R, { stroke: col || '#fff', sw: 3, draw: true, ...o });
    const lab = (S, id, d, t, col) => S.t(id, ox + Math.cos(d * Math.PI / 180) * 64, oy - Math.sin(d * Math.PI / 180) * 64, t, { size: 18, fill: col, pop: true });
    const sector = (S, id, d0, d1, col) => { const P = d => `${ox + 54 * Math.cos(d * Math.PI / 180)} ${oy - 54 * Math.sin(d * Math.PI / 180)}`; return S.p(id, `M ${ox} ${oy} L ${P(d0)} A 54 54 0 0 0 ${P(d1)} Z`, { fill: col, stroke: 'none', op: .35, pop: true }); };
    return { view: [360, 236], remember: 'Angles on a straight line add up to 180°. Angles all the way round a point add up to 360°.',
      steps: [
        lines({ title: 'A straight line is 180°', math: `Angles on a straight line add to ${b('180°')}`, choices: [Q('Angles on a straight line add up to…', ['90°', '180°', '360°'], '180°', 'A straight line is a half turn, and a half turn is 180 degrees. A full turn is 360.')],
          say: 'Here is a straight line, with angles of 65, 40 and x degrees sitting on it. A straight line is a half turn. What do the angles on it add up to?',
          run: async function (S) { S.l('base', 30, oy, 330, oy, { sw: 4, draw: true }); await S.wait(300); ray(S, 'r1', 65); ray(S, 'r2', 105); await S.wait(500); lab(S, 'l1', 32, '65°', C.tens); lab(S, 'l2', 85, '40°', C.units); lab(S, 'l3', 142, 'x', C.pink);
            await S.choose(this.choices[0]); S.p('half', `M ${ox + 40} ${oy} A 40 40 0 0 0 ${ox - 40} ${oy}`, { stroke: 'rgba(255,255,255,.35)', sw: 2, draw: true }); await S.wait(500); } }),
        lines({ title: 'Add the angles you know', math: `65 + 40 = ${b(105)}`, hints: ['Tap the 65° angle and the 40° angle.'], say: 'Tap the two angles you know to add them up.',
          run: async S => {
            const show = n => { if (n >= 1) sector(S, 'sA', 0, 65, C.tens); if (n >= 2) sector(S, 'sB', 65, 105, C.units); S.t('s1', 300, 30, n >= 2 ? '65 + 40 = 105' : '65', { size: 18, pop: true }); };
            hitR(S, 'hA', ox + 10, oy - 120, 150, 115); hitR(S, 'hB', ox - 60, oy - 140, 90, 130); let got = 0, a = false, bb = false;
            await S.ask((done, S) => { S.tap('hA', () => { if (a) return; a = true; got++; show(got); S.sfx('tick'); if (got === 2) setTimeout(done, 600); }); S.tap('hB', () => { if (bb) return; bb = true; got++; show(got); S.sfx('tick'); if (got === 2) setTimeout(done, 600); }); });
            S.del('hA'); S.del('hB'); show(2); await S.wait(300);
          } }),
        lines({ title: 'Take away from 180', math: `180 − 105 = ${b(75)}`, choices: [Q('x = 180 − 105 = ?', ['75°', '85°', '105°'], '75°', '180 take away 105 is 75. Check: 105 plus 75 makes 180.')], say: 'x gets whatever is left of the 180. What is 180 take away 105?',
          run: async function (S) { await S.choose(this.choices[0]); sector(S, 'sX', 105, 180, C.pink); S.t('s2', 300, 60, '180 − 105 = 75', { size: 18, fill: C.good, pop: true }); S.sfx('good'); await S.wait(400); } }),
        { title: 'Answer and check', math: `x = ${b('75°')}. Check: 65 + 40 + 75 = 180 ✓`, say: 'So x is 75 degrees. Check: 65 plus 40 plus 75 is 180.', run: async S => { S.del('l3'); lab(S, 'l3', 142, '75°', C.good); await S.wait(400); } }
      ] };
  };
  E['ang-3'] = () => {
    // a triangle drawn with its real angles: 70° at A, 50° at B, so 60° at C
    const A = [30, 200], B = [200, 200], t = 170 / 1.1305, Cc = [A[0] + t * Math.cos(70 * Math.PI / 180), A[1] - t * Math.sin(70 * Math.PI / 180)], O = [285, 222], r = 30;
    const wedge = (S, id, V, d1, d2, col) => { const P = d => `${V[0] + r * Math.cos(d * Math.PI / 180)} ${V[1] - r * Math.sin(d * Math.PI / 180)}`; return S.p(id, `M ${V[0]} ${V[1]} L ${P(d1)} A ${r} ${r} 0 0 0 ${P(d2)} Z`, { fill: col, stroke: C.ink, sw: 1, op: .85, pop: true }); };
    const tear = (S, on) => {   // slide the three corners so their points meet on a straight line
      const mv = (id, V, rot) => { const e = S.get(id); e.style.transformBox = 'view-box'; e.style.transformOrigin = `${V[0]}px ${V[1]}px`; e.style.transform = on ? `translate(${O[0] - V[0]}px,${O[1] - V[1]}px) rotate(${rot}deg)` : ''; };
      mv('wA', A, 0); mv('wB', B, 0); mv('wC', Cc, 180);
    };
    return { view: [360, 240], remember: 'The three angles inside any triangle always add up to 180°.',
      steps: [
        lines({ title: 'Every triangle: 180°', math: `Tear off the corners: they make a ${k('straight line')}`, hints: ['Drag each coloured corner onto the dot on the line.'], choices: [Q('The 3 corners make a straight line. So they add up to…', ['90°', '180°', '360°'], '180°', 'The three corners fit exactly along a straight line, and a straight line is 180 degrees. That works for every triangle.')],
          say: 'Here is a fact about every triangle. Drag each coloured corner across and put its point on the dot. What do you notice?',
          run: async function (S) { S.p('tri', `M ${A} L ${B} L ${Cc} Z`, { stroke: '#fff', sw: 3, draw: true }); await S.wait(500);
            wedge(S, 'wA', A, 0, 70, C.tens); wedge(S, 'wB', B, 130, 180, C.units); wedge(S, 'wC', Cc, 250, 310, C.pink); await S.wait(400);
            S.t('a', A[0] + 44, A[1] - 14, '70°', { size: 15, fill: C.tens, pop: true }); S.t('b', B[0] - 44, B[1] - 12, '50°', { size: 15, fill: C.units, pop: true }); S.t('c', Cc[0] + 2, Cc[1] + 46, 'x', { size: 16, fill: C.pink, pop: true });
            S.l('line', 236, O[1], 340, O[1], { stroke: '#fff', sw: 2, draw: true }); S.c('dot', O[0], O[1], 5, { fill: C.units, pop: true }); S.t('l180', 288, 236, '180°', { size: 12, fill: C.mute, label: true });
            const placed = new Set(), put = id => { placed.add(id); const V = { wA: A, wB: B, wC: Cc }[id], rot = id === 'wC' ? 180 : 0, e = S.get(id); e.style.transformBox = 'view-box'; e.style.transformOrigin = `${V[0]}px ${V[1]}px`; e.style.transform = `translate(${O[0] - V[0]}px,${O[1] - V[1]}px) rotate(${rot}deg)`; };
            await S.ask((done, S) => ['wA', 'wB', 'wC'].forEach(id => S.drag(id, [[O[0] - 45, O[1] - 60, 90, 80]], () => { put(id); S.sfx('tick'); if (placed.size === 3) setTimeout(done, 600); return true; })));
            ['wA', 'wB', 'wC'].forEach(id => { if (!placed.has(id)) put(id); }); await S.wait(600); await S.choose(this.choices[0]); } }),
        lines({ title: 'Add the two you know', math: `70 + 50 = ${b(120)}`, choices: [Q('70 + 50 = ?', [120, 110, 130], 120, '7 tens plus 5 tens is 12 tens: 120.')], say: 'Back to our triangle. Add the two angles we know: 70 plus 50.', run: async function (S) { tear(S, false); await S.choose(this.choices[0]); S.t('s1', 290, 60, '70 + 50 = 120', { size: 17, pop: true }); S.sfx('tick'); await S.wait(600); } }),
        lines({ title: 'Take away from 180', math: `180 − 120 = ${b(60)}`, choices: [Q('x = 180 − 120 = ?', ['60°', '50°', '70°'], '60°', '180 take away 120 is 60. Check: 70 plus 50 plus 60 makes 180.')], say: 'The third angle gets whatever is left from 180. What is 180 take away 120?', run: async function (S) { await S.choose(this.choices[0]); S.t('s2', 290, 90, '180 − 120 = 60', { size: 17, fill: C.good, pop: true }); S.sfx('good'); await S.wait(400); } }),
        { title: 'Answer and check', math: `x = ${b('60°')}. Check: 70 + 50 + 60 = 180 ✓`, say: 'So x is 60 degrees. Check: 70 plus 50 plus 60 is 180.', run: async S => { S.del('c'); S.t('c', Cc[0] + 2, Cc[1] + 46, '60°', { size: 15, fill: C.good, pop: true }); await S.wait(400); } }
      ] };
  };

  /* ======================= SHAPES ======================= */
  const U = 22;   // pixels per cm on shape pictures
  E['shp-1'] = () => {   // walk round the edge side by side, then the quick way
    const x = 60, y = 50, w = 9 * U, h = 5 * U;
    const sides = [[x, y, x + w, y, 9, [0, -1]], [x + w, y, x + w, y + h, 5, [1, 0]], [x + w, y + h, x, y + h, 9, [0, 1]], [x, y + h, x, y, 5, [-1, 0]]];
    return { view: [360, 236], remember: 'Perimeter is the distance all the way round. For a rectangle: (long side + short side) × 2.',
      steps: [
        lines({ title: 'Walk all the way round', math: `Perimeter = the distance ${k('all the way round')}: 9 + 5 + 9 + 5 = ${b(28)} cm`, hints: ['Tap each side of the rectangle to drive along it.'],
          say: 'Perimeter is the distance all the way round the edge, like driving one lap of a track. Tap each side of the rectangle to drive along it, and we will add up the lengths.',
          run: async S => {
            S.r('rect', x, y, w, h, { fill: 'rgba(94,195,232,.12)', stroke: '#fff', sw: 3, pop: true }); S.t('lw', x + w / 2, y - 14, '9 cm', { size: 16, fill: C.units, pop: true }); S.t('lh', x - 10, y + h / 2, '5 cm', { size: 16, fill: C.tens, anchor: 'end', pop: true });
            const done4 = new Set(), drive = i => { const [x1, y1, x2, y2] = sides[i]; done4.add(i); S.l(`sd${i}`, x1, y1, x2, y2, { stroke: i % 2 ? C.tens : C.units, sw: 7, draw: true }); S.del(`hs${i}`);
              const vals = [...done4].sort().map(j => sides[j][4]); S.t('run', 180, 200, `${vals.join(' + ')}${done4.size === 4 ? ' = 28 cm' : ''}`, { size: 20, fill: done4.size === 4 ? C.good : '#fff', pop: true }); };
            sides.forEach(([x1, y1, x2, y2], i) => hitR(S, `hs${i}`, Math.min(x1, x2) - 14, Math.min(y1, y2) - 14, Math.abs(x2 - x1) + 28, Math.abs(y2 - y1) + 28));
            await S.ask((done, S) => sides.forEach((_, i) => S.tap(`hs${i}`, () => { if (done4.has(i)) return; drive(i); S.sfx('tick'); if (done4.size === 4) setTimeout(done, 700); })));
            sides.forEach((_, i) => { if (!done4.has(i)) drive(i); }); S.sfx('good'); await S.wait(400);
          } }),
        lines({ title: 'A quicker way: half way round', math: `9 + 5 = ${b(14)}`, choices: [Q('Half way round is one long + one short side. 9 + 5 = ?', [14, 45, 28], 14, 'One long side is 9 and one short side is 5. 9 plus 5 is 14.')], say: 'Here is a quicker way. Half way round is one long side and one short side. What is 9 plus 5?',
          run: async function (S) { await S.choose(this.choices[0]); S.p('half', `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h}`, { stroke: C.carry, sw: 9, draw: true }); S.t('run', 180, 200, '9 + 5 = 14', { size: 20, pop: true }); S.sfx('tick'); await S.wait(600); } }),
        lines({ title: 'Double it', math: `14 × 2 = ${b(28)} cm`, choices: [Q('The other half is the same. 14 × 2 = ?', [28, 24, 16], 28, '14 doubled is 28: 10 doubled is 20, 4 doubled is 8, and 20 plus 8 is 28.')], say: 'The other half is exactly the same. So double it. What is 14 times 2?',
          run: async function (S) { await S.choose(this.choices[0]); S.t('s2', 180, 224, '14 × 2 = 28 cm', { size: 20, fill: C.good, pop: true }); S.sfx('good'); await S.wait(600); } })
      ] };
  };
  E['shp-2'] = () => {   // tile it row by row, then length × width
    const x = 70, y = 40, L = 6, Wd = 4, u = 28, cols = [C.units, C.tens, C.hund, C.carry];
    const row = (S, r) => { for (let i = 0; i < L; i++) S.r(`q${r}_${i}`, x + i * u + 2, y + r * u + 2, u - 4, u - 4, { fill: cols[r], op: .8, rx: 3, pop: true, delay: i * 60 }); S.t(`rc${r}`, x + L * u + 22, y + r * u + u / 2, String((r + 1) * L), { size: 16, fill: cols[r], pop: true }); S.del(`hr${r}`); };
    return { view: [360, 236], remember: 'Area is how many squares cover the shape. Rectangle: length × width. Write the answer in cm².',
      steps: [
        { title: 'What area means', math: `Area = how many ${k('1 cm squares')} cover the shape`, say: 'Area is how much flat space a shape covers. We measure it in squares, each 1 centimetre by 1 centimetre. This rectangle is 6 centimetres long and 4 wide.',
          run: async S => { S.r('rect', x, y, L * u, Wd * u, { stroke: '#fff', sw: 3, pop: true }); S.t('lw', x + L * u / 2, y - 14, '6 cm', { size: 16, fill: C.units, pop: true }); S.t('lh', x - 10, y + Wd * u / 2, '4 cm', { size: 16, fill: C.tens, anchor: 'end', pop: true }); await S.wait(600); } },
        lines({ title: 'Fill the rows', math: `Each row holds ${b(6)} squares: 6, 12, 18, 24`, hints: ['Tap each row to fill it with squares.'], say: 'Tap each row to fill it with squares. Watch the total grow by 6 each time.',
          run: async S => {
            for (let r = 0; r < Wd; r++) hitR(S, `hr${r}`, x, y + r * u, L * u, u);
            const got = new Set(); await S.ask((done, S) => { for (let r = 0; r < Wd; r++) S.tap(`hr${r}`, () => { if (got.has(r)) return; got.add(r); row(S, r); S.sfx('tick'); if (got.size === Wd) setTimeout(done, 700); }); });
            for (let r = 0; r < Wd; r++) if (!got.has(r)) row(S, r); await S.wait(300);
          } }),
        lines({ title: 'Length × width', math: `6 × 4 = ${b('24 cm²')}`, choices: [Q('4 rows of 6 squares. 6 × 4 = ?', [24, 10, 20], 24, '4 rows of 6 is 6 times 4, which is 24. Adding 6 + 4 only gives 10: that is not how many squares there are.')],
          say: 'There are 4 rows of 6. That is 6 times 4. How many squares is that?',
          run: async function (S) { await S.choose(this.choices[0]); S.t('s', 180, 200, '6 × 4 = 24 cm²', { size: 22, fill: C.good, pop: true }); S.sfx('good'); await S.wait(500); } }),
        { title: 'The answer', math: `Area = ${b('24 cm²')}`, say: 'The area is 24 square centimetres. Next time, no need to count every square: just do length times width.', run: async S => { await S.wait(200); } }
      ] };
  };
  E['shp-3'] = () => {
    const x = 74, y = 30, u = 20, Wd = 9, Hh = 7, nw = 4, nh = 3, ah = Hh - nh, bw = Wd - nw;
    const P = (a, c) => `${x + a * u} ${y + c * u}`;
    return { view: [360, 236], remember: 'Cut an L-shape into two rectangles. Find any missing sides, work out each area, then add them.',
      steps: [
        lines({ title: 'Cut it into rectangles', math: `Cut the L into ${k('A')} and ${k('B')}`, hints: ['Tap the dotted line to cut the shape.'], say: 'An L-shape is two rectangles stuck together. Tap the dotted line to cut it into rectangle A at the bottom and rectangle B on top.',
          run: async S => { S.p('L', `M ${P(0, 0)} L ${P(bw, 0)} L ${P(bw, nh)} L ${P(Wd, nh)} L ${P(Wd, Hh)} L ${P(0, Hh)} Z`, { stroke: '#fff', sw: 3, fill: 'rgba(255,255,255,.05)', draw: true });
            S.t('tW', x + Wd * u / 2, y + Hh * u + 16, '9 cm', { size: 15, fill: C.units, pop: true }); S.t('tH', x - 8, y + Hh * u / 2, '7 cm', { size: 15, fill: C.tens, anchor: 'end', pop: true });
            S.t('tnw', x + (bw + Wd) * u / 2, y + nh * u - 12, '4 cm', { size: 13, fill: C.mute, pop: true });
            S.l('guide', x, y + nh * u, x + bw * u, y + nh * u, { stroke: C.units, sw: 2, dash: '3 5' }); hitR(S, 'hcut', x - 6, y + nh * u - 16, bw * u + 12, 32);
            const cut = () => { S.del('guide'); S.del('hcut'); S.l('cut', x, y + nh * u, x + bw * u, y + nh * u, { stroke: C.pink, sw: 3, dash: '6 5', draw: true }); S.t('A', x + Wd * u / 2, y + (nh + ah / 2) * u, 'A', { size: 24, fill: C.tens, pop: true }); S.t('B', x + bw * u / 2, y + nh * u / 2, 'B', { size: 24, fill: C.units, pop: true }); S.sfx('tick'); };
            await S.ask((done, S) => S.tap('hcut', () => { cut(); setTimeout(done, 600); })); if (S.get('hcut')) cut(); await S.wait(300); } }),
        lines({ title: 'Find the missing sides', math: `A is ${b(7 - 3 + ' cm')} tall (7 − 3). B is ${b(9 - 4 + ' cm')} wide (9 − 4)`,
          choices: [Q('How tall is A?', [4, 3, 7], 4, 'The whole height is 7, and B takes the top 3. So A is 7 take away 3: 4 centimetres.'), Q('How wide is B?', [5, 4, 9], 5, 'The whole width is 9, but 4 is cut out of the corner. 9 take away 4 is 5 centimetres.')],
          say: 'Some sides are missing. Use the sides you know to work them out.',
          run: async function (S) { await S.choose(this.choices[0]); S.t('ah', x + Wd * u + 18, y + (nh + ah / 2) * u, '4', { size: 17, fill: C.tens, pop: true }); S.t('bh', x - 8, y + nh * u / 2, '3', { size: 15, fill: C.units, anchor: 'end', pop: true });
            await S.choose(this.choices[1]); S.t('bw', x + bw * u / 2, y - 12, '5', { size: 17, fill: C.units, pop: true }); await S.wait(400); } }),
        lines({ title: 'Area of each part', math: `A: 9 × 4 = ${b(36)} &nbsp; B: 5 × 3 = ${b(15)}`, choices: [Q('Area of A: 9 × 4 = ?', [36, 13, 45], 36, '9 times 4 is 36. Area is length times width, not length plus width.'), Q('Area of B: 5 × 3 = ?', [15, 8, 53], 15, '5 times 3 is 15.')],
          say: 'Now the area of each rectangle: length times width.',
          run: async function (S) { await S.choose(this.choices[0]); S.r('fA', x, y + nh * u, Wd * u, ah * u, { fill: C.tens, op: .35, pop: true }); S.t('vA', x + Wd * u / 2, y + (nh + ah / 2) * u + 24, '36', { size: 18, pop: true });
            await S.choose(this.choices[1]); S.r('fB', x, y, bw * u, nh * u, { fill: C.units, op: .35, pop: true }); S.t('vB', x + bw * u / 2, y + nh * u / 2 + 22, '15', { size: 18, pop: true }); S.sfx('tick'); await S.wait(400); } }),
        lines({ title: 'Add the parts', math: `36 + 15 = ${b('51 cm²')}`, choices: [Q('36 + 15 = ?', [51, 41, 61], 51, '36 plus 15: 36 plus 10 is 46, plus 5 is 51.')], say: 'Add the two areas together. What is 36 plus 15?',
          run: async function (S) { await S.choose(this.choices[0]); S.t('s', 300, 14, '36 + 15', { size: 16, pop: true }); S.t('s2', 300, 214, '= 51 cm²', { size: 22, fill: C.good, pop: true }); S.sfx('good'); await S.wait(400); } })
      ] };
  };
})(window.NB = window.NB || {});
