/* AudioController — narration with synchronised captions.
   1. If a recorded clip exists in NB.AUDIO_MANIFEST[lessonId][clipId], it plays that file.
   2. Otherwise (or if the file fails) it falls back to the browser's speech voice.
   3. If muted or no voice exists, captions still run on a timer.
   play() always resolves — audio problems never block the lesson. */
(function (NB) {
  const synth = ('speechSynthesis' in window) ? window.speechSynthesis : null;
  let voice = null;
  function pickVoice() {
    try {
      const vs = synth.getVoices();
      voice = vs.find(v => /en[-_](IE|GB)/i.test(v.lang) && /female|libby|sonia|serena|kate|moira|martha|hazel/i.test(v.name))
        || vs.find(v => /en[-_](IE|GB)/i.test(v.lang))
        || vs.find(v => /^en/i.test(v.lang)) || null;
    } catch (e) { voice = null; }
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
      const rank = v => { const l = v.lang.replace('_', '-'); return (/IE|GB/i.test(l) ? 0 : /US/i.test(l) ? 1 : 2) * 10 + (/natural|neural|online|google|premium|enhanced/i.test(v.name) ? 0 : 1); };
      return vs.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
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
