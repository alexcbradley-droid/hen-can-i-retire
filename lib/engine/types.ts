// Core data model for the retirement planner.
// All money values are nominal pounds unless a field name says otherwise.
// Dates are ISO strings (YYYY-MM or YYYY-MM-DD) to keep scenarios JSON-serialisable.

export type Sex = 'male' | 'female' | 'unspecified';

export interface Person {
  id: string;
  name: string;
  dateOfBirth: string; // YYYY-MM-DD
  sex: Sex;
  planToAge: number; // simulate until this age (default 95)
}

export interface Employment {
  personId: string;
  grossSalary: number; // £/year
  salaryGrowthPct: number; // nominal %/year
  bonus: number; // £/year, paid monthly pro-rata for simplicity
  retirementDate: string; // YYYY-MM — when this person stops this work
  // Optional phased retirement: part-time income between retirementDate and partTimeEnd
  partTime?: {
    endDate: string; // YYYY-MM
    grossSalary: number; // £/year while part-time
  };
}

export interface DcPension {
  id: string;
  personId: string;
  name: string;
  currentValue: number;
  employeePct: number; // % of gross salary
  employerPct: number; // % of gross salary
  extraMonthly: number; // £/month additional personal contribution
  salarySacrifice: boolean;
  growthPct: number; // nominal %/year before fees
  feesPct: number; // %/year
  // Crystallisation: PCLS taken at retirement by default
  takePclsAtRetirement: boolean;
  pclsInvestTo: 'isa-then-gia' | 'cash';
}

export interface DbPension {
  id: string;
  personId: string;
  name: string;
  annualPension: number; // £/year at normal pension age, today's money
  normalPensionAge: number;
  startAge: number; // chosen start age (>= minimum)
  earlyReductionPct: number; // %/year taken early (typical 4-5)
  revaluationPct: number; // %/year while deferred (CPI-linked, capped)
  indexationPct: number; // %/year in payment
  lumpSum: number; // automatic lump sum if any (e.g. 3x for 1/80 schemes)
}

export interface StatePensionInput {
  personId: string;
  qualifyingYears: number; // NI years accrued to date
  yearsStillWorking?: boolean; // accrue more while employed (default true)
  deferralYears: number; // years to defer past SPA
}

export type AccountType = 'cash' | 'isa' | 'gia' | 'premium-bonds';

export interface InvestmentAccount {
  id: string;
  personId: string;
  name: string;
  type: AccountType;
  value: number;
  monthlyContribution: number; // while working
  assetId: string; // links to asset catalogue ('custom' allowed)
  growthPct: number; // nominal %/year (auto-filled from asset, editable)
  feesPct: number;
  costBasis?: number; // for GIA capital gains; defaults to value
}

export interface Property {
  id: string;
  name: string;
  isMainHome: boolean;
  value: number;
  growthPct: number; // %/year
  mortgage?: {
    balance: number;
    ratePct: number;
    monthlyPayment: number; // repayment mortgage payment
    interestOnly: boolean;
  };
  rental?: {
    grossMonthlyRent: number;
    rentGrowthPct: number;
    monthlyCosts: number; // management, insurance, maintenance etc.
  };
  sale?: {
    date: string; // YYYY-MM
    proceedsTo: 'invest' | 'cash';
    buyNext?: { price: number; date?: string }; // downsizing: buy cheaper home
  };
}

export interface OneOffEvent {
  id: string;
  name: string;
  date: string; // YYYY-MM
  // Positive = money in (inheritance, windfall); negative = out.
  // Enter amounts net of any tax due on receipt — the engine does not tax events.
  amount: number;
  to: 'invest' | 'cash';
}

export type SpendingModel =
  | { kind: 'flat'; monthlyToday: number } // today's money, inflated
  | { kind: 'phases'; goGo: number; slowGo: number; noGo: number; slowGoAge: number; noGoAge: number }
  | { kind: 'plsa'; standard: 'minimum' | 'moderate' | 'comfortable' };

export interface Spending {
  preRetirementMonthly: number; // £/month today's money while working
  retirement: SpendingModel;
  oneOffs: { id: string; name: string; date: string; amount: number }[]; // extra spends (wedding, car...)
  careCosts?: { fromAge: number; monthlyToday: number }; // late-life care provision
}

export type WithdrawalOrder = 'cash-gia-isa-pension' | 'cash-gia-pension-isa' | 'pension-first';

export interface Assumptions {
  inflationPct: number; // CPI %/year
  cashBufferMonths: number; // months of spending kept in cash before investing surplus
  withdrawalOrder: WithdrawalOrder;
  displayReal: boolean; // show charts/tables in today's money
}

export interface Goals {
  targetRetirementDate?: string; // YYYY-MM — "can I retire then?"
  targetMonthlyIncome?: number; // £/month today's money in retirement
  legacyTarget?: number; // £ to leave behind
}

export interface Scenario {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  people: Person[];
  employments: Employment[];
  dcPensions: DcPension[];
  dbPensions: DbPension[];
  statePensions: StatePensionInput[];
  accounts: InvestmentAccount[];
  properties: Property[];
  events: OneOffEvent[];
  spending: Spending;
  assumptions: Assumptions;
  goals: Goals;
}

// ---------- Engine outputs ----------

export interface MonthRow {
  ym: string; // YYYY-MM
  ages: number[]; // age of each person
  phase: 'working' | 'part-time' | 'retired';
  grossEmployment: number;
  netEmployment: number;
  statePension: number;
  dbPension: number;
  pensionDrawdown: number; // gross taken from DC pots
  rentalNet: number; // after costs and tax
  totalNetIncome: number;
  spending: number;
  netCashflow: number;
  taxPaid: number; // income tax + NI + CGT this month
  // Balances at month end
  cash: number;
  isa: number;
  gia: number;
  pensionPots: number;
  propertyEquity: number;
  netWorth: number;
}

export interface YearSummary {
  year: number;
  taxYear: string; // e.g. 2026/27
  grossIncome: number;
  taxPaid: number;
  netIncome: number;
  spending: number;
  netWorthEnd: number;
}

export interface KeyMetrics {
  retirementDate: string;
  netWorthAtRetirement: number;
  pensionPotAtRetirement: number;
  liquidAtRetirement: number; // cash + ISA + GIA
  guaranteedMonthlyAtRetirement: number; // state + DB, net, today's money
  sustainableMonthlyIncome: number; // today's money, money lasts to planToAge
  runOutAge: number | null; // null = never (within horizon)
  successToPlanAge: boolean;
  estateAtPlanAge: number; // nominal estate value at end of plan
  ihtEstimate: number; // IHT due on that estate under current rules
  totalTaxPaid: number;
  earliestRetirementDate: string | null; // from backward solver
  monteCarloSuccessPct: number | null;
}

export interface SensitivityResult {
  label: string;
  delta: string; // human description of the change
  runOutAge: number | null;
  netWorthAtPlanAge: number;
  sustainableMonthlyIncome: number;
}

export interface ProjectionResult {
  months: MonthRow[];
  years: YearSummary[];
  metrics: KeyMetrics;
  warnings: string[]; // engine-detected issues e.g. "pension accessed before age 57"
}
