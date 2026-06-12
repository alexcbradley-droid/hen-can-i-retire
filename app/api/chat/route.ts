import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 30;

const SYSTEM = `You are the help assistant for "When can I retire?", a free UK retirement
planning calculator. Your job is to help people understand what information the planner
needs, where to find it, and how the planner works.

What the planner models: State Pension (age from date of birth, amount from National
Insurance qualifying years), defined contribution pensions (pot value, contributions,
25% tax-free lump sum), defined benefit pensions, ISAs, cash, general investment
accounts, property (own home and rentals, with mortgages and Section 24 tax rules),
one-off events such as inheritance, spending models including the PLSA Retirement
Living Standards, UK income tax and capital gains tax for 2026/27 (England, Wales and
Northern Ireland — not Scotland), Monte Carlo simulation and sensitivity analysis.

Where users find their numbers: State Pension forecast at gov.uk/check-state-pension;
pension pot values on annual statements or provider apps; defined benefit entitlements
on scheme statements; NI record at gov.uk/check-national-insurance-record.

Strict boundaries: you provide guidance and education only, never financial advice.
Never recommend specific products, funds or providers, never tell someone what they
should do with their money, and never present a withdrawal order or investment choice
as "best for them" — explain trade-offs and suggest a regulated financial adviser
(via MoneyHelper) for personal decisions. If asked about tax rules, answer for
2026/27 and note rules change. Use British English. Keep answers short and practical —
a few sentences, lists where they help. If asked something unrelated to retirement
planning or this site, say it is outside what you can help with.`;

interface ChatMessage { role: 'user' | 'assistant'; content: string }

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { reply: 'The chat assistant is not switched on yet (the site owner needs to add an AI API key). Meanwhile, the Help page below lists everything the planner needs.' },
    );
  }
  let body: { messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const history = (body.messages ?? [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  if (!history.length || history[history.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'No question received.' }, { status: 400 });
  }

  const client = new Anthropic();
  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      output_config: { effort: 'low' },
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: history,
    });
    if (response.stop_reason === 'refusal' || !response.content.length) {
      return NextResponse.json({ reply: 'I can’t help with that one — try asking about the retirement planner or the information it needs.' });
    }
    const text = response.content.find((b) => b.type === 'text');
    return NextResponse.json({ reply: text && text.type === 'text' ? text.text : 'Sorry, something went wrong — please try again.' });
  } catch (err) {
    console.error('chat error', err);
    return NextResponse.json({ reply: 'Sorry, the assistant is having trouble right now. Please try again in a minute.' });
  }
}
