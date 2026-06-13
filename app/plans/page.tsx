import { Suspense } from 'react';
import PlansPage from '@/components/PlansPage';

export const metadata = { title: 'My plans — When Can I Retire?' };

export default function Plans() {
  return (
    <Suspense>
      <PlansPage />
    </Suspense>
  );
}
