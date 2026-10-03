import { useEffect, useId, useState } from 'react';
import { inr } from '../calc/format.js';

export function NumField({ label, value, onChange, unit, money, step = 1, min, max, hint, compact }) {
  const id = useId();
  const [text, setText] = useState(String(value));
  useEffect(() => {
    if (parseFloat(text) !== value) setText(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handle = (e) => {
    const v = e.target.value;
    setText(v);
    const n = parseFloat(v);
    if (Number.isFinite(n)) onChange(n);
    else if (v === '') onChange(0);
  };

  return (
    <div className={'field' + (compact ? ' field--compact' : '')}>
      <label htmlFor={id}>{label}</label>
      <div className="field__box">
        {money && <span className="field__pre">₹</span>}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={text}
          step={step}
          min={min}
          max={max}
          onChange={handle}
        />
        {unit && <span className="field__unit">{unit}</span>}
      </div>
      {(money && value >= 1e5) || hint ? (
        <p className="field__hint">
          {money && value >= 1e5 ? inr(value) : null}
          {money && value >= 1e5 && hint ? '. ' : null}
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({ label, value, onChange }) {
  const id = useId();
  return (
    <div className="field field--compact">
      <label htmlFor={id}>{label}</label>
      <div className="field__box">
        <input id={id} type="text" value={value} maxLength={40} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

export function Segmented({ label, value, options, onChange, hint }) {
  const id = useId();
  return (
    <div className="field">
      {label && <span className="field__label" id={id}>{label}</span>}
      <div className="seg" role="radiogroup" aria-labelledby={label ? id : undefined}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            className={value === o.value ? 'seg__opt is-on' : 'seg__opt'}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
      {hint && <p className="field__hint">{hint}</p>}
    </div>
  );
}

export function Toggle({ label, checked, onChange }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle__track" aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}

export function Section({ title, summary, open, children }) {
  return (
    <details className="section" open={open}>
      <summary>
        <span className="section__title">{title}</span>
        {summary && <span className="section__sum">{summary}</span>}
      </summary>
      <div className="section__body">{children}</div>
    </details>
  );
}
