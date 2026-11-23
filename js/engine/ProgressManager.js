/* ProgressManager — versioned lesson saves, kept apart from the main game save
   ("neonbay-maths") so lesson data can never corrupt existing player data.
   If storage is unavailable, everything still works in memory for the session. */
(function (NB) {
  const KEY = 'neonbay-lessons';
  const VERSION = 1;
  let mem = null;

  const blank = () => ({ version: VERSION, active: null, lessons: {} });
  const freshLesson = () => ({
    phase: 'lesson',            // lesson | guided | practice | summary
    step: 0,
    furthest: 0,
    checkpoints: {},            // id -> {attempts, done, assisted, followUp, followUpDone}
    facts: [],                  // working shown on the board
    guided: { step: 0, attempts: 0, facts: [], followUp: null },
    practice: null,             // {i, tier, streak, used, q, results, answered}
    stats: { checkpoints: 0, firstTry: 0, mistakes: 0, hints: 0, explanations: 0, easier: 0, followUps: 0, followUpsCorrect: 0 },
    awarded: {},                // reward keys already paid (survives replays)
    completed: false,
    completions: 0,
    rewards: { cash: 0, xp: 0 }
  });

  function load() {
    if (mem) return mem;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && d.version === VERSION && d.lessons) { mem = d; return mem; }
        // Future versions: migrate here instead of discarding.
      }
    } catch (e) { /* unreadable or blocked storage: start clean in memory */ }
    mem = blank();
    return mem;
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* keep going in memory */ }
  }

  NB.ProgressManager = {
    get(id) { return load().lessons[id] || null; },
    ensure(id) { const d = load(); if (!d.lessons[id]) { d.lessons[id] = freshLesson(); persist(); } return d.lessons[id]; },
    update(id, fn) { const L = this.ensure(id); fn(L); persist(); return L; },
    restart(id) {
      const d = load(), old = d.lessons[id] || freshLesson(), L = freshLesson();
      L.awarded = old.awarded; L.completions = old.completions; L.rewards = old.rewards;
      d.lessons[id] = L; persist(); return L;
    },
    setActive(id) { load().active = id; persist(); },
    active() { return load().active; },
    storageOK() { try { localStorage.setItem('__nb', '1'); localStorage.removeItem('__nb'); return true; } catch (e) { return false; } }
  };
})(window.NB = window.NB || {});
