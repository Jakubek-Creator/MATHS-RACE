/* QuestionGenerator — deterministic maths, randomised numbers and answer positions.
   Every answer is calculated in code, never typed in by hand. */
(function (NB) {
  const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = R(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

  /* Build 3 or 4 unique options: the answer plus plausible mistakes. */
  function options(answer, mistakes, n = 3) {
    const out = [];
    mistakes.forEach(m => { if (m > 0 && m !== answer && !out.includes(m)) out.push(m); });
    let k = 1;
    while (out.length < n - 1) { const v = answer + (k % 2 ? 10 : -10) * Math.ceil(k / 2); if (v > 0 && !out.includes(v) && v !== answer) out.push(v); k++; }
    return shuffle([answer, ...out.slice(0, n - 1)]).map(String);
  }

  const QG = {
    R, shuffle, options, WORD,

    /* A fresh question of the same kind, used to check independent understanding. */
    similar(kind) {
      if (kind === 'placeValue') {
        let n; do { n = R(21, 98); } while (n % 10 === 0);
        const t = Math.floor(n / 10);
        return { eq: `${t} in ${n} = []`, prompt: `What does the ${t} represent in ${n}?`, answer: String(t * 10), options: shuffle([t, t * 10, t * 100]).map(String),
          explain: `The ${t} is in the tens place, so it means ${WORD[t]} tens: ${t * 10}.` };
      }
      if (kind === 'tensTimes') {
        const t = R(2, 9) * 10, b = R(3, 9), ans = t * b;
        return { eq: `${t} × ${b} = []`, prompt: `What is ${t} × ${b}?`, answer: String(ans), options: options(ans, [ans / 10, ans + 10 * b, ans - 10 * b]),
          explain: `${t / 10} × ${b} = ${ans / 10}. These are tens, so it's ${ans / 10} tens: ${ans}.` };
      }
      if (kind === 'unitsTimes') {
        const a = R(3, 9), b = R(3, 9), ans = a * b;
        return { eq: `${a} × ${b} = []`, prompt: `What is ${a} × ${b}?`, answer: String(ans), options: options(ans, [ans + b, ans - b, a + b]),
          explain: `Count up in ${b}s, ${a} times: ${Array.from({ length: a }, (_, i) => b * (i + 1)).join(', ')}.` };
      }
      if (kind === 'add') {
        const x = R(12, 48) * 10, y = R(11, 89), ans = x + y;
        return { eq: `${x} + ${y} = []`, prompt: `What is ${x} + ${y}?`, answer: String(ans), options: options(ans, [ans + 10, ans - 10, ans + 1]),
          explain: `${x} + ${y - (y % 10)} = ${x + y - (y % 10)}, then add ${y % 10} more: ${ans}.` };
      }
      if (kind === 'split') {
        let n; do { n = R(21, 98); } while (n % 10 === 0);
        const t = n - (n % 10);
        return { eq: `${n} = [] + ${n % 10}`, prompt: `Split ${n} into tens and units.`, answer: String(t), options: shuffle([t, t / 10, n]).map(String),
          explain: `${n} is ${WORD[t / 10]} tens and ${WORD[n % 10]} units: ${t} + ${n % 10}.` };
      }
      return null;
    },

    /* Independent practice: 2-digit × 1-digit, three difficulty tiers. */
    practice(tier, used = []) {
      let a, b, key, guard = 0;
      do {
        if (tier <= 0) { a = R(12, 29); b = R(2, 4); }
        else if (tier === 1) { a = R(23, 59); b = R(3, 6); }
        else { a = R(41, 98); b = R(6, 9); }
        if (a % 10 === 0) a++;
        key = `${a}x${b}`;
      } while (used.includes(key) && ++guard < 50);
      const t = a - (a % 10), o = a % 10, ans = a * b;
      return {
        a, b, key, tier, answer: String(ans), t, o,
        options: options(ans, [t / 10 * b + o * b, ans + 10, a + b, ans - b, t * b + o], 4),
        explain: `Split ${a} into ${t} + ${o}. ${t} × ${b} = ${t * b}. ${o} × ${b} = ${o * b}. Then ${t * b} + ${o * b} = ${ans}.`
      };
    }
  };
  NB.QuestionGenerator = QG;
})(window.NB = window.NB || {});
