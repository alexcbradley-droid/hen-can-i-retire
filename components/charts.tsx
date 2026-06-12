'use client';

import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { MonthRow } from '@/lib/engine/types';
import { gbpShort, toReal } from '@/lib/format';

const C = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

// Down-sample first (keeping the original month index for deflation), then
// build chart rows — no point deflating points that are thrown away.
function sampledRows(months: MonthRow[], real: boolean, inflationPct: number, step = 3) {
  const out = [];
  for (let i = 0; i < months.length; i++) {
    if (i % step !== 0 && i !== months.length - 1) continue;
    const m = months[i];
    const f = (v: number) => (real ? toReal(v, i, inflationPct) : v);
    out.push({
      ym: m.ym,
      Cash: f(m.cash), ISA: f(m.isa), GIA: f(m.gia),
      Pensions: f(m.pensionPots), Property: f(m.propertyEquity),
      'Net worth': f(m.netWorth),
      Income: f(m.totalNetIncome), Spending: f(m.spending),
      'State Pension': f(m.statePension), 'DB pension': f(m.dbPension),
      Drawdown: f(m.pensionDrawdown), Rental: f(m.rentalNet),
    });
  }
  return out;
}

const tooltipStyle = { fontSize: 12, borderRadius: 8, border: '1px solid var(--line)' };

export function NetWorthChart({ months, real, inflationPct }: { months: MonthRow[]; real: boolean; inflationPct: number }) {
  const data = sampledRows(months, real, inflationPct);
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ left: 8, right: 8, top: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
        <XAxis dataKey="ym" tick={{ fontSize: 11 }} minTickGap={48} />
        <YAxis tickFormatter={gbpShort} tick={{ fontSize: 11 }} width={62} />
        <Tooltip formatter={(v) => gbpShort(Number(v))} contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {(['Cash', 'ISA', 'GIA', 'Pensions', 'Property'] as const).map((k, i) => (
          <Area key={k} type="monotone" dataKey={k} stackId="nw" stroke={C[i]} fill={C[i]} fillOpacity={0.45} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function IncomeSpendChart({ months, real, inflationPct }: { months: MonthRow[]; real: boolean; inflationPct: number }) {
  const data = sampledRows(months, real, inflationPct);
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ left: 8, right: 8, top: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
        <XAxis dataKey="ym" tick={{ fontSize: 11 }} minTickGap={48} />
        <YAxis tickFormatter={gbpShort} tick={{ fontSize: 11 }} width={62} />
        <Tooltip formatter={(v) => gbpShort(Number(v))} contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="Income" stroke={C[0]} dot={false} strokeWidth={2} />
        <Line type="monotone" dataKey="Spending" stroke={C[2]} dot={false} strokeWidth={2} />
        <Line type="monotone" dataKey="State Pension" stroke={C[3]} dot={false} />
        <Line type="monotone" dataKey="Drawdown" stroke={C[1]} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export interface CompareSeries { name: string; months: MonthRow[] }

export function CompareChart({ series, real, inflationPct }: { series: CompareSeries[]; real: boolean; inflationPct: number }) {
  // Align scenarios by month label, sampling each series before building rows.
  const byYm = new Map<string, Record<string, number | string>>();
  for (const s of series) {
    for (let i = 0; i < s.months.length; i++) {
      if (i % 3 !== 0 && i !== s.months.length - 1) continue;
      const m = s.months[i];
      const row = byYm.get(m.ym) ?? { ym: m.ym };
      row[s.name] = real ? toReal(m.netWorth, i, inflationPct) : m.netWorth;
      byYm.set(m.ym, row);
    }
  }
  const data = Array.from(byYm.values()).sort((a, b) => String(a.ym).localeCompare(String(b.ym)));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ left: 8, right: 8, top: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
        <XAxis dataKey="ym" tick={{ fontSize: 11 }} minTickGap={48} />
        <YAxis tickFormatter={gbpShort} tick={{ fontSize: 11 }} width={62} />
        <Tooltip formatter={(v) => gbpShort(Number(v))} contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s, i) => (
          <Line key={s.name} type="monotone" dataKey={s.name} stroke={C[i % C.length]} dot={false} strokeWidth={2} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
