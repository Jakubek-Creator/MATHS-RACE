/* Recorded narration manifest.
   No recordings are supplied yet, so every clip falls back to the browser voice.
   To add real recordings later, drop the files in audio/<lessonId>/ and list them here.
   No lesson code needs to change. Clip ids for lesson "mult-1":

   Lesson steps:     intro, split, tens, units, add, complete
   Step questions:   split-q, tens-q, units-q, add-q
   Help clips:       <stepId>-hint, <stepId>-alt, <stepId>-easier
   Guided practice:  guided-intro, g-split, g-tens, g-units, g-add
   Wrap-up:          practice-intro, summary

   Example:
   window.NB.AUDIO_MANIFEST['mult-1'] = { intro: 'audio/mult-1/intro.mp3', split: 'audio/mult-1/split.mp3' };
*/
window.NB = window.NB || {};
window.NB.AUDIO_MANIFEST = window.NB.AUDIO_MANIFEST || { 'mult-1': {} };
