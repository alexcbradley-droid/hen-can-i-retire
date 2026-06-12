// Investment asset catalogue. Each entry powers the pick lists in the UI.
// defaultGrowthPct is a long-run nominal annual return assumption (editable by
// the user); liveSymbol lets /api/market refresh recent performance from real
// market data (Yahoo Finance for listed assets, CoinGecko for crypto).

export type AssetClass = 'equity' | 'bond' | 'cash' | 'property' | 'crypto' | 'commodity' | 'mixed';

export interface AssetDef {
  id: string;
  label: string;
  class: AssetClass;
  defaultGrowthPct: number; // nominal %/year
  volatilityPct: number; // annualised std dev, drives Monte Carlo
  liveSymbol?: { source: 'yahoo' | 'coingecko'; symbol: string };
  note?: string;
}

export const ASSET_CATALOGUE: AssetDef[] = [
  { id: 'global-equity', label: 'Global equities (e.g. all-world tracker)', class: 'equity', defaultGrowthPct: 7.0, volatilityPct: 15, liveSymbol: { source: 'yahoo', symbol: 'VWRP.L' } },
  { id: 'us-equity', label: 'US equities (S&P 500 tracker)', class: 'equity', defaultGrowthPct: 7.5, volatilityPct: 16, liveSymbol: { source: 'yahoo', symbol: 'VUAG.L' } },
  { id: 'uk-equity', label: 'UK equities (FTSE All-Share tracker)', class: 'equity', defaultGrowthPct: 6.0, volatilityPct: 14, liveSymbol: { source: 'yahoo', symbol: 'VUKG.L' } },
  { id: 'em-equity', label: 'Emerging market equities', class: 'equity', defaultGrowthPct: 7.0, volatilityPct: 20, liveSymbol: { source: 'yahoo', symbol: 'VFEG.L' } },
  { id: 'tech-equity', label: 'Technology equities (Nasdaq 100 tracker)', class: 'equity', defaultGrowthPct: 8.0, volatilityPct: 22, liveSymbol: { source: 'yahoo', symbol: 'EQQQ.L' } },
  { id: 'dividend-equity', label: 'Dividend / income equities', class: 'equity', defaultGrowthPct: 6.0, volatilityPct: 13, liveSymbol: { source: 'yahoo', symbol: 'VHYL.L' } },
  { id: 'mixed-80-20', label: 'Mixed 80% shares / 20% bonds (e.g. LifeStrategy 80)', class: 'mixed', defaultGrowthPct: 6.2, volatilityPct: 12, liveSymbol: { source: 'yahoo', symbol: 'VNGA80.MI' } },
  { id: 'mixed-60-40', label: 'Mixed 60% shares / 40% bonds', class: 'mixed', defaultGrowthPct: 5.5, volatilityPct: 10, liveSymbol: { source: 'yahoo', symbol: 'VNGA60.MI' } },
  { id: 'gilts', label: 'UK government bonds (gilts)', class: 'bond', defaultGrowthPct: 4.0, volatilityPct: 7, liveSymbol: { source: 'yahoo', symbol: 'VGOV.L' } },
  { id: 'global-bonds', label: 'Global bonds (hedged)', class: 'bond', defaultGrowthPct: 4.0, volatilityPct: 6, liveSymbol: { source: 'yahoo', symbol: 'VAGS.L' } },
  { id: 'money-market', label: 'Money market / cash fund', class: 'cash', defaultGrowthPct: 3.5, volatilityPct: 0.5, liveSymbol: { source: 'yahoo', symbol: 'CSH2.L' } },
  { id: 'cash-savings', label: 'Cash savings account', class: 'cash', defaultGrowthPct: 3.5, volatilityPct: 0 },
  { id: 'gold', label: 'Gold', class: 'commodity', defaultGrowthPct: 4.5, volatilityPct: 15, liveSymbol: { source: 'yahoo', symbol: 'SGLN.L' } },
  { id: 'reit', label: 'Property funds (REITs)', class: 'property', defaultGrowthPct: 5.5, volatilityPct: 14, liveSymbol: { source: 'yahoo', symbol: 'IUKP.L' } },
  { id: 'bitcoin', label: 'Bitcoin', class: 'crypto', defaultGrowthPct: 10.0, volatilityPct: 60, liveSymbol: { source: 'coingecko', symbol: 'bitcoin' }, note: 'Extremely volatile, no reliable expected return. The FCA classes crypto as high risk: you could lose everything.' },
  { id: 'ethereum', label: 'Ethereum', class: 'crypto', defaultGrowthPct: 10.0, volatilityPct: 70, liveSymbol: { source: 'coingecko', symbol: 'ethereum' }, note: 'Extremely volatile, no reliable expected return. The FCA classes crypto as high risk: you could lose everything.' },
  { id: 'custom', label: 'Custom (set your own growth rate)', class: 'mixed', defaultGrowthPct: 5.0, volatilityPct: 10 },
];

export function assetById(id: string): AssetDef {
  return ASSET_CATALOGUE.find((a) => a.id === id) ?? ASSET_CATALOGUE[ASSET_CATALOGUE.length - 1];
}
