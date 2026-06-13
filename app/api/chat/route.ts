import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { checkAndLogUsage } from '@/lib/server/usage';
import { LIMITS } from '@/lib/limits';

export const maxDuration = 30;

const SYSTEM = `You are the assistant for "When can I retire?", a free UK retirement
planning calculator. You help people understand what the planner needs, where to find
their numbers, how the planner works — and, when plan context is provided, you explain
their own results and can propose changes to their plan.

What the planner models: State Pension (age from date of birth, amount from National
Insurance qualifying years), defined contribution pensions (pot value, contributions,
25% tax-free lump sum), defined benefit pensions, ISAs, cash, general investment
accounts, property (own home and rentals, with mortgages and Section 24 tax rules),
one-off events such as inheritance, spending models including the PLSA Retirement
Living Standards, UK income tax and capital gains tax for 2026/27 (England, Wales and
Northern Ireland — not Scotland), Monte Carlo simulation and sensitivity analysis.

How headline figures are derived (use these when asked "how did you get X"):
- The engine simulates the household month by month from now to the plan age: income
  (salary, pensions, rent) minus tax and spending; surpluses are invested, shortfalls
  are drawn from pots in the chosen withdrawal order.
- "Net worth at retirement" = cash + ISAs + general investments + remaining pension
  pots + property values minus mortgage balances, all at the first retirement month.
- "Sustainable income" = the highest flat monthly retirement spend (today's money)
  found by binary search such that money still lasts to the plan age.
- "Earliest you could retire" = the earliest retirement date (searching month by
  month) at which the plan still succeeds with current spending.
- "Guaranteed income" = State Pension plus defined benefit pensions once all are in
  payment, in today's money.
The Audit tab and the methodology page show every assumption and the exact breakdown.

Proposing changes: when the user asks you to change something in their plan, fill the
"changes" array. Each change has a "path" into the plan JSON you were given (e.g.
"spending.retirement.monthlyToday", "employments.0.retirementDate",
"goals.targetMonthlyIncome", "accounts.1.monthlyContribution"), a short human "label"
(e.g. "Retirement spending (£/month)") and the new scalar "value". Only reference
paths that exist in the provided plan JSON. Dates are "YYYY-MM" strings. Leave
"changes" empty when no change is requested. The user must confirm before anything is
applied, so propose exactly what they asked for — never invent extra changes.

Strict boundaries: you provide guidance and education only, never financial advice.
Never recommend specific products, funds or providers, never tell someone what they
should do with their money, and never present a withdrawal order or investment choice
as "best for them" — explain trade-offs and suggest a regulated financial adviser
(via MoneyHelper) for personal decisions. If asked about tax rules, answer for
2026/27 and note rules change. Use British English. Keep answers short and practical —
a few sentences, lists where they help. If asked something unrelated to retirement
planning or this site, say it is outside what you can help with.`;

const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    reply: { type: 'string', description: 'Your answer to the user, plain text.' },
    changes: {
      type: 'array',
      description: 'Plan edits the user explicitly asked for; empty if none.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          path: { type: 'string' },
          label: { type: 'string' },
          value: { anyOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] },
        },
        required: ['path', 'label', 'value'],
      },
    },
  },
  required: ['reply', 'changes'],
} as const;

interface ChatMessage { role: 'user' | 'assistant'; content: string }

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { reply: 'The chat assistant is not switched on yet (the site owner needs to add an AI API key). Meanwhile, the Help page lists everything the planner needs.' },
    );
  }
  let body: { messages?: ChatMessage[]; context?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const history = (body.messages ?? [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-LIMITS.chatHistoryMessages)
    .map((m) => ({ role: m.role, content: m.content.slice(0, LIMITS.chatMessageChars) }));
  // The Messages API requires the first message to be from the user — drop any
  // leading assistant greeting (or assistant-first window after slicing).
  while (history.length && history[0].role !== 'user') history.shift();
  if (!history.length || history[history.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'No question received.' }, { status: 400 });
  }

  const { allowed } = await checkAndLogUsage(req, 'chat', LIMITS.estChatCostUsd, LIMITS.chatPerDay);
  if (!allowed) {
    return NextResponse.json({
      reply: 'You have reached today’s limit for the assistant. It resets within 24 hours — meanwhile the Help and Methodology pages cover most questions.',
    });
  }

  // Plan context (scenario + computed metrics) from the client; capped hard so
  // an oversized payload can never blow the bill.
  let contextBlock = '';
  if (body.context) {
    try {
      contextBlock = JSON.stringify(body.context).slice(0, LIMITS.chatContextChars);
    } catch { /* ignore malformed context */ }
  }

  const client = new Anthropic();
  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: LIMITS.chatMaxOutputTokens,
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: RESPONSE_SCHEMA as unknown as Record<string, unknown> },
      },
      system: [
        { type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } },
        ...(contextBlock ? [{
          type: 'text' as const,
          text: `Current plan context (scenario JSON, computed metrics, warnings):\n${contextBlock}`,
        }] : []),
      ],
      messages: history,
    });
    if (response.stop_reason === 'refusal' || !response.content.length) {
      return NextResponse.json({ reply: 'I can’t help with that one — try asking about the retirement planner or the information it needs.' });
    }
    const text = response.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') {
      return NextResponse.json({ reply: 'Sorry, something went wrong — please try again.' });
    }
    try {
      const parsed = JSON.parse(text.text) as { reply?: string; changes?: unknown[] };
      return NextResponse.json({
        reply: parsed.reply || 'Sorry, something went wrong — please try again.',
        changes: Array.isArray(parsed.changes) ? parsed.changes.slice(0, 12) : [],
      });
    } catch {
      // Structured output that fails to parse is truncated JSON, not prose —
      // never show it raw.
      return NextResponse.json({ reply: 'That answer ran too long — please ask a more specific question.' });
    }
  } catch (err) {
    console.error('chat error', err);
    return NextResponse.json({ reply: 'Sorry, the assistant is having trouble right now. Please try again in a minute.' });
  }
}
