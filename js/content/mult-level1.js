/* Lesson content: Car Lot Deals, Level 1 (47 × 6), step-by-step worksheet format.
   NOVA shows the first sum, then hands over a little more each time until the child works alone. */
(function (NB) {
  NB.StepRenderer.register('blocks', ({ number }) => {
    const t = Math.floor(number / 10), o = number % 10;
    return `<div class="v-split"><div class="split-parts"><div class="part tens"><div class="blocks">${'<span class="b-rod v"></span>'.repeat(t)}</div><span>${t} tens</span></div>
      <div class="part units"><div class="blocks">${'<span class="b-cube"></span>'.repeat(o)}</div><span>${o} units</span></div></div></div>`;
  });

  NB.Content = NB.Content || {};
  NB.Content['mult-1'] = {
    id: 'mult-1', engine: 'sheet',
    gameTopic: 'mult', gameLevel: 0,
    district: 'Car Lot Deals', topic: 'Multiplying', level: 1,
    title: 'Two-digit × one-digit',
    mission: 'Mission 1: multiplication',
    boardTitle: "Let's Multiply!",

    // The handover: NOVA does one, you do one together, then less help, then on your own.
    handover: {
      startTier: 1,
      watch: { a: 47, b: 6, intro: "Rico needs the total for six parts packages at 47 dollars each. That's 47 times 6. Watch me do this one, step by step. Tap Show me when you're ready for each step." },
      together: { a: 32, b: 4, intro: 'Your turn: 32 times 4. Same steps. You type every number, and I give you a tip for each one.' },
      less: { count: 2, intro: '{q}. This time I only tell you which step comes next. Tap Hint if you need more.' },
      alone: { count: 3, intro: "Three deals on your own. Split, tens, units, add, answer. I'll stay quiet unless you get stuck." }
    }
  };
})(window.NB = window.NB || {});
