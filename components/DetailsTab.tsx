'use client';

// The full assumptions editor: household, work, pensions, savings &
// investments, property, one-off events, spending and global assumptions.

import { useStore } from '@/lib/store';
import { uid } from '@/lib/engine/defaults';
import { ASSET_CATALOGUE, assetById } from '@/lib/engine/assets';
import { statePensionAge, PLSA } from '@/lib/engine/uk-rules';
import { ymToIndex, indexToYm } from '@/lib/engine/engine';
import { gbp } from '@/lib/format';
import { NumField, TextField, MonthField, DateField, SelectField, CheckField } from './fields';
import { useMarketData } from './useMarketData';

export default function DetailsTab() {
  const { active: s, update } = useStore();
  const market = useMarketData();

  const personOptions = s.people.map((p) => ({ value: p.id, label: p.name }));
  const assetOptions = ASSET_CATALOGUE.map((a) => {
    const live = market?.assets?.[a.id];
    let label = a.label;
    if (live?.annualised5yPct != null) {
      // Crypto figures are a 1-year price change shown for information only —
      // never presented as an average and never auto-applied as a growth rate.
      label = a.class === 'crypto'
        ? `${a.label} — ${live.annualised5yPct.toFixed(0)}% past year (not a forecast)`
        : `${a.label} — 5yr avg ${live.annualised5yPct.toFixed(1)}%/yr`;
    }
    return { value: a.id, label };
  });
  const plsa = s.people.length > 1 ? PLSA.couple : PLSA.single;

  return (
    <div>
      {/* ---- household ---- */}
      <div className="card">
        <div className="panel-title"><h3>Household</h3>
          <span className="hint">State Pension ages are worked out from dates of birth.</span></div>
        {s.people.map((p, pi) => (
          <div className="grid4" key={p.id}>
            <TextField label="Name" value={p.name} onChange={(v) => update((d) => { d.people[pi].name = v; })} />
            <DateField label="Date of birth" value={p.dateOfBirth} onChange={(v) => update((d) => { d.people[pi].dateOfBirth = v || '1980-01-01'; })} />
            <NumField label="Plan to age" value={p.planToAge} min={60} onChange={(v) => update((d) => { d.people[pi].planToAge = v; })} />
            <div className="field"><b style={{ display: 'block', fontSize: '.82rem', marginBottom: 4 }}>State Pension age</b>
              <span className="pill">{(() => { const a = statePensionAge(p.dateOfBirth); return a.months ? `${a.years}y ${a.months}m` : a.years; })()}</span>
              {pi > 0 && (
                <button className="btn small danger" style={{ marginLeft: 8 }} onClick={() => update((d) => {
                  const id = d.people[pi].id;
                  d.people.splice(pi, 1);
                  d.employments = d.employments.filter((e) => e.personId !== id);
                  d.dcPensions = d.dcPensions.filter((e) => e.personId !== id);
                  d.dbPensions = d.dbPensions.filter((e) => e.personId !== id);
                  d.statePensions = d.statePensions.filter((e) => e.personId !== id);
                  d.accounts = d.accounts.map((a) => (a.personId === id ? { ...a, personId: d.people[0].id } : a));
                })}>Remove</button>
              )}
            </div>
          </div>
        ))}
        {s.people.length < 2 && (
          <button className="btn small" onClick={() => update((d) => {
            const id = uid('p');
            d.people.push({ id, name: 'Partner', dateOfBirth: '1980-01-01', sex: 'unspecified', planToAge: 95 });
            d.statePensions.push({ personId: id, qualifyingYears: 25, yearsStillWorking: true, deferralYears: 0 });
          })}>+ Add partner</button>
        )}
      </div>

      {/* ---- work ---- */}
      <div className="card">
        <div className="panel-title"><h3>Work &amp; retirement dates</h3>
          <span className="hint">Salary is gross (before tax). Growth is annual.</span></div>
        {s.employments.map((e, ei) => (
          <div key={e.personId + ei}>
            <div className="grid4">
              <SelectField label="Person" value={e.personId} options={personOptions}
                onChange={(v) => update((d) => { d.employments[ei].personId = v; })} />
              <NumField label="Salary" suffix="£/year" value={e.grossSalary} step={1000}
                onChange={(v) => update((d) => { d.employments[ei].grossSalary = v; })} />
              <NumField label="Bonus / extras" suffix="£/year" value={e.bonus} step={500}
                onChange={(v) => update((d) => { d.employments[ei].bonus = v; })} />
              <NumField label="Salary growth" suffix="%/year" value={e.salaryGrowthPct} step={0.5}
                onChange={(v) => update((d) => { d.employments[ei].salaryGrowthPct = v; })} />
            </div>
            <div className="grid4">
              <MonthField label="Retirement date" value={e.retirementDate}
                onChange={(v) => update((d) => { d.employments[ei].retirementDate = v || e.retirementDate; })} />
              <CheckField label="Phase into retirement with part-time work" value={!!e.partTime}
                onChange={(v) => update((d) => {
                  d.employments[ei].partTime = v ? { endDate: addYears(e.retirementDate, 3), grossSalary: Math.round(e.grossSalary / 3) } : undefined;
                })} />
              {e.partTime && (<>
                <MonthField label="Part-time until" value={e.partTime.endDate}
                  onChange={(v) => update((d) => { d.employments[ei].partTime!.endDate = v || e.partTime!.endDate; })} />
                <NumField label="Part-time salary" suffix="£/year" value={e.partTime.grossSalary} step={1000}
                  onChange={(v) => update((d) => { d.employments[ei].partTime!.grossSalary = v; })} />
              </>)}
            </div>
            <button className="btn small danger" onClick={() => update((d) => { d.employments.splice(ei, 1); })}>Remove job</button>
            <hr className="divider" />
          </div>
        ))}
        <button className="btn small" onClick={() => update((d) => {
          d.employments.push({ personId: d.people[0].id, grossSalary: 35000, salaryGrowthPct: 3, bonus: 0, retirementDate: addYears(new Date().toISOString().slice(0, 7), 10) });
        })}>+ Add job</button>
      </div>

      {/* ---- DC pensions ---- */}
      <div className="card">
        <div className="panel-title"><h3>Pension pots (defined contribution)</h3>
          <span className="hint">Workplace pensions, SIPPs and old pots. 25% tax-free cash is taken at retirement by default.</span></div>
        {s.dcPensions.map((dc, di) => (
          <div key={dc.id}>
            <div className="grid4">
              <TextField label="Name" value={dc.name} onChange={(v) => update((d) => { d.dcPensions[di].name = v; })} />
              <SelectField label="Whose" value={dc.personId} options={personOptions}
                onChange={(v) => update((d) => { d.dcPensions[di].personId = v; })} />
              <NumField label="Current value" suffix="£" value={dc.currentValue} step={1000}
                onChange={(v) => update((d) => { d.dcPensions[di].currentValue = v; })} />
              <NumField label="Growth" suffix="%/year" value={dc.growthPct} step={0.5}
                onChange={(v) => update((d) => { d.dcPensions[di].growthPct = v; })} />
            </div>
            <div className="grid4">
              <NumField label="Your contribution" suffix="% of salary" value={dc.employeePct} step={0.5}
                onChange={(v) => update((d) => { d.dcPensions[di].employeePct = v; })} />
              <NumField label="Employer contribution" suffix="% of salary" value={dc.employerPct} step={0.5}
                onChange={(v) => update((d) => { d.dcPensions[di].employerPct = v; })} />
              <NumField label="Extra monthly" suffix="£/month" value={dc.extraMonthly} step={50}
                onChange={(v) => update((d) => { d.dcPensions[di].extraMonthly = v; })} />
              <NumField label="Fees" suffix="%/year" value={dc.feesPct} step={0.1}
                onChange={(v) => update((d) => { d.dcPensions[di].feesPct = v; })} />
            </div>
            <div className="btn-row">
              <CheckField label="Paid by salary sacrifice" value={dc.salarySacrifice}
                onChange={(v) => update((d) => { d.dcPensions[di].salarySacrifice = v; })} />
              <CheckField label="Take 25% tax-free cash at retirement" value={dc.takePclsAtRetirement}
                onChange={(v) => update((d) => { d.dcPensions[di].takePclsAtRetirement = v; })} />
              <button className="btn small danger" onClick={() => update((d) => { d.dcPensions.splice(di, 1); })}>Remove</button>
            </div>
            <hr className="divider" />
          </div>
        ))}
        <button className="btn small" onClick={() => update((d) => {
          d.dcPensions.push({ id: uid('dc'), personId: d.people[0].id, name: 'Pension', currentValue: 0, employeePct: 5, employerPct: 3, extraMonthly: 0, salarySacrifice: false, growthPct: 5, feesPct: 0.5, takePclsAtRetirement: true, pclsInvestTo: 'isa-then-gia' });
        })}>+ Add pension pot</button>
      </div>

      {/* ---- DB pensions ---- */}
      <div className="card">
        <div className="panel-title"><h3>Final salary / career average pensions (defined benefit)</h3>
          <span className="hint">From your scheme statement. Taking it early typically reduces it ~4–5% per year.</span></div>
        {s.dbPensions.map((db, di) => (
          <div key={db.id}>
            <div className="grid4">
              <TextField label="Scheme name" value={db.name} onChange={(v) => update((d) => { d.dbPensions[di].name = v; })} />
              <SelectField label="Whose" value={db.personId} options={personOptions}
                onChange={(v) => update((d) => { d.dbPensions[di].personId = v; })} />
              <NumField label="Annual pension at normal age" suffix="£/year today" value={db.annualPension} step={500}
                onChange={(v) => update((d) => { d.dbPensions[di].annualPension = v; })} />
              <NumField label="One-off lump sum" suffix="£" value={db.lumpSum} step={1000}
                onChange={(v) => update((d) => { d.dbPensions[di].lumpSum = v; })} />
            </div>
            <div className="grid4">
              <NumField label="Normal pension age" value={db.normalPensionAge} onChange={(v) => update((d) => { d.dbPensions[di].normalPensionAge = v; })} />
              <NumField label="Start at age" value={db.startAge} onChange={(v) => update((d) => { d.dbPensions[di].startAge = v; })} />
              <NumField label="Early reduction" suffix="%/year early" value={db.earlyReductionPct} step={0.5}
                onChange={(v) => update((d) => { d.dbPensions[di].earlyReductionPct = v; })} />
              <NumField label="Increases in payment" suffix="%/year" value={db.indexationPct} step={0.5}
                onChange={(v) => update((d) => { d.dbPensions[di].indexationPct = v; })} />
            </div>
            <button className="btn small danger" onClick={() => update((d) => { d.dbPensions.splice(di, 1); })}>Remove</button>
            <hr className="divider" />
          </div>
        ))}
        <button className="btn small" onClick={() => update((d) => {
          d.dbPensions.push({ id: uid('db'), personId: d.people[0].id, name: 'Final salary scheme', annualPension: 8000, normalPensionAge: 65, startAge: 65, earlyReductionPct: 4.5, revaluationPct: 2.5, indexationPct: 2.5, lumpSum: 0 });
        })}>+ Add defined benefit pension</button>
      </div>

      {/* ---- state pension ---- */}
      <div className="card">
        <div className="panel-title"><h3>State Pension</h3>
          <span className="hint">Check your record at gov.uk/check-state-pension. 35 qualifying years gets the full amount; years keep accruing while you work.</span></div>
        {s.statePensions.map((sp, si) => {
          const person = s.people.find((p) => p.id === sp.personId);
          if (!person) return null;
          return (
            <div className="grid4" key={sp.personId}>
              <div className="field"><b style={{ display: 'block', fontSize: '.82rem', marginBottom: 4 }}>Person</b><span>{person.name}</span></div>
              <NumField label="Qualifying NI years so far" value={sp.qualifyingYears} min={0}
                onChange={(v) => update((d) => { d.statePensions[si].qualifyingYears = v; })} />
              <NumField label="Defer by" suffix="years" value={sp.deferralYears} step={0.5} min={0}
                onChange={(v) => update((d) => { d.statePensions[si].deferralYears = v; })} />
              <CheckField label="Still accruing years while working" value={sp.yearsStillWorking ?? true}
                onChange={(v) => update((d) => { d.statePensions[si].yearsStillWorking = v; })} />
            </div>
          );
        })}
      </div>

      {/* ---- savings & investments ---- */}
      <div className="card">
        <div className="panel-title"><h3>Savings &amp; investments</h3>
          <span className="hint">Pick an investment to use real market averages, or choose Custom and set your own rate. Past performance is not a reliable indicator of future results. Crypto is high risk — you could lose everything.</span></div>
        {s.accounts.map((a, ai) => (
          <div key={a.id}>
            <div className="grid4">
              <TextField label="Name" value={a.name} onChange={(v) => update((d) => { d.accounts[ai].name = v; })} />
              <SelectField label="Account type" value={a.type} options={[
                { value: 'cash', label: 'Cash savings' },
                { value: 'isa', label: 'ISA (tax-free)' },
                { value: 'gia', label: 'General investment account (taxable)' },
                { value: 'premium-bonds', label: 'Premium bonds' },
              ]} onChange={(v) => update((d) => { d.accounts[ai].type = v as typeof a.type; })} />
              <NumField label="Current value" suffix="£" value={a.value} step={500}
                onChange={(v) => update((d) => { d.accounts[ai].value = v; })} />
              <NumField label="Monthly saving while working" suffix="£/month" value={a.monthlyContribution} step={50}
                onChange={(v) => update((d) => { d.accounts[ai].monthlyContribution = v; })} />
            </div>
            <div className="grid4">
              <SelectField label="Invested in" value={a.assetId} options={assetOptions}
                onChange={(v) => update((d) => {
                  d.accounts[ai].assetId = v;
                  const live = market?.assets?.[v]?.annualised5yPct;
                  const useLive = live != null && assetById(v).class !== 'crypto';
                  d.accounts[ai].growthPct = useLive ? Math.round(live * 10) / 10 : assetById(v).defaultGrowthPct;
                })} />
              <NumField label="Expected growth" suffix="%/year" value={a.growthPct} step={0.5}
                onChange={(v) => update((d) => { d.accounts[ai].growthPct = v; })} />
              <NumField label="Fees" suffix="%/year" value={a.feesPct} step={0.1}
                onChange={(v) => update((d) => { d.accounts[ai].feesPct = v; })} />
              {a.type === 'gia' ? (
                <NumField label="Amount originally paid in" suffix="£ (for capital gains tax)" value={a.costBasis ?? a.value} step={500}
                  onChange={(v) => update((d) => { d.accounts[ai].costBasis = v; })} />
              ) : <div />}
            </div>
            {assetById(a.assetId).note && <p className="notice" style={{ marginTop: 0 }}>{assetById(a.assetId).note}</p>}
            <button className="btn small danger" onClick={() => update((d) => { d.accounts.splice(ai, 1); })}>Remove</button>
            <hr className="divider" />
          </div>
        ))}
        <button className="btn small" onClick={() => update((d) => {
          d.accounts.push({ id: uid('acc'), personId: d.people[0].id, name: 'New account', type: 'isa', value: 0, monthlyContribution: 0, assetId: 'global-equity', growthPct: market?.assets?.['global-equity']?.annualised5yPct ?? 7, feesPct: 0.3 });
        })}>+ Add account</button>
      </div>

      {/* ---- property ---- */}
      <div className="card">
        <div className="panel-title"><h3>Property</h3>
          <span className="hint">Your home is exempt from capital gains tax; other property sales are not. Rental mortgage interest gets the 20% tax credit (Section 24).</span></div>
        {s.properties.map((pr, pi) => (
          <div key={pr.id}>
            <div className="grid4">
              <TextField label="Name" value={pr.name} onChange={(v) => update((d) => { d.properties[pi].name = v; })} />
              <NumField label="Value" suffix="£" value={pr.value} step={5000}
                onChange={(v) => update((d) => { d.properties[pi].value = v; })} />
              <NumField label="Price growth" suffix="%/year" value={pr.growthPct} step={0.25}
                onChange={(v) => update((d) => { d.properties[pi].growthPct = v; })} />
              <CheckField label="This is our main home" value={pr.isMainHome}
                onChange={(v) => update((d) => { d.properties[pi].isMainHome = v; })} />
            </div>
            <CheckField label="Has a mortgage" value={!!pr.mortgage} onChange={(v) => update((d) => {
              d.properties[pi].mortgage = v ? { balance: 100000, ratePct: 4, monthlyPayment: 600, interestOnly: false } : undefined;
            })} />
            {pr.mortgage && (
              <div className="grid4">
                <NumField label="Mortgage balance" suffix="£" value={pr.mortgage.balance} step={1000}
                  onChange={(v) => update((d) => { d.properties[pi].mortgage!.balance = v; })} />
                <NumField label="Interest rate" suffix="%" value={pr.mortgage.ratePct} step={0.1}
                  onChange={(v) => update((d) => { d.properties[pi].mortgage!.ratePct = v; })} />
                <NumField label="Monthly payment" suffix="£" value={pr.mortgage.monthlyPayment} step={50}
                  onChange={(v) => update((d) => { d.properties[pi].mortgage!.monthlyPayment = v; })} />
                <CheckField label="Interest-only" value={pr.mortgage.interestOnly}
                  onChange={(v) => update((d) => { d.properties[pi].mortgage!.interestOnly = v; })} />
              </div>
            )}
            <CheckField label="Rented out" value={!!pr.rental} onChange={(v) => update((d) => {
              d.properties[pi].rental = v ? { grossMonthlyRent: 1000, rentGrowthPct: 2, monthlyCosts: 150 } : undefined;
            })} />
            {pr.rental && (
              <div className="grid3">
                <NumField label="Rent" suffix="£/month" value={pr.rental.grossMonthlyRent} step={50}
                  onChange={(v) => update((d) => { d.properties[pi].rental!.grossMonthlyRent = v; })} />
                <NumField label="Rent growth" suffix="%/year" value={pr.rental.rentGrowthPct} step={0.25}
                  onChange={(v) => update((d) => { d.properties[pi].rental!.rentGrowthPct = v; })} />
                <NumField label="Running costs" suffix="£/month" value={pr.rental.monthlyCosts} step={25}
                  onChange={(v) => update((d) => { d.properties[pi].rental!.monthlyCosts = v; })} />
              </div>
            )}
            <CheckField label="Plan to sell" value={!!pr.sale} onChange={(v) => update((d) => {
              d.properties[pi].sale = v ? { date: addYears(new Date().toISOString().slice(0, 7), 5), proceedsTo: 'invest' } : undefined;
            })} />
            {pr.sale && (
              <div className="grid3">
                <MonthField label="Sale date" value={pr.sale.date}
                  onChange={(v) => update((d) => { d.properties[pi].sale!.date = v || pr.sale!.date; })} />
                <SelectField label="Proceeds go to" value={pr.sale.proceedsTo} options={[
                  { value: 'invest', label: 'Invest (ISA first, then taxable account)' },
                  { value: 'cash', label: 'Hold as cash' },
                ]} onChange={(v) => update((d) => { d.properties[pi].sale!.proceedsTo = v as 'invest' | 'cash'; })} />
                <NumField label="Buy next home for (0 = none)" suffix="£ today" value={pr.sale.buyNext?.price ?? 0} step={10000}
                  onChange={(v) => update((d) => { d.properties[pi].sale!.buyNext = v > 0 ? { price: v } : undefined; })} />
              </div>
            )}
            <button className="btn small danger" onClick={() => update((d) => { d.properties.splice(pi, 1); })}>Remove property</button>
            <hr className="divider" />
          </div>
        ))}
        <button className="btn small" onClick={() => update((d) => {
          d.properties.push({ id: uid('prop'), name: d.properties.length ? 'Rental property' : 'Home', isMainHome: !d.properties.length, value: 300000, growthPct: 3 });
        })}>+ Add property</button>
      </div>

      {/* ---- events ---- */}
      <div className="card">
        <div className="panel-title"><h3>One-off events</h3>
          <span className="hint">Inheritance, windfalls, gifts to children (negative amount = money out). Enter amounts after any tax due on receipt.</span></div>
        {s.events.map((ev, ei) => (
          <div className="grid4" key={ev.id}>
            <TextField label="What" value={ev.name} onChange={(v) => update((d) => { d.events[ei].name = v; })} />
            <MonthField label="When" value={ev.date} onChange={(v) => update((d) => { d.events[ei].date = v || ev.date; })} />
            <NumField label="Amount (negative = out)" suffix="£" value={ev.amount} step={1000}
              onChange={(v) => update((d) => { d.events[ei].amount = v; })} />
            <div className="field" style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <SelectField label="Money in goes to" value={ev.to} options={[
                { value: 'invest', label: 'Invest' }, { value: 'cash', label: 'Cash' },
              ]} onChange={(v) => update((d) => { d.events[ei].to = v as 'invest' | 'cash'; })} />
              <button className="btn small danger" onClick={() => update((d) => { d.events.splice(ei, 1); })}>×</button>
            </div>
          </div>
        ))}
        <button className="btn small" onClick={() => update((d) => {
          d.events.push({ id: uid('ev'), name: 'Inheritance', date: addYears(new Date().toISOString().slice(0, 7), 10), amount: 50000, to: 'invest' });
        })}>+ Add event</button>
      </div>

      {/* ---- spending ---- */}
      <div className="card">
        <div className="panel-title"><h3>Spending</h3>
          <span className="hint">All figures in today&apos;s money (the planner adds inflation). Mortgage payments are added automatically on top.</span></div>
        <div className="grid3">
          <NumField label="Spending now, while working" suffix="£/month" value={s.spending.preRetirementMonthly} step={100}
            onChange={(v) => update((d) => { d.spending.preRetirementMonthly = v; })} />
          <SelectField label="Retirement spending model" value={s.spending.retirement.kind} options={[
            { value: 'flat', label: 'Same every year' },
            { value: 'phases', label: 'Phases: more early on, less later' },
            { value: 'plsa', label: 'Use a Retirement Living Standard' },
          ]} onChange={(v) => update((d) => {
            if (v === 'flat') d.spending.retirement = { kind: 'flat', monthlyToday: 2500 };
            else if (v === 'phases') d.spending.retirement = { kind: 'phases', goGo: 3000, slowGo: 2400, noGo: 2000, slowGoAge: 75, noGoAge: 85 };
            else d.spending.retirement = { kind: 'plsa', standard: 'moderate' };
          })} />
          <div />
        </div>
        {s.spending.retirement.kind === 'flat' && (
          <NumField label="Retirement spending" suffix="£/month today" value={s.spending.retirement.monthlyToday} step={100}
            onChange={(v) => update((d) => { (d.spending.retirement as { monthlyToday: number }).monthlyToday = v; })} />
        )}
        {s.spending.retirement.kind === 'phases' && (
          <div className="grid4">
            {(['goGo', 'slowGo', 'noGo'] as const).map((k) => (
              <NumField key={k} label={k === 'goGo' ? 'Active years' : k === 'slowGo' ? 'Slower years' : 'Later years'} suffix="£/month"
                value={(s.spending.retirement as Record<typeof k, number>)[k]} step={100}
                onChange={(v) => update((d) => { (d.spending.retirement as Record<typeof k, number>)[k] = v; })} />
            ))}
            <div className="grid2">
              <NumField label="Slower from age" value={(s.spending.retirement as { slowGoAge: number }).slowGoAge}
                onChange={(v) => update((d) => { (d.spending.retirement as { slowGoAge: number }).slowGoAge = v; })} />
              <NumField label="Later from age" value={(s.spending.retirement as { noGoAge: number }).noGoAge}
                onChange={(v) => update((d) => { (d.spending.retirement as { noGoAge: number }).noGoAge = v; })} />
            </div>
          </div>
        )}
        {s.spending.retirement.kind === 'plsa' && (
          <SelectField label="Standard (PLSA Retirement Living Standards, 2025)" value={s.spending.retirement.standard} options={[
            { value: 'minimum', label: `Minimum — covers needs (${gbp(plsa.minimum)}/year)` },
            { value: 'moderate', label: `Moderate — more security and flexibility (${gbp(plsa.moderate)}/year)` },
            { value: 'comfortable', label: `Comfortable — more financial freedom (${gbp(plsa.comfortable)}/year)` },
          ]} onChange={(v) => update((d) => { (d.spending.retirement as { standard: string }).standard = v; })} />
        )}
        <CheckField label="Allow for care costs late in life" value={!!s.spending.careCosts}
          onChange={(v) => update((d) => { d.spending.careCosts = v ? { fromAge: 88, monthlyToday: 2000 } : undefined; })} />
        {s.spending.careCosts && (
          <div className="grid2">
            <NumField label="From age" value={s.spending.careCosts.fromAge}
              onChange={(v) => update((d) => { d.spending.careCosts!.fromAge = v; })} />
            <NumField label="Extra cost" suffix="£/month today" value={s.spending.careCosts.monthlyToday} step={100}
              onChange={(v) => update((d) => { d.spending.careCosts!.monthlyToday = v; })} />
          </div>
        )}
        <div className="panel-title" style={{ marginTop: 10 }}><h4 style={{ margin: 0, fontSize: '.95rem' }}>One-off spends</h4></div>
        {s.spending.oneOffs.map((so, si) => (
          <div className="grid4" key={so.id}>
            <TextField label="What" value={so.name} onChange={(v) => update((d) => { d.spending.oneOffs[si].name = v; })} />
            <MonthField label="When" value={so.date} onChange={(v) => update((d) => { d.spending.oneOffs[si].date = v || so.date; })} />
            <NumField label="Cost" suffix="£" value={so.amount} step={500}
              onChange={(v) => update((d) => { d.spending.oneOffs[si].amount = v; })} />
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button className="btn small danger" onClick={() => update((d) => { d.spending.oneOffs.splice(si, 1); })}>×</button>
            </div>
          </div>
        ))}
        <button className="btn small" onClick={() => update((d) => {
          d.spending.oneOffs.push({ id: uid('so'), name: 'New car', date: addYears(new Date().toISOString().slice(0, 7), 5), amount: 20000 });
        })}>+ Add one-off spend</button>
      </div>

      {/* ---- assumptions & goals ---- */}
      <div className="card">
        <div className="panel-title"><h3>Assumptions &amp; goals</h3>
          <span className="hint">Defaults follow common UK planning conventions — see Methodology.</span></div>
        <div className="grid4">
          <NumField label="Inflation" suffix="%/year" value={s.assumptions.inflationPct} step={0.25}
            onChange={(v) => update((d) => { d.assumptions.inflationPct = v; })} />
          <NumField label="Cash buffer in retirement" suffix="months of spending" value={s.assumptions.cashBufferMonths} step={1} min={0}
            onChange={(v) => update((d) => { d.assumptions.cashBufferMonths = v; })} />
          <SelectField label="Withdrawal order in retirement" value={s.assumptions.withdrawalOrder} options={[
            { value: 'cash-gia-isa-pension', label: 'Cash → taxable → ISA → pension (common default)' },
            { value: 'cash-gia-pension-isa', label: 'Cash → taxable → pension → ISA (preserve ISA)' },
            { value: 'pension-first', label: 'Pension first' },
          ]} onChange={(v) => update((d) => { d.assumptions.withdrawalOrder = v as typeof s.assumptions.withdrawalOrder; })} />
          <CheckField label="Show charts in today's money" value={s.assumptions.displayReal}
            onChange={(v) => update((d) => { d.assumptions.displayReal = v; })} />
        </div>
        <div className="grid3">
          <MonthField label="Target retirement date (goal)" value={s.goals.targetRetirementDate ?? ''}
            onChange={(v) => update((d) => { d.goals.targetRetirementDate = v || undefined; })} />
          <NumField label="Target retirement income" suffix="£/month today" value={s.goals.targetMonthlyIncome ?? 0} step={100}
            onChange={(v) => update((d) => { d.goals.targetMonthlyIncome = v || undefined; })} />
          <NumField label="Legacy to leave" suffix="£" value={s.goals.legacyTarget ?? 0} step={10000}
            onChange={(v) => update((d) => { d.goals.legacyTarget = v || undefined; })} />
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          The withdrawal-order options are educational comparisons, not recommendations — the most
          tax-efficient order depends on your circumstances.
        </p>
      </div>
    </div>
  );
}

function addYears(ym: string, years: number): string {
  return indexToYm(ymToIndex(ym) + years * 12);
}
