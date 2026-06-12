'use client';

import { useEffect, useState } from 'react';

export interface MarketData {
  asOf: string;
  assets: Record<string, { annualised5yPct: number | null; lastPrice: number | null; currency?: string }>;
  attribution: string;
}

let cached: MarketData | null = null;

/** Live-ish market data for the asset pick list; null until loaded or if unavailable. */
export function useMarketData(): MarketData | null {
  const [data, setData] = useState<MarketData | null>(cached);
  useEffect(() => {
    if (cached) return;
    let alive = true;
    fetch('/api/market')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.assets) { cached = d; setData(d); } })
      .catch(() => { /* offline or rate-limited: defaults are used */ });
    return () => { alive = false; };
  }, []);
  return data;
}
