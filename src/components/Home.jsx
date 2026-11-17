import { ALPHABETS, glyphStyle } from '../data/alphabets';
import { percentFor, overallPercent, starsOf } from '../lib/progress';
import ProgressRing from './ProgressRing';
import Avatar from './Avatar';

export default function Home({ profile, progress, onOpen, onQuiz, onSwitch, onParent }) {
  const percents = ALPHABETS.map((a) => percentFor(progress, a));
  const overall = overallPercent(progress);
  const stars = starsOf(progress);

  return (
    <div className="screen home">
      <header className="home-head">
        <button className="child-chip" onClick={onSwitch} aria-label={`${profile.name} – switch child`}>
          <Avatar profile={profile} size={64} />
          <span>
            <span className="logo-small">
              Little <b>Learner</b>
            </span>
            <span className="hello">Hi, {profile.name}! 👋</span>
          </span>
        </button>
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
                  🎯 Quiz {p.quizBest > 0 && <small>⭐ {p.quizBest}%</small>}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <footer className="home-foot">
        <button className="parent-btn" onClick={onParent}>
          🔒 Parents
        </button>
      </footer>
    </div>
  );
}
