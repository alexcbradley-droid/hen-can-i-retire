'use client';

// Sign-in gates. When cloud accounts are available, some surfaces require the
// user to be signed in (Google) — this keeps automated clients off the paid
// AI upload and off data export, and is what the "My plans" / "Compare" pages
// use to require an account. When cloud is not configured the gates are
// inert, so the browser-only build behaves exactly as before.

import { useStore } from '@/lib/store';

/** Full-page gate: renders a sign-in prompt until the user is signed in. */
export function RequireSignIn({ title, blurb, children }: {
  title: string; blurb: string; children: React.ReactNode;
}) {
  const store = useStore();
  if (!store.loaded) {
    return <main className="container"><p className="muted" style={{ padding: 40 }}>Loading…</p></main>;
  }
  if (store.cloudOn && !store.userEmail) {
    return (
      <main className="container" style={{ paddingTop: 24 }}>
        <h1>{title}</h1>
        <div className="card" style={{ maxWidth: 540 }}>
          <p style={{ marginBottom: 14 }}>{blurb}</p>
          <button className="btn cta" onClick={store.signIn}>Sign up / in with Google</button>
          <p className="small muted" style={{ margin: '12px 0 0' }}>
            Free, takes a few seconds, and keeps your plans across devices.
          </p>
        </div>
      </main>
    );
  }
  return <>{children}</>;
}

/** For action buttons (download / upload) that should require sign-in. */
export function useSignInGate(): { gated: boolean; signIn: () => void } {
  const store = useStore();
  return { gated: store.cloudOn && !store.userEmail, signIn: store.signIn };
}
