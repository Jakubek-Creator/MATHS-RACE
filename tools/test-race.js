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

// ---------- driving: run with `node tools/test-race.js` ----------
require('../js/game/Drive.js'); const D = window.NB.Drive;
const field = (stats, skill = .75) => [0, 1, 2, 3].map(i => ({ type: 'coupe', stats, ai: true, skill, charges: 1 }));
function race(key, seed, racers, frame = 1 / 60, opts = {}) {
  const tr = D.track(key, seed, 1), s = new D.Sim(tr, racers, { seed, ...opts }); s.lights(.5);
  let maxLat = 0;
  for (let t = 0; t < 150 && s.phase !== 'done'; t += frame) { s.step(frame); s.cars.forEach(c => { maxLat = Math.max(maxLat, Math.abs(c.lat)); }); }
  return { s, tr, maxLat };
}
// every track: the race finishes in 30–60 s, nobody leaves the walls, nobody gets stuck
for (const key of D.THEME_KEYS) {
  const { s, tr, maxLat } = race(key, 2, field(R.stats('coupe', {})));
  const t = s.cars[0].time - s.goAt;
  assert.ok(s.cars[0].finished && t > 30 && t < 60, `${key}: race takes ${t.toFixed(1)} s`);
  assert.ok(maxLat <= tr.wall - 1.1 + 1e-6, `${key}: car went through a wall`);
  assert.ok(!s.events.some(e => e.type === 'respawn'), `${key}: AI got stuck`);
  assert.strictEqual(s.events.filter(e => e.type === 'checkpoint' && e.i === 0).length, (D.CPS - 1) * s.laps, `${key}: checkpoints`);
}
// frame-rate independent: 30 fps and 144 fps give the same race
const a = race('city', 5, field(R.stats('hatch', {})), 1 / 30).s, b = race('city', 5, field(R.stats('hatch', {})), 1 / 144).s;
assert.ok(Math.abs(a.cars[0].time - b.cars[0].time) < .05, `30 vs 144 fps: ${a.cars[0].time} vs ${b.cars[0].time}`);
// tuning values matter: a faster car wins on its own
const mixed = [{ type: 'hyper', stats: R.stats('hyper', { eng: 5, turbo: 5 }), ai: true }, ...field(R.stats('banger', {})).slice(1)];
assert.strictEqual(race('circuit', 3, mixed).s.order()[0].i, 0, 'the hypercar should beat three bangers');
console.log('PASS driving');
// mission balance: the child's car (driven by an average AI) vs rivals matched by missionRivalRating
const win = p => { let w = 0; for (let seed = 1; seed <= 24; seed++) {
  const B = R.boost(p), my = R.stats('muscle', { eng: 1 }), ps = { ...my, spd: Math.min(100, my.spd + B.spd), acc: Math.min(100, my.acc + B.acc), han: Math.min(100, my.han + B.spd) };
  const riv = R.rivals(1, seed, R.missionRivalRating(R.rating(my), 6, (p.n - p.wrong) / p.n)).map(r => ({ ...r, skill: .65, charges: R.charges(r.stats) }));
  const me = { type: 'muscle', stats: ps, ai: true, skill: .6, charges: R.charges(ps) + B.extra, form: B.form };
  const { s } = race(D.THEME_KEYS[seed % 3], seed, [me, ...riv], 1 / 60, { slots: [B.head >= 8 ? 0 : B.head >= 4 ? 1 : 3, ...[0, 1, 2, 3].filter(k => k !== (B.head >= 8 ? 0 : B.head >= 4 ? 1 : 3))] });
  if (s.finalOrder().indexOf(s.cars[0]) === 0) w++; } return w / 24; };
const good = win({ n: 5, clean: 5, fast: 4, hinted: 0, wrong: 0, best: 5 }), weak = win({ n: 5, clean: 1, fast: 0, hinted: 2, wrong: 3, best: 1 });
console.log('win rate: perfect mission', good.toFixed(2), 'weak mission', weak.toFixed(2));
assert.ok(good > weak + .15 && good >= .65 && weak >= .15, 'clean maths should win more races');
console.log('PASS balance');
