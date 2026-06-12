import { NextResponse } from 'next/server';
import { ASSET_CATALOGUE } from '@/lib/engine/assets';

// Live-ish market data for the investment pick lists. Sources:
//  - Stooq (free CSV endpoint) for listed ETFs — 5-year monthly closes
//  - CoinGecko (free public API, attribution required) for crypto
// Responses are cached for 12 hours via route segment config; on any failure the
// client falls back to the catalogue's long-run default assumptions.

export const revalidate = 43200; // 12 hours

const STOOQ_MAP: Record<string, string> = {
  // catalogue id -> stooq symbol (LSE listings use the .uk suffix)
  'global-equity': 'vwrp.uk',
  'us-equity': 'vuag.uk',
  'uk-equity': 'vukg.uk',
  'em-equity': 'vfeg.uk',
  'tech-equity': 'eqqq.uk',
  'dividend-equity': 'vhyl.uk',
  gilts: 'vgov.uk',
  'global-bonds': 'vags.uk',
  'money-market': 'csh2.uk',
  gold: 'sgln.uk',
  reit: 'iukp.uk',
};

async function stooqAnnualised5y(symbol: string): Promise<{ pct: number | null; last: number | null }> {
  try {
    const res = await fetch(`https://stooq.com/q/d/l/?s=${symbol}&i=m`, {
      next: { revalidate },
      headers: { 'User-Agent': 'when-can-i-retire.app market data (cached 12h)' },
    });
    if (!res.ok) return { pct: null, last: null };
    const text = await res.text();
    const lines = text.trim().split('\n').slice(1); // Date,Open,High,Low,Close,Volume
    if (lines.length < 13) return { pct: null, last: null };
    const rows = lines.map((l) => l.split(','));
    const closes = rows.map((r) => parseFloat(r[4])).filter((n) => isFinite(n) && n > 0);
    if (closes.length < 13) return { pct: null, last: null };
    const months = Math.min(60, closes.length - 1);
    const first = closes[closes.length - 1 - months];
    const last = closes[closes.length - 1];
    const years = months / 12;
    const pct = (Math.pow(last / first, 1 / years) - 1) * 100;
    if (!isFinite(pct) || pct < -50 || pct > 100) return { pct: null, last };
    return { pct: Math.round(pct * 10) / 10, last };
  } catch {
    return { pct: null, last: null };
  }
}

async function coingecko(id: string): Promise<{ pct: number | null; last: number | null }> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=gbp&days=365&interval=daily`,
      { next: { revalidate }, headers: { accept: 'application/json' } },
    );
    if (!res.ok) return { pct: null, last: null };
    const data = (await res.json()) as { prices?: [number, number][] };
    const prices = data.prices ?? [];
    if (prices.length < 30) return { pct: null, last: null };
    const first = prices[0][1];
    const last = prices[prices.length - 1][1];
    const pct = ((last - first) / first) * 100; // 1-year change, not a forecast
    return { pct: Math.round(pct * 10) / 10, last: Math.round(last) };
  } catch {
    return { pct: null, last: null };
  }
}

export async function GET() {
  const assets: Record<string, { annualised5yPct: number | null; lastPrice: number | null }> = {};

  const jobs = ASSET_CATALOGUE.map(async (a) => {
    if (a.liveSymbol?.source === 'coingecko') {
      const { pct, last } = await coingecko(a.liveSymbol.symbol);
      // Crypto: report 1y change as information only; never override the user's growth input
      assets[a.id] = { annualised5yPct: pct, lastPrice: last };
    } else if (STOOQ_MAP[a.id]) {
      const { pct, last } = await stooqAnnualised5y(STOOQ_MAP[a.id]);
      assets[a.id] = { annualised5yPct: pct, lastPrice: last };
    } else {
      assets[a.id] = { annualised5yPct: null, lastPrice: null };
    }
  });
  await Promise.allSettled(jobs);

  return NextResponse.json({
    asOf: new Date().toISOString(),
    assets,
    attribution: 'Listed-fund history via Stooq; crypto prices by CoinGecko. Past performance is not a reliable indicator of future results.',
  });
}
