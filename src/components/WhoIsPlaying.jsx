import { overallPercent } from '../lib/progress';
import Avatar from './Avatar';

export default function WhoIsPlaying({ profiles, progressOf, activeId, onPick, onParent }) {
  return (
    <div className="screen who">
      <h1 className="who-title">Who's playing?</h1>
      <div className="who-grid">
        {profiles.map((p) => (
          <button
            key={p.id}
            className={`who-card pop-in ${p.id === activeId ? 'is-active' : ''}`}
            onClick={() => onPick(p.id)}
          >
            <Avatar profile={p} size={88} />
            <span className="who-name">{p.name}</span>
            <span className="muted">{overallPercent(progressOf(p.id))}% done</span>
          </button>
        ))}
      </div>
      <button className="parent-btn" onClick={onParent}>
        🔒 Parents
      </button>
    </div>
  );
}
