import { useInstall } from '../lib/install';

// "Add to Home Screen" help for parents, shown in the parent menu.
export default function InstallCard() {
  const { installed, canPrompt, ios, prompt } = useInstall();

  return (
    <section className="card install-card">
      <img src="icons/icon-192.png" alt="" width="56" height="56" />
      <div className="install-body">
        <h2>{installed ? 'Installed on this device ✓' : 'Add to Home Screen'}</h2>
        {installed ? (
          <p className="muted">Little Learner opens like an app and works offline.</p>
        ) : canPrompt ? (
          <>
            <p className="muted">Keep Little Learner on your phone like an app – it works offline too.</p>
            <button className="btn btn-main btn-small" onClick={prompt}>
              📲 Install app
            </button>
          </>
        ) : ios ? (
          <ol className="install-steps">
            <li>
              Open this page in <b>Safari</b>
            </li>
            <li>
              Tap the <b>Share</b> button <span className="share-ico">⬆︎</span>
            </li>
            <li>
              Choose <b>Add to Home Screen</b>
            </li>
          </ol>
        ) : (
          <p className="muted">
            Open your browser menu <b>⋮</b> and choose <b>Install app</b> or <b>Add to Home screen</b>.
          </p>
        )}
        {!installed && ios && (
          <p className="install-note muted">
            On iPhone the home-screen app keeps its own progress – set up your child's profile again there.
          </p>
        )}
      </div>
    </section>
  );
}
