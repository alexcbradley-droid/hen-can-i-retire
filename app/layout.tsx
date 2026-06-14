import type { Metadata } from 'next';
import { Newsreader, Hanken_Grotesk, Spline_Sans_Mono } from 'next/font/google';
import Link from 'next/link';
import Script from 'next/script';
import Providers from '@/components/Providers';
import LogoMark from '@/components/Logo';
import SiteHeader from '@/components/SiteHeader';
import CookieConsent from '@/components/CookieConsent';
import './globals.css';

const serif = Newsreader({ subsets: ['latin'], weight: ['400', '500', '600'], display: 'swap', variable: '--font-serif', adjustFontFallback: false, fallback: ['Georgia', 'serif'] });
const sans = Hanken_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], display: 'swap', variable: '--font-sans' });
const mono = Spline_Sans_Mono({ subsets: ['latin'], weight: ['400', '500'], display: 'swap', variable: '--font-mono' });

const SITE_URL = 'https://whencaniretire.day';
const DESCRIPTION =
  'A free UK retirement planner: see your earliest retirement date and sustainable income in seconds, with real 2026/27 UK tax built in. No sign-up; your data stays in your browser.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'When Can I Retire? — UK retirement planner',
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  applicationName: 'When Can I Retire?',
  openGraph: {
    type: 'website', siteName: 'When Can I Retire?', locale: 'en_GB', url: '/',
    title: 'When Can I Retire? — UK retirement planner', description: DESCRIPTION,
  },
  twitter: { card: 'summary_large_image', title: 'When Can I Retire? — UK retirement planner', description: DESCRIPTION },
};

const ANALYTICS_ON = process.env.VERCEL_ENV === 'production';
const GA_ID = 'G-QM4TF66QYS';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        {ANALYTICS_ON && (
          <>
            <Script id="ga-consent-default" strategy="beforeInteractive">
              {`window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                window.gtag = gtag;
                gtag('consent', 'default', { ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied', analytics_storage:'denied' });
                try { if (localStorage.getItem('wcir-cookie-consent-v1') === 'granted') { gtag('consent','update',{ analytics_storage:'granted' }); } } catch (e) {}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');`}
            </Script>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          </>
        )}
        <Providers>
          <SiteHeader />
          {children}
          <footer className="site-footer no-print">
            <div className="footer-disclaimer">
              <div className="container">
                <span className="ico" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><path d="M12 9v4M12 17h.01" /></svg>
                </span>
                <p>
                  <b>This tool provides information and guidance only — it is not financial advice.</b> Projections
                  are estimates based on the figures and assumptions you provide and will differ from real
                  outcomes. The value of investments can go down as well as up. For free guidance see{' '}
                  <a href="https://www.moneyhelper.org.uk/en/getting-help-and-advice/financial-advisers" rel="noopener noreferrer" target="_blank">MoneyHelper</a>{' '}
                  or, if you are 50 or over,{' '}
                  <a href="https://www.moneyhelper.org.uk/en/pensions-and-retirement/pension-wise" rel="noopener noreferrer" target="_blank">Pension Wise</a>;
                  for regulated advice, an FCA-authorised adviser.
                </p>
              </div>
            </div>
            <div className="container">
              <div className="footer-grid">
                <div>
                  <Link href="/" className="brand" style={{ color: '#fff', marginBottom: 14 }}>
                    <LogoMark size={32} />
                    <span style={{ color: 'var(--gold)' }}>When can I retire?</span>
                  </Link>
                  <p style={{ color: '#9fb8ad', fontSize: '.92rem', maxWidth: '34ch' }}>
                    A free UK retirement planner. Your data stays in your browser.
                  </p>
                  <span className="recency"><span className="pulse" /> Tax year 2026/27 · last reviewed Jun 2026</span>
                </div>
                <div>
                  <h5>Plan</h5>
                  <Link href="/start">Start planning</Link>
                  <Link href="/plan?demo=1">Sample plan</Link>
                  <Link href="/plans">My plans</Link>
                  <Link href="/compare">Compare plans</Link>
                </div>
                <div>
                  <h5>Understand</h5>
                  <Link href="/methodology">Methodology &amp; sources</Link>
                  <Link href="/help">Help &amp; what to enter</Link>
                  <Link href="/about">About</Link>
                </div>
                <div>
                  <h5>Free UK guidance</h5>
                  <a href="https://www.moneyhelper.org.uk/" rel="noopener noreferrer" target="_blank">MoneyHelper ↗</a>
                  <a href="https://www.moneyhelper.org.uk/en/pensions-and-retirement/pension-wise" rel="noopener noreferrer" target="_blank">Pension Wise (50+) ↗</a>
                  <a href="https://www.gov.uk/check-state-pension" rel="noopener noreferrer" target="_blank">GOV.UK State Pension ↗</a>
                </div>
              </div>
              <div className="footer-bottom">
                <span>© 2026 When Can I Retire? · guidance, not financial advice</span>
                <span>
                  Privacy-conscious analytics, loaded only if you accept cookies. From the same maker:{' '}
                  <a href="https://truebricks.online" rel="noopener noreferrer" target="_blank">True Bricks</a> ·{' '}
                  <a href="https://aidailysignal.app" rel="noopener noreferrer" target="_blank">The AI Daily Signal</a>
                </span>
              </div>
            </div>
          </footer>
          <CookieConsent enabled={ANALYTICS_ON} clarityId="x6cmyc53rf" />
        </Providers>
      </body>
    </html>
  );
}
