# MATHS-RACE
maths learning app
By Jakub

A maths game for kids: learn a method step by step, then use it on jobs to earn cash for cars and races.

## Play
Open `index.html` in a browser, or turn on GitHub Pages (Settings → Pages → deploy from `main`, folder `/`).
Progress saves in the browser.

## What's inside
- **7 districts in 3 areas:** Number Row (adding & subtracting, multiplying, dividing), The Code Quarter (fractions, algebra), Shape Yard (angles, shapes). 3 levels each, plus a finale.
- **Each level:** mission brief (big idea, steps, common mistake) → lesson (NOVA shows you → together → less help → on your own) → job (5 typed answers, one review question from the level before).
- **Garage and daily race:** right answers earn cash for cars and mods.

## Code
- `js/content/methods.js`, `methods2.js` — one question generator + step-by-step worksheet per level. Jobs use the same generators, so a job only asks what its lesson taught.
- `js/engine/` — lesson screen, number pad, narration, rewards.
- `js/game/` — car art, home scene, race.
- `js/app.js` — screens, progress, jobs.
- `tools/test-generators.js` — run `node tools/test-generators.js` to check every generator's answers.
