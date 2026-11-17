// ABC | abc switch for English (capital / small letters).
export default function CaseSwitch({ value, onChange }) {
  return (
    <div className="case-switch" role="radiogroup" aria-label="Capital or small letters">
      {[
        ['en', 'ABC', 'Capital letters'],
        ['enl', 'abc', 'Small letters'],
      ].map(([id, label, aria]) => (
        <button
          key={id}
          role="radio"
          aria-checked={value === id}
          aria-label={aria}
          className={value === id ? 'is-active' : ''}
          onClick={(e) => {
            e.stopPropagation();
            onChange(id);
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
