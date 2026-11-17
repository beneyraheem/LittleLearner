import { ALPHABETS } from '../data/alphabets';
import { overallPercent, percentFor, starsOf } from '../lib/progress';
import Avatar from './Avatar';
import TopBar from './TopBar';
import InstallCard from './InstallCard';

export default function ParentMenu({ profiles, progressOf, onBack, onAdd, onEdit, onReset, onDelete }) {
  return (
    <div className="screen parent">
      <TopBar onBack={onBack} title="Parent menu" />

      <div className="parent-list">
        {profiles.map((p) => {
          const prog = progressOf(p.id);
          return (
            <article key={p.id} className="card child-card">
              <header className="child-head">
                <Avatar profile={p} size={60} />
                <div className="child-info">
                  <h2>{p.name}</h2>
                  <p className="muted">
                    {p.gender === 'girl' ? 'Girl' : 'Boy'} · {p.age} years
                  </p>
                </div>
                <div className="child-overall">
                  <b>{overallPercent(prog)}%</b>
                  <span className="muted">⭐ {starsOf(prog)}</span>
                </div>
              </header>

              <ul className="child-stats">
                {ALPHABETS.map((a) => {
                  const pct = percentFor(prog, a);
                  return (
                    <li key={a.id} style={{ '--main': a.theme.main }}>
                      <span className="stat-name">{a.title}</span>
                      <span className="stat-bar">
                        <span style={{ width: `${pct}%` }} />
                      </span>
                      <span className="stat-pct">{pct}%</span>
                      <span className="stat-quiz muted">
                        {prog[a.id].quizPlays ? `Quiz best ${prog[a.id].quizBest}%` : 'No quiz yet'}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <div className="child-actions">
                <button className="btn btn-soft btn-small" onClick={() => onEdit(p.id)}>
                  ✏️ Edit
                </button>
                <button
                  className="btn btn-soft btn-small"
                  onClick={() => window.confirm(`Reset all of ${p.name}'s progress?`) && onReset(p.id)}
                >
                  ↺ Reset progress
                </button>
                <button
                  className="btn btn-danger btn-small"
                  onClick={() =>
                    window.confirm(`Delete ${p.name}'s profile and progress? This cannot be undone.`) && onDelete(p.id)
                  }
                >
                  🗑 Delete
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <button className="btn btn-main btn-big add-child" onClick={onAdd}>
        ＋ Add a child
      </button>
      <InstallCard />
      <p className="muted parent-note">Progress is saved on this device only.</p>
    </div>
  );
}
