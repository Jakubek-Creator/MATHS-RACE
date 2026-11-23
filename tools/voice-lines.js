// Collects every sentence NOVA can say that never changes (worked examples, the guided question, tips,
// praise, stage messages) and writes tools/voice-lines.json for tools/make-voice.mjs to record.
// Lines with random numbers are left out on purpose: they use the device voice.
// Run: node tools/voice-lines.js   (needs Playwright)
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
(async () => {
  const b = await chromium.launch(), pg = await b.newPage();
  pg.on('pageerror', e => console.error(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html')); await pg.waitForTimeout(500);
  const lines = await pg.evaluate(() => {
    const A = NB.AudioController, out = new Map(), skipped = []; let owner = 'common';
    const put = s => { const h = A.hash(A.key(s)), o = out.get(h); if (!o) out.set(h, { t: s, by: new Set([owner]) }); else o.by.add(owner); };
    const add = t => { if (t) A.sentences(NB.spoken(t)).forEach(put); };
    const qOf = x => x.q || { a: x.a, b: x.b, key: `${x.a}x${x.b}` };
    for (const id in NB.Content) {
      const c = NB.Content[id], key = c.method || c.id, M = NB.Methods[key], H = c.handover; owner = id;
      try {
        if (NB.Explain[key]) {   // the worked example (same words as SheetLesson.enterLearn)
          const sc = NB.Explain[key](qOf(H.watch));
          add(H.watch.intro.replace(/\s*(Watch me|Watch out|Tap Show me|tap Show me)[^.]*\./g, '').trim());
          sc.steps.forEach(st => add(st.say));
          add(`Remember: ${sc.remember} Now you try one, and I'll help with every step.`);
        }
        const sh = M.build(qOf(H.together), 'together'), cap = sh.say.charAt(0).toUpperCase() + sh.say.slice(1);
        add(H.together.intro.replace('{q}', cap)); add(H.alone.intro);
        sh.moves.forEach(m => { [m.prompt, m.short, m.show, ...(m.hints || [])].forEach(add); if (m.alt) add(m.alt.say); if (m.easier) add(m.easier.say); });
        // less help / solo: only the sentences that come out the same for different random questions
        const seen = new Map();
        for (let r = 0; r < 9; r++) { const q = M.gen(r % 3, []), s2 = M.build(q, r % 2 ? 'less' : 'alone');
          s2.moves.forEach(m => [m.short, m.prompt, ...(m.hints || [])].forEach(t => t && A.sentences(NB.spoken(t)).forEach(s => seen.set(s, (seen.get(s) || 0) + 1)))); }
        seen.forEach((n, s) => { if (n >= 4) put(s); });
      } catch (e) { skipped.push(id + ': ' + e.message); }
    }
    owner = 'common'; Object.values(NB.AdaptiveLearningEngine.PHRASES).flat().forEach(add);
    ["That's how it's done. Now you do one, and I'll help with every step.", "You did every step yourself! Next, I'll give you less help.",
      "No hints needed! Done! You're ready. The next ones are all yours. I'll only step in if you get stuck.",
      'Perfect, no help at all!', 'Done. You finished on your own!', 'Perfect deal, no help needed!', 'Deal done. Nice work sticking with it!',
      'Your turn. Fill in the glowing box.', 'This time I only tell you which step comes next. Tap Hint if you need more.'].forEach(add);
    return { lines: [...out].map(([h, o]) => ({ h, t: o.t, b: o.by.size > 1 || o.by.has('common') ? 'common' : [...o.by][0] })), skipped };
  });
  fs.writeFileSync(path.join(__dirname, 'voice-lines.json'), JSON.stringify(lines.lines, null, 1));
  console.log(lines.lines.length, 'sentences', lines.skipped.length ? 'skipped: ' + lines.skipped.join('; ') : '');
  await b.close();
})();
