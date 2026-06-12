import ChatWidget from '@/components/ChatWidget';

export const metadata = { title: 'Help — When Can I Retire?' };

const checklist: { item: string; where: string }[] = [
  { item: 'Date of birth (you and your partner)', where: 'Sets your State Pension age and the plan timeline.' },
  { item: 'Salary and bonus, before tax', where: 'Your payslip or employment contract.' },
  { item: 'Pension pot values', where: 'Annual statements or your provider’s app — one entry per pot, with your and your employer’s contribution percentages.' },
  { item: 'Final salary (defined benefit) pensions', where: 'The scheme statement shows the annual pension and normal pension age.' },
  { item: 'State Pension qualifying years', where: 'gov.uk/check-state-pension or gov.uk/check-national-insurance-record — 35 years gets the full amount.' },
  { item: 'Savings and investments', where: 'Balances for cash, ISAs and any taxable investment accounts, plus what you add monthly.' },
  { item: 'Property', where: 'Home value and mortgage (balance, rate, monthly payment); for rentals, the rent and running costs too.' },
  { item: 'Spending', where: 'Roughly what your household spends per month now, and what you would like to spend in retirement — or pick a PLSA Retirement Living Standard in the planner.' },
  { item: 'One-offs', where: 'Expected inheritance, planned house sale or downsizing, big purchases.' },
];

export default function HelpPage() {
  return (
    <main className="container" style={{ paddingTop: 24 }}>
      <h1>Help</h1>
      <p className="muted">
        Everything the planner needs, where to find it, and an assistant for anything else.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, alignItems: 'start' }}>
        <div className="card">
          <h3>What information you need</h3>
          <ul className="small" style={{ lineHeight: 1.8, paddingLeft: 18 }}>
            {checklist.map((c) => (
              <li key={c.item} style={{ marginBottom: 6 }}>
                <b>{c.item}.</b> <span className="muted">{c.where}</span>
              </li>
            ))}
          </ul>
          <p className="small muted">
            Don&apos;t have everything? Start anyway — the planner uses sensible defaults, and every
            assumption can be refined later. Or upload a spreadsheet on the planner page and the AI
            will tell you exactly what is missing.
          </p>
        </div>
        <div>
          <ChatWidget />
        </div>
      </div>
    </main>
  );
}
