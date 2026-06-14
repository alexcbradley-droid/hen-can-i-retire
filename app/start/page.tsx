import { Suspense } from 'react';
import QuickStart from '@/components/QuickStart';

export const metadata = {
  title: 'Quick start — When Can I Retire?',
  description: 'Answer six quick questions and see your earliest retirement date — then open the full free planner.',
  alternates: { canonical: '/start' },
};

export default function StartPage() {
  return (
    <Suspense>
      <QuickStart />
    </Suspense>
  );
}
