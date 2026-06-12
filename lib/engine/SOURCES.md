# Fact sheet behind the engine constants

Researched 12 June 2026 via five parallel research passes, each figure
corroborated by at least two independent sources (gov.uk pages block automated
fetching, so official figures were verified through the DWP rates PDF, Commons
Library briefings, ICAEW, LITRG, Deloitte and similar professional sources).
Current tax year at research time: **2026/27**.

## State Pension
- Full new State Pension: **£230.25/wk (2025/26)**, **£241.30/wk = £12,547.60/yr (2026/27**, +4.8% triple lock, earnings-led**)**. DWP Benefit and pension rates 2026/27; Commons Library CBP-10403.
- Basic (old) State Pension: £176.45/wk → £184.90/wk.
- SPA: 66→67 phased for births 6 Apr 1960 – 5 Mar 1961 (one month per month of birth); 67 for births to 5 Apr 1977; 68 legislated 2044–46 (births ≥ 6 Apr 1977/78). Third SPA review in progress, unreported as of June 2026 — post-1970 births flagged "subject to review". DWP SPA timetable; Pensions Act 2014 s.26.
- Qualifying years: 35 full / 10 minimum, pro-rata 1/35th per year. Class 3 voluntary: £17.75/wk (25/26), £18.40/wk (26/27).
- Deferral: +1% per 9 weeks ≈ **5.79%/year**, no lump sum option (new system).
- Taxable, no NI on it; employees stop NI at SPA.
- Pension Credit minimum guarantee 2026/27: £238.00 single / £363.25 couple per week.

## Private pensions
- Normal minimum pension age **55 → 57 on 6 Apr 2028** (cliff edge; protected ages exist). Finance Act 2022.
- Tax-free cash: 25% PCLS, capped by **Lump Sum Allowance £268,275**; LSDBA £1,073,100. Lifetime allowance abolished Apr 2024, still abolished.
- Annual allowance **£60,000**; taper £200k threshold / £260k adjusted income down to £10k floor; **MPAA £10,000** (triggered by taxable drawdown/UFPLS, not by PCLS alone); 3-year carry-forward.
- Relief at source: 20% top-up in pot, higher/additional reclaimed via self-assessment. Salary sacrifice saves employee NI (8%/2%) + employer NI (15%); **from 6 Apr 2029 only first £2,000/yr of sacrificed contributions stays NI-free** (Autumn Budget 2025, draft legislation pending).
- Drawdown: 25% tax-free, 75% at marginal rate; UFPLS per-slice 25/75; small pots ≤£10k ×3 don't trigger MPAA.
- DB deferred revaluation: CPI capped 2.5% (post-2009 service) / 5% (pre); typical accrual 1/60 or 1/80 + 3/80 lump sum; early reduction ≈ 4–5%/yr (scheme-specific).
- Auto-enrolment: 8% total / 3% employer on qualifying earnings £6,240–£50,270 (frozen 2026/27).
- Annuities (June 2026, single-life level per £100k): ~£6,669 @55, ~£6,991 @60, ~£7,880 @65, ~£8,678 @70; RPI-linked @65 ~£5,720; joint-100% @65 ~£7,190. Volatile — date-stamped, editable. Sharing Pensions / Which? / HL.

## Income tax (England, Wales, NI) — 2025/26 and 2026/27 identical
- PA £12,570 (tapered £1 per £2 above £100k); 20% to £50,270; 40% to £125,140; 45% above. **Thresholds frozen to April 2031** (Autumn Budget 2025). Scotland differs (six bands) — flagged unsupported in v1.
- Pension income: taxable via PAYE, **no NI at any age**. No employee NI on earnings after SPA.
- Savings: PSA £1,000/£500/£0; starting rate band £5,000. Savings rates → 22/42/47% from 2027/28.
- Dividends: £500 allowance; **2026/27 rates 10.75%/35.75%/39.35%** (basic/higher +2pts Apr 2026).
- Property income: Section 24 (20% credit on finance costs); £1,000 property allowance; separate property rates 22/42/47% from April 2027 (not modelled — documented simplification).
- Marriage allowance: £1,260 transferable.

## ISAs, CGT, IHT
- ISA £20,000/yr, frozen to 2030; tax-free growth/withdrawals. From Apr 2027: cash-ISA portion capped £12,000 for under-65s (overall £20k unchanged).
- CGT: AEA £3,000; all assets (shares, crypto, residential property) 18% basic / 24% higher; main home exempt (private residence relief).
- IHT: NRB £325,000 + RNRB £175,000 (tapered above £2m estate), frozen to April 2031; spouse exemption unlimited; transferable bands (couple ≤£1m). **Unused pension funds join the estate from 6 Apr 2027** (legislated; personal representatives administer).

## Projections & drawdown
- FCA COBS 13 Annex 2 deterministic rates: **2% / 5% / 8% nominal**, inflation deduction **2.0%** (the 2.5% figure is FRC AS TM1 / SMPI, a different regime).
- Safe withdrawal: Bengen 4% (US, 30yr); **Morningstar 2026: 3.9%** (90% success, 30yr); UK-data research ≈ **3.0–3.6%**; Guyton-Klinger guardrails allow ~5%+ with spending cuts.
- Sequence-of-returns risk mitigations: 1–3 yr cash buffer, bond tent, dynamic spending.
- Long-run real returns (DMS/UBS Yearbook 2026, Barclays EGS): world equities ~5.2%, UK equities ~4.9%, gilts ~1.4%, cash ~0.5%, gold ~1.3%; UK property ~2–3% real capital + ~5.9% gross yield.
- Inflation: BoE target 2%; CPI 2.8% (April 2026); planning convention 2–2.5%.
- Life expectancy (ONS cohort, ~): man 65 → 85–86, woman → 87–88; 1-in-4 man → 92, woman → 94; hence **plan-to-age default 95**.
- Crypto: FCA "be prepared to lose all your money"; no reliable expected return — high volatility flag, excluded from "safe income" framing.
- PLSA Retirement Living Standards (June 2025, excl. housing, outside London): single £13,400 / £31,700 / £43,900; couple £21,600 / £43,900 / £60,600.

## Known simplifications in the engine (documented for the methodology page)
1. Tax estimated monthly from annualised income; total-return assumption (GIA dividend tax ignored, CGT modelled on disposals).
2. Triple lock proxied by CPI beyond 2026/27.
3. Scottish income tax bands not supported in v1.
4. 2027/28 savings/property rate rises and the cash-ISA cap are documented, not modelled.
5. Property CGT basis = value at simulation start.
6. Annuity purchase not auto-modelled; indicative rates shown for comparison.

## Regulatory position (feature-survey research)
Guidance, not advice (RAO art. 53 / PERG 8.30): user-driven inputs and generic
education only — no personal recommendations, no ranked "best for you" products.
Standard disclaimer set (Aviva-style) on every results page; three growth
scenarios mirror statutory illustrations; past-performance warnings on the
asset pick list; "Data by CoinGecko" attribution on crypto prices.
