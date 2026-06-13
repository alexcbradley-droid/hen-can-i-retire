// Factory helpers for new scenarios. The sample scenario doubles as the
// preview/demo content and as the engine smoke-test fixture.

import { Scenario } from './types';
import { PROJECTION_DEFAULTS } from './uk-rules';

let counter = 0;
export function uid(prefix = 'id'): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}-${Math.random().toString(36).slice(2, 7)}`;
}

export function emptyScenario(name = 'My plan'): Scenario {
  const personId = uid('p');
  const now = new Date().toISOString();
  return {
    id: uid('scn'),
    name,
    createdAt: now,
    updatedAt: now,
    people: [{ id: personId, name: 'You', dateOfBirth: '1980-01-01', sex: 'unspecified', planToAge: PROJECTION_DEFAULTS.defaultPlanToAge }],
    employments: [{ personId, grossSalary: 40000, salaryGrowthPct: 3, bonus: 0, retirementDate: '2047-01' }],
    dcPensions: [{
      id: uid('dc'), personId, name: 'Workplace pension', currentValue: 50000,
      employeePct: 5, employerPct: 3, extraMonthly: 0, salarySacrifice: false,
      growthPct: 5, feesPct: 0.5, takePclsAtRetirement: true, pclsInvestTo: 'isa-then-gia',
    }],
    dbPensions: [],
    statePensions: [{ personId, qualifyingYears: 20, yearsStillWorking: true, deferralYears: 0 }],
    accounts: [
      { id: uid('acc'), personId, name: 'Cash savings', type: 'cash', value: 10000, monthlyContribution: 0, assetId: 'cash-savings', growthPct: 3.5, feesPct: 0 },
      { id: uid('acc'), personId, name: 'Stocks & shares ISA', type: 'isa', value: 15000, monthlyContribution: 200, assetId: 'global-equity', growthPct: 7, feesPct: 0.3 },
    ],
    properties: [],
    events: [],
    spending: {
      preRetirementMonthly: 2200,
      retirement: { kind: 'plsa', standard: 'moderate' },
      oneOffs: [],
    },
    assumptions: {
      inflationPct: PROJECTION_DEFAULTS.inflationPct,
      cashBufferMonths: 12,
      withdrawalOrder: 'cash-gia-isa-pension',
      displayReal: false,
    },
    goals: {},
  };
}

/** Display name of the demo plan — used to find it again across sessions. */
export const SAMPLE_SCENARIO_NAME = 'Sample household';

/** Richer sample household used for the demo and tests. */
export function sampleScenario(): Scenario {
  const s = emptyScenario(SAMPLE_SCENARIO_NAME);
  const you = s.people[0];
  you.name = 'Alex';
  you.dateOfBirth = '1972-07-30';
  const partnerId = uid('p');
  s.people.push({ id: partnerId, name: 'Sam', dateOfBirth: '1974-05-01', sex: 'unspecified', planToAge: 95 });
  s.employments = [
    { personId: you.id, grossSalary: 85000, salaryGrowthPct: 3.5, bonus: 10000, retirementDate: '2031-07' },
    { personId: partnerId, grossSalary: 32000, salaryGrowthPct: 2.5, bonus: 0, retirementDate: '2032-05' },
  ];
  s.dcPensions = [{
    id: uid('dc'), personId: you.id, name: 'SIPP', currentValue: 250000,
    employeePct: 8, employerPct: 6, extraMonthly: 300, salarySacrifice: true,
    growthPct: 6, feesPct: 0.4, takePclsAtRetirement: true, pclsInvestTo: 'isa-then-gia',
  }, {
    id: uid('dc'), personId: partnerId, name: 'Workplace pension', currentValue: 60000,
    employeePct: 5, employerPct: 3, extraMonthly: 0, salarySacrifice: false,
    growthPct: 5, feesPct: 0.6, takePclsAtRetirement: true, pclsInvestTo: 'isa-then-gia',
  }];
  s.statePensions = [
    { personId: you.id, qualifyingYears: 32, yearsStillWorking: true, deferralYears: 0 },
    { personId: partnerId, qualifyingYears: 28, yearsStillWorking: true, deferralYears: 0 },
  ];
  s.accounts = [
    { id: uid('acc'), personId: you.id, name: 'Cash', type: 'cash', value: 30000, monthlyContribution: 0, assetId: 'cash-savings', growthPct: 3.5, feesPct: 0 },
    { id: uid('acc'), personId: you.id, name: 'ISA (global tracker)', type: 'isa', value: 90000, monthlyContribution: 500, assetId: 'global-equity', growthPct: 7, feesPct: 0.25 },
    { id: uid('acc'), personId: you.id, name: 'General investment account', type: 'gia', value: 40000, monthlyContribution: 0, assetId: 'mixed-60-40', growthPct: 5.5, feesPct: 0.3, costBasis: 30000 },
  ];
  s.properties = [{
    id: uid('prop'), name: 'Home', isMainHome: true, value: 450000, growthPct: 3,
    mortgage: { balance: 120000, ratePct: 4.0, monthlyPayment: 1400, interestOnly: false },
  }, {
    id: uid('prop'), name: 'Buy-to-let flat', isMainHome: false, value: 220000, growthPct: 2.5,
    mortgage: { balance: 90000, ratePct: 4.5, monthlyPayment: 600, interestOnly: true },
    rental: { grossMonthlyRent: 1100, rentGrowthPct: 2, monthlyCosts: 200 },
    sale: { date: '2040-06', proceedsTo: 'invest' },
  }];
  s.events = [
    { id: uid('ev'), name: 'Expected inheritance', date: '2036-01', amount: 100000, to: 'invest' },
  ];
  s.spending = {
    preRetirementMonthly: 3400,
    retirement: { kind: 'phases', goGo: 3600, slowGo: 2900, noGo: 2400, slowGoAge: 75, noGoAge: 85 },
    oneOffs: [{ id: uid('so'), name: 'New car', date: '2033-06', amount: 25000 }],
    careCosts: { fromAge: 90, monthlyToday: 1500 },
  };
  s.goals = { targetRetirementDate: '2031-07', targetMonthlyIncome: 3500 };
  return s;
}
