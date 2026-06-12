import { Suspense } from 'react';
import PlanApp from '@/components/PlanApp';

export const metadata = { title: 'Planner — When Can I Retire?' };

export default function PlanPage({ searchParams }: { searchParams: { demo?: string } }) {
  return (
    <Suspense>
      <PlanApp startWithDemo={searchParams?.demo === '1'} />
    </Suspense>
  );
}
