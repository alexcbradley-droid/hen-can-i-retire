import { Suspense } from 'react';
import AdminPage from '@/components/AdminPage';

export const metadata = { title: 'Admin — When Can I Retire?', robots: { index: false } };

export default function Admin() {
  return (
    <Suspense>
      <AdminPage />
    </Suspense>
  );
}
