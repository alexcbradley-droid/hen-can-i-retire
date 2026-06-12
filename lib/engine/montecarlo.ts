// Monte Carlo simulation: random monthly returns drawn from lognormal
// distributions parameterised by each pool's expected return and an
// approximate volatility, to estimate the probability the plan succeeds.

import { Scenario } from './types';
import { simulate } from './engine';
import { assetById } from './assets';

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller with the spare value cached, halving the transcendental calls. */
function makeGaussian(rand: () => number): () => number {
  let spare: number | null = null;
  return () => {
    if (spare !== null) {
      const v = spare;
      spare = null;
      return v;
    }
    let u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    const r = Math.sqrt(-2 * Math.log(u));
    spare = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  };
}

interface PoolParams { mu: number; sigma: number } // annual log-return params

function poolParams(meanPct: number, volPct: number): PoolParams {
  const m = 1 + meanPct / 100;
  const v = volPct / 100;
  const sigma2 = Math.log(1 + (v * v) / (m * m));
  return { mu: Math.log(m) - sigma2 / 2, sigma: Math.sqrt(sigma2) };
}

export interface MonteCarloResult {
  runs: number;
  successPct: number;
  percentileFinalNetWorth: { p10: number; p50: number; p90: number };
  medianRunOutAge: number | null;
}

export function monteCarlo(scenario: Scenario, runs = 300, seed = 42): MonteCarloResult {
  // Volatility per pool from the asset catalogue, weighted by value.
  const volOf = (types: string[]) => {
    const accs = scenario.accounts.filter((a) => types.includes(a.type));
    const tot = accs.reduce((t, a) => t + a.value, 0);
    if (tot <= 0) return 12;
    return accs.reduce((t, a) => t + assetById(a.assetId).volatilityPct * a.value, 0) / tot;
  };
  const meanOf = (types: string[], fallback: number) => {
    const accs = scenario.accounts.filter((a) => types.includes(a.type));
    const tot = accs.reduce((t, a) => t + a.value, 0);
    if (tot <= 0) return fallback;
    return accs.reduce((t, a) => t + (a.growthPct - a.feesPct) * a.value, 0) / tot;
  };

  const pools: Record<string, PoolParams> = {
    isa: poolParams(meanOf(['isa'], 5), volOf(['isa'])),
    gia: poolParams(meanOf(['gia'], 5), volOf(['gia'])),
    cash: poolParams(meanOf(['cash'], 3.5), 0.5),
  };
  for (const p of scenario.people) {
    const dcs = scenario.dcPensions.filter((d) => d.personId === p.id);
    const tot = dcs.reduce((t, d) => t + d.currentValue, 0);
    const mean = tot > 0 ? dcs.reduce((t, d) => t + (d.growthPct - d.feesPct) * d.currentValue, 0) / tot : 5;
    pools['pension:' + p.id] = poolParams(mean, 13);
  }

  let successes = 0;
  const finals: number[] = [];
  const runOuts: number[] = [];

  for (let run = 0; run < runs; run++) {
    const rand = mulberry32(seed + run * 7919);
    const gaussian = makeGaussian(rand);
    // One shared market factor per month plus idiosyncratic noise, so risky
    // pools are correlated (rho ≈ 0.8). Cached in a typed array, not a Map.
    const marketByMonth = new Float64Array(1800).fill(NaN);
    const override = (key: string, monthIndex: number): number | undefined => {
      const params = pools[key];
      if (!params) return undefined;
      let market = monthIndex < marketByMonth.length ? marketByMonth[monthIndex] : NaN;
      if (Number.isNaN(market)) {
        market = gaussian();
        if (monthIndex < marketByMonth.length) marketByMonth[monthIndex] = market;
      }
      const idio = gaussian();
      const z = key === 'cash' ? idio : 0.8 * market + 0.6 * idio;
      const monthlyMu = params.mu / 12;
      const monthlySigma = params.sigma / Math.sqrt(12);
      return Math.exp(monthlyMu + monthlySigma * z) - 1;
    };
    const r = simulate(scenario, { monthlyReturnsOverride: override });
    if (r.metrics.successToPlanAge) successes++;
    else if (r.metrics.runOutAge !== null) runOuts.push(r.metrics.runOutAge);
    finals.push(r.metrics.estateAtPlanAge);
  }

  finals.sort((a, b) => a - b);
  const pct = (p: number) => finals[Math.min(finals.length - 1, Math.floor((p / 100) * finals.length))];
  runOuts.sort((a, b) => a - b);

  return {
    runs,
    successPct: Math.round((successes / runs) * 100),
    percentileFinalNetWorth: { p10: pct(10), p50: pct(50), p90: pct(90) },
    medianRunOutAge: runOuts.length ? runOuts[Math.floor(runOuts.length / 2)] : null,
  };
}
