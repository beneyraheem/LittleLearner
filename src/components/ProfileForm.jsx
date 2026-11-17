import { useState } from 'react';
import Avatar from './Avatar';

const AGES = [2, 3, 4, 5, 6, 7, 8, 9, 10];

// Create or edit a child profile: name, gender and age.
export default function ProfileForm({ initial, title, subtitle, submitLabel = 'Save', onSave, onCancel }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [gender, setGender] = useState(initial?.gender ?? '');
  const [age, setAge] = useState(initial?.age ?? null);
  const valid = name.trim().length > 0 && gender && age;

  const submit = (e) => {
    e.preventDefault();
    if (valid) onSave({ name: name.trim().slice(0, 24), gender, age });
  };

  return (
    <div className="screen profile-screen">
      <form className="card profile-form pop-in" onSubmit={submit}>
        <Avatar profile={{ id: initial?.id || name, gender }} size={84} />
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}

        <label className="field">
          <span>Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Child's name"
            maxLength={24}
            autoComplete="off"
            enterKeyHint="done"
          />
        </label>

        <div className="field">
          <span>Boy or girl?</span>
          <div className="choice-row">
            {[
              ['girl', '👧', 'Girl'],
              ['boy', '👦', 'Boy'],
            ].map(([id, emoji, label]) => (
              <button
                type="button"
                key={id}
                className={`choice ${gender === id ? 'is-active' : ''}`}
                aria-pressed={gender === id}
                onClick={() => setGender(id)}
              >
                <span className="choice-emoji">{emoji}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span>Age</span>
          <div className="age-row">
            {AGES.map((a) => (
              <button
                type="button"
                key={a}
                className={`age ${age === a ? 'is-active' : ''}`}
                aria-pressed={age === a}
                onClick={() => setAge(a)}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="form-actions">
          {onCancel && (
            <button type="button" className="btn btn-soft" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button type="submit" className="btn btn-main btn-big" disabled={!valid}>
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
