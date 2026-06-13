'use client';

// Audit: how every headline figure was calculated, and every assumption that
// went into the calculation — the per-plan companion to the methodology page.

import Link from 'next/link';
import { useStore } from '@/lib/store';
import { ProjectionResult } from '@/lib/engine/types';
import { gbp, gbpShort, ymLabel } from '@/lib/format';
import { assetById } from '@/lib/engine/assets';
import { RULES_VERSION } from '@/lib/engine/uk-rules';

export default function AuditTab({ projection }: { projection: ProjectionResult }) {
  const { active: s } = useStore();
  const m = projection.metrics;
  const atRetirement = projection.months.find((r) => r.ym === m.retirementDate)
    ?? projection.months[projection.months.length - 1];

  return (
    <div>
      <div className="card">
        <div className="panel-title"><h3>How the headline figures are calculated</h3>
          <span className="hint">Engine rules: {RULES_VERSION}</span></div>
        <p className="small muted">
          The engine simulates your household month by month from now to age {s.people[0].planToAge}:
          income (salary, pensions, rent) minus tax and spending each month; surpluses are invested,
          shortfalls are drawn from your pots in the order “{s.assumptions.withdrawalOrder.replace(/-/g, ' → ')}”.
          Every figure below comes from that one simulation — there are no separate formulas to disagree
          with each other. Full method, sources and known simplifications: <Link href="/methodology">methodology page</Link>.
        </p>

        <h3 style={{ marginTop: 14 }}>Net worth at retirement — {gbpShort(m.netWorthAtRetirement)}</h3>
        <p className="small muted" style={{ marginBottom: 6 }}>
          The balances at your first retirement month ({ymLabel(m.retirementDate)}), added up:
        </p>
        <div className="table-wrap">
          <table className="data">
            <tbody>
              <tr><td>Cash</td><td>{gbpShort(atRetirement.cash)}</td></tr>
              <tr><td>ISAs</td><td>{gbpShort(atRetirement.isa)}</td></tr>
              <tr><td>General investments (taxable)</td><td>{gbpShort(atRetirement.gia)}</td></tr>
              <tr><td>Pension pots (after any tax-free lump sum taken)</td><td>{gbpShort(atRetirement.pensionPots)}</td></tr>
              <tr><td>Property equity (values minus mortgage balances)</td><td>{gbpShort(atRetirement.propertyEquity)}</td></tr>
              <tr><td><b>Net worth</b></td><td><b>{gbpShort(atRetirement.netWorth)}</b></td></tr>
            </tbody>
          </table>
        </div>

        <h3 style={{ marginTop: 16 }}>Sustainable income — {gbp(m.sustainableMonthlyIncome)}/month</h3>
        <p className="small muted">
          Found by binary search: the engine re-runs the whole simulation with different flat monthly
          retirement spends (in today&apos;s money) until it finds the highest one where your money still
          lasts to age {s.people[0].planToAge}. 18 search steps narrow it to the pound.
        </p>

        <h3>Earliest you could retire — {m.earliestRetirementDate ? ymLabel(m.earliestRetirementDate) : 'later than planned'}</h3>
        <p className="small muted">
          The same simulation, moving every retirement date earlier a month at a time (binary search)
          until the plan stops succeeding with your current spending. Retiring later never hurts the
          plan, which is what makes this search valid.
        </p>

        <h3>Guaranteed income — {gbp(m.guaranteedMonthlyAtRetirement)}/month</h3>
        <p className="small muted" style={{ marginBottom: 0 }}>
          State Pension (from your NI qualifying years) plus defined benefit pensions, once all are in
          payment, in today&apos;s money. This is income that does not depend on investment returns.
        </p>
      </div>

      <div className="card">
        <div className="panel-title"><h3>Every assumption in this plan</h3>
          <span className="hint">Edit any of these on the “Your details” tab</span></div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Item</th><th>Assumption</th></tr></thead>
            <tbody>
              <tr><td>Inflation (CPI)</td><td>{s.assumptions.inflationPct}% per year</td></tr>
              <tr><td>Cash buffer kept before investing surplus</td><td>{s.assumptions.cashBufferMonths} months of spending</td></tr>
              <tr><td>Withdrawal order in retirement</td><td>{s.assumptions.withdrawalOrder.replace(/-/g, ' → ')}</td></tr>
              <tr><td>Plan horizon</td><td>to age {s.people[0].planToAge}</td></tr>
              <tr><td>Tax rules</td><td>{RULES_VERSION}, England/Wales/NI bands</td></tr>
              {s.employments.map((e, i) => {
                const p = s.people.find((x) => x.id === e.personId);
                return <tr key={`emp${i}`}><td>Salary growth — {p?.name || `person ${i + 1}`}</td><td>{e.salaryGrowthPct}% per year, retiring {ymLabel(e.retirementDate)}</td></tr>;
              })}
              {s.dcPensions.map((d) => (
                <tr key={d.id}><td>Pension growth — {d.name}</td><td>{d.growthPct}% per year, fees {d.feesPct}%</td></tr>
              ))}
              {s.accounts.map((a) => (
                <tr key={a.id}><td>Growth — {a.name} ({a.type.toUpperCase()})</td><td>{a.growthPct}% per year ({assetById(a.assetId).label}), fees {a.feesPct}%</td></tr>
              ))}
              {s.properties.map((p) => (
                <tr key={p.id}><td>Price growth — {p.name}</td><td>{p.growthPct}% per year</td></tr>
              ))}
              {s.statePensions.map((sp, i) => {
                const p = s.people.find((x) => x.id === sp.personId);
                return <tr key={`sp${i}`}><td>State Pension — {p?.name || `person ${i + 1}`}</td><td>{sp.qualifyingYears} NI years so far{sp.deferralYears ? `, deferred ${sp.deferralYears}y` : ''}</td></tr>;
              })}
              <tr><td>Spending in retirement</td><td>
                {s.spending.retirement.kind === 'flat' && `${gbp(s.spending.retirement.monthlyToday)}/month (today's money)`}
                {s.spending.retirement.kind === 'phases' && 'three-phase (active / slower / later years)'}
                {s.spending.retirement.kind === 'plsa' && `PLSA "${s.spending.retirement.standard}" Retirement Living Standard`}
              </td></tr>
            </tbody>
          </table>
        </div>
        <p className="small muted" style={{ margin: '10px 0 0' }}>
          Monte Carlo (Risk &amp; stress tab) re-runs the simulation hundreds of times with randomised
          returns around these growth assumptions; the success rate is the share of runs where money
          lasts to plan age. Sensitivity cases change one assumption at a time so you can see which
          ones matter most.
        </p>
      </div>
    </div>
  );
}
