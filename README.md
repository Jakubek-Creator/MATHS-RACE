# MATHS-RACE
maths learning app
By Jakub

A maths game for kids: learn a method step by step, then use it on jobs to earn cash for cars and races.

## Play
**On any phone, tablet or computer:** https://jakubek-creator.github.io/MATHS-RACE/

It works in the browser, and it can be installed like an app (home-screen icon, opens full screen, plays offline after the first visit):
- **Android (Chrome):** open the link → ⋮ menu → **Add to Home screen** / **Install app**.
- **iPhone / iPad (Safari):** open the link → Share button → **Add to Home Screen**.

Progress saves on each device.

The link starts working once GitHub Pages is on (one time): repository **Settings → Pages → Build and deployment →
Source: Deploy from a branch → Branch: `main`, folder `/ (root)` → Save**. After a minute or two the game is live,
and every push to `main` updates it.

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
- `manifest.webmanifest`, `sw.js`, `img/icons/` — makes the game installable and playable offline (icons: `node tools/make-icons.js`).
- `tools/voice-lines.js`, `make-voice.mjs`, `pack-voice.mjs` — collect NOVA's fixed sentences, record them with Kokoro-82M, pack them per lesson into `audio/voice/`.
