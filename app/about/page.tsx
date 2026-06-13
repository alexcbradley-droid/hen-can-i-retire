import Link from 'next/link';

export const metadata = {
  title: 'About — When Can I Retire?',
  description:
    'How the When Can I Retire? planner works, and how it was built: one person directing AI tools, with Claude Code writing the codebase and Claude as architect and operations engineer.',
};

interface Project {
  name: string;
  url: string | null;
  status: 'live' | 'in_development' | 'planned';
  tagline: string;
  description: string;
  systems: string[];
  aiTools: string[];
  elements: string[];
}

const STATUS_LABEL: Record<Project['status'], string> = {
  live: 'Live',
  in_development: 'In development',
  planned: 'Planned',
};

// The same family of projects shown on aidailysignal.app/about, kept in step.
const projects: Project[] = [
  {
    name: 'When Can I Retire?',
    url: 'https://when-can-i-retire-six.vercel.app',
    status: 'live',
    tagline: 'Personal retirement-date modelling, built in the open.',
    description:
      'This site. A free UK retirement planner that answers the question everyone asks — when can I actually afford to stop working? It models pensions (State, workplace, final-salary), ISAs, savings, investments and property month by month with UK tax built in, finds your earliest retirement date and sustainable income, stress-tests the plan with Monte Carlo, and lets you save and compare scenarios. An AI assistant can explain any figure and edit your plan on request, and you can upload a spreadsheet for the AI to map. The projection engine runs entirely in your browser.',
    systems: [
      'Vercel (Next.js 14)',
      'Supabase (auth, per-user cloud save, usage limits)',
      'GitHub',
    ],
    aiTools: [
      'Claude (claude.ai) as architect and operations engineer via MCP',
      'Claude Code writing the entire codebase',
      'Anthropic API (Claude Opus) powering the in-app assistant and spreadsheet reader',
    ],
    elements: [
      'In-browser month-by-month projection engine with UK tax rules',
      'Goal solver: target date and income → what it takes',
      'Monte Carlo and sensitivity stress testing',
      'Scenario save, recall and side-by-side comparison',
      'Context-aware AI assistant that can explain and edit the plan',
      'AI spreadsheet import, gated behind sign-in',
    ],
  },
  {
    name: 'The AI Daily Signal',
    url: 'https://aidailysignal.app',
    status: 'live',
    tagline: 'A daily AI news publication that largely runs itself.',
    description:
      'Every morning, unattended, it gathers several hundred items from news feeds and podcast transcripts, drafts the day’s briefing, newsletter and podcast script, and queues them for human review. On publish it records the podcast episode with chapter marks, sends the newsletter, and serves the edition in ten languages. Its data desks refresh themselves daily: model benchmarks, an AI markets tape, and a global infrastructure tracker. Built and operated by one person directing AI tools; no development team.',
    systems: [
      'Supabase (Postgres, edge functions, cron, auth, storage)',
      'Vercel (Next.js 14)',
      'GitHub',
      'Resend (email)',
    ],
    aiTools: [
      'Claude (claude.ai) as architect and operations engineer via MCP',
      'Claude Code writing the entire codebase',
      'Anthropic API (Claude Sonnet) drafting the daily edition',
      'ElevenLabs (text-to-speech narration)',
    ],
    elements: [
      'RSS/feed ingestion engine',
      'Database-dispatched relay for long AI generations',
      'Automated podcast production with chapter marks',
      'Ten-language machine translation',
      'Human review gate before anything publishes',
    ],
  },
  {
    name: 'True Bricks',
    url: 'https://truebricks.app',
    status: 'in_development',
    tagline: 'The true total cost of owning a UK home.',
    description:
      'A property research tool that calculates the full cost of ownership for any UK residential property: mortgage, energy, maintenance, risk factors and area data, drawn together into a single comparable view with street-level and solar-potential analysis. Built on a vibe-coding platform with an AI pair: planning and task specifications written in conversation with Claude, then executed autonomously by Claude Code against a gated test-and-verify workflow.',
    systems: [
      'Lovable (React, Vite, Tailwind)',
      'Lovable Cloud (database, auth, edge functions, cron)',
      'Google APIs (Geocoding, Street View, Solar)',
    ],
    aiTools: [
      'Claude (claude.ai) for planning and task specs',
      'Claude Code for autonomous build sessions',
      'Lovable AI',
    ],
    elements: [
      'Edge-function API integrations',
      'Spec-driven agentic build workflow',
      'Automated test gates before commits',
      'Solar roof-potential analysis',
    ],
  },
];

function ChipGroup({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="chip-group">
      <span className="chip-group-label">{label}</span>
      <div className="chip-row">
        {items.map((t) => <span className="tagpill" key={t}>{t}</span>)}
      </div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <main className="container narrow" style={{ paddingTop: 24 }}>
      <h1>About When Can I Retire?</h1>
      <div className="prose">
        <p>
          Working out when you can afford to retire means pulling together pensions, savings,
          investments, property, tax and decades of compounding — the kind of sum most people never
          get a clear answer to. When Can I Retire? does that maths for you: enter your details, or
          upload a spreadsheet, and see your earliest retirement date, the income your plan sustains,
          and how it holds up when markets, inflation or longevity don&apos;t go to plan.
        </p>

        <h2>How it works</h2>
        <p>
          A projection engine simulates your household month by month from today to your plan age:
          income from work, pensions and rentals, minus tax and spending, with surpluses invested and
          shortfalls drawn from your pots in the order you choose. It has UK tax built in — income tax
          bands, the 25% tax-free lump sum, National Insurance, capital gains and an inheritance tax
          estimate, on verified 2026/27 figures. Goal solvers find your earliest possible retirement
          date and the income your plan supports; Monte Carlo and sensitivity tests show how robust it
          is. The engine runs entirely in your browser — your figures never leave your device unless
          you sign in to save them or use the optional AI features. Every assumption and source is on
          the <Link href="/methodology">methodology page</Link>, and an audit view inside the planner
          shows exactly how each headline figure was calculated.
        </p>

        <h2>How this site was built</h2>
        <p>
          There is no development team behind When Can I Retire?. It was designed, built and is run by
          one person directing AI tools — and this page exists to show what that means in practice.
        </p>
        <p>The division of labour:</p>
        <p>
          <strong>Claude (claude.ai)</strong> acts as architect and operations engineer. Through live
          connections to the infrastructure (the Model Context Protocol, MCP), it designs the systems
          and then runs them in conversation: provisioning the database, applying schema changes,
          reading deployment logs, diagnosing build failures and fixing them.
        </p>
        <p>
          <strong>Claude Code</strong> writes the site itself: the projection engine, every page and
          component, the AI features and the tests — working from written briefs, verifying its own
          work against live builds, and pushing to production.
        </p>
        <p>
          <strong>Supabase</strong> handles accounts: Google sign-in, a per-user table that syncs your
          saved plans across devices with row-level security, and the usage limits that keep the AI
          features affordable. <strong>Vercel</strong> hosts the site, deploying automatically from
          GitHub on every change. The <strong>Anthropic API</strong> (Claude Opus) powers the in-app
          assistant — which can see your plan, explain how any figure was derived, and make changes you
          confirm — and the spreadsheet reader that maps a file of any layout onto the planner.
        </p>
        <p>
          One rule is deliberate: the numbers are guidance, not advice. The tool shows you the maths and
          the assumptions behind it and leaves every decision with you — for choices like transfers,
          annuities or defined-benefit options, it points you to a regulated adviser. The marginal
          running cost is a few pounds a month.
        </p>

        <h2>Built with AI: the projects</h2>
        <p>The same approach, applied to other problems. This list grows.</p>

        {projects.map((p) => (
          <div className="project-card" key={p.name}>
            <div className="project-head">
              <h3 className="project-name">
                {p.url
                  ? <a href={p.url} target="_blank" rel="noopener noreferrer">{p.name}</a>
                  : p.name}
              </h3>
              <span className={`status-chip ${p.status}`}>{STATUS_LABEL[p.status]}</span>
            </div>
            <p className="project-tagline">{p.tagline}</p>
            <p className="project-desc">{p.description}</p>
            <ChipGroup label="Systems" items={p.systems} />
            <ChipGroup label="AI tools" items={p.aiTools} />
            <ChipGroup label="Elements" items={p.elements} />
          </div>
        ))}

        <p className="small muted" style={{ marginTop: 18 }}>
          When Can I Retire? provides information and guidance only — it is not financial advice. See the{' '}
          <Link href="/methodology">methodology page</Link> for every assumption, source and known
          simplification.
        </p>
      </div>
    </main>
  );
}
