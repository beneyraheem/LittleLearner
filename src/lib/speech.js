// Letter sounds: recorded clips when available, otherwise the browser's
// built-in text-to-speech (Web Speech API).

const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
let voices = [];

function loadVoices() {
  voices = synth ? synth.getVoices() : [];
}
if (synth) {
  loadVoices();
  synth.addEventListener?.('voiceschanged', loadVoices);
}

function findVoice(lang) {
  const l = lang.toLowerCase();
  return (
    voices.find((v) => v.lang?.toLowerCase().replace('_', '-').startsWith(l) && v.localService) ||
    voices.find((v) => v.lang?.toLowerCase().replace('_', '-').startsWith(l))
  );
}

export function speak(text, lang = 'en', { rate = 0.8 } = {}) {
  if (!synth || !text) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voice = findVoice(lang);
  if (voice) u.voice = voice;
  u.lang = voice?.lang || lang;
  u.rate = rate;
  u.pitch = 1.15;
  synth.speak(u);
}

let currentClip;

export function playLetter(alphabet, letter, { withWord = true } = {}) {
  currentClip?.pause();
  synth?.cancel();
  const tts = () => {
    const { native, fallback } = alphabet.phrase(letter, withWord);
    if (findVoice(alphabet.speechLang)) speak(native, alphabet.speechLang);
    else speak(fallback, 'en');
  };
  if (letter.audio) {
    currentClip = new Audio(letter.audio);
    currentClip.play().catch(tts);
  } else {
    tts();
  }
}

export const cheer = () => {
  const words = ['Great job!', 'Awesome!', 'You did it!', 'Super star!', 'Well done!'];
  speak(words[Math.floor(Math.random() * words.length)], 'en', { rate: 0.95 });
};
