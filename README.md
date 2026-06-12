# When can I retire?

A free UK retirement planning calculator. Enter your household's details — or
upload any spreadsheet and let AI map it — and see your earliest affordable
retirement date, sustainable income, month-by-month projections to age 95+,
scenario comparisons, Monte Carlo risk analysis and a printable report.

Built with Next.js 14 and TypeScript. Plans are stored in the visitor's
browser (no accounts, no database). This is a standalone project — it shares
no code with anything else.

## What's inside

- `lib/engine/` — the calculation engine: UK tax and pension rules for 2026/27
  (`uk-rules.ts`, with every figure sourced in `SOURCES.md`), the monthly
  simulation (`engine.ts`), goal solvers (`solvers.ts`) and Monte Carlo
  simulation (`montecarlo.ts`).
- `app/` — pages: landing, `/plan` (the planner), `/help` (data checklist and
  AI chat), `/methodology` (every assumption and disclaimer), plus API routes
  for AI spreadsheet interpretation, the chat assistant and cached market data.
- `components/` — the planner UI (six tabs) and charts.
- `scripts/smoke.ts` — engine regression test (`npm run smoke`).

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (must pass before deploying)
npm run smoke    # engine regression test
```

## Deploying (Vercel)

Import the repository into Vercel — no special settings needed. To switch on
the AI features (spreadsheet upload and the help chat), add one environment
variable in Vercel → Settings → Environment Variables:

- `ANTHROPIC_API_KEY` — a Claude API key. The site works fully without it;
  the AI features simply explain they're not configured until it's added.

Live market data (fund averages via Stooq, crypto prices by CoinGecko) needs
no key and degrades gracefully to documented long-run defaults if unreachable.

## Optional: Google sign-in and cloud saving

Without any setup, plans are saved in the visitor's browser. To let people
sign in with Google and keep their plans across devices:

1. Create a free project at supabase.com (any name, region London/eu-west-2).
2. In the Supabase dashboard, open **SQL Editor**, paste the contents of
   `supabase-setup.sql` from this repository, and run it.
3. Enable Google sign-in: Supabase → **Authentication → Sign In / Up →
   Google**. It asks for a Google OAuth Client ID and Secret — create those at
   console.cloud.google.com → **APIs & Services → Credentials → Create
   credentials → OAuth client ID** (type: Web application), adding the
   redirect URL that the Supabase Google settings page shows you.
4. In Vercel → Settings → Environment Variables, add (from Supabase →
   Settings → API):
   - `NEXT_PUBLIC_SUPABASE_URL` — the project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the anon/publishable key
5. Redeploy. A "Sign in with Google to save" button appears in the planner.

If the two variables are absent the sign-in button is hidden and the site
behaves exactly as before.

## Important

This tool provides guidance and education only — it is not financial advice
and makes no personal recommendations. Calculations use England, Wales &
Northern Ireland tax rules for 2026/27 (Scotland differs). See `/methodology`
on the site and `lib/engine/SOURCES.md` for every assumption, source and
known simplification.
