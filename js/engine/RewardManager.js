/* RewardManager — pays cash and XP through the main game's save (hooks),
   and remembers one-off rewards so replays and refreshes can't pay twice. */
(function (NB) {
  const TABLE = {
    checkpointFirst: { cash: 20, xp: 15 },
    move: { cash: 10, xp: 5 },
    checkpointAssisted: { cash: 10, xp: 8 },
    independent: { cash: 10, xp: 10 },
    guidedDone: { cash: 100, xp: 40 },
    practiceCorrect: { cash: 50, xp: 20 },
    lessonComplete: { cash: 200, xp: 100 }
  };
  class RewardManager {
    constructor(hooks, lessonId) { this.hooks = hooks; this.lessonId = lessonId; }
    /* key: unique id for one-off rewards (null = repeatable). Returns the amount paid or null. */
    award(kind, key) {
      const amt = TABLE[kind]; if (!amt) return null;
      let paid = true;
      NB.ProgressManager.update(this.lessonId, L => {
        if (key && L.awarded[key]) { paid = false; return; }
        if (key) L.awarded[key] = true;
        L.rewards.cash += amt.cash; L.rewards.xp += amt.xp;
      });
      if (!paid) return null;
      this.hooks.addCash(amt.cash); this.hooks.addXP(amt.xp);
      return amt;
    }
  }
  RewardManager.TABLE = TABLE;
  NB.RewardManager = RewardManager;
})(window.NB = window.NB || {});
