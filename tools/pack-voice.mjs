// Packs the recorded sentences (audio/v/<hash>.mp3, kept out of git) into a few files the game can load:
//   audio/voice/<bundle>.js   NB.VOICE.add({ <hash>: <base64 mp3>, ... })  one per lesson, plus "common"
//   audio/voice.js            NB.VOICE_INDEX = { bundles: [...] }        which bundles exist
// A lesson loads its own bundle when it opens; "common" (praise, tips, stage lines) loads with the page.
// Run: node tools/pack-voice.mjs   (after tools/make-voice.mjs)
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), src = path.join(root, 'audio/v'), out = path.join(root, 'audio/voice');
const lines = JSON.parse(readFileSync(path.join(root, 'tools/voice-lines.json'), 'utf8'));
mkdirSync(out, { recursive: true });
for (const f of readdirSync(out)) unlinkSync(path.join(out, f));
const bundles = {};
for (const { h, b } of lines) { const f = path.join(src, `${h}.mp3`); if (existsSync(f)) (bundles[b] = bundles[b] || {})[h] = readFileSync(f).toString('base64'); }
let total = 0;
for (const [b, m] of Object.entries(bundles)) { const js = `NB.VOICE.add(${JSON.stringify(m)});\n`; writeFileSync(path.join(out, `${b}.js`), js); total += js.length; }
writeFileSync(path.join(root, 'audio/voice.js'), `/* Made by tools/pack-voice.mjs: NOVA's recorded voice (Kokoro-82M) is packed per lesson in audio/voice/. */\nwindow.NB = window.NB || {};\nwindow.NB.VOICE_INDEX = { bundles: ${JSON.stringify(Object.keys(bundles).sort())} };\n`);
console.log(Object.keys(bundles).length, 'bundles,', Object.values(bundles).reduce((s, m) => s + Object.keys(m).length, 0), 'sentences,', (total / 1e6).toFixed(1), 'MB');
