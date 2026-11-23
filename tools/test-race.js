// Checks the maths → race boost rules. Run: node tools/test-race.js
global.window = {}; require('../js/game/Race.js'); const R = window.NB.Race, assert = require('assert');
const perfect = R.boost({ n: 5, clean: 5, fast: 5, hinted: 0, wrong: 0, best: 5 });
assert.deepStrictEqual([perfect.spd, perfect.acc, perfect.extra, perfect.form], [10, 10, 2, 1]);
const hinted = R.boost({ n: 5, clean: 0, fast: 0, hinted: 5, wrong: 0, best: 0 });
assert.ok(hinted.spd > 0 && hinted.spd < perfect.spd, 'hints help, but less than solving alone');
const wrong = R.boost({ n: 5, clean: 1, fast: 0, hinted: 0, wrong: 4, best: 1 });
assert.ok(wrong.form < 1 && wrong.extra === 0, 'wrong answers cost momentum, no nitro without a streak');
assert.strictEqual(R.missionLeague(0, .4), 0); assert.strictEqual(R.missionLeague(22, 1), 4); assert.strictEqual(R.missionLeague(10, .95), 3);
console.log('PASS');
assert.ok(R.missionRivalRating(40, 0, .4) < R.missionRivalRating(40, 0, 1), 'stronger missions face stronger rivals');
assert.ok(R.missionRivalRating(40, 21, 1) <= 95 && R.missionRivalRating(10, 0, 0) >= 15);
console.log('PASS rivals');
