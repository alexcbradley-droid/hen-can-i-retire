// Goal solvers built on the deterministic engine.

import { Scenario, ProjectionResult, SensitivityResult } from './types';
import { simulate, ymToIndex, indexToYm } from './engine';

/** Highest flat retirement spend (£/month today's money) the plan supports to plan age. */
export function sustainableMonthlyIncome(scenario: Scenario): number {
  let lo = 0;
  let hi = 50000;
  for (let iter = 0; iter < 18; iter++) {
    const mid = (lo + hi) / 2;
    const r = simulate(scenario, { flatRetirementSpendOverride: mid });
    if (r.metrics.successToPlanAge) lo = mid; else hi = mid;
  }
  return Math.floor(lo);
}

/**
 * Earliest retirement date (shifting every retirement date earlier in lockstep)
 * such that the plan still succeeds to plan age. Returns null if even the
 * planned date fails. Success is monotone in the retirement date (retiring
 * later never hurts), so a binary search on "months earlier" suffices.
 */
export function earliestRetirementDate(scenario: Scenario, maxEarlierYears = 25): string | null {
  const baseline = simulate(scenario);
  if (!baseline.metrics.successToPlanAge) return null;

  const baseIdx = ymToIndex(baseline.metrics.retirementDate);
  const nowIdx = ymToIndex(new Date().toISOString().slice(0, 7));
  let lo = 0; // months earlier that still succeeds
  let hi = Math.min(maxEarlierYears * 12, baseIdx - nowIdx - 1); // can't retire in the past
  while (lo < hi) {
    const mid = Math.ceil((lo + hi + 1) / 2);
    const r = simulate(scenario, { retirementShiftMonths: -mid });
    if (r.metrics.successToPlanAge) lo = mid; else hi = mid - 1;
  }
  return indexToYm(baseIdx - lo);
}

/**
 * "Can I retire on my target date / with my target income?" Forward check.
 * Returns the sustainable income with every retirement date moved to the goal.
 */
export function goalCheck(scenario: Scenario): {
  targetDate: string | null;
  targetIncomeMonthly: number | null;
  sustainableAtTarget: number;
  meetsIncomeGoal: boolean | null;
} {
  const targetDate = scenario.goals.targetRetirementDate ?? null;
  const targetIncome = scenario.goals.targetMonthlyIncome ?? null;
  const s = targetDate
    ? { ...scenario, employments: scenario.employments.map((e) => ({ ...e, retirementDate: targetDate })) }
    : scenario;
  const sustainable = sustainableMonthlyIncome(s);
  return {
    targetDate,
    targetIncomeMonthly: targetIncome,
    sustainableAtTarget: sustainable,
    meetsIncomeGoal: targetIncome !== null ? sustainable >= targetIncome : null,
  };
}

/** Standard sensitivity grid: returns, inflation, retirement date, longevity, crash. */
export function sensitivityGrid(scenario: Scenario): SensitivityResult[] {
  const cases: { label: string; delta: string; opt: Parameters<typeof simulate>[1] }[] = [
    { label: 'Base case', delta: 'Your assumptions as entered', opt: {} },
    { label: 'Lower returns', delta: 'All growth rates −2 percentage points', opt: { returnDeltaPct: -2 } },
    { label: 'Higher returns', delta: 'All growth rates +2 percentage points', opt: { returnDeltaPct: 2 } },
    { label: 'Higher inflation', delta: 'Inflation +1.5 percentage points', opt: { inflationDeltaPct: 1.5 } },
    { label: 'Retire 2 years earlier', delta: 'Every retirement date moved 24 months earlier', opt: { retirementShiftMonths: -24 } },
    { label: 'Retire 2 years later', delta: 'Every retirement date moved 24 months later', opt: { retirementShiftMonths: 24 } },
    { label: 'Live to 100', delta: 'Plan horizon extended to age 100', opt: { planToAgeOverride: 100 } },
    { label: 'Market crash at retirement', delta: '−30% on invested assets in the first retirement month', opt: { crashYearOnePct: -30 } },
  ];
  return cases.map((c) => {
    const r = simulate(scenario, c.opt);
    return {
      label: c.label,
      delta: c.delta,
      runOutAge: r.metrics.runOutAge,
      netWorthAtPlanAge: r.metrics.estateAtPlanAge,
      sustainableMonthlyIncome: 0, // expensive; filled lazily by UI on demand
    };
  });
}

/** Full projection with solver-derived metrics filled in. */
export function fullProjection(scenario: Scenario): ProjectionResult {
  const r = simulate(scenario);
  r.metrics.sustainableMonthlyIncome = sustainableMonthlyIncome(scenario);
  r.metrics.earliestRetirementDate = earliestRetirementDate(scenario);
  return r;
}
