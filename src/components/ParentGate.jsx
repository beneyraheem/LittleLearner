import { useMemo, useState } from 'react';

// A simple grown-ups-only check: add two numbers.
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

export default function ParentGate({ onPass, onCancel }) {
  const [round, setRound] = useState(0);
  const [x, y] = useMemo(() => [rand(3, 9), rand(3, 9)], [round]); // eslint-disable-line react-hooks/exhaustive-deps
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(false); // shake animation
  const [missed, setMissed] = useState(false); // show the try-again message

  const submit = (e) => {
    e.preventDefault();
    if (Number(value) === x + y) return onPass();
    setWrong(true);
    setMissed(true);
    setValue('');
    setRound((r) => r + 1);
  };

  return (
    <div className="overlay">
      <form className={`card gate pop-in ${wrong ? 'shake' : ''}`} onSubmit={submit} onAnimationEnd={() => setWrong(false)}>
        <div className="gate-lock">🔒</div>
        <h2>For grown-ups</h2>
        <p className="muted">Answer to open the parent menu</p>
        <div className="gate-q">
          {x} + {y} =
          <input
            autoFocus
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
            aria-label={`What is ${x} plus ${y}?`}
          />
        </div>
        {missed && <p className="gate-wrong">Not quite – try this one</p>}
        <div className="form-actions">
          <button type="button" className="btn btn-soft" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-main" disabled={!value}>
            Open
          </button>
        </div>
      </form>
    </div>
  );
}
