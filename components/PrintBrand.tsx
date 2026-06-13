// Shared print/PDF header + disclaimer so every printable surface carries the
// brand and the regulatory wording without re-assembling them by hand.

import { RULES_VERSION } from '@/lib/engine/uk-rules';

export function PrintBrand({ title }: { title: string }) {
  return <div className="print-brand"><b>When can I retire? — {title}</b></div>;
}

export function PrintMeta() {
  return (
    <p className="muted small print-only" style={{ margin: '0 0 8px' }}>
      Prepared {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} ·
      Rules: {RULES_VERSION} · Guidance only, not financial advice.
    </p>
  );
}
