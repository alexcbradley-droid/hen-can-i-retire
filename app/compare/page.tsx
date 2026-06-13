import { Suspense } from 'react';
import ComparePage from '@/components/ComparePage';
import { RequireSignIn } from '@/components/Gate';

export const metadata = { title: 'Compare plans — When Can I Retire?' };

export default function Compare() {
  return (
    <Suspense>
      <RequireSignIn
        title="Compare plans"
        blurb="Sign in to compare your saved plans side by side and download a comparison report."
      >
        <ComparePage />
      </RequireSignIn>
    </Suspense>
  );
}
