'use client';

// App-wide client providers: the scenario store (so every page and the
// floating assistant share the same plans) plus the assistant itself.
// The assistant is loaded lazily so the simulation engine it uses never
// weighs down the marketing pages' first load.

import dynamic from 'next/dynamic';
import { StoreProvider } from '@/lib/store';

const ChatAssistant = dynamic(() => import('./ChatAssistant'), { ssr: false });

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      {children}
      <ChatAssistant />
    </StoreProvider>
  );
}
