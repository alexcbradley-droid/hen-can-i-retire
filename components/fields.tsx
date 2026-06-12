'use client';

// Small controlled form helpers used across the editor.

export function NumField({ label, value, onChange, step, min, suffix }: {
  label: string; value: number; onChange: (v: number) => void;
  step?: number; min?: number; suffix?: string;
}) {
  return (
    <label className="field">
      <b>{label}{suffix ? <span className="muted"> ({suffix})</span> : null}</b>
      <input
        type="number"
        value={Number.isFinite(value) ? value : ''}
        step={step ?? 1}
        min={min}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </label>
  );
}

export function TextField({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <label className="field">
      <b>{label}</b>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function MonthField({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <label className="field">
      <b>{label}</b>
      <input type="month" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function DateField({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <label className="field">
      <b>{label}</b>
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="field">
      <b>{label}</b>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function CheckField({ label, value, onChange }: {
  label: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="checkbox-row">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
