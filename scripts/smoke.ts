// Engine smoke test: `npm run smoke`. Asserts the engine's core behaviours on
// the sample household so regressions fail loudly rather than printing noise.

import assert from 'node:assert';
import { sampleScenario, emptyScenario } from '../lib/engine/defaults';
import { simulate } from '../lib/engine/engine';
import { sustainableMonthlyIncome, earliestRetirementDate, fullProjection } from '../lib/engine/solvers';
import { monteCarlo } from '../lib/engine/montecarlo';
import { incomeTax, statePensionAge } from '../lib/engine/uk-rules';

// ---- unit checks on the tax and pension rules ----
assert.equal(Math.round(incomeTax(60000)), 11432, 'income tax on £60k');
assert.equal(Math.round(incomeTax(130000)), 44703, 'income tax on £130k (PA fully tapered)');
assert.equal(incomeTax(12000), 0, 'no tax below the personal allowance');
assert.deepEqual(statePensionAge('1959-12-01'), { years: 66, months: 0 });
assert.deepEqual(statePensionAge('1960-06-10'), { years: 66, months: 3 });
assert.deepEqual(statePensionAge('1965-01-01'), { years: 67, months: 0 });
assert.deepEqual(statePensionAge('1980-01-01'), { years: 68, months: 0 });

// ---- full simulation on the sample household ----
const s = sampleScenario();
const t0 = Date.now();
const r = simulate(s);
const simMs = Date.now() - t0;
assert.ok(r.months.length > 400, 'simulates a multi-decade horizon');
assert.ok(r.metrics.successToPlanAge, 'sample household plan succeeds');
assert.ok(r.metrics.netWorthAtRetirement > 1_000_000, 'plausible net worth at retirement');
assert.ok(r.metrics.guaranteedMonthlyAtRetirement > 1000 && r.metrics.guaranteedMonthlyAtRetirement < 4000,
  `guaranteed income in today's money looks plausible (got ${r.metrics.guaranteedMonthlyAtRetirement})`);
assert.ok(r.metrics.ihtEstimate > 0, 'large estate produces an IHT estimate');
assert.ok(simMs < 200, `simulation fast enough (${simMs}ms)`);

const sustainable = sustainableMonthlyIncome(s);
assert.ok(sustainable > 2000 && sustainable < 15000, `sustainable income plausible (got ${sustainable})`);

const earliest = earliestRetirementDate(s);
assert.ok(earliest && earliest <= '2031-07', `earliest retirement at or before plan (got ${earliest})`);

const mc = monteCarlo(s, 100);
assert.ok(mc.successPct >= 60, `Monte Carlo success plausible (got ${mc.successPct}%)`);

// ---- regression: a non-working partner must not flip the household to retired ----
const couple = sampleScenario();
couple.employments = couple.employments.slice(0, 1); // partner stops working
const r2 = simulate(couple);
assert.equal(r2.metrics.retirementDate, '2031-07', 'household retires when the worker retires');

// ---- empty scenario still runs end to end ----
const e = fullProjection(emptyScenario());
assert.ok(e.months.length > 0, 'empty scenario simulates');

console.log('smoke OK —',
  `sim ${simMs}ms,`,
  `sustainable £${sustainable}/mo,`,
  `earliest ${earliest},`,
  `MC ${mc.successPct}%,`,
  `guaranteed £${Math.round(r.metrics.guaranteedMonthlyAtRetirement)}/mo (today's money)`);
