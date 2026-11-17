// Sound effects. Small ones are synthesized with Web Audio; the big
// "letter complete" success sound is a real audio file, because iPhones mute
// Web Audio when the silent switch is on but still play <audio> elements.
import successUrl from '../assets/sounds/success.mp3';

let ctx;
const ac = () => {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
};

function tone(freq, start, dur, type = 'sine', vol = 0.18) {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = c.currentTime + start;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export const sfx = {
  pop: () => tone(660, 0, 0.12, 'triangle', 0.12),
  correct: () => [523, 659, 784].forEach((f, i) => tone(f, i * 0.08, 0.25, 'triangle')),
  wrong: () => { tone(220, 0, 0.18, 'sine', 0.12); tone(180, 0.12, 0.22, 'sine', 0.12); },
  win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.3, 'triangle')),
};

// ---- Success sound -------------------------------------------------------
const successClip = typeof Audio !== 'undefined' ? new Audio(successUrl) : null;
if (successClip) successClip.preload = 'auto';

// iOS only lets a page play sound that starts inside a tap. The success sound
// fires later (when the letter fills up), so unlock audio on the first touch.
let unlocked = false;
function unlock() {
  if (unlocked) return;
  unlocked = true;
  ac();
  if (successClip) {
    successClip.muted = true;
    successClip
      .play()
      .then(() => {
        successClip.pause();
        successClip.currentTime = 0;
      })
      .catch(() => {})
      .finally(() => {
        successClip.muted = false;
      });
  }
}
if (typeof window !== 'undefined') {
  for (const type of ['pointerdown', 'touchend', 'click', 'keydown']) {
    window.addEventListener(type, unlock, { capture: true, passive: true });
  }
}

sfx.success = () => {
  if (!successClip) return sfx.win();
  successClip.currentTime = 0;
  successClip.muted = false;
  successClip.play().catch(() => sfx.win());
};
