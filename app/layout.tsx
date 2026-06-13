import type { Metadata } from 'next';
import Link from 'next/link';
import HeaderAuth from '@/components/HeaderAuth';
import Providers from '@/components/Providers';
import LogoMark from '@/components/Logo';
import CookieConsent from '@/components/CookieConsent';
import './globals.css';

export const metadata: Metadata = {
  title: 'When Can I Retire? — UK retirement planner',
  description:
    'A free UK retirement calculator: project your pensions, savings, investments and property; find your earliest retirement date; compare scenarios; stress-test your plan.',
};

// Analytics runs only on the production deployment, so local dev and Vercel
// preview builds never send traffic. Loading itself is gated on consent
// (see CookieConsent).
const CLARITY_ON = process.env.VERCEL_ENV === 'production';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <Providers>
          <header className="site-header no-print">
            <div className="container">
              <Link href="/" className="brand">
                <LogoMark />
                When can I <span>retire?</span>
              </Link>
              <nav className="main-nav">
                <Link href="/plan">Planner</Link>
                <Link href="/plans">My plans</Link>
                <Link href="/compare">Compare</Link>
                <Link href="/help">Help</Link>
                <Link href="/methodology">Methodology</Link>
                <Link href="/about">About</Link>
              </nav>
              <HeaderAuth />
            </div>
          </header>
          {children}
          <footer className="site-footer no-print">
            <div className="container">
              <p>
                <b>This tool provides information and guidance only — it is not financial advice.</b> If you are
                unsure about retirement decisions, speak to a regulated financial adviser (find one via{' '}
                <a href="https://www.moneyhelper.org.uk/en/getting-help-and-advice/financial-advisers" rel="noopener noreferrer" target="_blank">MoneyHelper</a>).
                If you are 50 or over, <a href="https://www.moneyhelper.org.uk/en/pensions-and-retirement/pension-wise" rel="noopener noreferrer" target="_blank">Pension Wise</a>{' '}
                offers free, impartial pension guidance backed by government.
              </p>
              <p>
                Projections are estimates, not guarantees: they depend on assumptions about growth, inflation,
                charges and tax that may not be borne out, and on the accuracy of the information you enter.
                The value of investments can go down as well as up and you may get back less than you invest.
                Tax treatment depends on individual circumstances and rules may change. Calculations use
                England, Wales &amp; Northern Ireland tax bands for 2026/27 — Scottish income tax differs.
                Past performance is not a reliable indicator of future results.
              </p>
              <p>
                Your data stays in your browser by default. If you sign up / in with Google, your
                scenarios are saved to your account so you can pick them up on any device. If you use the
                AI features (chat assistant or spreadsheet upload), the plan or file content you provide is
                sent to our AI provider (Anthropic) solely to answer your request and is not used to train
                models — avoid including names, addresses or account numbers you would not want processed.
              </p>
              <p>
                We use privacy-conscious analytics (Microsoft Clarity) to understand how the site is used
                and improve it. No data is sold, ever.
              </p>
            </div>
          </footer>
          <CookieConsent enabled={CLARITY_ON} clarityId="x6cmyc53rf" />
        </Providers>
      </body>
    </html>
  );
}
