// Alphabet data for every supported language.
//
// Each letter has:
//   id      – stable key used for saved progress
//   char    – the glyph the child traces
//   name    – romanised name shown under the letter
//   sound   – short pronunciation hint
//   word / wordLatin / meaning / emoji – optional example word
//   audio   – optional path to a recorded clip (e.g. "audio/dv/haa.mp3" in /public).
//             When present it is played instead of text-to-speech.

const english = [
  ['A', 'Apple', '🍎'], ['B', 'Ball', '⚽'], ['C', 'Cat', '🐱'], ['D', 'Dog', '🐶'],
  ['E', 'Elephant', '🐘'], ['F', 'Fish', '🐟'], ['G', 'Grapes', '🍇'], ['H', 'Hat', '🎩'],
  ['I', 'Ice cream', '🍦'], ['J', 'Juice', '🧃'], ['K', 'Kite', '🪁'], ['L', 'Lion', '🦁'],
  ['M', 'Moon', '🌙'], ['N', 'Nest', '🪺'], ['O', 'Orange', '🍊'], ['P', 'Pig', '🐷'],
  ['Q', 'Queen', '👸'], ['R', 'Rabbit', '🐰'], ['S', 'Sun', '☀️'], ['T', 'Tiger', '🐯'],
  ['U', 'Umbrella', '☂️'], ['V', 'Violin', '🎻'], ['W', 'Whale', '🐳'], ['X', 'Xylophone', '🎶'],
  ['Y', 'Yo-yo', '🪀'], ['Z', 'Zebra', '🦓'],
].map(([char, word, emoji]) => ({
  id: char.toLowerCase(),
  char,
  lower: char.toLowerCase(),
  name: char,
  sound: char.toLowerCase(),
  word,
  emoji,
}));

// Thaana – the 24 base letters in traditional order.
const dhivehi = [
  ['ހ', 'Haa', 'h'], ['ށ', 'Shaviyani', 'sh'], ['ނ', 'Noonu', 'n'], ['ރ', 'Raa', 'r'],
  ['ބ', 'Baa', 'b'], ['ޅ', 'Lhaviyani', 'lh'], ['ކ', 'Kaafu', 'k'], ['އ', 'Alifu', 'a'],
  ['ވ', 'Vaavu', 'v'], ['މ', 'Meemu', 'm'], ['ފ', 'Faafu', 'f'], ['ދ', 'Dhaalu', 'dh'],
  ['ތ', 'Thaa', 'th'], ['ލ', 'Laamu', 'l'], ['ގ', 'Gaafu', 'g'], ['ޏ', 'Gnaviyani', 'gn'],
  ['ސ', 'Seenu', 's'], ['ޑ', 'Daviyani', 'd'], ['ޒ', 'Zaviyani', 'z'], ['ޓ', 'Taviyani', 't'],
  ['ޔ', 'Yaa', 'y'], ['ޕ', 'Paviyani', 'p'], ['ޖ', 'Javiyani', 'j'], ['ޗ', 'Chaviyani', 'ch'],
].map(([char, name, sound]) => ({ id: name.toLowerCase(), char, name, sound }));

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
}));

export const ALPHABETS = [
  {
    id: 'en',
    title: 'English',
    nativeTitle: 'ABC',
    speechLang: 'en',
    dir: 'ltr',
    font: '"Fredoka", system-ui, sans-serif',
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
    font: '"Noto Sans Thaana", sans-serif',
    displayScale: 1.6, // Thaana glyphs are small within the font's em box
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
    font: '"Noto Sans Arabic", sans-serif',
    theme: { main: '#8b5cf6', soft: '#ebe3ff', deep: '#6a3fd6' },
    letters: arabic,
    phrase: (l, withWord) => ({
      native: withWord ? `${l.nameNative}. ${l.word}` : l.nameNative,
      fallback: withWord ? `${l.name}. ${l.wordLatin}, ${l.meaning}.` : `${l.name}.`,
    }),
  },
];

export const getAlphabet = (id) => ALPHABETS.find((a) => a.id === id);
