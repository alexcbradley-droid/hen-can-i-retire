// Maps the AI spreadsheet-interpretation result onto a full Scenario.

import { Scenario } from './engine/types';
import { emptyScenario, uid } from './engine/defaults';
import { assetById } from './engine/assets';

export interface Intake {
  people: { name: string; dateOfBirth: string }[];
  employments: { personIndex: number; grossSalary: number; bonus: number; salaryGrowthPct: number; retirementDate: string }[];
  dcPensions: { personIndex: number; name: string; currentValue: number; employeePct: number; employerPct: number; extraMonthly: number; salarySacrifice: boolean; growthPct: number }[];
  dbPensions: { personIndex: number; name: string; annualPension: number; normalPensionAge: number }[];
  statePensionQualifyingYears: number[];
  accounts: { personIndex: number; name: string; type: 'cash' | 'isa' | 'gia' | 'premium-bonds'; value: number; monthlyContribution: number; assetId: string; growthPct: number }[];
  properties: { name: string; isMainHome: boolean; value: number; growthPct: number; mortgageBalance: number; mortgageRatePct: number; mortgageMonthlyPayment: number; interestOnly: boolean; grossMonthlyRent: number; rentalMonthlyCosts: number }[];
  events: { name: string; date: string; amount: number }[];
  preRetirementMonthlySpend: number;
  retirementMonthlySpend: number;
  notes: string[];
  questions: string[];
}

export function intakeToScenario(intake: Intake, name = 'Imported plan'): Scenario {
  const s = emptyScenario(name);
  const people = (intake.people?.length ? intake.people : [{ name: 'You', dateOfBirth: '1980-01-01' }]).slice(0, 2);
  s.people = people.map((p) => ({
    id: uid('p'),
    name: p.name || 'You',
    dateOfBirth: /^\d{4}-\d{2}-\d{2}$/.test(p.dateOfBirth) ? p.dateOfBirth : '1980-01-01',
    sex: 'unspecified' as const,
    planToAge: 95,
  }));
  // Resolve a (possibly out-of-range) person index from the AI to a real person.
  const personAt = (i: number) => s.people[Math.min(Math.max(0, Math.trunc(i ?? 0)), s.people.length - 1)];
  const pid = (i: number) => personAt(i).id;
  if ((intake.people?.length ?? 0) > 2) {
    intake.questions = [
      'The spreadsheet mentions more than two people — this planner models up to two, so extra people’s figures were merged onto the second person. Please check them.',
      ...(intake.questions ?? []),
    ];
  }

  s.employments = (intake.employments ?? []).map((e) => ({
    personId: pid(e.personIndex),
    grossSalary: e.grossSalary || 0,
    bonus: e.bonus || 0,
    salaryGrowthPct: e.salaryGrowthPct ?? 3,
    retirementDate: /^\d{4}-\d{2}$/.test(e.retirementDate) ? e.retirementDate : defaultRetirement(s, e.personIndex),
  }));
  if (!s.employments.length) {
    s.employments = [{ personId: s.people[0].id, grossSalary: 0, bonus: 0, salaryGrowthPct: 0, retirementDate: defaultRetirement(s, 0) }];
  }

  s.dcPensions = (intake.dcPensions ?? []).map((d) => ({
    id: uid('dc'), personId: pid(d.personIndex), name: d.name || 'Pension',
    currentValue: d.currentValue || 0, employeePct: d.employeePct || 0, employerPct: d.employerPct || 0,
    extraMonthly: d.extraMonthly || 0, salarySacrifice: !!d.salarySacrifice,
    growthPct: d.growthPct || 5, feesPct: 0.5, takePclsAtRetirement: true, pclsInvestTo: 'isa-then-gia' as const,
  }));
  s.dbPensions = (intake.dbPensions ?? []).map((d) => ({
    id: uid('db'), personId: pid(d.personIndex), name: d.name || 'Defined benefit pension',
    annualPension: d.annualPension || 0, normalPensionAge: d.normalPensionAge || 65,
    startAge: d.normalPensionAge || 65, earlyReductionPct: 4.5, revaluationPct: 2.5, indexationPct: 2.5, lumpSum: 0,
  }));
  s.statePensions = s.people.map((p, i) => ({
    personId: p.id,
    qualifyingYears: intake.statePensionQualifyingYears?.[i] ?? 30,
    yearsStillWorking: true,
    deferralYears: 0,
  }));
  s.accounts = (intake.accounts ?? []).map((a) => ({
    id: uid('acc'), personId: pid(a.personIndex), name: a.name || 'Account',
    type: a.type ?? 'cash', value: a.value || 0, monthlyContribution: a.monthlyContribution || 0,
    assetId: assetById(a.assetId).id, growthPct: a.growthPct ?? assetById(a.assetId).defaultGrowthPct, feesPct: 0.3,
  }));
  s.properties = (intake.properties ?? []).map((p) => ({
    id: uid('prop'), name: p.name || 'Property', isMainHome: !!p.isMainHome,
    value: p.value || 0, growthPct: p.growthPct ?? 3,
    mortgage: p.mortgageBalance > 0 ? {
      balance: p.mortgageBalance, ratePct: p.mortgageRatePct || 4,
      monthlyPayment: p.mortgageMonthlyPayment || 0, interestOnly: !!p.interestOnly,
    } : undefined,
    rental: p.grossMonthlyRent > 0 ? {
      grossMonthlyRent: p.grossMonthlyRent, rentGrowthPct: 2, monthlyCosts: p.rentalMonthlyCosts || 0,
    } : undefined,
  }));
  s.events = (intake.events ?? []).filter((e) => /^\d{4}-\d{2}$/.test(e.date)).map((e) => ({
    id: uid('ev'), name: e.name || 'Event', date: e.date, amount: e.amount || 0,
    to: 'invest' as const,
  }));
  if (intake.preRetirementMonthlySpend > 0) s.spending.preRetirementMonthly = intake.preRetirementMonthlySpend;
  s.spending.retirement = intake.retirementMonthlySpend > 0
    ? { kind: 'flat', monthlyToday: intake.retirementMonthlySpend }
    : { kind: 'plsa', standard: 'moderate' };
  return s;
}

function defaultRetirement(s: Scenario, personIndex: number): string {
  const clamped = Math.min(Math.max(0, Math.trunc(personIndex ?? 0)), s.people.length - 1);
  const dob = s.people[clamped].dateOfBirth;
  const year = parseInt(dob.slice(0, 4), 10) + 67;
  return `${year}-${dob.slice(5, 7)}`;
}
