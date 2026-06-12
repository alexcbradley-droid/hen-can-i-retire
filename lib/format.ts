export function gbp(n: number, dp = 0): string {
  if (!isFinite(n)) return '—';
  return n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: dp, maximumFractionDigits: dp });
}

export function gbpShort(n: number): string {
  if (!isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `£${(n / 1_000_000).toFixed(2)}m`;
  if (abs >= 10_000) return `£${Math.round(n / 1000)}k`;
  return gbp(n);
}

export function ymLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

/** Deflate a nominal value at month-offset `monthsFromNow` to today's money. */
export function toReal(nominal: number, monthsFromNow: number, inflationPct: number): number {
  return nominal / Math.pow(1 + inflationPct / 100, monthsFromNow / 12);
}
