'use client';

import { ProjectionResult } from '@/lib/engine/types';
import { useStore } from '@/lib/store';
import { gbp, gbpShort, ymLabel } from '@/lib/format';
import { NetWorthChart, IncomeSpendChart } from './charts';

export default function OverviewTab({ projection }: { projection: ProjectionResult }) {
  const { active: s } = useStore();
  const m = projection.metrics;
  const goal = s.goals;

  const goalMet = goal.targetMonthlyIncome != null ? m.sustainableMonthlyIncome >= goal.targetMonthlyIncome : null;

  return (
    <div>
      {projection.warnings.map((w) => <p className="notice" key={w}>{w}</p>)}

      <div className="tiles">
        <div className={`tile ${m.successToPlanAge ? 'good' : 'bad'}`}>
          <div className="bar" /><div className="k">Plan status</div>
          <div className="v small">{m.successToPlanAge ? 'On track' : 'Falls short'}</div>
          <div className="sub">{m.successToPlanAge ? `Money lasts to age ${s.people[0].planToAge}` : `Runs out at age ${m.runOutAge}`}</div>
        </div>
        <div className="tile">
          <div className="bar" /><div className="k">Planned retirement</div>
          <div className="v small">{ymLabel(m.retirementDate)}</div>
        </div>
        <div className={`tile ${m.earliestRetirementDate ? 'good' : 'warn'}`}>
          <div className="bar" /><div className="k">Earliest you could retire</div>
          <div className="v small">{m.earliestRetirementDate ? ymLabel(m.earliestRetirementDate) : 'Later than planned'}</div>
          <div className="sub">Keeping all other assumptions</div>
        </div>
        <div className="tile">
          <div className="bar" /><div className="k">Sustainable income</div>
          <div className="v">{gbp(m.sustainableMonthlyIncome)}/mo</div>
          <div className="sub">Today&apos;s money, lasts to age {s.people[0].planToAge}</div>
        </div>
        <div className="tile">
          <div className="bar" /><div className="k">Guaranteed income</div>
          <div className="v">{gbp(m.guaranteedMonthlyAtRetirement)}/mo</div>
          <div className="sub">State + DB pensions once all in payment, today&apos;s money</div>
        </div>
        <div className="tile">
          <div className="bar" /><div className="k">Net worth at retirement</div>
          <div className="v">{gbpShort(m.netWorthAtRetirement)}</div>
        </div>
        <div className="tile">
          <div className="bar" /><div className="k">Pension pots at retirement</div>
          <div className="v">{gbpShort(m.pensionPotAtRetirement)}</div>
        </div>
        <div className="tile">
          <div className="bar" /><div className="k">Other savings at retirement</div>
          <div className="v">{gbpShort(m.liquidAtRetirement)}</div>
          <div className="sub">Cash, ISAs and investments</div>
        </div>
        <div className="tile">
          <div className="bar" /><div className="k">Estate at age {s.people[0].planToAge}</div>
          <div className="v">{gbpShort(m.estateAtPlanAge)}</div>
          <div className="sub">Inheritance tax estimate {gbpShort(m.ihtEstimate)}</div>
        </div>
        <div className="tile">
          <div className="bar" /><div className="k">Lifetime tax paid</div>
          <div className="v">{gbpShort(m.totalTaxPaid)}</div>
        </div>
        {goal.targetMonthlyIncome != null && (
          <div className={`tile ${goalMet ? 'good' : 'bad'}`}>
            <div className="bar" /><div className="k">Income goal {gbp(goal.targetMonthlyIncome)}/mo</div>
            <div className="v small">{goalMet ? 'Met' : `Short by ${gbp(goal.targetMonthlyIncome - m.sustainableMonthlyIncome)}/mo`}</div>
          </div>
        )}
        {goal.legacyTarget != null && goal.legacyTarget > 0 && (() => {
          const yearsToPlanAge = (projection.months.length - 1) / 12;
          const estateToday = m.estateAtPlanAge / Math.pow(1 + s.assumptions.inflationPct / 100, yearsToPlanAge);
          const legacyMet = estateToday >= goal.legacyTarget!;
          return (
            <div className={`tile ${legacyMet ? 'good' : 'bad'}`}>
              <div className="bar" /><div className="k">Legacy goal {gbpShort(goal.legacyTarget)}</div>
              <div className="v small">{legacyMet ? 'On track' : `Short by ${gbpShort(goal.legacyTarget - estateToday)}`}</div>
              <div className="sub">Estate at plan age ≈ {gbpShort(estateToday)} in today&apos;s money</div>
            </div>
          );
        })()}
      </div>

      <div className="card section-gap">
        <div className="panel-title"><h3>Net worth by component</h3>
          <span className="hint">{s.assumptions.displayReal ? "Today's money" : 'Future (nominal) money'}</span></div>
        <NetWorthChart months={projection.months} real={s.assumptions.displayReal} inflationPct={s.assumptions.inflationPct} />
      </div>

      <div className="card">
        <div className="panel-title"><h3>Income vs spending</h3>
          <span className="hint">Monthly, {s.assumptions.displayReal ? "today's money" : 'nominal'}</span></div>
        <IncomeSpendChart months={projection.months} real={s.assumptions.displayReal} inflationPct={s.assumptions.inflationPct} />
      </div>
    </div>
  );
}
