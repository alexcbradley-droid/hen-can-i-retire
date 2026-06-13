'use client';

// Small controlled form helpers used across the editor.
//
// `hint` renders always-visible help text under the label (GOV.UK pattern —
// works on touch devices, unlike hover tooltips). `required` marks fields the
// assessment needs with a coloured asterisk.

import { ReactNode } from 'react';

function FieldLabel({ label, suffix, required, hint }: {
  label: string; suffix?: string; required?: boolean; hint?: string;
}) {
  return (
    <>
      <b>
        {label}
        {suffix ? <span className="muted"> ({suffix})</span> : null}
        {required ? <span className="req" title="Needed for an accurate result" aria-label="required"> *</span> : null}
      </b>
      {hint ? <span className="field-hint">{hint}</span> : null}
    </>
  );
}

export function NumField({ label, value, onChange, step, min, suffix, hint, required }: {
  label: string; value: number; onChange: (v: number) => void;
  step?: number; min?: number; suffix?: string; hint?: string; required?: boolean;
}) {
  return (
    <label className="field">
      <FieldLabel label={label} suffix={suffix} required={required} hint={hint} />
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

export function TextField({ label, value, onChange, hint, required }: {
  label: string; value: string; onChange: (v: string) => void; hint?: string; required?: boolean;
}) {
  return (
    <label className="field">
      <FieldLabel label={label} required={required} hint={hint} />
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function MonthField({ label, value, onChange, hint, required }: {
  label: string; value: string; onChange: (v: string) => void; hint?: string; required?: boolean;
}) {
  return (
    <label className="field">
      <FieldLabel label={label} required={required} hint={hint} />
      <input type="month" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function DateField({ label, value, onChange, hint, required }: {
  label: string; value: string; onChange: (v: string) => void; hint?: string; required?: boolean;
}) {
  return (
    <label className="field">
      <FieldLabel label={label} required={required} hint={hint} />
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function SelectField({ label, value, onChange, options, hint, required }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; hint?: string; required?: boolean;
}) {
  return (
    <label className="field">
      <FieldLabel label={label} required={required} hint={hint} />
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function CheckField({ label, value, onChange, hint }: {
  label: string; value: boolean; onChange: (v: boolean) => void; hint?: string;
}) {
  return (
    <label className="checkbox-row" title={hint}>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {label}
        {hint ? <span className="field-hint" style={{ display: 'block' }}>{hint}</span> : null}
      </span>
    </label>
  );
}

/** Section heading with optional always-visible explainer line. */
export function SectionHelp({ children }: { children: ReactNode }) {
  return <p className="small muted" style={{ margin: '-6px 0 12px' }}>{children}</p>;
}
