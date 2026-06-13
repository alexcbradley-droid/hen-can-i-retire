import { Suspense } from 'react';
import ComparePage from '@/components/ComparePage';

export const metadata = { title: 'Compare plans — When Can I Retire?' };

export default function Compare() {
  return (
    <Suspense>
      <ComparePage />
    </Suspense>
  );
}
