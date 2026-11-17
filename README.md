# Little Learner 🔤

A playful alphabet app for kids — **English**, **Dhivehi (Thaana)** and **Arabic**.
Built with React + Vite. No login: progress is saved in the browser (localStorage).

## How it works

1. **Meet the letter** – a big letter card with its name, sound and an example word. The letter is spoken aloud.
2. **Trace it** – the letter is shown as a dashed outline. The child colours it in with a finger
   (rainbow or crayon colours). Paint stays inside the letter; a meter shows how much is filled.
   At 80 % the letter magically fills in, is marked complete ⭐ and the child moves on to the next letter.
3. **Quiz** – listen to a letter and tap the right one out of four cards. 10 rounds, stars, best score saved.

Progress is shown as percentages on the home screen (per language and overall) and on each language's letter map.

## Run it

```bash
npm install
npm run dev
```

Build for production (static files in `dist/`, can be hosted anywhere):

```bash
npm run build
```

## Fonts

- English: Fredoka (npm / Fontsource)
- Arabic: **KFGQPC Hafs Uthmanic Script** (`src/assets/fonts/`, King Fahd Glorious Qur'an Printing Complex;
  free to use and distribute unmodified). Its strokes are thin, so on screen it is slightly emboldened
  (`textStroke`) and the tracing shape is thickened (`traceThicken`). The font draws an isolated ي without
  dots, so that one letter uses Noto Sans Arabic.
- Dhivehi: **MV Waheed** (`src/assets/fonts/MV_Waheed.otf`), the classic textbook Thaana style, with
  Noto Sans Thaana as fallback. Its size and vertical position are tuned with `displayScale` and
  `glyphShift` on the Dhivehi entry in `src/data/alphabets.js`.

## Letter sounds

- **Dhivehi:** recorded letter names in `src/assets/audio/dv/<letter id>.m4a` (e.g. `kaafu.m4a`), picked up
  automatically by file name.
- **English and Arabic:** the device's text-to-speech voices.

To add recordings for another language, set `audio` (a URL) on its letters in `src/data/alphabets.js`.
A recording always takes priority over text-to-speech, and text-to-speech is used if a clip fails to play.

## Project layout

```
src/
  data/alphabets.js        letters, names, sounds, example words per language
  lib/progress.js          localStorage progress + percentages
  lib/speech.js            letter audio / text-to-speech
  lib/sfx.js               little synthesized sound effects
  components/
    Home.jsx               language cards with progress rings
    LetterMap.jsx          grid of letters for one language
    Learn.jsx              intro → trace → celebrate → next letter
    TraceCanvas.jsx        finger-painting inside the letter outline
    Quiz.jsx               listen-and-tap quiz
```

Adding a new alphabet = adding one entry to `ALPHABETS` in `src/data/alphabets.js`.
