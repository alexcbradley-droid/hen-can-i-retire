'use client';

// Side-by-side comparison of up to three plans, with its own printable PDF.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { cachedProjection } from '@/lib/projection-cache';
import { ProjectionResult } from '@/lib/engine/types';
import { gbp, gbpShort, ymLabel } from '@/lib/format';
import { CompareChart } from './charts';
import { PrintBrand, PrintMeta } from './PrintBrand';

const MAX = 3;

export default function ComparePage() {
  const store = useStore();
  const [picked, setPicked] = useState<string[]>([]);

  const ids = picked.length
    ? picked
    : store.scenarios.slice(0, MAX).map((s) => s.id); // sensible default: first three

  const chosen = store.scenarios.filter((s) => ids.includes(s.id)).slice(0, MAX);

  const results = useMemo(
    () => chosen.map((s) => ({ s, r: cachedProjection(s) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chosen.map((s) => `${s.id}:${s.updatedAt}`).join('|')],
  );

  const toggle = (id: string) => {
    setPicked((prev) => {
      const cur = prev.length ? prev : ids;
      // Keep at least one selected — deselecting to zero would silently
      // bounce back to the default selection.
      if (cur.includes(id)) return cur.length > 1 ? cur.filter((x) => x !== id) : cur;
      if (cur.length >= MAX) return cur;
      return [...cur, id];
    });
  };

  if (!store.loaded) {
    return <main className="container"><p className="muted" style={{ padding: 40 }}>Loading your plans…</p></main>;
  }
  if (store.scenarios.length < 2) {
    return (
      <main className="container" style={{ paddingTop: 24 }}>
        <h1>Compare plans</h1>
        <p className="muted">
          You need at least two plans to compare. Open the <Link href="/plan">planner</Link>, hit{' '}
          <b>Duplicate</b>, change something (retire earlier, spend more, sell a property), then come back.
        </p>
      </main>
    );
  }

  const rows: { label: string; value: (r: ProjectionResult, planToAge: number) => string; cls?: (r: ProjectionResult) => string }[] = [
    { label: 'Plan status', value: (r, age) => (r.metrics.successToPlanAge ? `On track to ${age}` : `Runs out at ${r.metrics.runOutAge}`), cls: (r) => (r.metrics.successToPlanAge ? 'pill good' : 'pill bad') },
    { label: 'Planned retirement', value: (r) => ymLabel(r.metrics.retirementDate) },
    { label: 'Earliest possible', value: (r) => (r.metrics.earliestRetirementDate ? ymLabel(r.metrics.earliestRetirementDate) : 'Later than planned') },
    { label: 'Sustainable income', value: (r) => `${gbp(r.metrics.sustainableMonthlyIncome)}/mo` },
    { label: 'Guaranteed income', value: (r) => `${gbp(r.metrics.guaranteedMonthlyAtRetirement)}/mo` },
    { label: 'Net worth at retirement', value: (r) => gbpShort(r.metrics.netWorthAtRetirement) },
    { label: 'Pension pots at retirement', value: (r) => gbpShort(r.metrics.pensionPotAtRetirement) },
    { label: 'Estate at plan age', value: (r) => gbpShort(r.metrics.estateAtPlanAge) },
    { label: 'IHT estimate', value: (r) => gbpShort(r.metrics.ihtEstimate) },
    { label: 'Lifetime tax paid', value: (r) => gbpShort(r.metrics.totalTaxPaid) },
  ];

  return (
    <main className="container" style={{ paddingTop: 24 }}>
      <PrintBrand title="plan comparison" />
      <div className="panel-title no-print">
        <h1>Compare plans</h1>
        <span className="hint">Pick up to {MAX} plans to see them side by side.</span>
      </div>

      <div className="btn-row no-print" style={{ marginBottom: 14 }}>
        {store.scenarios.map((s) => (
          <button
            key={s.id}
            className={`btn small ${ids.includes(s.id) ? 'primary' : ''}`}
            onClick={() => toggle(s.id)}
            disabled={!ids.includes(s.id) && ids.length >= MAX}
          >
            {s.name}
          </button>
        ))}
        <button className="btn small cta" style={{ marginLeft: 'auto' }} onClick={() => window.print()}>
          Download comparison PDF
        </button>
      </div>

      <div className="card">
        <PrintMeta />
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th style={{ minWidth: 160 }}> </th>
                {results.map(({ s }) => <th key={s.id}>{s.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <td><b>{row.label}</b></td>
                  {results.map(({ s, r }) => (
                    <td key={s.id}>
                      {row.cls
                        ? <span className={row.cls(r)}>{row.value(r, s.people[0].planToAge)}</span>
                        : row.value(r, s.people[0].planToAge)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td><b>Key differences in inputs</b></td>
                {results.map(({ s }) => (
                  <td key={s.id} style={{ whiteSpace: 'normal', maxWidth: 240 }}>
                    <span className="small muted">
                      Retiring {s.employments[0] ? ymLabel(s.employments[0].retirementDate) : '—'} ·
                      inflation {s.assumptions.inflationPct}% ·
                      spend {s.spending.retirement.kind === 'flat' ? `${gbp(s.spending.retirement.monthlyToday)}/mo` : s.spending.retirement.kind}
                    </span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="panel-title"><h3>Net worth over time</h3>
          <span className="hint">{results[0]?.s.assumptions.displayReal ? "Today's money" : 'Nominal'}</span></div>
        <CompareChart
          series={results.map(({ s, r }) => ({ name: s.name, months: r.months }))}
          real={results[0]?.s.assumptions.displayReal ?? true}
          inflationPct={results[0]?.s.assumptions.inflationPct ?? 2.5}
        />
      </div>

      <p className="small muted print-only" style={{ marginTop: 10 }}>
        Projections are estimates based on the assumptions in each plan, not guarantees. Investment values
        can fall as well as rise. This comparison is guidance, not financial advice.
      </p>
    </main>
  );
}
