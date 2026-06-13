import { Suspense } from 'react';
import PlansPage from '@/components/PlansPage';
import { RequireSignIn } from '@/components/Gate';

export const metadata = { title: 'My plans — When Can I Retire?' };

export default function Plans() {
  return (
    <Suspense>
      <RequireSignIn
        title="My plans"
        blurb="Sign in to see and manage the plans saved to your account, on any device."
      >
        <PlansPage />
      </RequireSignIn>
    </Suspense>
  );
}
