'use client';

// Six-question quick start → an instant, clearly-illustrative first result,
// then "Open the full planner" which prefills a real scenario and hands off to
// the planner. The teaser maths is a simplified guideline; the planner does the
// real 2026/27-tax projection.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { emptyScenario } from '@/lib/engine/defaults';
import AreaChart from './AreaChart';

const NOW = new Date();
const THIS_YEAR = NOW.getFullYear();
const MM = String(NOW.getMonth() + 1).padStart(2, '0');

const gbp = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`;
const gbpK = (n: number) => (n >= 1000 ? `£${Math.round(n / 1000)}k` : `£${n}`);

type Answers = { age: number; target: number; pot: number; save: number; spend: number; home: number };

const STEPS = [
  { key: 'age', q: 'How old are you?', hint: 'This is the starting point for your plan. You can refine everything later.', type: 'slider', min: 25, max: 64, step: 1, unit: 'years old', fmt: (v: number) => `${v}` },
  { key: 'target', q: 'When would you ideally like to retire?', hint: 'Pick a target age to aim for — we’ll tell you whether it looks reachable.', type: 'slider', min: 50, max: 70, step: 1, unit: '', fmt: (v: number) => `age ${v}` },
  { key: 'pot', q: 'Roughly how much is in your pensions and savings today?', hint: 'A rough total is fine — workplace and personal pensions, ISAs and savings combined.', type: 'slider', min: 0, max: 900000, step: 5000, unit: '', fmt: gbpK },
  { key: 'save', q: 'How much goes into them each month?', hint: 'Include your own and your employer’s pension contributions, plus any regular saving.', type: 'slider', min: 0, max: 3000, step: 25, unit: 'a month', fmt: gbp },
  { key: 'spend', q: 'What would you like to spend each month in retirement?', hint: 'In today’s money. Think of the lifestyle you’d be comfortable with.', type: 'slider', min: 1200, max: 6000, step: 100, unit: 'a month', fmt: gbp },
  { key: 'home', q: 'Do you own your home?', hint: 'Housing costs make a big difference to the income you’ll need.', type: 'seg', options: ['Yes — mortgage-free', 'Yes — still paying a mortgage', 'No — I rent'] },
] as const;

function project(a: Answers) {
  const annualNeed = a.spend * 12;
  const homeFactor = [1.0, 1.08, 1.22][a.home] ?? 1.0;
  const targetPot = annualNeed * 22 * homeFactor;
  const growth = 0.04; const contrib = a.save * 12;
  let bal = a.pot; let yrs = 0; const series = [a.pot];
  while (bal < targetPot && yrs < 45 && a.age + yrs < 80) { bal = bal * (1 + growth) + contrib; yrs++; series.push(bal); }
  const earliestAge = a.age + yrs;
  let draw = bal;
  for (let age = earliestAge; age < 95; age++) { draw = draw * (1 + growth) - annualNeed * homeFactor; series.push(Math.max(draw, 0)); }
  return { earliestAge, year: THIS_YEAR + yrs, income: a.spend, series, lastsToEnd: draw > 0 };
}

function scenarioJson(a: Answers): string {
  const s = emptyScenario('My quick start');
  const retireYear = THIS_YEAR + Math.max(1, a.target - a.age);
  const retireDate = `${retireYear}-${MM}`;
  s.people[0].dateOfBirth = `${THIS_YEAR - a.age}-06-01`;
  s.employments = s.employments.map((e) => ({ ...e, retirementDate: retireDate }));
  s.dcPensions = [{ ...s.dcPensions[0], currentValue: a.pot, employeePct: 0, employerPct: 0, extraMonthly: a.save }];
  s.accounts = [];
  s.spending = { ...s.spending, retirement: { kind: 'flat', monthlyToday: a.spend } };
  s.goals = { targetRetirementDate: retireDate, targetMonthlyIncome: a.spend };
  return JSON.stringify(s);
}

export default function QuickStart() {
  const store = useStore();
  const router = useRouter();
  const [cur, setCur] = useState(0);
  const [done, setDone] = useState(false);
  const [a, setA] = useState<Answers>({ age: 42, target: 63, pot: 150000, save: 800, spend: 2400, home: 0 });

  const step = STEPS[cur];
  const set = (key: keyof Answers, v: number) => setA((p) => ({ ...p, [key]: v }));

  const next = () => { if (cur < STEPS.length - 1) setCur(cur + 1); else { setDone(true); window.scrollTo({ top: 0 }); } };
  const back = () => { if (cur > 0) setCur(cur - 1); };

  const openPlanner = () => { store.importJson(scenarioJson(a)); router.push('/plan'); };

  if (done) {
    const r = project(a);
    const onTrack = r.earliestAge <= a.target;
    const close = !onTrack && r.earliestAge <= a.target + 3;
    const sub = onTrack
      ? `That meets your target of age ${a.target} — open the full planner to pressure-test it.`
      : close
        ? `That's a little past your target of ${a.target}. Small changes could close the gap — let's see how in the planner.`
        : `That's later than your target of ${a.target}. The planner shows what would move it earlier.`;
    return (
      <div className="qs-page">
        <div className="qs-stage">
          <div className="container" style={{ maxWidth: 740 }}>
            <div className="qs-card">
              <div className="qs-result-head">
                <span className="eyebrow">Your first result</span>
                <div className="qs-headline">You could be on track to retire at <b>{r.earliestAge}</b>.</div>
                <p style={{ color: '#bcd3c9', margin: 0, position: 'relative' }}>{sub}</p>
              </div>
              <div className="qs-result-body">
                <div className="qs-stats">
                  <div className="qs-stat"><div className="f amber">{r.earliestAge}</div><div className="l">Earliest retire age</div></div>
                  <div className="qs-stat"><div className="f teal">{r.year}</div><div className="l">Around the year</div></div>
                  <div className="qs-stat"><div className="f teal">{gbp(r.income)}</div><div className="l">Monthly income</div></div>
                </div>
                <AreaChart className="qs-chart" series={r.series} w={600} h={170} stroke="var(--accent)" sw={3} grid ariaLabel="Projected pot value over time" />
                <div className="qs-chart-axis"><span>Age {a.age}</span><span>Retire {r.earliestAge}</span><span>Age 95</span></div>
                <div className="qs-illus">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                  <span><b style={{ color: 'var(--ink)' }}>Illustrative estimate</b> from a simplified model. The full planner applies real 2026/27 UK tax, your actual pots and stress-tests the plan — your number will differ.</span>
                </div>
                <div className="qs-result-cta">
                  <button className="btn btn-primary btn-lg" onClick={openPlanner}>Open the full planner
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </button>
                  <button className="btn btn-ghost btn-lg" onClick={() => { setDone(false); setCur(0); }}>Start over</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="qs-page">
      <div className="qs-stage">
        <div className="container" style={{ maxWidth: 740 }}>
          <div style={{ margin: '0 0 14px' }}>
            <Link href="/" className="qs-exit" style={{ marginLeft: 0 }}>← Back to home</Link>
          </div>
          <div className="qs-card">
            <div className="qs-prog">
              <div className="qs-prog-bar"><div className="qs-prog-fill" style={{ width: `${((cur + 1) / STEPS.length) * 100}%` }} /></div>
              <div className="qs-prog-meta">
                <span>Question {cur + 1} of {STEPS.length}</span>
                <span className="save"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg> Stays in your browser</span>
              </div>
            </div>
            <div className="qs-body">
              <div className="qs-q">{step.q}</div>
              <div className="qs-hint">{step.hint}</div>
              {step.type === 'slider' ? (
                <>
                  <div className="qs-value">
                    {step.fmt(a[step.key as keyof Answers])}
                    {step.unit ? <span className="unit">{step.unit}</span> : null}
                  </div>
                  <input className="qs-range" type="range" min={step.min} max={step.max} step={step.step}
                    aria-label={step.q} aria-valuetext={`${step.fmt(a[step.key as keyof Answers])} ${step.unit ?? ''}`.trim()}
                    value={a[step.key as keyof Answers]} onChange={(e) => set(step.key as keyof Answers, +e.target.value)} />
                  <div className="qs-scale"><span>{step.fmt(step.min!)}</span><span>{step.fmt(step.max!)}</span></div>
                </>
              ) : (
                <div className="qs-seg">
                  {step.options!.map((o, oi) => (
                    <button key={oi} className="qs-opt" aria-pressed={a.home === oi} onClick={() => set('home', oi)}>
                      <span className="tick"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></span>
                      {o}
                    </button>
                  ))}
                </div>
              )}
              <div className="qs-nav">
                {cur > 0 && (
                  <button className="qs-back" onClick={back}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 6l-6 6 6 6" /></svg> Back
                  </button>
                )}
                <div className="spacer" />
                <button className="btn btn-primary" onClick={next}>
                  {cur === STEPS.length - 1 ? 'See my result' : 'Continue'}
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </button>
              </div>
              <div className="qs-microtrust">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></svg>
                Free · no sign-up · guidance, not financial advice
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
