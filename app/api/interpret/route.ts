import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { checkAndLogUsage } from '@/lib/server/usage';
import { LIMITS } from '@/lib/limits';

export const maxDuration = 60;

// Schema for what Claude extracts from an uploaded spreadsheet. It mirrors the
// planner's Scenario shape (minus ids) plus follow-up questions for the user.
const INTAKE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    people: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          name: { type: 'string' },
          dateOfBirth: { type: 'string', description: 'YYYY-MM-DD; estimate from age if needed' },
        },
        required: ['name', 'dateOfBirth'],
      },
    },
    employments: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          personIndex: { type: 'integer' },
          grossSalary: { type: 'number', description: '£/year before tax' },
          bonus: { type: 'number' },
          salaryGrowthPct: { type: 'number' },
          retirementDate: { type: 'string', description: 'YYYY-MM' },
        },
        required: ['personIndex', 'grossSalary', 'bonus', 'salaryGrowthPct', 'retirementDate'],
      },
    },
    dcPensions: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          personIndex: { type: 'integer' },
          name: { type: 'string' },
          currentValue: { type: 'number' },
          employeePct: { type: 'number' },
          employerPct: { type: 'number' },
          extraMonthly: { type: 'number' },
          salarySacrifice: { type: 'boolean' },
          growthPct: { type: 'number' },
        },
        required: ['personIndex', 'name', 'currentValue', 'employeePct', 'employerPct', 'extraMonthly', 'salarySacrifice', 'growthPct'],
      },
    },
    dbPensions: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          personIndex: { type: 'integer' },
          name: { type: 'string' },
          annualPension: { type: 'number' },
          normalPensionAge: { type: 'number' },
        },
        required: ['personIndex', 'name', 'annualPension', 'normalPensionAge'],
      },
    },
    statePensionQualifyingYears: { type: 'array', items: { type: 'number' }, description: 'one per person, NI qualifying years so far; use 30 if unknown' },
    accounts: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          personIndex: { type: 'integer' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['cash', 'isa', 'gia', 'premium-bonds'] },
          value: { type: 'number' },
          monthlyContribution: { type: 'number' },
          assetId: { type: 'string', enum: ['global-equity', 'us-equity', 'uk-equity', 'em-equity', 'tech-equity', 'dividend-equity', 'mixed-80-20', 'mixed-60-40', 'gilts', 'global-bonds', 'money-market', 'cash-savings', 'gold', 'reit', 'bitcoin', 'ethereum', 'custom'] },
          growthPct: { type: 'number' },
        },
        required: ['personIndex', 'name', 'type', 'value', 'monthlyContribution', 'assetId', 'growthPct'],
      },
    },
    properties: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          name: { type: 'string' },
          isMainHome: { type: 'boolean' },
          value: { type: 'number' },
          growthPct: { type: 'number' },
          mortgageBalance: { type: 'number' },
          mortgageRatePct: { type: 'number' },
          mortgageMonthlyPayment: { type: 'number' },
          interestOnly: { type: 'boolean' },
          grossMonthlyRent: { type: 'number', description: '0 if not rented out' },
          rentalMonthlyCosts: { type: 'number' },
        },
        required: ['name', 'isMainHome', 'value', 'growthPct', 'mortgageBalance', 'mortgageRatePct', 'mortgageMonthlyPayment', 'interestOnly', 'grossMonthlyRent', 'rentalMonthlyCosts'],
      },
    },
    events: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          name: { type: 'string' },
          date: { type: 'string', description: 'YYYY-MM' },
          amount: { type: 'number', description: 'negative = money out' },
        },
        required: ['name', 'date', 'amount'],
      },
    },
    preRetirementMonthlySpend: { type: 'number', description: '£/month household spending now, excluding mortgage payments' },
    retirementMonthlySpend: { type: 'number', description: 'desired £/month in retirement, today’s money; 0 if unknown' },
    notes: { type: 'array', items: { type: 'string' }, description: 'what was found and any assumptions made' },
    questions: { type: 'array', items: { type: 'string' }, description: 'information missing from the spreadsheet the user should add' },
  },
  required: ['people', 'employments', 'dcPensions', 'dbPensions', 'statePensionQualifyingYears', 'accounts', 'properties', 'events', 'preRetirementMonthlySpend', 'retirementMonthlySpend', 'notes', 'questions'],
} as const;

const SYSTEM = `You interpret personal-finance spreadsheets for a UK retirement planner.
You receive the contents of a user's spreadsheet (any layout, converted to CSV per sheet).
Extract whatever maps onto the planner's data model: people and ages, salaries, pensions
(defined contribution pot values and contributions; defined benefit annual amounts),
savings and investment accounts (classify as cash / ISA / general investment account),
properties with mortgages and rental income, one-off events, and monthly spending.
Figures may be annual or monthly — convert sensibly and say so in notes. Use conservative
defaults where needed (growth 5% for investments, 3.5% cash) and record every assumption
in notes. List in questions the genuinely missing information that matters most for a
retirement projection (at most 6, ordered by importance). Amounts are pounds sterling
unless clearly stated otherwise. Never invent accounts or people that are not evidenced.`;

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'AI features are not configured yet. Add the details manually, or ask the site owner to set the ANTHROPIC_API_KEY environment variable.' },
      { status: 503 },
    );
  }
  let body: { sheets?: { name: string; csv: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const sheets = (body.sheets ?? []).slice(0, 10);
  if (!sheets.length) {
    return NextResponse.json({ error: 'No spreadsheet content received.' }, { status: 400 });
  }
  // Cap the payload so an enormous sheet can't blow the context or the bill.
  const content = sheets
    .map((s) => `## Sheet: ${s.name}\n${s.csv.slice(0, 60000)}`)
    .join('\n\n')
    .slice(0, 250000);

  // Per-caller daily cap: spreadsheet reads are the most expensive AI call.
  const estCost = (content.length / 3 / 1e6) * 5 + 0.04;
  const { allowed } = await checkAndLogUsage(req, 'interpret', estCost, LIMITS.interpretPerDay);
  if (!allowed) {
    return NextResponse.json(
      { error: 'You have reached today’s limit for spreadsheet imports. It resets within 24 hours — you can still enter details manually.' },
      { status: 429 },
    );
  }

  const client = new Anthropic();
  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 16000,
      system: SYSTEM,
      output_config: { format: { type: 'json_schema', schema: INTAKE_SCHEMA as unknown as Record<string, unknown> } },
      messages: [{ role: 'user', content: `Here is my spreadsheet:\n\n${content}` }],
    });
    if (response.stop_reason === 'refusal' || !response.content.length) {
      return NextResponse.json({ error: 'The AI could not process this spreadsheet. Try removing unusual content and re-uploading.' }, { status: 422 });
    }
    const text = response.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response from the AI.' }, { status: 502 });
    }
    return NextResponse.json({ intake: JSON.parse(text.text) });
  } catch (err) {
    console.error('interpret error', err);
    return NextResponse.json({ error: 'Something went wrong reading the spreadsheet. Please try again.' }, { status: 502 });
  }
}
