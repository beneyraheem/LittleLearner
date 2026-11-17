// Alphabet data for every supported language.
//
// Each letter has:
//   id      – stable key used for saved progress
//   char    – the glyph the child traces
//   name    – romanised name shown under the letter
//   sound   – short pronunciation hint
//   word / wordLatin / meaning / emoji – optional example word
//   audio   – recorded clip, picked up automatically from
//             src/assets/audio/<language id>/<letter id>.<m4a|mp3|wav|aac|ogg>
//             (e.g. audio/en/a.m4a, audio/dv/kaafu.m4a, audio/ar/2-baa.m4a).
//             When present it is played instead of text-to-speech.

// All recorded clips, keyed "<language id>/<letter id>".
const AUDIO = Object.fromEntries(
  Object.entries(
    import.meta.glob('../assets/audio/*/*.{m4a,mp3,wav,aac,ogg}', { eager: true, query: '?url', import: 'default' }),
  ).map(([path, url]) => {
    const [lang, file] = path.split('/').slice(-2);
    return [`${lang}/${file.replace(/\.[^.]+$/, '')}`, url];
  }),
);

const ENGLISH_START = { N: [0.2, 0.85], P: [0.25, 0.15], R: [0.25, 0.15] };

// Hand-drawn tracing paths (fractions of the letter's ink box, 0,0 = top left).
// B: start at the top on the right and go left, down the stem, along the
// bottom, round the lower bump to the middle, then round the upper bump.
const ENGLISH_GUIDES = {
  B: [[[0.62, 0.08], [0.4, 0.08], [0.18, 0.08], [0.12, 0.14], [0.12, 0.4], [0.12, 0.7], [0.12, 0.86], [0.18, 0.92], [0.4, 0.92], [0.62, 0.92], [0.8, 0.86], [0.89, 0.7], [0.82, 0.55], [0.62, 0.46], [0.78, 0.38], [0.85, 0.26], [0.78, 0.13], [0.62, 0.08]]],
};

const english = [
  ['A', 'Apple', '🍎'], ['B', 'Ball', '⚽'], ['C', 'Cat', '🐱'], ['D', 'Dog', '🐶'],
  ['E', 'Elephant', '🐘'], ['F', 'Fish', '🐟'], ['G', 'Grapes', '🍇'], ['H', 'Hat', '🎩'],
  ['I', 'Ice cream', '🍦'], ['J', 'Juice', '🧃'], ['K', 'Kite', '🪁'], ['L', 'Lion', '🦁'],
  ['M', 'Moon', '🌙'], ['N', 'Nest', '🪺'], ['O', 'Orange', '🍊'], ['P', 'Pig', '🐷'],
  ['Q', 'Queen', '👸'], ['R', 'Rabbit', '🐰'], ['S', 'Sun', '☀️'], ['T', 'Tiger', '🐯'],
  ['U', 'Umbrella', '☂️'], ['V', 'Violin', '🎻'], ['W', 'Whale', '🐳'], ['X', 'Xylophone', '🎶'],
  ['Y', 'Yo-yo', '🪀'], ['Z', 'Zebra', '🦓'],
].map(([char, word, emoji]) => ({
  // where the first stroke starts, for letters the automatic guide can't guess
  // (canvas fractions: [x, y], 0,0 = top left)
  startNear: ENGLISH_START[char],
  guide: ENGLISH_GUIDES[char],
  id: char.toLowerCase(),
  char,
  lower: char.toLowerCase(),
  name: char,
  sound: char.toLowerCase(),
  word,
  emoji,
}));

// Hand-drawn tracing paths for Thaana letters whose bends overlap in the
// MV Waheed font, so the automatic centre line can't see them. Each stroke is
// a list of [x, y] points as fractions of the letter's ink box (0,0 = top
// left); a single point is a dot to tap.
const FAAFU = [[0.85, 0.08], [0.72, 0.15], [0.62, 0.22], [0.75, 0.27], [0.86, 0.32], [0.72, 0.4], [0.6, 0.46], [0.7, 0.5], [0.78, 0.55], [0.6, 0.66], [0.4, 0.77], [0.25, 0.84], [0.1, 0.87]];
const THAANA_GUIDES = {
  raa: [[[0.9, 0.12], [0.76, 0.2], [0.62, 0.27], [0.48, 0.24], [0.42, 0.32], [0.48, 0.42], [0.62, 0.5], [0.78, 0.57], [0.68, 0.6], [0.52, 0.57], [0.4, 0.65], [0.25, 0.73], [0.1, 0.82]]],
  faafu: [FAAFU],
  paviyani: [FAAFU, [[0.64, 0.91]]],
  daviyani: [[[0.45, 0.08], [0.3, 0.18], [0.17, 0.3], [0.15, 0.4], [0.35, 0.42], [0.6, 0.45], [0.5, 0.55], [0.3, 0.66], [0.2, 0.78], [0.35, 0.86], [0.6, 0.88], [0.88, 0.84]]],
  laamu: [[[0.64, 0.07], [0.58, 0.18], [0.42, 0.31], [0.6, 0.3], [0.8, 0.28], [0.93, 0.27], [0.75, 0.42], [0.5, 0.58], [0.3, 0.72], [0.07, 0.85]]],
};

// Thaana – the 24 base letters in traditional order.
const dhivehi = [
  ['ހ', 'Haa', 'h'], ['ށ', 'Shaviyani', 'sh'], ['ނ', 'Noonu', 'n'], ['ރ', 'Raa', 'r'],
  ['ބ', 'Baa', 'b'], ['ޅ', 'Lhaviyani', 'lh'], ['ކ', 'Kaafu', 'k'], ['އ', 'Alifu', 'a'],
  ['ވ', 'Vaavu', 'v'], ['މ', 'Meemu', 'm'], ['ފ', 'Faafu', 'f'], ['ދ', 'Dhaalu', 'dh'],
  ['ތ', 'Thaa', 'th'], ['ލ', 'Laamu', 'l'], ['ގ', 'Gaafu', 'g'], ['ޏ', 'Gnaviyani', 'gn'],
  ['ސ', 'Seenu', 's'], ['ޑ', 'Daviyani', 'd'], ['ޒ', 'Zaviyani', 'z'], ['ޓ', 'Taviyani', 't'],
  ['ޔ', 'Yaa', 'y'], ['ޕ', 'Paviyani', 'p'], ['ޖ', 'Javiyani', 'j'], ['ޗ', 'Chaviyani', 'ch'],
].map(([char, name, sound]) => {
  const id = name.toLowerCase();
  return { id, char, name, sound, guide: THAANA_GUIDES[id] };
});

// Number of dots on each Arabic letter (ت two above, ث three above, …).
const ARABIC_DOTS = { 'ب': 1, 'ت': 2, 'ث': 3, 'ج': 1, 'خ': 1, 'ذ': 1, 'ز': 1, 'ش': 3, 'ض': 1, 'ظ': 1, 'غ': 1, 'ف': 1, 'ق': 2, 'ن': 1, 'ي': 2 };

const arabic = [
  ['ا', 'Alif', 'ألف', 'a', 'أرنب', 'Arnab', 'rabbit', '🐰'],
  ['ب', 'Baa', 'باء', 'b', 'بطة', 'Batta', 'duck', '🦆'],
  ['ت', 'Taa', 'تاء', 't', 'تفاحة', 'Tuffaha', 'apple', '🍎'],
  ['ث', 'Thaa', 'ثاء', 'th', 'ثعلب', "Tha'lab", 'fox', '🦊'],
  ['ج', 'Jeem', 'جيم', 'j', 'جمل', 'Jamal', 'camel', '🐫'],
  ['ح', 'Haa', 'حاء', 'ḥ', 'حصان', 'Hisan', 'horse', '🐴'],
  ['خ', 'Khaa', 'خاء', 'kh', 'خروف', 'Kharoof', 'sheep', '🐑'],
  ['د', 'Daal', 'دال', 'd', 'دب', 'Dubb', 'bear', '🐻'],
  ['ذ', 'Dhaal', 'ذال', 'dh', 'ذرة', 'Dhura', 'corn', '🌽'],
  ['ر', 'Raa', 'راء', 'r', 'ريشة', 'Reesha', 'feather', '🪶'],
  ['ز', 'Zaay', 'زاي', 'z', 'زرافة', 'Zarafa', 'giraffe', '🦒'],
  ['س', 'Seen', 'سين', 's', 'سمكة', 'Samaka', 'fish', '🐟'],
  ['ش', 'Sheen', 'شين', 'sh', 'شمس', 'Shams', 'sun', '☀️'],
  ['ص', 'Saad', 'صاد', 'ṣ', 'صقر', 'Saqr', 'falcon', '🦅'],
  ['ض', 'Daad', 'ضاد', 'ḍ', 'ضفدع', "Dhifda'", 'frog', '🐸'],
  ['ط', 'Taa', 'طاء', 'ṭ', 'طائرة', "Ta'ira", 'airplane', '✈️'],
  ['ظ', 'Dhaa', 'ظاء', 'ẓ', 'ظرف', 'Dharf', 'envelope', '✉️'],
  ['ع', 'Ayn', 'عين', 'ʿ', 'عين', 'Ayn', 'eye', '👁️'],
  ['غ', 'Ghayn', 'غين', 'gh', 'غيمة', 'Ghayma', 'cloud', '☁️'],
  ['ف', 'Faa', 'فاء', 'f', 'فيل', 'Feel', 'elephant', '🐘'],
  ['ق', 'Qaaf', 'قاف', 'q', 'قمر', 'Qamar', 'moon', '🌙'],
  ['ك', 'Kaaf', 'كاف', 'k', 'كلب', 'Kalb', 'dog', '🐶'],
  ['ل', 'Laam', 'لام', 'l', 'ليمون', 'Laymoon', 'lemon', '🍋'],
  ['م', 'Meem', 'ميم', 'm', 'موز', 'Mawz', 'banana', '🍌'],
  ['ن', 'Noon', 'نون', 'n', 'نحلة', 'Nahla', 'bee', '🐝'],
  ['ه', 'Haa', 'هاء', 'h', 'هدية', 'Hadiyya', 'gift', '🎁'],
  ['و', 'Waaw', 'واو', 'w', 'وردة', 'Warda', 'rose', '🌹'],
  ['ي', 'Yaa', 'ياء', 'y', 'يد', 'Yad', 'hand', '✋'],
].map(([char, name, nameNative, sound, word, wordLatin, meaning, emoji], i) => ({
  id: `${i + 1}-${name.toLowerCase()}`,
  char,
  name,
  nameNative,
  sound,
  word,
  wordLatin,
  meaning,
  emoji,
  dots: ARABIC_DOTS[char] || 0, // how many dots to tap when tracing
  // The Uthmanic font draws an isolated ي without its two dots (Qur'anic
  // style). Children need the dots, so this one letter uses Noto Sans Arabic.
  ...(char === 'ي' ? { font: '"Noto Sans Arabic", sans-serif' } : {}),
}));

export const ALPHABETS = [
  {
    id: 'en',
    title: 'English',
    nativeTitle: 'ABC',
    speechLang: 'en',
    dir: 'ltr',
    font: '"Fredoka", system-ui, sans-serif',
    traceOutline: 2.2, // thicker border around the letter when tracing
    traceWeight: 500, // lighter Fredoka so English strokes are about as thick as the others
    theme: { main: '#ff7a59', soft: '#ffe3d9', deep: '#d9512f' },
    letters: english,
    // What to say for a letter: [text, language] in the native voice,
    // and a fallback spoken with an English voice.
    phrase: (l, withWord) => {
      const t = withWord ? `${l.char}. ${l.char} is for ${l.word}.` : `${l.char}.`;
      return { native: t, fallback: t };
    },
  },
  {
    id: 'dv',
    title: 'Dhivehi',
    nativeTitle: 'ދިވެހި',
    speechLang: 'dv',
    dir: 'rtl',
    // MV Waheed (src/assets/fonts) with Noto Sans Thaana as fallback.
    font: '"MV Waheed", "Noto Sans Thaana", sans-serif',
    displayScale: 1.8, // MV Waheed glyphs are small within the font's em box
    glyphShift: '-0.22em', // …and sit low, so lift them to look centred
    theme: { main: '#14b8a6', soft: '#d3f5ef', deep: '#0d8a7c' },
    letters: dhivehi,
    phrase: (l) => ({ native: l.char, fallback: `${l.name}.` }),
  },
  {
    id: 'ar',
    title: 'Arabic',
    nativeTitle: 'العربية',
    speechLang: 'ar',
    dir: 'rtl',
    // KFGQPC Hafs Uthmanic Script (src/assets/fonts), Noto Sans Arabic fallback.
    font: '"KFGQPC Hafs", "Noto Sans Arabic", sans-serif',
    displayScale: 1.2,
    glyphShift: '-0.2em', // the font sits letters low – lift them to look centred
    textStroke: '0.022em', // the font is thin – embolden it a little on screen
    traceThicken: 0.045, // …and thicken the tracing shape (fraction of font size)
    theme: { main: '#8b5cf6', soft: '#ebe3ff', deep: '#6a3fd6' },
    letters: arabic,
    phrase: (l, withWord) => ({
      native: withWord ? `${l.nameNative}. ${l.word}` : l.nameNative,
      fallback: withWord ? `${l.name}. ${l.wordLatin}, ${l.meaning}.` : `${l.name}.`,
    }),
  },
];

// Attach recorded clips to their letters.
for (const a of ALPHABETS) {
  a.letters = a.letters.map((l) => ({ ...l, audio: l.audio ?? AUDIO[`${a.id}/${l.id}`] }));
}

export const getAlphabet = (id) => ALPHABETS.find((a) => a.id === id);

// Font and on-screen boldness for a letter (a few letters override the alphabet font).
export const fontOf = (alphabet, letter) => letter?.font || alphabet.font;
export const glyphStyle = (alphabet, letter) => ({
  fontFamily: fontOf(alphabet, letter),
  '--stroke': letter?.font ? '0' : alphabet.textStroke || '0',
  // Letters drawn in the fallback font: lighter, smaller and lifted to match.
  ...(letter?.font ? { fontWeight: 500, '--fs': 0.9, '--gy': '-0.12em' } : {}),
});
