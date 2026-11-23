/* AdaptiveLearningEngine — decides how to respond to each attempt.
   1st miss: friendly hint.  2nd miss: explain it a different way with a new visual.
   3rd miss: slow down with an easier worked example.  4th miss: demonstrate the answer.
   Correct after help: a similar follow-up question to check independent understanding.
   Messages are always encouraging; getting help is never treated as failure. */
(function (NB) {
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const PHRASES = {
    first: ["Fantastic! You're getting really good at this!", "Excellent! You've got it.", 'Spot on!', 'Nailed it!'],
    assisted: ["That's it! Well worked out.", 'Yes! You got there.', 'Great, you cracked it.'],
    hint: ["Almost! Let's have another look.", "Good try! Let's look at that again.", "You're getting closer.", 'Nearly there.'],
    reexplain: ["Let's look at it a different way."],
    easier: ["Let's try another example together. I'll slow down."],
    demonstrate: ["Let's work it out together. Watch this."],
    followUp: ["Let's check you've really got it. Try this one."],
    followUpRight: ['Brilliant! You did that one all by yourself.', 'Superb. That one was all you!'],
    followUpWrong: ["Good effort! Here's how that one works."],
    streak: ['Amazing streak! Keep going!', "Three in a row! You're on fire!", 'Streak! Your engine is roaring!'],
    bigStreak: ['Five in a row! Bonus time!', 'Unstoppable! Five in a row!'],
    mission: ['You did it! Time to celebrate!', 'Mission complete! What a driver!'],
    think: ['Take your time. Think it through.', 'Look at the steps. You can do this.']
  };

  class AdaptiveLearningEngine {
    constructor(stats) { this.stats = stats; }
    phrase(kind) { return pick(PHRASES[kind]); }

    /* cp: saved checkpoint record {attempts, done, assisted}. Returns an action. */
    assess(cp, correct) {
      cp.attempts = (cp.attempts || 0) + 1;
      if (correct) {
        if (cp.attempts === 1) { this.stats.firstTry++; return { type: 'correct-first' }; }
        cp.assisted = true;
        return { type: 'correct-assisted' };
      }
      this.stats.mistakes++;
      if (cp.attempts === 1) { this.stats.hints++; return { type: 'hint' }; }
      if (cp.attempts === 2) { this.stats.explanations++; return { type: 'reexplain' }; }
      if (cp.attempts === 3) { this.stats.easier++; return { type: 'easier' }; }
      return { type: 'demonstrate' };
    }

    /* Independent practice difficulty: two first-try wins in a row step up, a miss steps down. */
    nextTier(p, correct) {
      if (correct) { p.streak = (p.streak || 0) + 1; if (p.streak >= 2 && p.tier < 2) { p.tier++; p.streak = 0; } }
      else { p.streak = 0; if (p.tier > 0) p.tier--; }
      return p.tier;
    }
  }
  AdaptiveLearningEngine.phrase = kind => pick(PHRASES[kind]);
  NB.AdaptiveLearningEngine = AdaptiveLearningEngine;
})(window.NB = window.NB || {});
