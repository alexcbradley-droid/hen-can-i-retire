'use client';

import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { cachedProjection } from '@/lib/projection-cache';
import { gbp, gbpShort, ymLabel } from '@/lib/format';
import { CompareChart } from './charts';

export default function CompareTab() {
  const { scenarios, active } = useStore();

  const results = useMemo(
    () => scenarios.map((s) => ({ s, r: cachedProjection(s) })),
    // Cheap change token: ids + timestamps, not full content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scenarios.map((s) => `${s.id}:${s.updatedAt}`).join('|')],
  );

  if (scenarios.length < 2) {
    return (
      <div className="card">
        <h3>Compare scenarios</h3>
        <p className="muted">
          You only have one scenario so far. Use <b>Duplicate</b> in the bar above, change something
          (retire earlier, sell a property, spend more), and the scenarios will appear here side by side.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="panel-title"><h3>Scenario comparison</h3>
          <span className="hint">All figures from each scenario&apos;s own assumptions.</span></div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Scenario</th><th>Retires</th><th>Earliest possible</th><th>Sustainable income</th>
                <th>Net worth at retirement</th><th>Money lasts</th><th>Estate at plan age</th><th>IHT estimate</th>
              </tr>
            </thead>
            <tbody>
              {results.map(({ s, r }) => (
                <tr key={s.id} style={s.id === active.id ? { fontWeight: 600 } : undefined}>
                  <td>{s.name}{s.id === active.id ? ' (current)' : ''}</td>
                  <td>{ymLabel(r.metrics.retirementDate)}</td>
                  <td>{r.metrics.earliestRetirementDate ? ymLabel(r.metrics.earliestRetirementDate) : '—'}</td>
                  <td>{gbp(r.metrics.sustainableMonthlyIncome)}/mo</td>
                  <td>{gbpShort(r.metrics.netWorthAtRetirement)}</td>
                  <td>{r.metrics.successToPlanAge ? 'To plan age' : `Runs out at ${r.metrics.runOutAge}`}</td>
                  <td>{gbpShort(r.metrics.estateAtPlanAge)}</td>
                  <td>{gbpShort(r.metrics.ihtEstimate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card">
        <div className="panel-title"><h3>Net worth over time</h3>
          <span className="hint">{active.assumptions.displayReal ? "Today's money" : 'Nominal'}</span></div>
        <CompareChart
          series={results.map(({ s, r }) => ({ name: s.name, months: r.months }))}
          real={active.assumptions.displayReal}
          inflationPct={active.assumptions.inflationPct}
        />
      </div>
    </div>
  );
}
