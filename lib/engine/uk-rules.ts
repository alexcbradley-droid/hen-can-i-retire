// UK tax and pension rules used by the projection engine.
// Values are being verified against primary sources (gov.uk / HMRC) — see
// lib/engine/SOURCES.md for the dated, sourced fact sheet behind every figure.
// England, Wales & Northern Ireland bands; Scotland is flagged as unsupported in v1.

export const RULES_VERSION = '2026-06 (tax years 2025/26 and 2026/27)';

// ---------- Income tax (rUK) ----------
export const INCOME_TAX = {
  personalAllowance: 12570,
  paTaperThreshold: 100000, // PA reduced £1 per £2 above this
  bands: [
    { upTo: 50270, rate: 0.2 }, // basic
    { upTo: 125140, rate: 0.4 }, // higher
    { upTo: Infinity, rate: 0.45 }, // additional
  ],
};

// ---------- National Insurance (employee, Class 1) ----------
export const NATIONAL_INSURANCE = {
  primaryThreshold: 12570, // £/year
  upperEarningsLimit: 50270,
  mainRate: 0.08,
  upperRate: 0.02,
  // No employee NI from State Pension age; no NI on pension or rental income.
};

// ---------- Savings & dividends ----------
export const SAVINGS_DIVIDENDS = {
  personalSavingsAllowance: { basic: 1000, higher: 500, additional: 0 },
  startingRateForSavingsBand: 5000,
  dividendAllowance: 500,
  // 2026/27 rates (basic & higher rose 2 points at Autumn Budget 2025)
  dividendRates: { basic: 0.1075, higher: 0.3575, additional: 0.3935 },
  // From 2027/28 savings income rates rise to 22%/42%/47% — documented in
  // SOURCES.md; not modelled (engine uses a total-return simplification).
};

// ---------- Capital gains tax ----------
export const CGT = {
  annualExemptAmount: 3000,
  sharesRates: { basic: 0.18, higher: 0.24 }, // also applies to crypto
  residentialPropertyRates: { basic: 0.18, higher: 0.24 },
  mainHomeExempt: true, // private residence relief
};

// ---------- ISAs ----------
export const ISA = {
  annualAllowance: 20000,
  // Growth and withdrawals are entirely tax-free.
};

// ---------- Pensions ----------
export const PENSIONS = {
  normalMinimumPensionAge: 55,
  nmpaRisesTo57On: '2028-04-06',
  pclsRate: 0.25, // tax-free lump sum share
  lumpSumAllowance: 268275, // max total tax-free cash
  annualAllowance: 60000,
  moneyPurchaseAnnualAllowance: 10000,
  taperThresholdIncome: 200000,
  taperAdjustedIncome: 260000,
  taperMinimum: 10000,
  basicRateReliefFactor: 0.25, // relief at source: £80 becomes £100
  autoEnrolment: { totalMin: 0.08, employerMin: 0.03 },
};

// ---------- State Pension ----------
export const STATE_PENSION = {
  // Full new State Pension. 2025/26 confirmed; 2026/27 figure verified in SOURCES.md.
  fullWeekly: { '2025/26': 230.25, '2026/27': 241.3 },
  fullQualifyingYears: 35,
  minQualifyingYears: 10,
  deferralUpliftPerYear: 0.0579, // 1% per 9 weeks deferred ≈ 5.79%/year
  taxable: true,
  niPayable: false,
  pensionCreditWeekly2026: { single: 238.0, couple: 363.25 }, // standard minimum guarantee
};

// State Pension age from date of birth (simplified legislated schedule).
// 66 -> 67 transition applies to those born 6 Apr 1960 – 5 Apr 1961 (phased),
// 67 for those born 6 Apr 1961 – 5 Apr 1977, 68 for 6 Apr 1977 onwards (legislated
// for 2044–46; an earlier rise has been discussed but not legislated).
export function statePensionAge(dobIso: string): { years: number; months: number } {
  const dob = new Date(dobIso + (dobIso.length === 7 ? '-01' : ''));
  const d = (y: number, m: number, day: number) => new Date(Date.UTC(y, m - 1, day));
  if (dob < d(1960, 4, 6)) return { years: 66, months: 0 };
  // Phased rise: one month per month-of-birth across 6 Apr 1960 – 5 Mar 1961
  const phases: { from: Date; to: Date; months: number }[] = [];
  for (let i = 0; i < 11; i++) {
    const from = d(1960, 4 + i, 6 + 0);
    const to = d(1960, 5 + i, 5);
    phases.push({ from, to, months: i + 1 });
  }
  for (const p of phases) {
    if (dob >= p.from && dob <= p.to) return { years: 66, months: p.months };
  }
  if (dob < d(1977, 4, 6)) return { years: 67, months: 0 };
  return { years: 68, months: 0 };
}

// ---------- Inheritance tax ----------
export const IHT = {
  nilRateBand: 325000,
  residenceNilRateBand: 175000,
  rnrbTaperThreshold: 2000000,
  rate: 0.4,
  spouseExempt: true,
  // From 6 April 2027 unused pension funds are due to be included in the estate.
  pensionsInEstateFrom: '2027-04-06',
};

// ---------- Projection assumptions ----------
export const PROJECTION_DEFAULTS = {
  // Long-run planning assumption. BoE target is 2%; FCA COBS illustrations
  // deduct 2.0%; the FRC's AS TM1 (annual pension statements) uses 2.5%.
  inflationPct: 2.5,
  fcaRates: { lower: 2, intermediate: 5, higher: 8 }, // nominal %/year, COBS 13 Annex 2
  defaultPlanToAge: 95, // ~1 in 4 65-year-olds live into their early-to-mid 90s (ONS cohort)
  cashInterestPct: 3.5,
};

// Indicative single-life level annuity rates per £100,000, healthy life,
// June 2026 (near multi-year highs — date-stamped, editable in the UI).
export const ANNUITY_INDICATIVE = {
  asOf: '2026-06',
  singleLifeLevelPer100k: { 55: 6669, 60: 6991, 65: 7880, 70: 8678 },
  rpiLinkedAt65Per100k: 5720,
  jointLife100At65Per100k: 7190,
};

// ---------- PLSA Retirement Living Standards (annual, outside London) ----------
export const PLSA = {
  single: { minimum: 13400, moderate: 31700, comfortable: 43900 },
  couple: { minimum: 21600, moderate: 43900, comfortable: 60600 },
};

// ---------- Safe withdrawal guidance ----------
export const WITHDRAWAL = {
  classicRulePct: 4.0, // Bengen 1994, US data, 30-year horizon
  morningstarLatestPct: 3.9, // Morningstar State of Retirement Income, 2026 retirees
  ukConservativePct: 3.3, // UK-data research range is ~3.0–3.6%
};

// ---------- Helpers ----------

export function taxYearOf(date: Date): string {
  const y = date.getUTCFullYear();
  const startsNewYear = date.getUTCMonth() > 3 || (date.getUTCMonth() === 3 && date.getUTCDate() >= 6);
  const start = startsNewYear ? y : y - 1;
  return `${start}/${String((start + 1) % 100).padStart(2, '0')}`;
}

export function fullStatePensionWeekly(taxYear: string): number {
  const table = STATE_PENSION.fullWeekly as Record<string, number>;
  if (table[taxYear]) return table[taxYear];
  // Beyond known years: return the latest known rate; the engine inflates
  // from the end of that tax year (see latestKnownSpEndIndex).
  return table[latestKnownSpYear()];
}

/** Latest tax year present in the State Pension table, e.g. "2026/27". */
export function latestKnownSpYear(): string {
  const years = Object.keys(STATE_PENSION.fullWeekly);
  return years.sort()[years.length - 1];
}

/**
 * Month index (year*12 + month-1, as used by the engine) of the final month
 * of the latest known State Pension tax year — the point from which the
 * engine starts inflating the rate. Derived from the table so adding next
 * year's rate cannot leave a stale anchor behind.
 */
export function latestKnownSpEndIndex(): number {
  const startYear = parseInt(latestKnownSpYear().slice(0, 4), 10);
  return (startYear + 1) * 12 + 2; // March of the following calendar year
}

/** Normal minimum pension age for a given engine month index (55 → 57 on 6 Apr 2028). */
export function minPensionAgeAt(monthIndex: number): number {
  const rise = PENSIONS.nmpaRisesTo57On; // YYYY-MM-DD
  const riseIndex = parseInt(rise.slice(0, 4), 10) * 12 + (parseInt(rise.slice(5, 7), 10) - 1);
  return monthIndex >= riseIndex ? 57 : PENSIONS.normalMinimumPensionAge;
}

/**
 * Income tax on non-savings income for one year (rUK bands, PA taper).
 * Bands apply to taxable income (income minus the tapered personal allowance):
 * 0–£37,700 basic, £37,700–£125,140 higher, above £125,140 additional.
 */
export function incomeTax(grossIncome: number): number {
  let pa = INCOME_TAX.personalAllowance;
  if (grossIncome > INCOME_TAX.paTaperThreshold) {
    pa = Math.max(0, pa - (grossIncome - INCOME_TAX.paTaperThreshold) / 2);
  }
  const taxable = Math.max(0, grossIncome - pa);
  const basicBand = INCOME_TAX.bands[0].upTo - INCOME_TAX.personalAllowance; // 37,700
  const additionalThreshold = INCOME_TAX.bands[1].upTo; // 125,140 of taxable income
  const basic = Math.min(taxable, basicBand);
  const higher = Math.min(Math.max(0, taxable - basicBand), additionalThreshold - basicBand);
  const additional = Math.max(0, taxable - additionalThreshold);
  return basic * INCOME_TAX.bands[0].rate + higher * INCOME_TAX.bands[1].rate + additional * INCOME_TAX.bands[2].rate;
}

/** Employee NI for one year of earned income (not pensions/rent), if under SPA. */
export function employeeNI(grossEarnings: number, underSpa: boolean): number {
  if (!underSpa) return 0;
  const { primaryThreshold, upperEarningsLimit, mainRate, upperRate } = NATIONAL_INSURANCE;
  const main = Math.max(0, Math.min(grossEarnings, upperEarningsLimit) - primaryThreshold) * mainRate;
  const upper = Math.max(0, grossEarnings - upperEarningsLimit) * upperRate;
  return main + upper;
}
