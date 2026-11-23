// Records NOVA's fixed sentences with Kokoro-82M (Apache-2.0, runs locally) and writes:
//   audio/v/<hash>.mp3   one small mp3 per sentence
//   audio/voice.js       NB.VOICE = { base, has: { <hash>: 1 } } so the game knows what is recorded
// Run after tools/voice-lines.js:
//   cd tools && npm i kokoro-js@1.2.1 --onnxruntime-node-install-cuda=skip   (once)
//   NODE_USE_ENV_PROXY=1 node tools/make-voice.mjs [voice]          (voice defaults to af_heart)
// Already-recorded sentences are skipped, so re-running only records new lines.
import { KokoroTTS } from 'kokoro-js';
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), dir = path.join(root, 'audio/v'), tmp = path.join(root, 'audio/v/_tmp.wav');
const VOICE = process.argv[2] || 'af_heart', SPEED = 0.94;
const lines = JSON.parse(readFileSync(path.join(root, 'tools/voice-lines.json'), 'utf8'));
mkdirSync(dir, { recursive: true });
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' });
let made = 0;
for (const { h, t } of lines) {
  const out = path.join(dir, `${h}.mp3`); if (existsSync(out)) continue;
  const audio = await tts.generate(t, { voice: VOICE, speed: SPEED });
  await audio.save(tmp);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-ac', '1', '-ar', '24000', '-b:a', '40k', out]);
  if (++made % 25 === 0) console.log(made, 'recorded');
}
if (existsSync(tmp)) unlinkSync(tmp);
const has = Object.fromEntries(lines.filter(l => existsSync(path.join(dir, `${l.h}.mp3`))).map(l => [l.h, 1]));
writeFileSync(path.join(root, 'audio/voice.js'), `/* Made by tools/make-voice.mjs: NOVA's recorded sentences (Kokoro-82M, voice ${VOICE}). */\nwindow.NB = window.NB || {};\nwindow.NB.VOICE = { base: 'audio/v/', has: ${JSON.stringify(has)} };\n`);
console.log('done:', made, 'new,', Object.keys(has).length, 'total');
