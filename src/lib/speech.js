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

// Voices are not labelled male/female, so match known female voice names
// (iPhone/Mac, Android/Chrome, Windows/Edge). Novelty and known male voices
// are skipped.
const FEMALE = /\b(female|woman|samantha|karen|moira|tessa|fiona|victoria|serena|kate|susan|allison|ava|zoe|nicky|veena|kathy|princess|martha|catherine|google us english|google uk english female|zira|aria|jenny|hazel|libby|sonia|natasha|clara|michelle|emma|ana|salma|zariyah|hoda|amina|laila|layla|mouna|sana|fatima|amira|hala|rana|noura|leila)\b/i;
const MALE = /\b(male|man|daniel|alex|fred|aaron|arthur|oliver|rishi|gordon|tom|lee|ralph|albert|junior|david|mark|george|guy|ryan|thomas|maged|majed|tarik|naayf|hamed|bassel|omar|shakir|hamdan|zayd|fahed|jamal|moaz)\b/i;
const NOVELTY = /\b(bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|deranged|hysterical|pipe organ)\b/i;

function score(v, lang) {
  const name = v.name || '';
  if (NOVELTY.test(name)) return -1000;
  let s = 0;
  // Chrome's "Google …" voices are female unless their name says Male.
  const google = /^google\b/i.test(name) && !/\bmale\b/i.test(name);
  if (/female/i.test(name) || google || (FEMALE.test(name) && !/\bmale\b/i.test(name))) s += 100;
  else if (MALE.test(name)) s -= 50;
  if (/enhanced|premium|natural|neural/i.test(name)) s += 10;
  if (v.localService) s += 5;
  if (lang === 'en' && /en[-_](us|gb)/i.test(v.lang)) s += 3;
  return s;
}

const cache = {};
function findVoice(lang) {
  const l = lang.toLowerCase();
  const key = `${l}:${voices.length}`;
  if (key in cache) return cache[key];
  const matches = voices.filter((v) => v.lang?.toLowerCase().replace('_', '-').startsWith(l));
  let best = null;
  for (const v of matches) if (!best || score(v, l) > score(best, l)) best = v; // novelty voices score lowest
  return (cache[key] = best);
}

const isFemale = (v) => v && score(v, '') >= 100;

export function speak(text, lang = 'en', { rate = 0.8 } = {}) {
  if (!synth || !text) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voice = findVoice(lang);
  if (voice) u.voice = voice;
  u.lang = voice?.lang || lang;
  u.rate = rate;
  // A female voice gets a gentle lift; anything else is raised more so it
  // sounds softer and closer to a female voice.
  u.pitch = isFemale(voice) ? 1.15 : 1.45;
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
