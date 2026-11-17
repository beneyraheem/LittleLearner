# Little Learner 🔤

A playful alphabet app for kids — **English**, **Dhivehi (Thaana)** and **Arabic**.
Built with React + Vite. No login: progress is saved in the browser (localStorage).

## How it works

1. **Meet the letter** – a big letter card with its name, sound and an example word. The letter is spoken aloud.
2. **Trace it** – the letter is a bold track with guide dots along each stroke: a numbered green circle
   shows where each stroke starts, arrows show the direction, and a finger demo plays once (👀 *Show me*
   replays it). The guide is worked out automatically from the letter's shape (`src/lib/letterGuide.js`):
   strokes start at the top, English goes left→right, Arabic/Thaana right→left, Arabic dots come last.
   A letter can give a start hint (`startNear` in `src/data/alphabets.js`, e.g. N starts bottom-left).
   The letter is complete when the child has reached **every guide dot in order** – each stroke from its
   green start, along the arrows. Reached dots disappear and the next one is highlighted; going the wrong
   way, jumping ahead or sweeping over the whole letter doesn't count (leaving the letter mid-drag pauses
   counting until the finger is lifted). Then the letter fills in, is marked complete ⭐ and the child
   moves on.
3. **Quiz** – listen to a letter and tap the right one out of four cards. 10 rounds, stars, best score saved.

Progress is shown as percentages on the home screen (per language and overall) and on each language's letter map.

### Children & parents

- **First visit:** a short welcome form makes a profile for the child (name, boy/girl, age).
- **Several children:** each child has their own progress. With more than one child the app opens on
  *Who's playing?*, and tapping the child's picture on the home screen switches child.
- **Parent menu:** the 🔒 *Parents* button asks a simple sum (e.g. 7 + 5) so little ones can't wander in.
  Parents can see each child's progress and quiz scores, add, edit or delete children, and reset progress.
- Everything is stored on the device (localStorage) – no accounts or servers.

## Install on a phone (PWA)

Little Learner is a Progressive Web App: it can be added to the home screen and works offline after the
first visit (fonts and letter sounds included).

- **iPhone / iPad:** open the site in Safari → Share → *Add to Home Screen*.
- **Android:** Chrome shows *Install app* (also available from the 🔒 Parents menu).

On iPhone the home-screen app keeps its own storage, so profiles made in Safari don't carry over.
Updates are picked up automatically the next time the app is opened online. Icons live in `public/icons/`.

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

Recorded clips are picked up automatically from `src/assets/audio/<language>/<letter id>.<m4a|mp3|wav|aac|ogg>`;
any letter without a clip uses the device's text-to-speech (a female voice where available).

- **Dhivehi:** all 24 letters recorded (`src/assets/audio/dv/kaafu.m4a`, …).
- **English / Arabic:** all letters have machine-voice clips (Google Translate's text-to-speech voice), made with
  `python3 scripts/make_letter_audio_google.py`. Each says the letter, then the example word. To use real
  recordings instead, overwrite the files – names are listed in `src/assets/audio/en/README.md` and
  `src/assets/audio/ar/README.md`. On a Mac, `bash scripts/make_letter_audio_mac.sh` makes them with the
  built-in voices instead.

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
