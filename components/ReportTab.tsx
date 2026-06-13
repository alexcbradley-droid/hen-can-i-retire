'use client';

import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { ProjectionResult } from '@/lib/engine/types';
import { sensitivityGrid } from '@/lib/engine/solvers';
import { gbp, gbpShort, ymLabel } from '@/lib/format';
import { NetWorthChart, IncomeSpendChart } from './charts';
import { assetById } from '@/lib/engine/assets';
import { RULES_VERSION } from '@/lib/engine/uk-rules';

export default function ReportTab({ projection }: { projection: ProjectionResult }) {
  const { active: s } = useStore();
  const m = projection.metrics;
  const grid = useMemo(
    () => sensitivityGrid(s),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [`${s.id}:${s.updatedAt}`],
  );

  return (
    <div>
      <div className="print-brand"><b>When can I retire? — retirement plan report</b></div>
      <div className="btn-row no-print" style={{ marginBottom: 14 }}>
        <button className="btn cta" onClick={() => window.print()}>Download PDF report</button>
        <span className="muted small">Uses your browser&apos;s print dialogue — choose &quot;Save as PDF&quot; as the destination for a file.</span>
      </div>

      <div className="card">
        <h2>Retirement plan report — {s.name}</h2>
        <p className="muted small">
          Prepared {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} ·
          Rules: {RULES_VERSION} · Guidance only, not financial advice.
        </p>
        <div className="tiles">
          <div className={`tile ${m.successToPlanAge ? 'good' : 'bad'}`}><div className="bar" /><div className="k">Verdict</div>
            <div className="v small">{m.successToPlanAge ? `Funded to age ${s.people[0].planToAge}` : `Shortfall at age ${m.runOutAge}`}</div></div>
          <div className="tile"><div className="bar" /><div className="k">Planned retirement</div><div className="v small">{ymLabel(m.retirementDate)}</div></div>
          <div className="tile"><div className="bar" /><div className="k">Earliest possible</div><div className="v small">{m.earliestRetirementDate ? ymLabel(m.earliestRetirementDate) : '—'}</div></div>
          <div className="tile"><div className="bar" /><div className="k">Sustainable income</div><div className="v small">{gbp(m.sustainableMonthlyIncome)}/mo</div></div>
          <div className="tile"><div className="bar" /><div className="k">Guaranteed income (today&apos;s money)</div><div className="v small">{gbp(m.guaranteedMonthlyAtRetirement)}/mo</div></div>
          <div className="tile"><div className="bar" /><div className="k">Net worth at retirement</div><div className="v small">{gbpShort(m.netWorthAtRetirement)}</div></div>
          <div className="tile"><div className="bar" /><div className="k">Estate at plan age</div><div className="v small">{gbpShort(m.estateAtPlanAge)}</div></div>
          <div className="tile"><div className="bar" /><div className="k">IHT estimate</div><div className="v small">{gbpShort(m.ihtEstimate)}</div></div>
        </div>
      </div>

      <div className="card">
        <h3>Household and assumptions</h3>
        <ul className="small" style={{ columns: 2, lineHeight: 1.9 }}>
          {s.people.map((p) => <li key={p.id}>{p.name}: born {p.dateOfBirth}, planning to age {p.planToAge}</li>)}
          {s.employments.map((e, i) => {
            const p = s.people.find((x) => x.id === e.personId);
            return <li key={i}>{p?.name}: {gbp(e.grossSalary)}/yr {e.bonus ? `+ ${gbp(e.bonus)} bonus` : ''}, retiring {ymLabel(e.retirementDate)}</li>;
          })}
          {s.dcPensions.map((d) => <li key={d.id}>{d.name}: {gbpShort(d.currentValue)}, {d.employeePct}% + {d.employerPct}% employer, growth {d.growthPct}%</li>)}
          {s.dbPensions.map((d) => <li key={d.id}>{d.name}: {gbp(d.annualPension)}/yr from age {d.startAge}</li>)}
          {s.accounts.map((a) => <li key={a.id}>{a.name} ({a.type.toUpperCase()}): {gbpShort(a.value)} in {assetById(a.assetId).label}, {a.growthPct}%/yr</li>)}
          {s.properties.map((p) => <li key={p.id}>{p.name}: {gbpShort(p.value)}{p.mortgage ? `, mortgage ${gbpShort(p.mortgage.balance)}` : ''}{p.rental ? `, rent ${gbp(p.rental.grossMonthlyRent)}/mo` : ''}{p.sale ? `, selling ${ymLabel(p.sale.date)}` : ''}</li>)}
          {s.events.map((e) => <li key={e.id}>{e.name}: {gbpShort(e.amount)} in {ymLabel(e.date)}</li>)}
          <li>Inflation {s.assumptions.inflationPct}% · cash buffer {s.assumptions.cashBufferMonths} months · withdrawal order: {s.assumptions.withdrawalOrder.replace(/-/g, ' → ')}</li>
        </ul>
      </div>

      <div className="card">
        <h3>Net worth projection</h3>
        <NetWorthChart months={projection.months} real={s.assumptions.displayReal} inflationPct={s.assumptions.inflationPct} />
        <h3 style={{ marginTop: 18 }}>Income vs spending</h3>
        <IncomeSpendChart months={projection.months} real={s.assumptions.displayReal} inflationPct={s.assumptions.inflationPct} />
      </div>

      <div className="card">
        <h3>Sensitivity</h3>
        <table className="data">
          <thead><tr><th>Case</th><th>Money lasts</th><th>Net worth at plan age</th></tr></thead>
          <tbody>
            {grid.map((g) => (
              <tr key={g.label}>
                <td>{g.label} <span className="muted">— {g.delta}</span></td>
                <td>{g.runOutAge === null ? 'to plan age' : `runs out at ${g.runOutAge}`}</td>
                <td>{gbpShort(g.netWorthAtPlanAge)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Important notes</h3>
        <p className="small muted" style={{ marginBottom: 0 }}>
          This report is guidance, not financial advice, and is only as good as the information entered.
          Projections use simplified UK tax rules ({RULES_VERSION}) — see the methodology page for every
          assumption, source and known simplification. Investment values can fall as well as rise; past
          performance does not predict future results; tax rules change. For decisions such as transfers,
          annuity purchase or defined benefit options, consult a regulated financial adviser.
        </p>
      </div>
    </div>
  );
}
