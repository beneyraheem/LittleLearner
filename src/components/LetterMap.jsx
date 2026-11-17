import { getAlphabet } from '../data/alphabets';
import { percentFor } from '../lib/progress';
import TopBar from './TopBar';

export default function LetterMap({ langId, progress, onBack, onLearn, onQuiz }) {
  const a = getAlphabet(langId);
  const done = new Set(progress[langId].done);
  const pct = percentFor(progress, a);
  const nextIndex = Math.max(0, a.letters.findIndex((l) => !done.has(l.id)));

  return (
    <div className="screen" style={{ '--main': a.theme.main, '--soft': a.theme.soft, '--deep': a.theme.deep, '--fs': a.displayScale, '--gy': a.glyphShift }}>
      <TopBar onBack={onBack} title={a.title} theme={a.theme}>
        <span className="pct-chip">{pct}%</span>
      </TopBar>

      <div className="map-hero">
        <div className="bar" aria-label={`${pct}% complete`}>
          <div className="bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="map-sub">
          {done.size} of {a.letters.length} letters traced
          {progress[langId].quizBest > 0 && <> · Quiz best {progress[langId].quizBest}%</>}
        </p>
        <div className="map-actions">
          <button className="btn btn-main btn-big" onClick={() => onLearn(nextIndex)}>
            ✏️ {pct === 100 ? 'Practice again' : done.size ? 'Continue' : 'Start!'}
          </button>
          <button className="btn btn-soft btn-big" onClick={onQuiz}>
            🎯 Quiz
          </button>
        </div>
      </div>

      <div className="letter-grid" dir={a.dir}>
        {a.letters.map((l, i) => {
          const isDone = done.has(l.id);
          const isNext = i === nextIndex && pct < 100;
          return (
            <button
              key={l.id}
              className={`tile ${isDone ? 'is-done' : ''} ${isNext ? 'is-next' : ''}`}
              onClick={() => onLearn(i)}
              aria-label={`${l.name}${isDone ? ', completed' : ''}`}
            >
              <span className="tile-char glyph" style={{ fontFamily: a.font }}>
                {l.char}
              </span>
              <span className="tile-name">{l.name}</span>
              {isDone && <span className="tile-star">⭐</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
