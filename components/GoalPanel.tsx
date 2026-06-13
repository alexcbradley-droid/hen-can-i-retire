'use client';

// Goal planner: pick a retirement date and monthly income, and solve for what
// it takes — extra saving per month, or a later date that works as-is.

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { goalPlan, GoalPlanResult } from '@/lib/engine/solvers';
import { ymToIndex } from '@/lib/engine/engine';
import { MonthField, NumField } from './fields';
import { gbp, ymLabel } from '@/lib/format';

export default function GoalPanel() {
  const store = useStore();
  const s = store.active;
  const [plan, setPlan] = useState<GoalPlanResult | null>(null);
  const [working, setWorking] = useState(false);

  const ready = !!(s.goals.targetRetirementDate && s.goals.targetMonthlyIncome);

  const run = () => {
    setWorking(true);
    // Yield to the browser so the button state paints before the solver runs.
    setTimeout(() => {
      setPlan(goalPlan(store.active));
      setWorking(false);
    }, 30);
  };

  return (
    <div className="card section-gap">
      <div className="panel-title"><h3>Your goal</h3>
        <span className="hint">When do you want to retire, and on how much?</span></div>
      <div className="grid3" style={{ alignItems: 'end' }}>
        <MonthField label="Target retirement date" required hint="When you'd like to stop working."
          value={s.goals.targetRetirementDate ?? ''}
          onChange={(v) => { store.update((d) => { d.goals.targetRetirementDate = v || undefined; }); setPlan(null); }} />
        <NumField label="Target income" suffix="£/month today" step={100} min={0} required
          hint="What you'd like to live on in retirement, in today's money."
          value={s.goals.targetMonthlyIncome ?? 0}
          onChange={(v) => { store.update((d) => { d.goals.targetMonthlyIncome = v || undefined; }); setPlan(null); }} />
        <div style={{ paddingBottom: 2 }}>
          <button className="btn cta" onClick={run} disabled={!ready || working}>
            {working ? 'Working it out…' : 'Work out what’s needed'}
          </button>
        </div>
      </div>
      {!ready && (
        <p className="small muted" style={{ margin: '8px 0 0' }}>
          Set both a date and an income, then hit the button.
        </p>
      )}
      {plan && plan.met && (
        <div className="notice info" style={{ marginBottom: 0 }}>
          <b>You&apos;re on track.</b> Retiring in {ymLabel(plan.targetDate)}, your plan sustains{' '}
          about {gbp(plan.sustainableAtTarget)}/month — {gbp(plan.sustainableAtTarget - plan.targetIncome)}/month
          more than your {gbp(plan.targetIncome)}/month goal.
        </div>
      )}
      {plan && !plan.met && (
        <div className="notice" style={{ marginBottom: 0 }}>
          <b>Not yet.</b> Retiring in {ymLabel(plan.targetDate)}, your plan sustains about{' '}
          {gbp(plan.sustainableAtTarget)}/month — {gbp(plan.targetIncome - plan.sustainableAtTarget)}/month
          short of your goal. Ways to get there:
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            {plan.extraMonthlySaving != null && (
              <li>Save about <b>{gbp(plan.extraMonthlySaving)}/month</b> extra from now until retirement
                (assumed invested, ~5% growth), or</li>
            )}
            {plan.laterDateMeetingGoal && (
              <li>Retire in <b>{ymLabel(plan.laterDateMeetingGoal)}</b> instead
                ({ymToIndex(plan.laterDateMeetingGoal) - ymToIndex(plan.targetDate)} months later), or</li>
            )}
            <li>Plan around <b>{gbp(plan.sustainableAtTarget)}/month</b> on your target date.</li>
          </ul>
        </div>
      )}
    </div>
  );
}
