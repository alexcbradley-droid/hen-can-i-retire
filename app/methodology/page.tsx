import { PLSA } from '@/lib/engine/uk-rules';
import { gbp } from '@/lib/format';

export const metadata = { title: 'Methodology — When Can I Retire?' };

export default function MethodologyPage() {
  return (
    <main className="container narrow" style={{ paddingTop: 24 }}>
      <h1>Methodology and assumptions</h1>
      <p className="muted">
        Every figure the calculator uses, where it comes from, and what is simplified. Researched and
        verified June 2026 against official sources (DWP, HMRC, Commons Library briefings and
        professional tax summaries). Current tax year: 2026/27.
      </p>

      <div className="card">
        <h3>How the projection works</h3>
        <p className="small">
          The engine simulates your household month by month from today until your chosen plan age
          (default 95 — roughly 1 in 4 healthy 65-year-olds lives into their early-to-mid 90s,
          so planning only to the average risks outliving the money). Each month it pays salaries,
          collects pensions and rent, deducts tax and National Insurance, pays your spending, and
          grows every account at its assumed rate. Surplus cash above your buffer is invested
          (ISA first, up to the £20,000 annual allowance, then a taxable account); shortfalls are
          met by selling investments in your chosen withdrawal order. The &quot;earliest retirement&quot;
          solver moves your retirement date earlier until the plan would fail; &quot;sustainable income&quot;
          finds the highest spending the plan supports to your plan age.
        </p>
      </div>

      <div className="card">
        <h3>State Pension</h3>
        <ul className="small">
          <li>Full new State Pension: £241.30/week (£12,547.60/year) for 2026/27, after the 4.8% earnings-led triple lock rise (DWP benefit and pension rates 2026/27). Beyond 2026/27 it is uprated at your inflation assumption.</li>
          <li>Your State Pension age is calculated from your date of birth, including the phased rise to 67 (births 6 April 1960 – 5 March 1961) and the legislated rise to 68 (births from 6 April 1977, currently scheduled 2044–46 and subject to government review).</li>
          <li>Entitlement is 1/35th of the full rate per qualifying National Insurance year (minimum 10 years), and years keep accruing while you work. Deferral adds about 5.8% per year deferred.</li>
          <li>State Pension is taxable but no National Insurance is due on it.</li>
        </ul>
      </div>

      <div className="card">
        <h3>Private pensions</h3>
        <ul className="small">
          <li>Minimum access age 55, rising to 57 on 6 April 2028 (the planner warns if a plan accesses a pension earlier).</li>
          <li>25% tax-free lump sum, capped by the £268,275 Lump Sum Allowance; the rest of the pot stays invested and withdrawals are taxed as income.</li>
          <li>Personal contributions get basic-rate relief added in the pot; salary sacrifice contributions reduce taxable pay instead. (The planner does not yet reclaim higher-rate relief through self-assessment — a small understatement for higher-rate taxpayers.)</li>
          <li>Defined benefit pensions are revalued to their start date, reduced for early payment at your scheme&apos;s rate (typically 4–5% per year), and indexed in payment.</li>
          <li>The annual allowance (£60,000), taper and MPAA are not policed by the engine — very large contributions may overstate relief.</li>
        </ul>
      </div>

      <div className="card">
        <h3>Tax (England, Wales &amp; Northern Ireland, 2026/27)</h3>
        <ul className="small">
          <li>Personal allowance £12,570 (tapered above £100,000); 20% to £50,270; 40% to £125,140; 45% above. Thresholds frozen to April 2031 (Autumn Budget 2025). Scottish bands are not supported.</li>
          <li>Employee National Insurance 8%/2% while working, none after State Pension age and none on pension or rental income.</li>
          <li>Capital gains tax on taxable investment accounts: £3,000 annual exempt amount, 18%/24%. Your main home is exempt (private residence relief); other property sales pay 24% in the model.</li>
          <li>Rental income is taxed as income with the 20% Section 24 credit on mortgage interest.</li>
          <li>Inheritance tax estimate: 40% above the nil-rate bands (£325,000 + £175,000 residence band per person, transferable between spouses, residence band tapered above £2m estates), including pension pots — unused pensions join the estate from 6 April 2027.</li>
          <li>Simplifications: tax is estimated from annualised monthly income; investments use total-return growth (dividend tax in taxable accounts is not separately modelled); the April 2026 dividend-rate rise and the 2027 savings/property rate rises and cash-ISA cap are documented but not separately modelled.</li>
        </ul>
      </div>

      <div className="card">
        <h3>Investment returns and inflation</h3>
        <ul className="small">
          <li>Default growth rates are long-run nominal assumptions per asset class (e.g. global equities 7%, gilts 4%, cash 3.5%), consistent with 126 years of market history (UBS Global Investment Returns Yearbook; Barclays Equity Gilt Study: world equities ≈5.2% real, UK equities ≈4.9% real, gilts ≈1.4% real). Every rate is editable.</li>
          <li>Where available, the pick list shows each fund&apos;s recent 5-year annualised return (history via Stooq; crypto prices by CoinGecko). Past performance is not a reliable indicator of future results.</li>
          <li>Default inflation is 2.5%/year — the Bank of England targets 2%; FCA-regulated illustrations deduct 2.0%; the FRC&apos;s statutory annual statements use 2.5%.</li>
          <li>Crypto: the FCA&apos;s warning applies — be prepared to lose all money held in cryptoassets. The planner shows no expected return for crypto from live data and flags it in the risk report.</li>
          <li>Monte Carlo simulation draws randomised monthly returns (correlated across pools, volatility by asset class) over 500 runs; planners commonly aim for an 85–95% success rate. Benchmarks shown for withdrawal rates: Bengen&apos;s 4% rule, Morningstar&apos;s 3.9% (2026), UK-data studies ≈3.0–3.6%.</li>
        </ul>
      </div>

      <div className="card">
        <h3>Spending benchmarks</h3>
        <p className="small" style={{ marginBottom: 6 }}>
          PLSA Retirement Living Standards (June 2025, excluding housing costs, outside London), per year:
        </p>
        <table className="data">
          <thead><tr><th>Standard</th><th>Single</th><th>Couple</th></tr></thead>
          <tbody>
            {(['minimum', 'moderate', 'comfortable'] as const).map((k) => (
              <tr key={k}>
                <td style={{ textTransform: 'capitalize' }}>{k}</td>
                <td>{gbp(PLSA.single[k])}</td>
                <td>{gbp(PLSA.couple[k])}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small muted" style={{ marginTop: 8 }}>
          The phased spending model reflects the well-documented &quot;retirement spending smile&quot;:
          more in the active early years, less later, with optional care costs at the end.
        </p>
      </div>

      <div className="card">
        <h3>What this site is and is not</h3>
        <p className="small" style={{ marginBottom: 0 }}>
          This is an educational guidance tool, not regulated financial advice, and nothing here is
          a personal recommendation. Projections are deterministic or simulated estimates based on
          the assumptions shown — real returns, inflation, tax law and your circumstances will
          differ. Investment pick lists are user-driven comparisons, not product recommendations.
          For decisions such as transfers, annuity purchase or defined benefit options, speak to a
          regulated financial adviser — find one via MoneyHelper. Your plan data stays in your
          browser; spreadsheet uploads and chat messages are sent to the AI service only to answer
          your request and are not stored by this site.
        </p>
      </div>
    </main>
  );
}
