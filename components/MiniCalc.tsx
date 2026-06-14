'use client';

// Hero mini-calculator: three sliders give an instant, clearly-illustrative
// "earliest retirement" teaser before the user fills in any form. Uses a
// simplified 4% guideline — the full planner does the real maths.

import { useState } from 'react';
import Link from 'next/link';
import AreaChart from './AreaChart';

const THIS_YEAR = new Date().getFullYear();

function gbpK(n: number) { return n >= 1000 ? `£${Math.round(n / 1000)}k` : `£${n}`; }
function gbp(n: number) { return `£${Math.round(n).toLocaleString('en-GB')}`; }

function project(age: number, pot: number, monthly: number) {
  const annualNeed = monthly * 12;
  const target = annualNeed * 25;            // 4% safe-withdrawal guideline
  const growth = 0.04;
  const contrib = Math.max(annualNeed * 0.42, 3000);
  let bal = pot; let yrs = 0; const pts = [pot];
  while (bal < target && yrs < 45 && age + yrs < 80) {
    bal = bal * (1 + growth) + contrib; yrs++; pts.push(bal);
  }
  if (pts.length < 3) return { age: age + yrs, year: THIS_YEAR + yrs, series: [pot, pot * 1.04 + contrib, target] };
  return { age: age + yrs, year: THIS_YEAR + yrs, series: pts };
}

export default function MiniCalc() {
  const [age, setAge] = useState(42);
  const [pot, setPot] = useState(120000);
  const [spend, setSpend] = useState(2400);
  const r = project(age, pot, spend);

  return (
    <div className="calc" aria-label="Quick retirement teaser">
      <div className="calc-head"><span className="eyebrow">Try it now</span></div>
      <div className="calc-title">Your earliest retirement date</div>
      <div className="calc-grid">
        <div className="field">
          <label htmlFor="c-age">Your age <span className="val">{age}</span></label>
          <input type="range" id="c-age" min={25} max={65} step={1} value={age} onChange={(e) => setAge(+e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="c-pot">Savings &amp; pensions <span className="val">{gbpK(pot)}</span></label>
          <input type="range" id="c-pot" min={0} max={900000} step={5000} value={pot} onChange={(e) => setPot(+e.target.value)} />
        </div>
        <div className="field full">
          <label htmlFor="c-spend">Monthly spend you&apos;d want in retirement <span className="val">{gbp(spend)}</span></label>
          <input type="range" id="c-spend" min={1200} max={6000} step={100} value={spend} onChange={(e) => setSpend(+e.target.value)} />
        </div>
      </div>

      <div className="calc-result" aria-live="polite">
        <div className="rlabel">On current course, you could be on track to</div>
        <div className="rmain">retire around <b>{r.year}</b>, at age <span className="age">{r.age}</span></div>
        <AreaChart series={r.series} w={460} h={54} stroke="var(--accent)" sw={2.6} dot className="spark" ariaLabel="Illustrative pot growth to retirement" />
        <div className="illus">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
          <span><b>Illustrative only</b> — a simplified 4% guideline. Your full plan models your real pots, UK tax and stress-tests it.</span>
        </div>
        <div className="calc-cta">
          <Link className="btn btn-primary" href="/start">See your full plan
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
