'use client';

// PECR-compliant cookie consent. The Microsoft Clarity analytics tag — the
// only non-essential cookie source on the site — is not loaded until the
// visitor explicitly accepts. The choice is remembered in localStorage.
// Functional storage (saved plans, sign-in) is first-party and essential, so
// it is not gated here.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';

const KEY = 'wcir-cookie-consent-v1';
type Consent = 'granted' | 'denied';

export default function CookieConsent({ enabled, clarityId }: { enabled: boolean; clarityId: string }) {
  // undefined = still reading; null = no choice yet (show banner)
  const [consent, setConsent] = useState<Consent | null | undefined>(undefined);

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      setConsent(v === 'granted' || v === 'denied' ? v : null);
    } catch {
      setConsent(null);
    }
  }, []);

  // Analytics only exists on the production deployment; nothing to consent to
  // (or load) anywhere else.
  if (!enabled) return null;

  const choose = (v: Consent) => {
    try { localStorage.setItem(KEY, v); } catch { /* private mode */ }
    setConsent(v);
  };

  return (
    <>
      {consent === 'granted' && (
        <Script id="ms-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window,document,"clarity","script","${clarityId}");`}
        </Script>
      )}
      {consent === null && (
        <div className="cookie-banner no-print" role="dialog" aria-label="Cookie choices">
          <p>
            We&apos;d like to use privacy-conscious analytics (Microsoft Clarity) to see how the planner
            is used and improve it. It sets cookies only if you accept. Essential features — saving your
            plans and signing in — work either way. See the <Link href="/about">About page</Link>.
          </p>
          <div className="btn-row" style={{ flexWrap: 'nowrap' }}>
            <button className="btn small cta" onClick={() => choose('granted')}>Accept</button>
            <button className="btn small cookie-reject" onClick={() => choose('denied')}>Reject</button>
          </div>
        </div>
      )}
    </>
  );
}
