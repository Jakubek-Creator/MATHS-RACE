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
  E['add-1'] = () => {
    const a = 47, bb = 38; let g, A, B;
    const cubes = () => [...A.cubes, ...B.cubes];
    return { view: [360, 250], remember: 'Start with the units. If a column makes 10 or more, swap 10 units for 1 ten: write the units, carry the ten.',
      steps: [
        { title: 'Set it out', math: `Line up the ${k('tens')} and the ${k('units')}.`, say: "Here are 47 and 38 as blocks. The long rods are tens and the little cubes are units. To add in columns, line them up: units under units, tens under tens.",
          run: async S => { A = S.blocks('A', 14, 10, 4, 7); S.t('la', 100, 26, '47', { size: 18, label: true, fill: C.mute });
            B = S.blocks('B', 14, 150, 3, 8, { d: 300 }); S.t('lb', 100, 166, '38', { size: 18, label: true, fill: C.mute }); await S.wait(500); g = columns(S, { x: 320, a, b: bb, n: 2 }); await S.wait(600); } },
        { title: 'Add the units', math: `7 + 8 = ${b('15')} units`, say: 'Always start with the units. 7 units plus 8 units. Put them together and count: 15 units.',
          run: async S => { colHL(S, g, 0); S.sfx('tick');
            cubes().forEach((id, i) => { const e = S.get(id), x = +e.getAttribute('x'), y = +e.getAttribute('y'); S.to(id, 14 + i * 10.5 - x, 108 - y); });
            await S.wait(700); S.t('u15', 214, 112, '15 units', { size: 15, label: true, fill: C.units, pop: true }); await S.wait(500); } },
        { title: 'Swap 10 units for 1 ten', math: `15 = ${b('1 ten')} + ${b('5 units')}<br>Write ${k('5')}, carry ${k('1')}`, say: "15 units is too many for one column. 10 units make 1 ten, so we swap them. The 5 units stay: write 5 in the units column. The new ten is carried over to the tens column.",
          run: async S => { const cs = cubes(); colHL(S, g, 0);
            cs.slice(0, 10).forEach(id => S.fade(id, .15)); S.r('swap', 12, 104, 105, 14, { stroke: C.carry, sw: 2, rx: 4, pop: true }); await S.wait(600);
            S.del('swap'); cs.slice(0, 10).forEach(id => S.del(id)); S.del('u15');
            S.r('newrod', 54, 10, 7, 70, { fill: C.carry, stroke: C.ink, sw: 1, rx: 1.5, from: [-10, 100], pop: true }); S.sfx('good');
            cs.slice(10).forEach((id, i) => { const e = S.get(id), x = +e.getAttribute('x'), y = +e.getAttribute('y'); S.to(id, 120 + i * 10.5 - x, 108 - y); });
            await S.wait(500); write(S, g, 0, 5); await S.wait(300); carry(S, g, 1, 1); await S.wait(600); } },
        { title: 'Add the tens', math: `4 + 3 + ${k('1')} = ${b('8')} tens`, say: 'Now the tens column. 4 tens plus 3 tens, plus the 1 ten we carried, makes 8 tens. Write 8 in the tens column.',
          run: async S => { colHL(S, g, 1);
            [...B.rods].forEach((id, i) => S.to(id, 64 + i * 10 - (14 + i * 10), -140)); S.paint('newrod', C.tens); await S.wait(700);
            S.del('la'); S.del('lb'); S.t('t8', 140, 46, '8 tens', { size: 15, label: true, fill: C.tens, pop: true }); write(S, g, 1, 8); await S.wait(500); } },
        { title: 'Read the answer', math: `47 + 38 = ${b('85')}`, say: 'Read the answer row from left to right: 8 tens and 5 units. 85. So 47 plus 38 is 85.',
          run: async S => { S.hl(g.X(1) - 18, g.yR - 20, 70, 40); S.t('ans', 180, 220, '47 + 38 = 85', { size: 24, fill: C.good, pop: true }); S.sfx('good'); await S.wait(400); } }
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
      steps.push({ title: `Add the ${WORD[p]}`, math: up ? `${sum}<br>Write ${k(out)}, carry ${k(1)} to the ${WORD[p + 1]}` : `${sum} ${WORD[p]}. Write ${k(out)}`,
        say: `The ${WORD[p]} column: ${da} plus ${db}${kin ? `, plus the 1 we carried` : ''}, is ${tot}.` + (up ? ` That's 10 or more, so 10 ${WORD[p]} swap for 1 of the ${WORD[p + 1]}. Write ${out} and carry the 1.` : ` Write ${out}.`),
        run: async S => {
          colHL(S, g, p);
          // bring the bottom counters up beside the top ones
          for (let i = 0; i < db; i++) { const id = `B${p}_${i}`, e = S.get(id); if (!e) continue; const [tx, ty] = ch.pos(p, da + kin + i, 34); S.to(id, tx - +e.getAttribute('cx'), ty - +e.getAttribute('cy')); }
          await S.wait(600);
          if (up) {   // ten counters become one, which moves into the next column
            const ten = []; for (let i = 0; i < da; i++) ten.push(`A${p}_${i}`); for (let i = 0; i < kin; i++) ten.push(`K${p}_${i}`); for (let i = 0; i < db; i++) ten.push(`B${p}_${i}`);
            ten.slice(0, 10).forEach(id => S.fade(id, .15)); await S.wait(500);
            const [tx, ty] = ch.pos(p + 1, dig(a, p + 1), 34), [fx, fy] = ch.pos(p, 4, 34);
            S.c(`K${p + 1}_0`, tx, ty, 5.5, { fill: PLC[p + 1], stroke: C.carry, sw: 2.5, from: [fx - tx, fy - ty], pop: true }); S.sfx('good');
            ten.slice(0, 10).forEach(id => S.del(id));
          }
          write(S, g, p, out); if (up) { await S.wait(250); carry(S, g, p + 1, 1); }
          await S.wait(500);
        } });
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
        { title: 'Units: not enough', math: `2 − 7? We only have ${b('2')} units.`, say: "Units first: 2 take away 7. We can't take 7 units away from 2. We need more units.",
          run: async S => { colHL(S, g, 0); S.t('no', 120, 200, '2 − 7 ✗', { size: 16, fill: C.red, label: true, pop: true }); await S.wait(500); } },
        { title: 'Exchange a ten', math: `5 tens → ${k('4')} tens. 2 units → ${k('12')} units`, say: 'So we exchange. Take 1 ten from the tens column and swap it for 10 units. The tens go down from 5 to 4. The units go up from 2 to 12.',
          run: async S => { S.del('no'); colHL(S, g, 1);
            S.fade('A1_4', 0); const [fx, fy] = ch.pos(1, 4, 40);
            for (let i = 0; i < 10; i++) { const [tx, ty] = ch.pos(0, 2 + i, 40); S.c(`X0_${i}`, tx, ty, 5.5, { fill: C.units, stroke: C.carry, sw: 2, from: [fx - tx, fy - ty], pop: true, delay: i * 40 }); }
            S.sfx('good'); await S.wait(600);
            S.l('x5', g.X(1) - 9, g.yA + 9, g.X(1) + 9, g.yA - 9, { stroke: C.red, sw: 2.5, draw: true }); S.t('k1', g.X(1) + 2, g.yK, '4', { size: 16, fill: C.carry, pop: true });
            S.t('k0', g.X(0) - 14, g.yA - 4, '1', { size: 15, fill: C.carry, pop: true }); await S.wait(500); } },
        { title: 'Take away the units', math: `12 − 7 = ${b('5')}`, say: 'Now we have 12 units. 12 take away 7 is 5. Write 5 in the units column.',
          run: async S => { colHL(S, g, 0); const gone = ['A0_0', 'A0_1', ...Array.from({ length: 5 }, (_, i) => `X0_${i}`)]; gone.forEach(id => S.fade(id, .12)); await S.wait(600); write(S, g, 0, 5); await S.wait(300); } },
        { title: 'Take away the tens', math: `4 − 2 = ${b('2')}`, say: 'The tens column: we have 4 tens now, not 5. 4 take away 2 is 2.',
          run: async S => { colHL(S, g, 1); ['A1_2', 'A1_3'].forEach(id => S.fade(id, .12)); await S.wait(500); write(S, g, 1, 2); await S.wait(300); } },
        { title: 'Take away the hundreds', math: `3 − 1 = ${b('2')}`, say: 'The hundreds: 3 take away 1 is 2.',
          run: async S => { colHL(S, g, 2); S.fade('A2_2', .12); await S.wait(400); write(S, g, 2, 2); await S.wait(300); } },
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
      steps.push({ title: `Multiply the ${place}`, math: z ? `${d} × ${m} = ${d * m}, so ${p} × ${m} = ${b(prods[i])}` : `${p} × ${m} = ${b(prods[i])}`,
        say: z ? `${p} times ${m}. Think ${d} times ${m}, which is ${d * m}. These are ${place}, so ${d * m} ${place} is ${prods[i]}.` : `Now the units: ${p} times ${m} is ${prods[i]}.`,
        run: async S => { S.hl(g.cells[i].x - 4, 34, g.cells[i].w + 8, 132); g.fill(i, prods[i], cols[i]); S.sfx('good'); await S.wait(600); } });
    });
    steps.push({ title: 'Add the parts', math: `${prods.map(p => b(p)).join(' + ')} = ${b(tot)}`, say: `Add the parts together: ${prods.join(' plus ')} is ${tot}.`,
      run: async S => { S.hl(null); S.t('sum', 180, 196, `${prods.join(' + ')} = ${tot}`, { size: 22, fill: C.good, pop: true }); S.sfx('good'); await S.wait(500); } });
    steps.push({ title: 'The answer', math: `${a} × ${m} = ${b(tot)}`, say: `So ${a} times ${m} is ${tot}. Split, multiply each part, then add.`,
      run: async S => { S.t('ans', 180, 228, `${a} × ${m} = ${tot}`, { size: 24, fill: C.units, pop: true }); await S.wait(300); } });
    return { view: [360, 244], steps, remember: 'Split the big number into hundreds, tens and units. Multiply each part, then add the answers.' };
  }
  E['mult-1'] = () => multBy1(47, 6);
  E['mult-3'] = () => multBy1(324, 6);
  E['mult-2'] = () => {   // 34 × 26 with the grid method
    const A = [30, 4], B = [20, 6], P = [[600, 80], [180, 24]]; const x = 70, y = 50, W = 270, H = 150, w1 = 200, h1 = 100;
    const cell = (S, r, c, col) => { const cx = c ? x + w1 + 4 : x, cy = r ? y + h1 + 4 : y, cw = c ? W - w1 - 4 : w1, chh = r ? H - h1 - 4 : h1; S.r(`f${r}${c}`, cx, cy, cw, chh, { fill: col, op: .35, rx: 4, pop: true }); S.t(`v${r}${c}`, cx + cw / 2, cy + chh / 2, String(P[r][c]), { size: cw < 60 || chh < 50 ? 17 : 24, pop: true }); };
    return { view: [360, 250], remember: 'Split both numbers into tens and units. Multiply every part by every part, then add all four answers.',
      steps: [
        { title: 'Split both numbers', math: `34 = ${b(30)} + ${b(4)} &nbsp; 26 = ${b(20)} + ${b(6)}`, say: '34 times 26. Split both numbers: 34 is 30 and 4, and 26 is 20 and 6. Draw a grid with a box for every pair.',
          run: async S => { S.t('q', 180, 14, '34 × 26', { size: 18, fill: C.mute, label: true });
            [[x, y, w1, h1], [x + w1 + 4, y, W - w1 - 4, h1], [x, y + h1 + 4, w1, H - h1 - 4], [x + w1 + 4, y + h1 + 4, W - w1 - 4, H - h1 - 4]].forEach(([a, bb, c, d], i) => S.r(`g${i}`, a, bb, c, d, { stroke: 'rgba(255,255,255,.5)', sw: 2, dash: '5 4', rx: 4, pop: true, delay: i * 100 }));
            S.t('a0', x + w1 / 2, y - 14, '30', { size: 19, fill: C.tens, pop: true }); S.t('a1', x + w1 + 4 + (W - w1 - 4) / 2, y - 14, '4', { size: 19, fill: C.units, pop: true });
            S.t('b0', x - 14, y + h1 / 2, '20', { size: 19, fill: C.tens, anchor: 'end', pop: true }); S.t('b1', x - 14, y + h1 + 4 + (H - h1 - 4) / 2, '6', { size: 19, fill: C.units, anchor: 'end', pop: true }); await S.wait(700); } },
        { title: 'Tens × tens', math: `30 × 20 → 3 × 2 = 6, two zeros: ${b(600)}`, say: '30 times 20. Do 3 times 2, which is 6, then put the two zeros back on: 600.', run: async S => { S.hl(x - 3, y - 3, w1 + 6, h1 + 6); cell(S, 0, 0, C.hund); S.sfx('good'); await S.wait(500); } },
        { title: 'Units × tens', math: `4 × 20 = ${b(80)} &nbsp; 30 × 6 = ${b(180)}`, say: '4 times 20 is 80. And 30 times 6: 3 times 6 is 18, with a zero, 180.', run: async S => { S.hl(null); cell(S, 0, 1, C.tens); await S.wait(500); cell(S, 1, 0, C.tens); S.sfx('good'); await S.wait(500); } },
        { title: 'Units × units', math: `4 × 6 = ${b(24)}`, say: 'The last box: 4 times 6 is 24.', run: async S => { S.hl(x + w1 + 1, y + h1 + 1, W - w1 + 2, H - h1 + 2); cell(S, 1, 1, C.units); S.sfx('good'); await S.wait(500); } },
        { title: 'Add all four', math: `600 + 80 + 180 + 24 = ${b(884)}`, say: 'Add all four answers: 600 plus 80 plus 180 plus 24 is 884. So 34 times 26 is 884.',
          run: async S => { S.hl(null); S.t('sum', 180, 226, '600 + 80 + 180 + 24 = 884', { size: 19, fill: C.good, pop: true }); S.sfx('good'); await S.wait(400); } }
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
      steps.push({ title: `Divide${first ? '' : ' again'}`, math: `How many ${d}s in ${b(cc)}? ${k(qq)}<br>${qq} × ${d} = ${prod}`, say: `${first && ii > 0 ? `${ds[0]} is too small to share by ${d}, so we use ${cc}. ` : ''}How many ${d}s go into ${cc}? Look at the table: ${qq} times ${d} is ${prod}. So write ${qq} on top.`,
        run: async S => { ladder(S, qq || 0); S.t(`q${ii}`, x, top - 14, String(qq), { size: 28, fill: C.good, pop: true }); S.sfx('tick'); await S.wait(300);
          S.t(`m${rr}`, x + 9, y, String(prod), { size: 24, fill: C.tens, pop: true, anchor: 'end' }); S.t(`mm${rr}`, x - 9 - String(prod).length * 15, y, '−', { size: 20, fill: C.red, pop: true }); await S.wait(500); } });
      steps.push({ title: nextDigit != null ? 'Subtract and bring down' : 'Subtract', math: `${cc} − ${prod} = ${b(left)}${nextDigit != null ? `<br>Bring down the ${k(nextDigit)}: ${b(left * 10 + nextDigit)}` : left ? `` : `<br>Nothing left over`}`,
        say: `Take ${prod} away from ${cc}: that leaves ${left}.` + (nextDigit != null ? ` Bring down the next digit, ${nextDigit}, to make ${left * 10 + nextDigit}.` : left ? ` ${left} is left over.` : ' Nothing is left over, so we are finished.'),
        run: async S => { ladder(S, 0); S.l(`ln${rr}`, x - 24, y + 16, x + 14, y + 16, { sw: 2.5, draw: true }); await S.wait(300);
          S.t(`l${rr}`, x + 9, y + 36, String(left), { size: 24, fill: C.units, anchor: 'end', pop: true }); await S.wait(300);
          if (nextDigit != null) { S.t(`bd${rr}`, X(ii + 1), y + 36, String(nextDigit), { size: 24, fill: C.carry, from: [0, -(y + 36 - top - 30)], pop: false }); S.l(`ar${rr}`, X(ii + 1), top + 50, X(ii + 1), y + 18, { stroke: C.carry, sw: 1.5, dash: '3 4', draw: true }); }
          await S.wait(500); } });
      rem = left; i++; if (i < ds.length) cur = left * 10 + ds[i]; row++;
    }
    const ans = Math.floor(N / d);
    steps.push({ title: 'Read the answer', math: `${N} ÷ ${d} = ${b(ans)}${rem ? ` r ${rem}` : ''}<br>Check: ${ans} × ${d} = ${ans * d} ✓`, say: `The answer is on top of the bus stop: ${ans}. Check by multiplying back: ${ans} times ${d} is ${ans * d}.`,
      run: async S => { ladder(S, 0); S.hl(X(qStart) - 16, top - 30, (ds.length - qStart) * cw + 6, 32); S.sfx('good'); await S.wait(300); } });
    return { view: [360, 70 + (row + 1) * 64], steps, remember: 'Divide, multiply, subtract, bring down. Then do it again until every digit is used.' };
  }
  E['div-1'] = () => longDiv(96, 4);
  E['div-2'] = () => longDiv(852, 4);
  E['div-3'] = () => longDiv(1365, 5);

  /* ======================= ALGEBRA (a balance) ======================= */
  function balance(S) {
    S.p('stand', 'M 180 214 L 165 240 L 195 240 Z', { fill: '#6b737b', stroke: '#6b737b', sw: 2 });
    S.l('beam', 40, 214, 320, 214, { stroke: '#aab4bd', sw: 6 });
    S.r('panL', 40, 206, 120, 8, { fill: '#8f969d', rx: 3 }); S.r('panR', 200, 206, 120, 8, { fill: '#8f969d', rx: 3 });
  }
  const cube = (S, id, side, i, o = {}) => { const x = (side ? 210 : 50) + (i % 8) * 13, y = 192 - Math.floor(i / 8) * 13; return S.r(id, x, y, 11, 11, { fill: C.units, stroke: C.ink, sw: 1, rx: 2, pop: true, delay: (o.d || 0) + i * 30 }); };
  const bag = (S, id, i, o = {}) => { const x = 46 + i * 31, y = 160; S.r(id, x, y, 28, 32, { fill: C.pink, stroke: C.ink, sw: 1.5, rx: 8, pop: true, delay: o.d || 0 }); return S.t(id + 't', x + 14, y + 17, 'x', { size: 20, delay: o.d || 0, pop: true }); };
  const eqTop = (S, id, str, o = {}) => S.t(id, 180, 28, str, { size: 26, pop: true, ...o });
  E['alg-1'] = () => ({ view: [360, 246], remember: 'An equation is a balance. Do the same thing to both sides until x is on its own.',
    steps: [
      { title: 'Picture a balance', math: `x + 4 = 11`, say: 'x plus 4 equals 11. Think of a balance. On the left is a bag with x cubes inside, plus 4 cubes. On the right are 11 cubes. Both sides weigh the same.',
        run: async S => { balance(S); bag(S, 'x', 0); for (let i = 0; i < 4; i++) cube(S, `L${i}`, 0, i + 3); for (let i = 0; i < 11; i++) cube(S, `R${i}`, 1, i, { d: 300 }); eqTop(S, 'e1', 'x + 4 = 11'); await S.wait(800); } },
      { title: 'Undo the + 4', math: `Take ${k('4')} from both sides`, say: 'To get x on its own, undo the plus 4. Take 4 cubes away from the left, and 4 away from the right, so it still balances.',
        run: async S => { for (let i = 0; i < 4; i++) { S.to(`L${i}`, 0, -120); S.fade(`L${i}`, 0); S.to(`R${10 - i}`, 0, -120); S.fade(`R${10 - i}`, 0); } S.sfx('tick'); eqTop(S, 'e1', 'x + 4 − 4 = 11 − 4', { size: 22 }); await S.wait(800); } },
      { title: 'Work it out', math: `x = 11 − 4 = ${b(7)}`, say: 'Now the bag is on its own, and it balances 7 cubes. So x is 7.',
        run: async S => { eqTop(S, 'e1', 'x = 7', { fill: C.good }); S.hl(204, 140, 112, 66); S.sfx('good'); await S.wait(500); } },
      { title: 'Check', math: `7 + 4 = 11 ✓`, say: 'Check by putting 7 back in: 7 plus 4 is 11. It matches, so x equals 7.',
        run: async S => { S.hl(null); S.t('chk', 180, 64, '7 + 4 = 11 ✓', { size: 20, fill: C.good, pop: true }); await S.wait(400); } }
    ] });
  E['alg-2'] = () => ({ view: [360, 246], remember: '3x means 3 lots of x. To undo times, divide both sides.',
    steps: [
      { title: 'Picture a balance', math: `3x = 15`, say: '3x equals 15. 3x means 3 times x: three bags, each with the same number of cubes. They balance 15 cubes.',
        run: async S => { balance(S); for (let i = 0; i < 3; i++) bag(S, `x${i}`, i, { d: i * 150 }); for (let i = 0; i < 15; i++) cube(S, `R${i}`, 1, i, { d: 300 }); eqTop(S, 'e1', '3x = 15'); await S.wait(800); } },
      { title: 'Undo the × 3', math: `Share both sides into ${k('3')} equal groups`, say: 'To undo times 3, divide by 3. Share the 15 cubes into 3 equal groups, one for each bag.',
        run: async S => { for (let i = 0; i < 15; i++) { const gi = Math.floor(i / 5), e = S.get(`R${i}`); S.to(`R${i}`, 214 + gi * 36 + (i % 5 % 2) * 13 - +e.getAttribute('x'), 154 + Math.floor(i % 5 / 2) * 13 - +e.getAttribute('y')); } S.sfx('tick'); eqTop(S, 'e1', '3x ÷ 3 = 15 ÷ 3', { size: 22 }); await S.wait(900); } },
      { title: 'Work it out', math: `x = 15 ÷ 3 = ${b(5)}`, say: 'Each group has 5 cubes, so each bag holds 5. x is 5.', run: async S => { eqTop(S, 'e1', 'x = 5', { fill: C.good }); S.sfx('good'); await S.wait(500); } },
      { title: 'Check', math: `3 × 5 = 15 ✓`, say: 'Check: 3 times 5 is 15. It matches.', run: async S => { S.t('chk', 180, 64, '3 × 5 = 15 ✓', { size: 20, fill: C.good, pop: true }); await S.wait(400); } }
    ] });
  E['alg-3'] = () => ({ view: [360, 246], remember: 'Two steps: undo the + or − first, then undo the ×. Always do the same to both sides.',
    steps: [
      { title: 'Picture a balance', math: `3x + 5 = 20`, say: '3x plus 5 equals 20. On the left: 3 bags of x and 5 cubes. On the right: 20 cubes. Two things were done to x, so we undo them, last one first.',
        run: async S => { balance(S); for (let i = 0; i < 3; i++) bag(S, `x${i}`, i, { d: i * 120 }); for (let i = 0; i < 5; i++) S.r(`L${i}`, 142 + (i % 2) * 13, 192 - Math.floor(i / 2) * 13, 11, 11, { fill: C.units, stroke: C.ink, sw: 1, rx: 2, pop: true, delay: i * 30 }); for (let i = 0; i < 20; i++) cube(S, `R${i}`, 1, i, { d: 300 }); eqTop(S, 'e1', '3x + 5 = 20'); await S.wait(800); } },
      { title: 'Undo the + 5', math: `Take ${k(5)} from both sides: 3x = ${b(15)}`, say: 'First undo the plus 5. Take 5 cubes off both sides. Now 3 bags balance 15 cubes.',
        run: async S => { for (let i = 0; i < 5; i++) { S.to(`L${i}`, 0, -120); S.fade(`L${i}`, 0); S.to(`R${19 - i}`, 0, -120); S.fade(`R${19 - i}`, 0); } S.sfx('tick'); eqTop(S, 'e1', '3x = 15'); await S.wait(800); } },
      { title: 'Undo the × 3', math: `x = 15 ÷ 3 = ${b(5)}`, say: 'Now undo times 3: share 15 into 3 groups. Each bag holds 5, so x is 5.', run: async S => { eqTop(S, 'e1', 'x = 5', { fill: C.good }); S.hl(204, 150, 112, 56); S.sfx('good'); await S.wait(500); } },
      { title: 'Check', math: `3 × 5 + 5 = 20 ✓`, say: 'Check: 3 times 5 is 15, plus 5 is 20. It matches.', run: async S => { S.hl(null); S.t('chk', 180, 64, '3 × 5 + 5 = 20 ✓', { size: 20, fill: C.good, pop: true }); await S.wait(400); } }
    ] });

  /* ======================= FRACTIONS (bar model) ======================= */
  function bar(S, pre, x, y, w, h, parts, shade, col, o = {}) {
    const pw = w / parts;
    for (let i = 0; i < parts; i++) S.r(`${pre}${i}`, x + i * pw, y, pw, h, { fill: i < shade ? col : 'rgba(255,255,255,.06)', stroke: '#fff', sw: 2, rx: 2, pop: !o.still, delay: (o.d || 0) + i * 70 });
  }
  E['frac-1'] = () => ({ view: [360, 230], remember: 'To find a fraction of an amount: divide by the bottom number, then times by the top number.',
    steps: [
      { title: 'What it means', math: `${NB.fracHTML('{f:3/4}')} of 20: cut 20 into ${k(4)} equal parts, take ${k(3)}`, say: 'Three quarters of 20. The bottom number, 4, tells us to cut 20 into 4 equal parts. The top number, 3, tells us how many parts we take.',
        run: async S => { S.r('whole', 30, 60, 300, 50, { fill: 'rgba(255,255,255,.06)', stroke: '#fff', sw: 2, rx: 3, pop: true }); S.t('w20', 180, 85, '20', { size: 26, pop: true }); S.t('lbl', 180, 34, 'the whole: 20', { size: 14, label: true, fill: C.mute }); await S.wait(700); } },
      { title: 'Divide by the bottom', math: `20 ÷ ${k(4)} = ${b(5)} in each part`, say: 'Divide by the bottom number. 20 divided by 4 is 5. Each quarter is 5.',
        run: async S => { S.del('w20'); for (let i = 1; i < 4; i++) S.l(`cut${i}`, 30 + i * 75, 56, 30 + i * 75, 114, { sw: 3, draw: true }); await S.wait(500);
          for (let i = 0; i < 4; i++) S.t(`p${i}`, 67 + i * 75, 85, '5', { size: 24, pop: true, delay: i * 150 }); for (let i = 0; i < 20; i++) S.c(`dot${i}`, 45 + Math.floor(i / 5) * 75 + (i % 5) * 11, 128, 4, { fill: C.units, pop: true, delay: 600 + i * 30 }); await S.wait(900); } },
      { title: 'Times by the top', math: `5 × ${k(3)} = ${b(15)}`, say: 'Now times by the top number. We take 3 parts: 5 times 3 is 15.',
        run: async S => { for (let i = 0; i < 3; i++) S.r(`sh${i}`, 30 + i * 75, 60, 75, 50, { fill: C.carry, op: .55, rx: 2, pop: true, delay: i * 200 }); S.sfx('good'); await S.wait(800); S.t('sum', 142, 160, '5 + 5 + 5 = 15', { size: 20, fill: C.good, pop: true }); await S.wait(400); } },
      { title: 'The answer', math: `${NB.fracHTML('{f:3/4}')} of 20 = ${b(15)}`, say: 'So three quarters of 20 is 15.', run: async S => { S.t('ans', 180, 204, '¾ of 20 = 15', { size: 24, fill: C.units, pop: true }); await S.wait(300); } }
    ] });
  E['frac-2'] = () => ({ view: [360, 230], remember: 'Equivalent fractions: whatever you do to the bottom, do the same to the top.',
    steps: [
      { title: 'Same amount, different slices', math: `${NB.fracHTML('{f:6/8}')} = ${NB.fracHTML('{f:?/4}')}`, say: '6 eighths is the same as how many quarters? Here is 6 eighths: a bar cut into 8 slices with 6 coloured.',
        run: async S => { bar(S, 'e', 30, 40, 300, 46, 8, 6, C.carry); S.t('l8', 180, 20, '6 eighths', { size: 15, label: true, fill: C.mute }); await S.wait(800); } },
      { title: 'Compare the bottoms', math: `8 ÷ ${k(2)} = 4`, say: 'Compare the bottom numbers: 8 and 4. 8 divided by 2 is 4. So every 2 small slices join to make 1 big slice.',
        run: async S => { bar(S, 'q', 30, 130, 300, 46, 4, 0, C.carry); S.t('l4', 180, 110, 'quarters', { size: 15, label: true, fill: C.mute }); await S.wait(400);
          for (let i = 0; i < 4; i++) S.p(`br${i}`, `M ${34 + i * 75} 92 Q ${67 + i * 75} 112 ${101 + i * 75} 92`, { stroke: C.units, sw: 2, draw: true }); await S.wait(700); } },
      { title: 'Same to the top', math: `6 ÷ ${k(2)} = ${b(3)}`, say: 'Do the same to the top: 6 divided by 2 is 3. 3 quarters are coloured: exactly the same amount of the bar.',
        run: async S => { for (let i = 0; i < 3; i++) S.r(`qs${i}`, 30 + i * 75, 130, 75, 46, { fill: C.carry, rx: 2, pop: true, delay: i * 200 }); S.sfx('good'); await S.wait(800); } },
      { title: 'The answer', math: `${NB.fracHTML('{f:6/8}')} = ${b(NB.fracHTML('{f:3/4}'))}`, say: 'So 6 eighths is the same as 3 quarters.', run: async S => { S.t('ans', 180, 208, '6/8 = 3/4', { size: 24, fill: C.units, pop: true }); await S.wait(300); } }
    ] });
  E['frac-3'] = () => ({ view: [360, 250], remember: 'You can only add fractions with the same bottom number. Make the bottoms match, then add the tops.',
    steps: [
      { title: 'Different slices', math: `${NB.fracHTML('{f:1/2}')} + ${NB.fracHTML('{f:1/3}')}`, say: 'A half plus a third. The slices are different sizes, so we can\'t just add them. First we make them the same size.',
        run: async S => { bar(S, 'h', 30, 30, 300, 40, 2, 1, C.carry); bar(S, 't', 30, 100, 300, 40, 3, 1, C.tens, { d: 300 }); S.t('lh', 345, 50, '½', { size: 20, fill: C.carry }); S.t('lt', 345, 120, '⅓', { size: 20, fill: C.tens }); await S.wait(800); } },
      { title: 'Find a common bottom', math: `2 and 3 both go into ${k(6)}`, say: 'Find a number that 2 and 3 both go into. 6 works. Cut both bars into sixths.',
        run: async S => { for (let i = 1; i < 6; i++) { if (i % 3) S.l(`ch${i}`, 30 + i * 50, 30, 30 + i * 50, 70, { stroke: '#fff', sw: 1.5, dash: '3 3', draw: true }); if (i % 2) S.l(`ct${i}`, 30 + i * 50, 100, 30 + i * 50, 140, { stroke: '#fff', sw: 1.5, dash: '3 3', draw: true }); } await S.wait(700);
          S.t('h6', 345, 50, '3⁄6', { size: 16, fill: C.carry, pop: true }); S.t('t6', 345, 120, '2⁄6', { size: 16, fill: C.tens, pop: true }); await S.wait(400); } },
      { title: 'Add the tops', math: `${NB.fracHTML('{f:3/6}')} + ${NB.fracHTML('{f:2/6}')} = ${b(NB.fracHTML('{f:5/6}'))}`, say: 'Now the slices match. 3 sixths plus 2 sixths is 5 sixths. Add the tops, keep the bottom the same.',
        run: async S => { for (let i = 0; i < 6; i++) S.r(`s${i}`, 30 + i * 50, 170, 50, 40, { fill: i < 3 ? C.carry : i < 5 ? C.tens : 'rgba(255,255,255,.06)', stroke: '#fff', sw: 2, rx: 2, pop: true, delay: i * 120 }); S.sfx('good'); await S.wait(900); S.t('ans', 180, 234, '½ + ⅓ = 5⁄6', { size: 22, fill: C.units, pop: true }); await S.wait(300); } }
    ] });

  /* ======================= ANGLES ======================= */
  E['ang-1'] = () => {
    const cx = 120, cy = 124, R = 86;
    const arrow = (S, deg) => { S.get('arr') || S.p('arr', `M ${cx} ${cy} L ${cx} ${cy - R + 14} M ${cx - 9} ${cy - R + 28} L ${cx} ${cy - R + 12} L ${cx + 9} ${cy - R + 28}`, { stroke: C.units, sw: 5 }); const e = S.get('arr'); e.style.transformOrigin = `${cx}px ${cy}px`; e.style.transformBox = 'view-box'; e.style.transform = `rotate(${deg}deg)`; };
    const arc = (S, id, d0, d1, col) => { const p = d => [cx + Math.sin(d * Math.PI / 180) * 46, cy - Math.cos(d * Math.PI / 180) * 46], [x0, y0] = p(d0), [x1, y1] = p(d1); S.p(id, `M ${x0} ${y0} A 46 46 0 0 1 ${x1} ${y1}`, { stroke: col, sw: 4, draw: true }); };
    return { view: [360, 236], remember: 'A quarter turn is a right angle: 90°. Count the quarter turns and times by 90.',
      steps: [
        { title: 'A quarter turn', math: `1 quarter turn = ${b('90°')} (a right angle)`, say: 'Start facing North. A quarter turn is a right angle, like the corner of a page. It measures 90 degrees.',
          run: async S => { S.c('ring', cx, cy, R, { stroke: 'rgba(255,255,255,.3)', sw: 2, pop: true }); [['N', 0], ['E', 90], ['S', 180], ['W', 270]].forEach(([l, d]) => S.t(`c${l}`, cx + Math.sin(d * Math.PI / 180) * (R + 16), cy - Math.cos(d * Math.PI / 180) * (R + 16), l, { size: 18, fill: '#fff', pop: true }));
            arrow(S, 0); await S.wait(500); arrow(S, 90); arc(S, 'a1', 0, 90, C.tens); S.r('sq', cx, cy - 16, 16, 16, { stroke: C.tens, sw: 2 }); await S.wait(800); arrow(S, 0); await S.wait(500); } },
        { title: 'Count the quarter turns', math: `North → South, clockwise: ${k(2)} quarter turns`, say: 'Now turn clockwise, the way a clock\'s hands go, from North to South. Count each quarter turn: 1, 2. That\'s 2 quarter turns.',
          run: async S => { S.del('sq'); arrow(S, 90); arc(S, 'a1', 0, 90, C.units); S.t('n1', cx + 62, cy - 62, '1', { size: 20, fill: C.units, pop: true }); S.sfx('tick'); await S.wait(900); arrow(S, 180); arc(S, 'a2', 90, 180, C.units); S.t('n2', cx + 62, cy + 62, '2', { size: 20, fill: C.units, pop: true }); S.sfx('tick'); await S.wait(800); } },
        { title: 'Times by 90', math: `2 × 90° = ${b('180°')}`, say: 'Each quarter turn is 90 degrees, so 2 quarter turns is 2 times 90: 180 degrees. That\'s a half turn.',
          run: async S => { S.t('m', 280, 90, '90° + 90°', { size: 20, pop: true }); await S.wait(400); S.t('r', 280, 130, '= 180°', { size: 26, fill: C.good, pop: true }); S.sfx('good'); await S.wait(400); } },
        { title: 'The answer', math: `North to South clockwise = ${b('180°')}, a half turn`, say: 'So turning from North to South is a turn of 180 degrees.', run: async S => { S.t('ans', 280, 176, 'half turn', { size: 16, label: true, fill: C.units, pop: true }); await S.wait(300); } }
      ] };
  };
  E['ang-2'] = () => {
    const ox = 180, oy = 170, R = 130, ray = (S, id, d, col, o = {}) => S.l(id, ox, oy, ox + Math.cos(d * Math.PI / 180) * R, oy - Math.sin(d * Math.PI / 180) * R, { stroke: col || '#fff', sw: 3, draw: true, ...o });
    const lab = (S, id, d, t, col) => S.t(id, ox + Math.cos(d * Math.PI / 180) * 64, oy - Math.sin(d * Math.PI / 180) * 64, t, { size: 18, fill: col, pop: true });
    return { view: [360, 236], remember: 'Angles on a straight line add up to 180°. Angles all the way round a point add up to 360°.',
      steps: [
        { title: 'A straight line is 180°', math: `Angles on a straight line add to ${b('180°')}`, say: 'Here is a straight line, with angles of 65, 40 and x degrees sitting on it. A straight line is a half turn, so the angles on it always add up to 180 degrees.',
          run: async S => { S.l('base', 30, oy, 330, oy, { sw: 4, draw: true }); await S.wait(300); ray(S, 'r1', 65); ray(S, 'r2', 105); await S.wait(500); lab(S, 'l1', 32, '65°', C.tens); lab(S, 'l2', 85, '40°', C.units); lab(S, 'l3', 142, 'x', C.pink);
            S.p('half', `M ${ox + 40} ${oy} A 40 40 0 0 0 ${ox - 40} ${oy}`, { stroke: 'rgba(255,255,255,.35)', sw: 2, draw: true }); await S.wait(600); } },
        { title: 'Add the angles you know', math: `65 + 40 = ${b(105)}`, say: 'Add up the angles you know: 65 plus 40 is 105.', run: async S => { S.t('s1', 300, 30, '65 + 40 = 105', { size: 18, pop: true }); S.sfx('tick'); await S.wait(500); } },
        { title: 'Take away from 180', math: `180 − 105 = ${b(75)}`, say: 'x gets whatever is left: 180 take away 105 is 75.', run: async S => { S.t('s2', 300, 60, '180 − 105 = 75', { size: 18, fill: C.good, pop: true }); S.sfx('good'); await S.wait(400); } },
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
        { title: 'Every triangle: 180°', math: `Tear off the corners: they make a ${k('straight line')}`, say: 'Here is a fact about every triangle ever drawn: its three angles add up to 180 degrees. Tear off the three corners and put their points together. They make a straight line, and a straight line is 180 degrees.',
          run: async S => { S.p('tri', `M ${A} L ${B} L ${Cc} Z`, { stroke: '#fff', sw: 3, draw: true }); await S.wait(500);
            wedge(S, 'wA', A, 0, 70, C.tens); wedge(S, 'wB', B, 130, 180, C.units); wedge(S, 'wC', Cc, 250, 310, C.pink); await S.wait(400);
            S.t('a', A[0] + 44, A[1] - 14, '70°', { size: 15, fill: C.tens, pop: true }); S.t('b', B[0] - 44, B[1] - 12, '50°', { size: 15, fill: C.units, pop: true }); S.t('c', Cc[0] + 2, Cc[1] + 46, 'x', { size: 16, fill: C.pink, pop: true }); await S.wait(500);
            S.l('line', 236, O[1], 340, O[1], { stroke: '#fff', sw: 2, draw: true }); S.t('l180', 288, 236, '180°', { size: 12, fill: C.mute, label: true }); tear(S, true); await S.wait(1200); } },
        { title: 'Add the two you know', math: `70 + 50 = ${b(120)}`, say: 'Back to our triangle. Add the two angles we know: 70 plus 50 is 120.', run: async S => { tear(S, false); S.t('s1', 290, 60, '70 + 50 = 120', { size: 17, pop: true }); S.sfx('tick'); await S.wait(600); } },
        { title: 'Take away from 180', math: `180 − 120 = ${b(60)}`, say: 'The third angle gets whatever is left from 180: 180 take away 120 is 60.', run: async S => { S.t('s2', 290, 90, '180 − 120 = 60', { size: 17, fill: C.good, pop: true }); S.sfx('good'); await S.wait(400); } },
        { title: 'Answer and check', math: `x = ${b('60°')}. Check: 70 + 50 + 60 = 180 ✓`, say: 'So x is 60 degrees. Check: 70 plus 50 plus 60 is 180.', run: async S => { S.del('c'); S.t('c', Cc[0] + 2, Cc[1] + 46, '60°', { size: 15, fill: C.good, pop: true }); await S.wait(400); } }
      ] };
  };

  /* ======================= SHAPES ======================= */
  const U = 22;   // pixels per cm on shape pictures
  E['shp-1'] = () => {
    const x = 60, y = 50, w = 9 * U, h = 5 * U;
    return { view: [360, 236], remember: 'Perimeter is the distance all the way round. For a rectangle: (long side + short side) × 2.',
      steps: [
        { title: 'What perimeter means', math: `Perimeter = the distance ${k('all the way round')}`, say: 'Perimeter is the distance all the way round the edge of a shape, like driving one lap round a track. This rectangle is 9 centimetres long and 5 centimetres wide.',
          run: async S => { S.r('rect', x, y, w, h, { fill: 'rgba(94,195,232,.15)', stroke: '#fff', sw: 3, pop: true }); S.t('lw', x + w / 2, y - 14, '9 cm', { size: 16, fill: C.units, pop: true }); S.t('lh', x - 10, y + h / 2, '5 cm', { size: 16, fill: C.tens, anchor: 'end', pop: true });
            S.c('car', x, y, 7, { fill: C.pink, pop: true }); await S.wait(400); S.to('car', w, 0); await S.wait(600); S.to('car', w, h); await S.wait(500); S.to('car', 0, h); await S.wait(600); S.to('car', 0, 0); await S.wait(500); } },
        { title: 'Half way round', math: `9 + 5 = ${b(14)}`, say: 'Half way round is one long side and one short side: 9 plus 5 is 14.',
          run: async S => { S.p('half', `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h}`, { stroke: C.units, sw: 6, draw: true }); S.t('s1', 180, 196, '9 + 5 = 14', { size: 20, pop: true }); S.sfx('tick'); await S.wait(700); } },
        { title: 'Double it', math: `14 × 2 = ${b(28)} cm`, say: 'The other half is exactly the same, so double it: 14 times 2 is 28.',
          run: async S => { S.p('half2', `M ${x + w} ${y + h} L ${x} ${y + h} L ${x} ${y}`, { stroke: C.carry, sw: 6, draw: true }); S.t('s2', 180, 222, '14 × 2 = 28 cm', { size: 20, fill: C.good, pop: true }); S.sfx('good'); await S.wait(700); } },
      ] };
  };
  E['shp-2'] = () => {
    const x = 70, y = 40, L = 6, Wd = 4, u = 28;
    return { view: [360, 236], remember: 'Area is how many squares cover the shape. Rectangle: length × width. Write the answer in cm².',
      steps: [
        { title: 'What area means', math: `Area = how many ${k('1 cm squares')} cover the shape`, say: 'Area is how much flat space a shape covers. We measure it in squares, each 1 centimetre by 1 centimetre. This rectangle is 6 centimetres long and 4 wide.',
          run: async S => { S.r('rect', x, y, L * u, Wd * u, { stroke: '#fff', sw: 3, pop: true }); S.t('lw', x + L * u / 2, y - 14, '6 cm', { size: 16, fill: C.units, pop: true }); S.t('lh', x - 10, y + Wd * u / 2, '4 cm', { size: 16, fill: C.tens, anchor: 'end', pop: true }); await S.wait(600); } },
        { title: 'One row', math: `One row holds ${b(6)} squares`, say: 'Fill the first row with squares. One row along the 6 centimetre side holds 6 squares.',
          run: async S => { for (let i = 0; i < L; i++) S.r(`q0_${i}`, x + i * u + 2, y + 2, u - 4, u - 4, { fill: C.units, op: .8, rx: 3, pop: true, delay: i * 90 }); S.sfx('tick'); await S.wait(800); } },
        { title: 'Count the rows', math: `${b(4)} rows of 6`, say: 'The width is 4 centimetres, so 4 rows fit.',
          run: async S => { for (let r = 1; r < Wd; r++) for (let i = 0; i < L; i++) S.r(`q${r}_${i}`, x + i * u + 2, y + r * u + 2, u - 4, u - 4, { fill: [C.units, C.tens, C.hund, C.carry][r], op: .8, rx: 3, pop: true, delay: r * 260 + i * 40 }); await S.wait(1200); } },
        { title: 'Length × width', math: `6 × 4 = ${b('24 cm²')}`, say: '4 rows of 6 is 6 times 4: 24 squares. No need to count them one by one. The area is 24 square centimetres.',
          run: async S => { S.t('s', 180, 200, '6 × 4 = 24 cm²', { size: 22, fill: C.good, pop: true }); S.sfx('good'); await S.wait(500); } }
      ] };
  };
  E['shp-3'] = () => {
    const x = 74, y = 30, u = 20, Wd = 9, Hh = 7, nw = 4, nh = 3, ah = Hh - nh, bw = Wd - nw;
    const P = (a, c) => `${x + a * u} ${y + c * u}`;
    return { view: [360, 236], remember: 'Cut an L-shape into two rectangles. Find any missing sides, work out each area, then add them.',
      steps: [
        { title: 'Cut it into rectangles', math: `Cut the L into ${k('A')} and ${k('B')}`, say: 'An L-shape is two rectangles stuck together. Draw a line to cut it into rectangle A at the bottom and rectangle B on top.',
          run: async S => { S.p('L', `M ${P(0, 0)} L ${P(bw, 0)} L ${P(bw, nh)} L ${P(Wd, nh)} L ${P(Wd, Hh)} L ${P(0, Hh)} Z`, { stroke: '#fff', sw: 3, fill: 'rgba(255,255,255,.05)', draw: true });
            S.t('tW', x + Wd * u / 2, y + Hh * u + 16, '9 cm', { size: 15, fill: C.units, pop: true }); S.t('tH', x - 8, y + Hh * u / 2, '7 cm', { size: 15, fill: C.tens, anchor: 'end', pop: true });
            S.t('tnw', x + (bw + Wd) * u / 2, y + nh * u - 12, '4 cm', { size: 13, fill: C.mute, pop: true }); await S.wait(500);
            S.l('cut', x, y + nh * u, x + bw * u, y + nh * u, { stroke: C.pink, sw: 3, dash: '6 5', draw: true }); S.t('A', x + Wd * u / 2, y + (nh + ah / 2) * u, 'A', { size: 24, fill: C.tens, pop: true }); S.t('B', x + bw * u / 2, y + nh * u / 2, 'B', { size: 24, fill: C.units, pop: true }); await S.wait(500); } },
        { title: 'Find the missing sides', math: `A is ${b(7 - 3 + ' cm')} tall (7 − 3). B is ${b(9 - 4 + ' cm')} wide (9 − 4)`, say: 'Some sides are missing. The whole height is 7, and B takes 3 of it, so A is 4 centimetres tall. The whole width is 9, minus the 4 cut out, so B is 5 centimetres wide.',
          run: async S => { S.t('ah', x + Wd * u + 18, y + (nh + ah / 2) * u, '4', { size: 17, fill: C.tens, pop: true }); S.t('bw', x + bw * u / 2, y - 12, '5', { size: 17, fill: C.units, pop: true }); S.t('bh', x - 8, y + nh * u / 2, '3', { size: 15, fill: C.units, anchor: 'end', pop: true }); await S.wait(600); } },
        { title: 'Area of each part', math: `A: 9 × 4 = ${b(36)} &nbsp; B: 5 × 3 = ${b(15)}`, say: 'Rectangle A is 9 by 4: 36 square centimetres. Rectangle B is 5 by 3: 15 square centimetres.',
          run: async S => { S.r('fA', x, y + nh * u, Wd * u, ah * u, { fill: C.tens, op: .35, pop: true }); S.t('vA', x + Wd * u / 2, y + (nh + ah / 2) * u + 24, '36', { size: 18, pop: true }); await S.wait(500);
            S.r('fB', x, y, bw * u, nh * u, { fill: C.units, op: .35, pop: true }); S.t('vB', x + bw * u / 2, y + nh * u / 2 + 22, '15', { size: 18, pop: true }); S.sfx('tick'); await S.wait(500); } },
        { title: 'Add the parts', math: `36 + 15 = ${b('51 cm²')}`, say: 'Add the two areas: 36 plus 15 is 51. The L-shape covers 51 square centimetres.', run: async S => { S.t('s', 300, 14, '36 + 15', { size: 16, pop: true }); S.t('s2', 300, 214, '= 51 cm²', { size: 22, fill: C.good, pop: true }); S.sfx('good'); await S.wait(400); } }
      ] };
  };
})(window.NB = window.NB || {});
