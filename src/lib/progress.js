import { useCallback, useEffect, useMemo, useState } from 'react';
import { ALPHABETS, MAIN_ALPHABETS, variantsOf } from '../data/alphabets';

// Everything is saved in localStorage – no login needed.
//   profiles  – the children using this device
//   activeId  – who is playing right now
//   progress  – per child: { [langId]: { done: [letterIds], stars: { [letterId]: best 1–3 }, quizBest, quizPlays } }
const KEY = 'littlelearner.v2';
const LEGACY_KEY = 'littlelearner.progress.v1'; // single-child progress from before profiles

const emptyProgress = () =>
  Object.fromEntries(ALPHABETS.map((a) => [a.id, { done: [], stars: {}, quizBest: 0, quizPlays: 0 }]));

// Fill in any languages missing from saved progress.
function normalise(saved) {
  const base = emptyProgress();
  if (saved && typeof saved === 'object') {
    for (const id of Object.keys(base)) if (saved[id]) base[id] = { ...base[id], ...saved[id] };
  }
  return base;
}

function load() {
  const state = { profiles: [], activeId: null, progress: {}, legacy: null };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && Array.isArray(saved.profiles)) {
      state.profiles = saved.profiles;
      state.activeId = saved.activeId;
      for (const p of saved.profiles) state.progress[p.id] = normalise(saved.progress?.[p.id]);
    }
    // Progress saved before profiles existed goes to the first child created.
    if (!state.profiles.length) state.legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null');
  } catch {
    /* corrupt or unavailable storage – start fresh */
  }
  if (!state.profiles.some((p) => p.id === state.activeId)) state.activeId = state.profiles[0]?.id ?? null;
  return state;
}

const newId = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function useStore() {
  const [state, setState] = useState(load);

  useEffect(() => {
    try {
      const { profiles, activeId, progress } = state;
      localStorage.setItem(KEY, JSON.stringify({ profiles, activeId, progress }));
      if (profiles.length && !state.legacy) localStorage.removeItem(LEGACY_KEY);
    } catch {
      /* storage unavailable (private mode) – progress lasts for this visit only */
    }
  }, [state]);

  const updateChild = useCallback((fn) => {
    setState((s) => {
      if (!s.activeId) return s;
      const next = fn(s.progress[s.activeId]);
      return next === s.progress[s.activeId] ? s : { ...s, progress: { ...s.progress, [s.activeId]: next } };
    });
  }, []);

  // Mark a letter traced and keep its best tracing stars (1–3).
  const completeLetter = useCallback(
    (langId, letterId, stars = 0) =>
      updateChild((p) => {
        const l = p[langId];
        const isDone = l.done.includes(letterId);
        const best = l.stars?.[letterId] || 0;
        if (isDone && stars <= best) return p;
        return {
          ...p,
          [langId]: {
            ...l,
            done: isDone ? l.done : [...l.done, letterId],
            stars: stars > best ? { ...(l.stars || {}), [letterId]: stars } : l.stars || {},
          },
        };
      }),
    [updateChild],
  );

  const recordQuiz = useCallback(
    (langId, percent) =>
      updateChild((p) => ({
        ...p,
        [langId]: { ...p[langId], quizBest: Math.max(p[langId].quizBest, percent), quizPlays: p[langId].quizPlays + 1 },
      })),
    [updateChild],
  );

  const addProfile = useCallback((data) => {
    const id = newId();
    setState((s) => ({
      ...s,
      profiles: [...s.profiles, { id, ...data, createdAt: Date.now() }],
      activeId: id,
      progress: { ...s.progress, [id]: normalise(s.profiles.length ? null : s.legacy) },
      legacy: null,
    }));
    return id;
  }, []);

  const updateProfile = useCallback((id, data) => {
    setState((s) => ({ ...s, profiles: s.profiles.map((p) => (p.id === id ? { ...p, ...data } : p)) }));
  }, []);

  const deleteProfile = useCallback((id) => {
    setState((s) => {
      const profiles = s.profiles.filter((p) => p.id !== id);
      const progress = { ...s.progress };
      delete progress[id];
      return { ...s, profiles, progress, activeId: s.activeId === id ? profiles[0]?.id ?? null : s.activeId };
    });
  }, []);

  const resetProfile = useCallback((id) => {
    setState((s) => ({ ...s, progress: { ...s.progress, [id]: emptyProgress() } }));
  }, []);

  const setActive = useCallback((id) => setState((s) => ({ ...s, activeId: id })), []);

  const profile = useMemo(() => state.profiles.find((p) => p.id === state.activeId) || null, [state]);

  return {
    profiles: state.profiles,
    profile,
    progress: profile ? state.progress[profile.id] : emptyProgress(),
    progressOf: (id) => state.progress[id] || emptyProgress(),
    completeLetter,
    recordQuiz,
    addProfile,
    updateProfile,
    deleteProfile,
    resetProfile,
    setActive,
  };
}

// Tracing progress for one alphabet, 0–100.
export function percentFor(progress, alphabet) {
  const done = progress[alphabet.id]?.done ?? [];
  const valid = done.filter((id) => alphabet.letters.some((l) => l.id === id)).length;
  return Math.round((valid / alphabet.letters.length) * 100);
}

export function overallPercent(progress) {
  // each card counts once; English = average of capitals and small letters
  const all = MAIN_ALPHABETS.map((m) => {
    const v = variantsOf(m.id).map((a) => percentFor(progress, a));
    return v.reduce((x, y) => x + y, 0) / v.length;
  });
  return Math.round(all.reduce((x, y) => x + y, 0) / all.length);
}

export const starsOf = (progress) => ALPHABETS.reduce((n, a) => n + (progress[a.id]?.done.length ?? 0), 0);
