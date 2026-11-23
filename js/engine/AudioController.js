/* AudioController — narration with synchronised captions.
   0. If every sentence of the line has been recorded (NB.VOICE: tools/make-voice.mjs + tools/pack-voice.mjs, a natural AI voice),
      it plays those recordings one after another. Lines with random numbers are never all recorded, so they use step 2.
   1. If a recorded clip exists in NB.AUDIO_MANIFEST[lessonId][clipId], it plays that file.
   2. Otherwise (or if the file fails) it falls back to the browser's speech voice.
   3. If muted or no voice exists, captions still run on a timer.
   play() always resolves — audio problems never block the lesson. */
(function (NB) {
  const synth = ('speechSynthesis' in window) ? window.speechSynthesis : null;
  let voice = null;
  /* Best-sounding English voice first: the natural / neural / premium voices many phones and browsers now ship
     (Edge "Natural", Chrome "Google", Apple "Enhanced"/"Premium"), Irish and UK accents ahead of others,
     and the old robotic engines (eSpeak, "compact") last. */
  function score(v) {
    const n = v.name, l = String(v.lang).replace('_', '-'); let s = 0;
    if (/natural|neural/i.test(n)) s += 50; if (/premium|enhanced/i.test(n)) s += 40; if (/google/i.test(n)) s += 25; if (/online/i.test(n)) s += 10;
    if (/IE|GB/i.test(l)) s += 12; else if (/US|AU|NZ|CA/i.test(l)) s += 6;
    if (/female|libby|sonia|maisie|emily|serena|kate|moira|martha|hazel|aria|jenny|ava|samantha|karen|catherine|fiona/i.test(n)) s += 5;
    if (/compact|espeak|robot/i.test(n)) s -= 40;
    return s;
  }
  function pickVoice() {
    try { voice = synth.getVoices().filter(v => /^en/i.test(v.lang)).sort((a, b) => score(b) - score(a))[0] || null; } catch (e) { voice = null; }
  }
  if (synth) { pickVoice(); try { synth.addEventListener('voiceschanged', pickVoice); } catch (e) {} }

  /* Shared voice settings. NB.voicePref = {name, rate, pitch} is set by the game's voice picker;
     with no choice saved, the best English (Irish/UK first) voice is picked automatically. */
  const LANGS = { 'en-IE': 'Ireland', 'en-GB': 'UK', 'en-US': 'US', 'en-AU': 'Australia', 'en-CA': 'Canada', 'en-IN': 'India', 'en-NZ': 'New Zealand', 'en-ZA': 'South Africa' };
  NB.Voice = {
    supported: !!synth,
    list() {
      if (!synth) return [];
      let vs = []; try { vs = synth.getVoices().filter(v => /^en/i.test(v.lang)); } catch (e) {}
      return vs.sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
    },
    langLabel(lang) { const l = String(lang).replace('_', '-'); return 'English (' + (LANGS[l] || l.split('-')[1] || 'other') + ')'; },
    current() {
      const p = NB.voicePref || {};
      if (p.name && synth) { try { const v = synth.getVoices().find(x => x.name === p.name); if (v) return v; } catch (e) {} }
      return voice;
    },
    apply(u, rate = 1) {
      const p = NB.voicePref || {}, v = this.current();
      if (v) { u.voice = v; u.lang = v.lang; }
      u.rate = Math.min(2, (p.rate || 0.92) * rate);
      u.pitch = p.pitch != null ? p.pitch : 1.05;
    },
    preview(text) {
      if (!synth) return;
      try { synth.cancel(); const u = new SpeechSynthesisUtterance(text); this.apply(u); synth.speak(u); } catch (e) {}
    },
    onChange(cb) { if (synth) try { synth.addEventListener('voiceschanged', cb); } catch (e) {} }
  };

  /* Recorded sentences arrive in bundles (audio/voice/<lesson>.js, made by tools/pack-voice.mjs). */
  NB.VOICE = {
    data: {}, asked: {},
    add(m) { Object.assign(this.data, m); },
    /* resolves when the bundle is in (or failed, or there is none); never rejects */
    load(name) {
      const I = NB.VOICE_INDEX; if (!I || !I.bundles.includes(name)) return Promise.resolve();
      if (!this.asked[name]) this.asked[name] = new Promise(res => { const sc = document.createElement('script'); sc.src = `audio/voice/${name}.js`; sc.async = true; sc.onload = sc.onerror = () => res(); document.head.appendChild(sc); });
      return this.asked[name];
    }
  };
  NB.VOICE.load('common');

  class AudioController {
    constructor({ lessonId, onWord, onState, isMuted }) {
      this.lessonId = lessonId;
      this.onWord = onWord || (() => {});
      this.onState = onState || (() => {});
      this.isMuted = isMuted || (() => false);
      this.token = 0;
      this.timers = [];
      this.el = null;
      this.paused = false;
      this.playing = false;
    }
    static hasVoice() { return !!synth; }

    /* Recorded natural voice, sentence by sentence. Returns the file list only if every sentence is recorded. */
    static sentences(t) { return String(t).split(/(?<=[.!?])\s+/).map(x => x.trim()).filter(Boolean); }
    static key(t) { return String(t).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
    static hash(t) { let h = 5381; for (const ch of t) h = (Math.imul(h, 33) ^ ch.charCodeAt(0)) >>> 0; return h.toString(36); }
    recorded(text) {
      const D = NB.VOICE.data;
      const parts = AudioController.sentences(text), files = parts.map(p => { const d = D[AudioController.hash(AudioController.key(p))]; return d ? `data:audio/mpeg;base64,${d}` : null; });
      return parts.length && files.every(Boolean) ? parts.map((p, i) => ({ url: files[i], words: AudioController.words(p).length })) : null;
    }
    clipUrl(clipId) {
      const m = (NB.AUDIO_MANIFEST || {})[this.lessonId] || {};
      return m[clipId] || null;
    }

    /* Split caption into words with char offsets so speech boundary events map to words. */
    static words(text) {
      const out = []; const re = /\S+/g; let m;
      while ((m = re.exec(text))) out.push({ w: m[0], i: m.index });
      return out;
    }

    stop() {
      this.token++;
      this.timers.forEach(clearTimeout); this.timers = [];
      if (this.el) { try { this.el.pause(); } catch (e) {} this.el = null; }
      if (synth) { try { synth.cancel(); } catch (e) {} }
      this.playing = false; this.paused = false;
      this.onState('stopped');
    }

    pause() {
      if (!this.playing || this.paused) return;
      this.paused = true;
      if (this.el) this.el.pause();
      else if (synth && this.mode === 'speech') { try { synth.pause(); } catch (e) {} }
      this.onState('paused');
    }
    resume() {
      if (!this.paused) return;
      this.paused = false;
      if (this.el) this.el.play().catch(() => {});
      else if (synth && this.mode === 'speech') { try { synth.resume(); } catch (e) {} }
      this.onState('playing');
    }

    /* Play a clip. opts.rate < 1 slows the explanation down. Resolves with 'ended' | 'stopped' | 'silent'. */
    play(clipId, text, opts = {}) {
      this.stop();
      const my = this.token;
      const words = AudioController.words(text);
      const rate = opts.rate || 1;
      this.playing = true; this.onState('playing');

      return new Promise(resolve => {
        let finished = false;
        const done = reason => {
          if (finished) return; finished = true;
          if (my !== this.token) return resolve('stopped');
          this.timers.forEach(clearTimeout); this.timers = [];
          this.playing = false; this.el = null;
          this.onWord(words.length);           // mark caption complete
          this.onState('ended');
          resolve(reason);
        };
        const silent = () => {
          // Captions advance on a timer at a comfortable reading pace.
          this.mode = 'silent';
          const per = 330 / rate;
          words.forEach((_, k) => this.timers.push(setTimeout(() => { if (my === this.token) this.onWord(k); }, k * per)));
          this.timers.push(setTimeout(() => done('silent'), words.length * per + 600));
        };
        const speak = () => {
          if (!synth) return silent();
          this.mode = 'speech';
          try {
            const u = new SpeechSynthesisUtterance(text);
            NB.Voice.apply(u, rate);
            u.onboundary = e => {
              if (my !== this.token || e.name === 'sentence') return;
              let k = 0; while (k + 1 < words.length && words[k + 1].i <= e.charIndex) k++;
              this.onWord(k);
            };
            u.onend = () => done('ended');
            u.onerror = () => done('ended');
            synth.speak(u);
            // Safety net: some browsers never fire onend.
            this.timers.push(setTimeout(() => done('ended'), (text.length * 95) / rate + 5000));
          } catch (e) { silent(); }
        };

        if (this.isMuted()) return silent();
        const seq = this.recorded(text);
        if (seq) {   // play the recorded sentences in order; the caption follows along
          this.mode = 'file';
          let j = 0, off = 0;
          const next = () => {
            if (my !== this.token) return;
            if (j >= seq.length) return done('ended');
            const part = seq[j], a = new Audio(part.url); this.el = a; a.playbackRate = rate;
            a.ontimeupdate = () => { if (my === this.token && a.duration) this.onWord(Math.min(words.length - 1, off + Math.floor(a.currentTime / a.duration * part.words))); };
            a.onended = () => { off += part.words; j++; next(); };
            a.onerror = () => { if (my === this.token) { this.el = null; j ? done('ended') : speak(); } };
            a.play().catch(() => { if (my === this.token) { this.el = null; j ? done('ended') : speak(); } });
          };
          return next();
        }
        const url = this.clipUrl(clipId);
        if (url) {
          this.mode = 'file';
          const a = new Audio(url); this.el = a;
          a.playbackRate = rate;
          a.ontimeupdate = () => {
            if (my !== this.token || !a.duration) return;
            this.onWord(Math.floor((a.currentTime / a.duration) * words.length));
          };
          a.onended = () => done('ended');
          a.onerror = () => { if (my === this.token) { this.el = null; speak(); } };
          a.play().catch(() => { if (my === this.token) { this.el = null; speak(); } });
        } else speak();
      });
    }
  }
  NB.AudioController = AudioController;
})(window.NB = window.NB || {});
