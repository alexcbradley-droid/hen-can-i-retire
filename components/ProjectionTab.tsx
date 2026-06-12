'use client';

import { useState } from 'react';
import { ProjectionResult, MonthRow } from '@/lib/engine/types';
import { useStore } from '@/lib/store';
import { toReal } from '@/lib/format';
import { downloadFile, slugify } from '@/lib/download';

const COLS: { key: keyof MonthRow; label: string }[] = [
  { key: 'grossEmployment', label: 'Gross pay' },
  { key: 'statePension', label: 'State Pension' },
  { key: 'dbPension', label: 'DB pension' },
  { key: 'pensionDrawdown', label: 'Drawdown' },
  { key: 'rentalNet', label: 'Rental net' },
  { key: 'taxPaid', label: 'Tax' },
  { key: 'spending', label: 'Spending' },
  { key: 'netCashflow', label: 'Net cashflow' },
  { key: 'cash', label: 'Cash' },
  { key: 'isa', label: 'ISA' },
  { key: 'gia', label: 'Investments' },
  { key: 'pensionPots', label: 'Pensions' },
  { key: 'propertyEquity', label: 'Property equity' },
  { key: 'netWorth', label: 'Net worth' },
];

export default function ProjectionTab({ projection }: { projection: ProjectionResult }) {
  const { active: s } = useStore();
  const [granularity, setGranularity] = useState<'yearly' | 'monthly'>('yearly');
  const real = s.assumptions.displayReal;

  const rows = granularity === 'monthly'
    ? projection.months
    : projection.months.filter((m) => m.ym.endsWith('-12') || m === projection.months[projection.months.length - 1]);

  const deflate = (v: number, i: number) => (real ? toReal(v, i, s.assumptions.inflationPct) : v);
  const fmt = (v: number, i: number) => Math.round(deflate(v, i)).toLocaleString('en-GB');

  const downloadCsv = () => {
    // CSV cells must be plain numbers — locale thousands separators would split columns.
    const header = ['month', 'ages', ...COLS.map((c) => c.label)].join(',');
    const lines = projection.months.map((m, i) =>
      [m.ym, m.ages.join('/'), ...COLS.map((c) => Math.round(deflate(m[c.key] as number, i)))].join(','),
    );
    downloadFile(`${slugify(s.name)}-projection.csv`, header + '\n' + lines.join('\n'), 'text/csv');
  };

  return (
    <div className="card">
      <div className="panel-title">
        <h3>Projection {real ? "(today's money)" : '(nominal)'}</h3>
        <div className="btn-row no-print">
          <select value={granularity} onChange={(e) => setGranularity(e.target.value as 'yearly' | 'monthly')} style={{ width: 'auto' }}>
            <option value="yearly">Year-end rows</option>
            <option value="monthly">Every month</option>
          </select>
          <button className="btn small" onClick={downloadCsv}>Download CSV</button>
        </div>
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr><th>Month</th><th>Age{s.people.length > 1 ? 's' : ''}</th>{COLS.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const i = projection.months.indexOf(m);
              return (
                <tr key={m.ym}>
                  <td>{m.ym}</td>
                  <td>{m.ages.join(' / ')}</td>
                  {COLS.map((c) => {
                    const v = m[c.key] as number;
                    return <td key={c.key} className={v < -0.5 ? 'neg' : undefined}>{fmt(v, i)}</td>;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
