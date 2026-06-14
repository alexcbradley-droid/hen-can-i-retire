import Link from 'next/link';
import MiniCalc from '@/components/MiniCalc';
import AreaChart from '@/components/AreaChart';

const PROOF = [120, 150, 188, 232, 286, 352, 430, 520, 612, 705, 792, 860, 900, 892, 855, 792, 706, 600, 470, 330, 210, 120, 60, 30];

const JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'When Can I Retire?',
  url: 'https://whencaniretire.day',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web browser',
  description:
    'A free UK retirement planner that projects pensions, savings, investments and property with UK tax built in, finds your earliest retirement date and sustainable income, and stress-tests the plan with Monte Carlo simulation.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'GBP' },
  inLanguage: 'en-GB',
  isAccessibleForFree: true,
};

export default function Home() {
  return (
    <main>
      {/* HERO */}
      <section className="hero">
        <div className="container">
          <div>
            <span className="eyebrow on-dark">Free UK retirement planner</span>
            <h1><b className="serif">When can I <em>actually</em><br />retire?</b></h1>
            <p className="sub">
              <b>When Can I Retire?</b> is a free UK retirement planner. Answer three quick questions and
              see your earliest retirement date — before you fill in a single form.
            </p>
            <div className="chips">
              <span className="chip on-dark"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg> Free, no sign-up</span>
              <span className="chip on-dark"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg> Data stays in your browser</span>
              <span className="chip on-dark"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /><circle cx="12" cy="12" r="4" /></svg> Real 2026/27 UK tax</span>
            </div>
            <p className="reassure">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></svg>
              <span>Guidance, not financial advice — and nothing you enter ever leaves your device.</span>
            </p>
          </div>
          <MiniCalc />
        </div>
      </section>

      {/* PROOF BAND */}
      <section className="section cream" id="how">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">What an answer looks like</span>
            <h2>See the whole journey, not just a number</h2>
            <p className="lead">Every plan shows your pot month-by-month — when it peaks, how long it lasts, and whether it survives a bad decade. Here&apos;s a sample household.</p>
          </div>
          <div className="proof-grid">
            <div className="proof-chart">
              <div className="pc-head">
                <div className="stat"><span className="label">Plan lasts until age</span><span className="figure teal tnum" style={{ fontSize: '1.9rem' }}>96</span></div>
                <span className="chip"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg> Sample household</span>
              </div>
              <AreaChart className="area" series={PROOF} w={560} h={220} stroke="var(--c1)" sw={3.5} grid ariaLabel="Projected pot value rising to retirement then drawing down, lasting beyond age 95" />
              <div className="axis"><span>Age 42</span><span>Retire 61</span><span>State pension 67</span><span>96</span></div>
              <div className="legend">
                <span><i style={{ background: 'var(--c1)' }} /> Total pot value</span>
                <span><i style={{ background: 'var(--c3)' }} /> Retirement begins</span>
              </div>
            </div>
            <div className="proof-side stack" style={{ gap: 16 }}>
              <div className="verdict good">
                <div className="dot"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></div>
                <div><h4>On track — and resilient</h4><p className="small muted" style={{ margin: 0 }}>Survives a 2008-style crash in year one with income intact.</p></div>
              </div>
              <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, padding: 22 }}>
                <div className="stat"><span className="figure lg amber tnum">61</span><span className="label">Earliest retire age</span></div>
                <div className="stat"><span className="figure lg teal tnum">£2,680</span><span className="label">Sustainable / month</span></div>
              </div>
              <p className="small muted" style={{ margin: 0, display: 'flex', gap: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ flex: 'none', marginTop: 2 }}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                Sample figures shown for illustration — your plan uses your own numbers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* STORY */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Why people trust the maths</span>
            <h2>Built like a proper plan — not a back-of-envelope guess</h2>
          </div>
          <div className="story-grid">
            <div className="story-card feature story-wide">
              <div className="ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="m7 14 3-4 4 3 5-7" /></svg></div>
              <div className="big tnum">600+</div>
              <h3>Months modelled, one at a time</h3>
              <p>Pensions, ISAs, investments and property projected month-by-month to your hundredth birthday — so you see exactly when the money runs thin, not just an average.</p>
            </div>
            <div className="story-card">
              <div className="ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M8 4v4" /></svg></div>
              <div className="big tnum">2026/27</div>
              <h3>Real UK tax built in</h3>
              <p>Income tax, the 25% tax-free lump sum and State Pension age — all current, England, Wales &amp; NI.</p>
            </div>
            <div className="story-card">
              <div className="ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 17 6-6 4 4 8-8" /><path d="M14 7h7v7" /></svg></div>
              <h3>Stress-tested, not sugar-coated</h3>
              <p>Run a market crash or higher inflation and watch whether your plan still holds. The honest answer beats the comforting one.</p>
            </div>
            <div className="story-card">
              <div className="ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4 7v5c0 5 8 9 8 9s8-4 8-9V7Z" /></svg></div>
              <h3>Private by default</h3>
              <p>Everything computes in your browser. Nothing is uploaded; sign in only if you want to save a plan.</p>
            </div>
            <div className="story-card story-wide">
              <div className="ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg></div>
              <h3>An assistant that explains, in plain English</h3>
              <p>Not sure what a number means, or want to try &ldquo;what if I worked two more years?&rdquo; — ask the assistant on any page and it walks you through it.</p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section tint" id="methodology">
        <div className="container">
          <div className="section-head center">
            <span className="eyebrow" style={{ justifyContent: 'center' }}>Three steps to your date</span>
            <h2>Starting takes about two minutes</h2>
          </div>
          <div className="steps">
            <div className="step"><div className="num">1</div><h3>Tell us the basics</h3><p>Your age, your pots and roughly what you&apos;d like to spend. Six questions to a first result — or upload a spreadsheet if you have one.</p></div>
            <div className="step"><div className="num">2</div><h3>See your verdict</h3><p>An earliest retirement date, the income it sustains, and a clear on-track / at-risk read — with the chart behind it.</p></div>
            <div className="step"><div className="num">3</div><h3>Refine with confidence</h3><p>Adjust contributions, retire earlier, stress-test a crash. Watch the date move and find a plan you can trust.</p></div>
          </div>
          <div className="center" style={{ marginTop: 38 }}>
            <Link className="btn btn-primary btn-lg" href="/start">Start planning — it&apos;s free
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* TRUST BAND */}
      <section className="section" id="help">
        <div className="container">
          <div className="trust">
            <div>
              <span className="eyebrow on-dark">Safe hands</span>
              <h2 style={{ margin: '12px 0' }}>Confidence, with the right caution</h2>
              <p className="lead">This is a planning tool to help you think clearly — it doesn&apos;t replace regulated advice. We point you to the official, free UK services when you want a person.</p>
              <p className="small" style={{ color: '#aec7bc', margin: 0 }}>Tax data current for 2026/27 · last reviewed June 2026 · England, Wales &amp; Northern Ireland.</p>
            </div>
            <div className="signposts">
              <div className="signpost">
                <span className="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg></span>
                <div><b>MoneyHelper</b><span>Free, government-backed money guidance. <a href="https://www.moneyhelper.org.uk/" rel="noopener noreferrer" target="_blank">Visit MoneyHelper →</a></span></div>
              </div>
              <div className="signpost">
                <span className="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 11h-6" /></svg></span>
                <div><b>Pension Wise — free for over-50s</b><span>A free appointment to talk through your pension options. <a href="https://www.moneyhelper.org.uk/en/pensions-and-retirement/pension-wise" rel="noopener noreferrer" target="_blank">Book Pension Wise →</a></span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="section cream final">
        <div className="container">
          <div className="card">
            <span className="eyebrow" style={{ justifyContent: 'center' }}>No sign-up needed</span>
            <h2 style={{ marginTop: 12 }}>Your retirement date is two minutes away</h2>
            <p className="lead" style={{ marginBottom: 24 }}>See where you stand today, for free — then decide what to change.</p>
            <div className="hero-ctas" style={{ justifyContent: 'center' }}>
              <Link className="btn btn-primary btn-lg" href="/start">Start planning</Link>
              <Link className="btn btn-ghost btn-lg" href="/plan?demo=1">Try the sample household</Link>
            </div>
          </div>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD) }} />
    </main>
  );
}
