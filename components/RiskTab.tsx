'use client';

import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { sensitivityGrid } from '@/lib/engine/solvers';
import { monteCarlo, MonteCarloResult } from '@/lib/engine/montecarlo';
import { ProjectionResult } from '@/lib/engine/types';
import { gbpShort } from '@/lib/format';
import { WITHDRAWAL } from '@/lib/engine/uk-rules';

export default function RiskTab({ projection }: { projection: ProjectionResult }) {
  const { active: s } = useStore();
  const [mc, setMc] = useState<MonteCarloResult | null>(null);
  const [running, setRunning] = useState(false);
  const scenarioKey = `${s.id}:${s.updatedAt}`;

  // A Monte Carlo result belongs to one version of one scenario — clear it
  // the moment the inputs change so a stale probability is never shown.
  useEffect(() => { setMc(null); }, [scenarioKey]);

  const grid = useMemo(
    () => sensitivityGrid(s),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scenarioKey],
  );

  const runMc = () => {
    setRunning(true);
    // Let the spinner paint before the synchronous simulation work starts.
    setTimeout(() => {
      setMc(monteCarlo(s, 500));
      setRunning(false);
    }, 30);
  };

  const planAge = s.people[0].planToAge;
  const liquidAtRet = projection.metrics.liquidAtRetirement + projection.metrics.pensionPotAtRetirement;
  const impliedSwr = liquidAtRet > 0
    ? ((projection.metrics.sustainableMonthlyIncome - projection.metrics.guaranteedMonthlyAtRetirement) * 12) / liquidAtRet * 100
    : 0;

  return (
    <div>
      <div className="card">
        <div className="panel-title"><h3>Sensitivity analysis</h3>
          <span className="hint">How the outcome moves when one assumption changes.</span></div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Case</th><th>What changes</th><th>Money lasts</th><th>Net worth at age {planAge}</th></tr></thead>
            <tbody>
              {grid.map((g) => (
                <tr key={g.label}>
                  <td>{g.label}</td>
                  <td style={{ textAlign: 'left' }} className="muted">{g.delta}</td>
                  <td>{g.runOutAge === null ? <span className="pill good">to plan age</span> : <span className="pill bad">runs out at {g.runOutAge}</span>}</td>
                  <td>{gbpShort(g.netWorthAtPlanAge)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="panel-title"><h3>Monte Carlo simulation</h3>
          <span className="hint">500 randomised market paths based on each pool&apos;s expected return and volatility.</span></div>
        {!mc && (
          <button className="btn primary" onClick={runMc} disabled={running}>
            {running ? 'Running 500 simulations…' : 'Run simulation'}
          </button>
        )}
        {mc && (
          <>
            <div className="tiles">
              <div className={`tile ${mc.successPct >= 85 ? 'good' : mc.successPct >= 70 ? 'warn' : 'bad'}`}>
                <div className="bar" /><div className="k">Probability of success</div>
                <div className="v">{mc.successPct}%</div>
                <div className="sub">Money lasts to plan age in {mc.successPct}% of paths</div>
              </div>
              <div className="tile"><div className="bar" /><div className="k">Poor markets (10th pct)</div><div className="v">{gbpShort(mc.percentileFinalNetWorth.p10)}</div><div className="sub">Final net worth</div></div>
              <div className="tile"><div className="bar" /><div className="k">Median</div><div className="v">{gbpShort(mc.percentileFinalNetWorth.p50)}</div><div className="sub">Final net worth</div></div>
              <div className="tile"><div className="bar" /><div className="k">Strong markets (90th pct)</div><div className="v">{gbpShort(mc.percentileFinalNetWorth.p90)}</div><div className="sub">Final net worth</div></div>
              {mc.medianRunOutAge && (
                <div className="tile warn"><div className="bar" /><div className="k">When failures happen</div><div className="v small">age {mc.medianRunOutAge}</div><div className="sub">Median run-out age in failing paths</div></div>
              )}
            </div>
            <p className="small muted" style={{ marginTop: 10 }}>
              Planners commonly aim for 85–95%. A result below that suggests retiring a little later,
              spending slightly less, or holding more in guaranteed income.{' '}
              <button className="btn small no-print" onClick={runMc} disabled={running}>{running ? 'Running…' : 'Re-run'}</button>
            </p>
          </>
        )}
      </div>

      <div className="card">
        <div className="panel-title"><h3>Risks and considerations</h3></div>
        <ul className="small" style={{ lineHeight: 1.9 }}>
          <li><b>Withdrawal rate.</b> Your plan implies drawing roughly <b>{impliedSwr > 0 && isFinite(impliedSwr) ? impliedSwr.toFixed(1) : '—'}%</b> of
            your invested money in the first year (after guaranteed income). Research benchmarks: the classic &quot;4% rule&quot; ({WITHDRAWAL.classicRulePct}%),
            Morningstar&apos;s 2026 estimate ({WITHDRAWAL.morningstarLatestPct}%), and UK-data studies ({WITHDRAWAL.ukConservativePct}–3.6%). Above these, the plan leans on good markets.</li>
          <li><b>Sequence of returns.</b> Poor markets in the first years of retirement do disproportionate damage. Your {s.assumptions.cashBufferMonths}-month
            cash buffer helps you avoid selling investments in a downturn; the market-crash case above shows the direct impact.</li>
          <li><b>Inflation.</b> A sustained 1.5-point rise in inflation compounds heavily over decades — see the sensitivity row above. Index-linked income (State Pension, many DB schemes) protects against this; level annuities and cash do not.</li>
          <li><b>Longevity.</b> Around 1 in 4 healthy 65-year-olds lives into their mid-90s. The &quot;live to 100&quot; case shows whether your plan survives a long life.</li>
          <li><b>Tax rules change.</b> This plan uses 2026/27 rules including the 2027 change bringing unused pensions into inheritance tax. Future budgets will move thresholds and rates.</li>
          <li><b>Care costs.</b> {s.spending.careCosts ? 'You have allowed for late-life care costs — good.' : 'You have not allowed for late-life care costs; residential care can exceed £4,000–£6,000 a month.'}</li>
          {s.accounts.some((a) => ['bitcoin', 'ethereum'].includes(a.assetId)) && (
            <li><b>Crypto.</b> Part of your plan is in cryptoassets. The FCA&apos;s warning applies: be prepared to lose all money held in crypto — consider excluding it from income you rely on.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
