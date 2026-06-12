import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'When Can I Retire? — UK retirement planner',
  description:
    'A free UK retirement calculator: project your pensions, savings, investments and property; find your earliest retirement date; compare scenarios; stress-test your plan.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <header className="site-header no-print">
          <div className="container">
            <Link href="/" className="brand">
              When can I <span>retire?</span>
            </Link>
            <nav className="main-nav">
              <Link href="/plan">Planner</Link>
              <Link href="/help">Help &amp; chat</Link>
              <Link href="/methodology">Methodology</Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="site-footer no-print">
          <div className="container">
            <p>
              <b>This tool provides information and guidance only — it is not financial advice.</b> If you are
              unsure about retirement decisions, speak to a regulated financial adviser (you can find one via{' '}
              <a href="https://www.moneyhelper.org.uk/en/getting-help-and-advice/financial-advisers" rel="noopener noreferrer" target="_blank">MoneyHelper</a>).
            </p>
            <p>
              Projections are estimates, not guarantees: they depend on assumptions about growth, inflation,
              charges and tax that may not be borne out, and on the accuracy of the information you enter.
              The value of investments can go down as well as up and you may get back less than you invest.
              Tax treatment depends on individual circumstances and rules may change. Calculations use
              England, Wales &amp; Northern Ireland tax bands for 2026/27 — Scottish income tax differs.
              Past performance is not a reliable indicator of future results.
            </p>
            <p>Your data stays in your browser — nothing you enter is stored on our servers.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
