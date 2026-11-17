import { ALPHABETS, glyphStyle } from '../data/alphabets';
import { percentFor } from '../lib/progress';
import ProgressRing from './ProgressRing';

export default function Home({ progress, onOpen, onQuiz, onReset }) {
  const percents = ALPHABETS.map((a) => percentFor(progress, a));
  const overall = Math.round(percents.reduce((a, b) => a + b, 0) / percents.length);
  const stars = ALPHABETS.reduce((n, a) => n + progress[a.id].done.length, 0);

  return (
    <div className="screen home">
      <header className="home-head">
        <div>
          <h1 className="logo">
            Little <span>Learner</span>
          </h1>
          <p className="tagline">Trace, listen &amp; play with letters!</p>
        </div>
        <div className="home-stats">
          <ProgressRing percent={overall} color="#ffb03a" size={72} stroke={9} />
          <div className="stars-pill">⭐ {stars}</div>
        </div>
      </header>

      <div className="lang-grid">
        {ALPHABETS.map((a, i) => {
          const pct = percents[i];
          const p = progress[a.id];
          return (
            <article
              key={a.id}
              className="lang-card"
              style={{ '--main': a.theme.main, '--soft': a.theme.soft, '--deep': a.theme.deep, '--fs': a.displayScale, '--gy': a.glyphShift, '--stroke': a.textStroke }}
            >
              <button className="lang-card-body" onClick={() => onOpen(a.id)}>
                <div className="lang-letters" dir={a.dir} style={glyphStyle(a)}>
                  {a.letters.slice(0, 3).map((l) => (
                    <span key={l.id}>
                      <i className="glyph">{l.char}</i>
                    </span>
                  ))}
                </div>
                <div className="lang-info">
                  <h2>{a.title}</h2>
                  <p className="lang-native" style={{ fontFamily: a.font }}>
                    {a.nativeTitle}
                  </p>
                  <p className="lang-count">
                    {p.done.length} / {a.letters.length} letters
                  </p>
                </div>
                <ProgressRing percent={pct} color={a.theme.main} />
              </button>
              <div className="lang-actions">
                <button className="btn btn-main" onClick={() => onOpen(a.id)}>
                  ✏️ {pct === 0 ? 'Start' : pct === 100 ? 'Practice' : 'Continue'}
                </button>
                <button className="btn btn-soft" onClick={() => onQuiz(a.id)}>
                  🎯 Quiz {p.quizBest > 0 && <small>best {p.quizBest}%</small>}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <footer className="home-foot">
        <button
          className="link-btn"
          onClick={() => {
            if (window.confirm('Reset all progress? This cannot be undone.')) onReset();
          }}
        >
          Reset progress
        </button>
      </footer>
    </div>
  );
}
