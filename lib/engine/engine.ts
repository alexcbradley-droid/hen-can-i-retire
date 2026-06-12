// Deterministic monthly projection engine.
// Simulates a household month by month from the start of the current year to
// the oldest person's plan-to age. Documented simplifications:
//  - Tax is estimated monthly from annualised income (good when income is
//    stable within a phase; small inaccuracies in transition years).
//  - Investments use a total-return assumption (dividends are reinvested
//    inside the return; dividend tax in a GIA is ignored).
//  - GIA capital gains tax uses pooled cost basis, the annual exempt amount,
//    and the holder's marginal band.
//  - The retirement spending model applies once the first person retires.
//  - Property cost basis for CGT is the value at the start of the simulation.

import {
  Scenario, ProjectionResult, MonthRow, YearSummary, KeyMetrics, Person, WithdrawalOrder,
} from './types';
import {
  incomeTax, employeeNI, statePensionAge, taxYearOf, fullStatePensionWeekly,
  latestKnownSpEndIndex, minPensionAgeAt,
  PENSIONS, CGT, ISA, IHT, STATE_PENSION, PLSA, INCOME_TAX,
} from './uk-rules';

export interface SimOptions {
  returnDeltaPct?: number; // shift all growth rates by this many points
  inflationDeltaPct?: number;
  retirementShiftMonths?: number; // move every retirement date by n months
  planToAgeOverride?: number;
  crashYearOnePct?: number; // one-off fall applied to invested assets in first retirement month
  flatRetirementSpendOverride?: number; // £/month today's money (for solvers)
  monthlyReturnsOverride?: (assetKey: string, monthIndex: number) => number | undefined; // Monte Carlo hook
}

// Withdrawal sequences for each strategy (cash is always drawn first).
const WITHDRAWAL_SEQUENCES: Record<WithdrawalOrder, ('gia' | 'isa' | 'pension')[]> = {
  'cash-gia-isa-pension': ['gia', 'isa', 'pension'],
  'cash-gia-pension-isa': ['gia', 'pension', 'isa'],
  'pension-first': ['pension', 'gia', 'isa'],
};

// ---------- date helpers ----------
export function ymToIndex(ym: string): number {
  const [y, m] = ym.split('-').map(Number);
  return y * 12 + (m - 1);
}
export function indexToYm(i: number): string {
  const y = Math.floor(i / 12);
  const m = (i % 12) + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}
function ageAt(p: Person, monthIndex: number): number {
  return (monthIndex - ymToIndex(p.dateOfBirth.slice(0, 7))) / 12;
}

interface PotState {
  cash: number;
  isa: number;
  gia: number; giaBasis: number;
  // per-person pension pots
  pension: Record<string, number>; // personId -> drawdown-able value (uncrystallised+crystallised combined)
  pclsRemaining: Record<string, number>; // LSA headroom per person
  pclsTaken: Record<string, boolean>;
}

export function simulate(scenario: Scenario, opt: SimOptions = {}): ProjectionResult {
  const s = scenario;
  const warnings: string[] = [];
  const infl = (s.assumptions.inflationPct + (opt.inflationDeltaPct ?? 0)) / 100;
  const rShift = (opt.returnDeltaPct ?? 0) / 100;

  const startIndex = ymToIndex(new Date().toISOString().slice(0, 7));
  const planAges = s.people.map((p) => opt.planToAgeOverride ?? p.planToAge ?? 95);
  const endIndex = Math.max(
    ...s.people.map((p, i) => ymToIndex(p.dateOfBirth.slice(0, 7)) + Math.round(planAges[i] * 12)),
  );

  const shift = opt.retirementShiftMonths ?? 0;
  const retirementIdx: Record<string, number> = {};
  for (const e of s.employments) {
    const idx = ymToIndex(e.retirementDate) + shift;
    // A person with several jobs retires when the last one ends.
    retirementIdx[e.personId] = Math.max(retirementIdx[e.personId] ?? idx, idx);
  }
  // The household's retirement phase is set by the people who actually work —
  // a non-working partner must not flip the household to "retired" from day one.
  const employedRetirements = Object.values(retirementIdx);
  const firstRetirementIdx = employedRetirements.length ? Math.min(...employedRetirements) : startIndex;
  const lastRetirementIdx = employedRetirements.length ? Math.max(...employedRetirements) : startIndex;
  for (const p of s.people) {
    if (!(p.id in retirementIdx)) retirementIdx[p.id] = firstRetirementIdx;
  }

  // Tax-free cash is taken at retirement, but never before the minimum
  // pension age — crystallisation is deferred until the person is old enough.
  const pclsIdx: Record<string, number> = {};
  for (const p of s.people) {
    const dobIdx = ymToIndex(p.dateOfBirth.slice(0, 7));
    let idx = retirementIdx[p.id];
    while (idx - dobIdx < minPensionAgeAt(idx) * 12 && idx <= endIndex) idx++;
    pclsIdx[p.id] = idx;
  }

  // ---------- initial pots ----------
  const pots: PotState = {
    cash: 0, isa: 0, gia: 0, giaBasis: 0,
    pension: {}, pclsRemaining: {}, pclsTaken: {},
  };
  for (const p of s.people) {
    pots.pension[p.id] = 0;
    pots.pclsRemaining[p.id] = PENSIONS.lumpSumAllowance;
    pots.pclsTaken[p.id] = false;
  }
  for (const a of s.accounts) {
    if (a.type === 'cash' || a.type === 'premium-bonds') pots.cash += a.value;
    else if (a.type === 'isa') pots.isa += a.value;
    else { pots.gia += a.value; pots.giaBasis += a.costBasis ?? a.value; }
  }
  for (const d of s.dcPensions) pots.pension[d.personId] = (pots.pension[d.personId] ?? 0) + d.currentValue;

  // weighted growth rates for the merged pools (kept simple and editable)
  const monthlyRate = (annualPct: number) => Math.pow(1 + (annualPct / 100 + rShift), 1 / 12) - 1;
  const wAvg = (items: { value: number; growthPct: number; feesPct: number }[], fallback: number) => {
    const tot = items.reduce((t, i) => t + i.value, 0);
    if (tot <= 0) return fallback;
    return items.reduce((t, i) => t + (i.growthPct - i.feesPct) * i.value, 0) / tot;
  };
  const isaGrowth = wAvg(s.accounts.filter((a) => a.type === 'isa'), 5);
  const giaGrowth = wAvg(s.accounts.filter((a) => a.type === 'gia'), 5);
  const cashGrowth = wAvg(s.accounts.filter((a) => a.type === 'cash'), 3.5);
  const penGrowth: Record<string, number> = {};
  for (const p of s.people) {
    penGrowth[p.id] = wAvg(
      s.dcPensions.filter((d) => d.personId === p.id).map((d) => ({ value: d.currentValue || 1, growthPct: d.growthPct, feesPct: d.feesPct })),
      5,
    );
  }

  // ---------- property state ----------
  const props = s.properties.map((p) => ({
    def: p,
    value: p.value,
    basis: p.value,
    mortgage: p.mortgage ? { ...p.mortgage } : undefined,
    sold: false,
    boughtNext: false,
  }));

  // ---------- state pension ----------
  const spStartIdx: Record<string, number> = {};
  const spFraction: Record<string, number> = {};
  const spUplift: Record<string, number> = {};
  for (const p of s.people) {
    const input = s.statePensions.find((x) => x.personId === p.id);
    const spa = statePensionAge(p.dateOfBirth);
    const spaIdx = ymToIndex(p.dateOfBirth.slice(0, 7)) + spa.years * 12 + spa.months;
    const deferMonths = Math.round((input?.deferralYears ?? 0) * 12);
    spStartIdx[p.id] = spaIdx + deferMonths;
    const accrueUntil = (input?.yearsStillWorking ?? true)
      ? Math.max(0, (Math.min(retirementIdx[p.id], spaIdx) - startIndex) / 12)
      : 0;
    const qy = Math.min(STATE_PENSION.fullQualifyingYears, (input?.qualifyingYears ?? 35) + accrueUntil);
    spFraction[p.id] = qy >= STATE_PENSION.minQualifyingYears ? qy / STATE_PENSION.fullQualifyingYears : 0;
    spUplift[p.id] = Math.pow(1 + STATE_PENSION.deferralUpliftPerYear, input?.deferralYears ?? 0);
  }

  // ---------- DB pensions ----------
  const dbStart: Record<string, number> = {};
  for (const db of s.dbPensions) {
    const person = s.people.find((p) => p.id === db.personId)!;
    dbStart[db.id] = ymToIndex(person.dateOfBirth.slice(0, 7)) + Math.round(db.startAge * 12);
  }

  // ---------- main loop ----------
  const months: MonthRow[] = [];
  let runOutIdx: number | null = null;
  let totalTax = 0;
  let isaContribThisTaxYear = 0;
  let giaGainsThisTaxYear: Record<string, number> = {};
  let lastTaxYear = '';

  for (let i = startIndex; i <= endIndex; i++) {
    const date = new Date(Date.UTC(Math.floor(i / 12), i % 12, 15));
    const taxYear = taxYearOf(date);
    if (taxYear !== lastTaxYear) {
      isaContribThisTaxYear = 0;
      giaGainsThisTaxYear = {};
      lastTaxYear = taxYear;
    }
    const yearsFromStart = (i - startIndex) / 12;
    const inflFactor = Math.pow(1 + infl, yearsFromStart);

    // ----- per-person income -----
    let grossEmployment = 0, netEmployment = 0, statePensionInc = 0, dbInc = 0;
    const personEarned: Record<string, number> = {}; // annualised taxable earnings
    const personPensionIncome: Record<string, number> = {}; // annualised taxable pension/rental income
    const personMortgageInterestCredit: Record<string, number> = {};
    const personEeDeduct: Record<string, number> = {}; // monthly employee pension deduction from take-home

    for (const p of s.people) {
      personEarned[p.id] = 0; personPensionIncome[p.id] = 0;
      personMortgageInterestCredit[p.id] = 0; personEeDeduct[p.id] = 0;
    }

    // Aggregate salary per person first, then apply pension contributions once
    // on the aggregate — a person with two jobs must not double-fund each pot.
    const personGross: Record<string, number> = {};
    for (const e of s.employments) {
      const retIdx = ymToIndex(e.retirementDate) + shift;
      const ptEnd = e.partTime ? ymToIndex(e.partTime.endDate) + shift : retIdx;
      let annualGross = 0;
      if (i < retIdx) {
        annualGross = (e.grossSalary + e.bonus) * Math.pow(1 + e.salaryGrowthPct / 100, yearsFromStart);
      } else if (e.partTime && i < ptEnd) {
        annualGross = e.partTime.grossSalary * inflFactor;
      }
      if (annualGross > 0) personGross[e.personId] = (personGross[e.personId] ?? 0) + annualGross;
    }
    for (const p of s.people) {
      const annualGross = personGross[p.id] ?? 0;
      if (annualGross <= 0) continue;
      let employeeAmt = 0, sacrifice = 0;
      for (const d of s.dcPensions.filter((x) => x.personId === p.id)) {
        const ee = (d.employeePct / 100) * annualGross / 12 + d.extraMonthly;
        const er = (d.employerPct / 100) * annualGross / 12;
        if (d.salarySacrifice) sacrifice += ee; else employeeAmt += ee;
        pots.pension[p.id] += ee + er;
      }
      // Relief-at-source top-up: non-sacrifice personal contributions get the basic-rate uplift in the pot
      pots.pension[p.id] += employeeAmt * PENSIONS.basicRateReliefFactor;

      personEarned[p.id] += annualGross - sacrifice * 12; // sacrifice reduces taxable pay
      personEeDeduct[p.id] += employeeAmt; // paid from take-home
      grossEmployment += annualGross / 12;
    }

    // ----- state pension -----
    for (const p of s.people) {
      if (i >= spStartIdx[p.id] && spFraction[p.id] > 0) {
        const baseWeekly = fullStatePensionWeekly(taxYear);
        // inflate beyond the last known tax year (triple-lock proxied by CPI);
        // the anchor is derived from the rates table so it can't go stale
        const extraYears = Math.max(0, (i - latestKnownSpEndIndex()) / 12);
        const weekly = baseWeekly * Math.pow(1 + infl, extraYears) * spFraction[p.id] * spUplift[p.id];
        const monthly = (weekly * 52.18) / 12;
        statePensionInc += monthly;
        personPensionIncome[p.id] += monthly * 12;
      }
    }

    // ----- DB pensions -----
    for (const db of s.dbPensions) {
      if (i === dbStart[db.id] && db.lumpSum > 0) {
        // Automatic scheme lump sum (e.g. 3/80ths), revalued to the start date; tax-free.
        const yearsToStart = Math.max(0, (dbStart[db.id] - startIndex) / 12);
        pots.cash += db.lumpSum * Math.pow(1 + db.revaluationPct / 100, yearsToStart);
      }
      if (i >= dbStart[db.id]) {
        const yearsToStart = Math.max(0, (dbStart[db.id] - startIndex) / 12);
        const yearsEarly = Math.max(0, db.normalPensionAge - db.startAge);
        const atStart = db.annualPension
          * Math.pow(1 + db.revaluationPct / 100, yearsToStart)
          * Math.max(0.2, 1 - (db.earlyReductionPct / 100) * yearsEarly);
        const yearsInPayment = (i - dbStart[db.id]) / 12;
        const annual = atStart * Math.pow(1 + db.indexationPct / 100, yearsInPayment);
        dbInc += annual / 12;
        personPensionIncome[db.personId] += annual;
      }
    }

    // ----- property -----
    // Cashflow view: rent minus running costs minus the full mortgage payment.
    // Tax view: rent minus running costs (finance costs not deductible), with a
    // 20% basic-rate credit on mortgage interest (Section 24).
    let rentalCashflow = 0, rentalTaxableProfit = 0, rentalMortgageInterest = 0, mortgagePayments = 0;
    let propertySaleCash = 0, propertySaleInvest = 0, propertyCgt = 0;
    for (const pr of props) {
      if (pr.sold) continue;
      pr.value *= 1 + (pr.def.growthPct / 100) / 12;
      let payment = 0, interest = 0;
      if (pr.mortgage && pr.mortgage.balance > 0) {
        interest = (pr.mortgage.balance * pr.mortgage.ratePct) / 100 / 12;
        payment = pr.mortgage.interestOnly ? interest : Math.min(pr.mortgage.monthlyPayment, pr.mortgage.balance + interest);
        const principal = pr.mortgage.interestOnly ? 0 : Math.max(0, payment - interest);
        pr.mortgage.balance = Math.max(0, pr.mortgage.balance - principal);
      }
      if (pr.def.rental) {
        const rent = pr.def.rental.grossMonthlyRent * Math.pow(1 + pr.def.rental.rentGrowthPct / 100, yearsFromStart);
        const costs = pr.def.rental.monthlyCosts * inflFactor;
        rentalCashflow += rent - costs - payment;
        rentalTaxableProfit += Math.max(0, rent - costs);
        rentalMortgageInterest += interest;
      } else {
        mortgagePayments += payment; // own home: mortgage is part of spending
      }
      if (pr.def.sale && !pr.sold && i >= ymToIndex(pr.def.sale.date)) {
        pr.sold = true;
        const balance = pr.mortgage?.balance ?? 0;
        let proceeds = pr.value - balance;
        if (!pr.def.isMainHome) { // main home is exempt (private residence relief)
          const gain = Math.max(0, pr.value - pr.basis);
          const tax = Math.max(0, gain - CGT.annualExemptAmount) * CGT.residentialPropertyRates.higher;
          propertyCgt += tax;
          proceeds -= tax;
        }
        if (pr.def.sale.buyNext) {
          proceeds -= pr.def.sale.buyNext.price * inflFactor;
          props.push({ def: { ...pr.def, id: pr.def.id + '-next', name: pr.def.name + ' (next home)', value: 0, mortgage: undefined, rental: undefined, sale: undefined, isMainHome: pr.def.isMainHome }, value: pr.def.sale.buyNext.price * inflFactor, basis: pr.def.sale.buyNext.price * inflFactor, mortgage: undefined, sold: false, boughtNext: false });
        }
        if (pr.def.sale.proceedsTo === 'cash') propertySaleCash += Math.max(0, proceeds);
        else propertySaleInvest += Math.max(0, proceeds);
        if (proceeds < 0) pots.cash += proceeds; // negative equity / expensive next home comes from cash
      }
    }
    // split rental taxable profit across people for tax (joint ownership assumed)
    const perPersonRental = (rentalTaxableProfit * 12) / s.people.length;
    const perPersonInterestCredit = (rentalMortgageInterest * 12 * 0.2) / s.people.length;
    for (const p of s.people) {
      personPensionIncome[p.id] += perPersonRental; // taxed as income (no NI)
      personMortgageInterestCredit[p.id] += perPersonInterestCredit;
    }

    // ----- events -----
    let eventCash = 0, eventInvest = 0;
    for (const ev of s.events) {
      if (ymToIndex(ev.date) === i) {
        const amt = ev.amount;
        if (amt >= 0) { if (ev.to === 'cash') eventCash += amt; else eventInvest += amt; }
        else eventCash += amt;
      }
    }

    // ----- spending -----
    const retired = i >= firstRetirementIdx;
    let spend: number;
    if (!retired) {
      spend = s.spending.preRetirementMonthly * inflFactor;
    } else {
      const m = s.spending.retirement;
      const firstAge = ageAt(s.people[0], i);
      let todayMonthly: number;
      if (opt.flatRetirementSpendOverride !== undefined) todayMonthly = opt.flatRetirementSpendOverride;
      else if (m.kind === 'flat') todayMonthly = m.monthlyToday;
      else if (m.kind === 'phases') todayMonthly = firstAge >= m.noGoAge ? m.noGo : firstAge >= m.slowGoAge ? m.slowGo : m.goGo;
      else {
        const table = s.people.length > 1 ? PLSA.couple : PLSA.single;
        todayMonthly = table[m.standard] / 12;
      }
      if (s.spending.careCosts && firstAge >= s.spending.careCosts.fromAge) {
        todayMonthly += s.spending.careCosts.monthlyToday;
      }
      spend = todayMonthly * inflFactor;
    }
    for (const so of s.spending.oneOffs) {
      if (ymToIndex(so.date) === i) spend += so.amount;
    }
    spend += mortgagePayments; // own-home mortgage on top of living costs

    // ----- crash stress -----
    if (opt.crashYearOnePct && i === firstRetirementIdx) {
      const f = 1 + opt.crashYearOnePct / 100;
      pots.isa *= f; pots.gia *= f;
      for (const pid of Object.keys(pots.pension)) pots.pension[pid] *= f;
    }

    // ----- PCLS (tax-free cash) at retirement, deferred to minimum pension age -----
    for (const p of s.people) {
      if (i === pclsIdx[p.id] && !pots.pclsTaken[p.id]) {
        const dcs = s.dcPensions.filter((d) => d.personId === p.id);
        if (dcs.length && dcs.some((d) => d.takePclsAtRetirement)) {
          const pot = pots.pension[p.id];
          const tfc = Math.min(pot * PENSIONS.pclsRate, pots.pclsRemaining[p.id]);
          pots.pension[p.id] -= tfc;
          pots.pclsRemaining[p.id] -= tfc;
          pots.pclsTaken[p.id] = true;
          const dest = dcs[0].pclsInvestTo;
          if (dest === 'cash') pots.cash += tfc;
          else {
            const isaRoom = Math.max(0, ISA.annualAllowance * s.people.length - isaContribThisTaxYear);
            const toIsa = Math.min(tfc, isaRoom);
            pots.isa += toIsa; isaContribThisTaxYear += toIsa;
            pots.gia += tfc - toIsa; pots.giaBasis += tfc - toIsa;
          }
          if (pclsIdx[p.id] > retirementIdx[p.id]) {
            const nmpaAge = minPensionAgeAt(pclsIdx[p.id]);
            warnings.push(`${p.name} retires before the minimum pension age — the pension (and its tax-free cash) cannot be touched until age ${nmpaAge}, so the early years rely on other savings.`);
          }
        }
      }
    }

    // ----- tax on regular income (annualised estimate) -----
    let taxThisMonth = 0;
    let netRegularIncome = 0;
    for (const p of s.people) {
      const earned = personEarned[p.id];
      const pensionInc = personPensionIncome[p.id];
      // Relief-at-source contributions come from after-tax pay, so they don't
      // reduce taxable income here (the relief is added inside the pot instead).
      const taxableAnnual = Math.max(0, earned + pensionInc);
      const tax = Math.max(0, incomeTax(taxableAnnual) - personMortgageInterestCredit[p.id]);
      const underSpa = i < spStartIdx[p.id] - Math.round((s.statePensions.find((x) => x.personId === p.id)?.deferralYears ?? 0) * 12);
      const ni = employeeNI(earned, underSpa);
      taxThisMonth += (tax + ni) / 12;
      netRegularIncome += (earned + pensionInc - tax - ni) / 12 - personEeDeduct[p.id];
    }
    netEmployment = Math.max(0, netRegularIncome - statePensionInc - dbInc - rentalCashflow); // residual after the named streams (approximation for display)

    // ----- cashflow -----
    // netRegularIncome counted rental *taxable profit*; adjust to actual rental cashflow.
    pots.cash += netRegularIncome + (rentalCashflow - rentalTaxableProfit) + eventCash + propertySaleCash;
    // invest destinations
    const investIn = eventInvest + propertySaleInvest;
    if (investIn > 0) {
      const isaRoom = Math.max(0, ISA.annualAllowance * s.people.length - isaContribThisTaxYear);
      const toIsa = Math.min(investIn, isaRoom);
      pots.isa += toIsa; isaContribThisTaxYear += toIsa;
      pots.gia += investIn - toIsa; pots.giaBasis += investIn - toIsa;
    }
    pots.cash -= spend;

    // contributions to investment accounts while working
    if (!retired) {
      for (const a of s.accounts) {
        if (a.monthlyContribution > 0) {
          const amt = a.monthlyContribution * inflFactor;
          pots.cash -= amt;
          if (a.type === 'isa') {
            // Respect the ISA annual allowance; the overflow goes to the taxable account
            const room = Math.max(0, ISA.annualAllowance * s.people.length - isaContribThisTaxYear);
            const toIsa = Math.min(amt, room);
            pots.isa += toIsa; isaContribThisTaxYear += toIsa;
            pots.gia += amt - toIsa; pots.giaBasis += amt - toIsa;
          } else if (a.type === 'gia') { pots.gia += amt; pots.giaBasis += amt; }
          else pots.cash += amt; // cash contribution stays in cash
        }
      }
    }

    // ----- withdrawals to cover deficit / invest surplus -----
    let drawdownGross = 0;
    let drawdownNet = 0;
    const bufferTarget = (s.assumptions.cashBufferMonths || 0) * spend;
    if (pots.cash < 0 || (retired && pots.cash < bufferTarget * 0.999)) {
      let need = Math.max(0, (retired ? bufferTarget : 0) - pots.cash);
      const seq = WITHDRAWAL_SEQUENCES[s.assumptions.withdrawalOrder] ?? WITHDRAWAL_SEQUENCES['cash-gia-isa-pension'];
      for (const src of seq) {
        if (need <= 0) break;
        if (src === 'gia' && pots.gia > 0) {
          const take = Math.min(need, pots.gia);
          const gain = take * Math.max(0, 1 - pots.giaBasis / pots.gia);
          // Joint ownership assumed: realised gains split equally, each person
          // using their own annual exempt amount and marginal CGT band.
          let cgt = 0;
          for (const p of s.people) {
            const share = gain / s.people.length;
            giaGainsThisTaxYear[p.id] = (giaGainsThisTaxYear[p.id] ?? 0) + share;
            const taxableGain = Math.max(0, giaGainsThisTaxYear[p.id] - CGT.annualExemptAmount);
            const income = personPensionIncome[p.id] + personEarned[p.id];
            const rate = income > INCOME_TAX.bands[0].upTo ? CGT.sharesRates.higher : CGT.sharesRates.basic;
            cgt += Math.min(share, taxableGain) * rate;
          }
          pots.gia -= take;
          pots.giaBasis = Math.max(0, pots.giaBasis * (pots.gia / (pots.gia + take)));
          pots.cash += take - cgt;
          taxThisMonth += cgt;
          need = Math.max(0, need - (take - cgt));
        } else if (src === 'isa' && pots.isa > 0) {
          const take = Math.min(need, pots.isa);
          pots.isa -= take; pots.cash += take; need -= take;
        } else if (src === 'pension') {
          // draw from each person's pot if they're old enough
          for (const p of s.people) {
            if (need <= 0) break;
            const pot = pots.pension[p.id];
            if (pot <= 0) continue;
            if (ageAt(p, i) < minPensionAgeAt(i)) continue;
            // Effective tax rate on a recurring monthly draw, from the real
            // bands on top of this person's other income (zero below the
            // personal allowance). Iterate the gross-up to convergence.
            const annualInc = personPensionIncome[p.id] + personEarned[p.id];
            const baseTax = incomeTax(annualInc);
            const rateOn = (grossMonthly: number) => {
              const extra = grossMonthly * 12;
              return extra > 0 ? (incomeTax(annualInc + extra) - baseTax) / extra : 0;
            };
            let gross = Math.min(need, pot);
            for (let it = 0; it < 3; it++) {
              gross = Math.min(need / (1 - rateOn(gross)), pot);
            }
            const tax = gross * rateOn(gross);
            pots.pension[p.id] -= gross;
            pots.cash += gross - tax;
            taxThisMonth += tax;
            drawdownGross += gross;
            drawdownNet += gross - tax;
            need = Math.max(0, need - (gross - tax));
          }
        }
      }
      if (pots.cash < -1 && runOutIdx === null && retired) {
        runOutIdx = i;
      }
    } else if (pots.cash > bufferTarget) {
      // invest surplus above the buffer
      const surplus = retired ? pots.cash - bufferTarget : Math.max(0, pots.cash - Math.max(bufferTarget, spend * 2));
      if (surplus > 0) {
        const isaRoom = Math.max(0, ISA.annualAllowance * s.people.length - isaContribThisTaxYear);
        const toIsa = Math.min(surplus, isaRoom);
        pots.isa += toIsa; isaContribThisTaxYear += toIsa;
        pots.gia += surplus - toIsa; pots.giaBasis += surplus - toIsa;
        pots.cash -= surplus;
      }
    }

    // ----- growth -----
    const mi = i - startIndex;
    const g = (key: string, annualPct: number) => {
      const o = opt.monthlyReturnsOverride?.(key, mi);
      return o !== undefined ? o : monthlyRate(annualPct);
    };
    pots.isa *= 1 + g('isa', isaGrowth);
    pots.gia *= 1 + g('gia', giaGrowth);
    pots.cash *= 1 + Math.max(0, g('cash', cashGrowth));
    for (const p of s.people) pots.pension[p.id] *= 1 + g('pension:' + p.id, penGrowth[p.id]);

    totalTax += taxThisMonth + propertyCgt;

    // ----- record -----
    const propertyEquity = props.filter((x) => !x.sold).reduce((t, x) => t + x.value - (x.mortgage?.balance ?? 0), 0);
    const pensionTotal = Object.values(pots.pension).reduce((a, b) => a + b, 0);
    months.push({
      ym: indexToYm(i),
      ages: s.people.map((p) => Math.floor(ageAt(p, i))),
      phase: !retired ? 'working' : i < lastRetirementIdx ? 'part-time' : 'retired',
      grossEmployment: round2(grossEmployment),
      netEmployment: round2(netEmployment),
      statePension: round2(statePensionInc),
      dbPension: round2(dbInc),
      pensionDrawdown: round2(drawdownGross),
      rentalNet: round2(rentalCashflow),
      totalNetIncome: round2(netRegularIncome + drawdownNet),
      spending: round2(spend),
      netCashflow: round2(netRegularIncome - spend),
      taxPaid: round2(taxThisMonth + propertyCgt),
      cash: round2(pots.cash),
      isa: round2(pots.isa),
      gia: round2(pots.gia),
      pensionPots: round2(pensionTotal),
      propertyEquity: round2(propertyEquity),
      netWorth: round2(pots.cash + pots.isa + pots.gia + pensionTotal + propertyEquity),
    });
  }

  // ---------- yearly summary ----------
  const years: YearSummary[] = [];
  for (let y = Math.floor(startIndex / 12); y <= Math.floor(endIndex / 12); y++) {
    const rows = months.filter((m) => m.ym.startsWith(String(y)));
    if (!rows.length) continue;
    years.push({
      year: y,
      taxYear: taxYearOf(new Date(Date.UTC(y, 6, 1))),
      grossIncome: round2(rows.reduce((t, r) => t + r.grossEmployment + r.statePension + r.dbPension + r.pensionDrawdown + r.rentalNet, 0)),
      taxPaid: round2(rows.reduce((t, r) => t + r.taxPaid, 0)),
      netIncome: round2(rows.reduce((t, r) => t + r.totalNetIncome, 0)),
      spending: round2(rows.reduce((t, r) => t + r.spending, 0)),
      netWorthEnd: rows[rows.length - 1].netWorth,
    });
  }

  // ---------- metrics ----------
  const retRow = months.find((m) => ymToIndex(m.ym) === firstRetirementIdx) ?? months[months.length - 1];
  const last = months[months.length - 1];
  const estate = last.netWorth; // pensions included in estate from April 2027 rules
  const nrb = IHT.nilRateBand * (s.people.length > 1 ? 2 : 1);
  let rnrb = IHT.residenceNilRateBand * (s.people.length > 1 ? 2 : 1);
  const hasHome = props.some((p) => p.def.isMainHome && !p.sold);
  if (!hasHome) rnrb = 0;
  if (estate > IHT.rnrbTaperThreshold) rnrb = Math.max(0, rnrb - (estate - IHT.rnrbTaperThreshold) / 2);
  const ihtEstimate = Math.max(0, (estate - nrb - rnrb)) * IHT.rate;

  // Guaranteed income (state + DB) once every stream is in payment, expressed
  // in today's money so it can sit beside the other today's-money figures.
  let guaranteedIdx = -Infinity;
  for (const p of s.people) {
    if (spFraction[p.id] > 0) guaranteedIdx = Math.max(guaranteedIdx, spStartIdx[p.id]);
  }
  for (const db of s.dbPensions) guaranteedIdx = Math.max(guaranteedIdx, dbStart[db.id]);
  let guaranteedMonthly = 0;
  if (isFinite(guaranteedIdx)) {
    const gi = Math.min(Math.max(guaranteedIdx, startIndex), endIndex);
    const row = months[gi - startIndex];
    guaranteedMonthly = (row.statePension + row.dbPension) / Math.pow(1 + infl, (gi - startIndex) / 12);
  }

  const metrics: KeyMetrics = {
    retirementDate: indexToYm(firstRetirementIdx),
    netWorthAtRetirement: retRow.netWorth,
    pensionPotAtRetirement: retRow.pensionPots,
    liquidAtRetirement: round2(retRow.cash + retRow.isa + retRow.gia),
    guaranteedMonthlyAtRetirement: round2(guaranteedMonthly),
    sustainableMonthlyIncome: 0, // filled by solver
    runOutAge: runOutIdx !== null ? Math.floor(ageAt(s.people[0], runOutIdx)) : null,
    successToPlanAge: runOutIdx === null,
    estateAtPlanAge: estate,
    ihtEstimate: round2(ihtEstimate),
    totalTaxPaid: round2(totalTax),
    earliestRetirementDate: null,
    monteCarloSuccessPct: null,
  };

  return { months, years, metrics, warnings: Array.from(new Set(warnings)) };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
