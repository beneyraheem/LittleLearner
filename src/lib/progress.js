import { useCallback, useEffect, useState } from 'react';
import { ALPHABETS } from '../data/alphabets';

// Progress lives in localStorage – no login needed.
const KEY = 'littlelearner.progress.v1';

const empty = () =>
  Object.fromEntries(ALPHABETS.map((a) => [a.id, { done: [], quizBest: 0, quizPlays: 0 }]));

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    const base = empty();
    if (saved && typeof saved === 'object') {
      for (const id of Object.keys(base)) {
        if (saved[id]) base[id] = { ...base[id], ...saved[id] };
      }
    }
    return base;
  } catch {
    return empty();
  }
}

export function useProgress() {
  const [progress, setProgress] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(progress));
    } catch {
      /* storage unavailable (private mode) – progress lasts for this visit only */
    }
  }, [progress]);

  const completeLetter = useCallback((langId, letterId) => {
    setProgress((p) => {
      const lang = p[langId];
      if (lang.done.includes(letterId)) return p;
      return { ...p, [langId]: { ...lang, done: [...lang.done, letterId] } };
    });
  }, []);

  const recordQuiz = useCallback((langId, percent) => {
    setProgress((p) => {
      const lang = p[langId];
      return {
        ...p,
        [langId]: { ...lang, quizBest: Math.max(lang.quizBest, percent), quizPlays: lang.quizPlays + 1 },
      };
    });
  }, []);

  const reset = useCallback(() => setProgress(empty()), []);

  return { progress, completeLetter, recordQuiz, reset };
}

// Tracing progress for one alphabet, 0–100.
export function percentFor(progress, alphabet) {
  const done = progress[alphabet.id]?.done ?? [];
  const valid = done.filter((id) => alphabet.letters.some((l) => l.id === id)).length;
  return Math.round((valid / alphabet.letters.length) * 100);
}
