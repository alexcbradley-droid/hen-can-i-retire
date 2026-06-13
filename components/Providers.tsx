'use client';

// App-wide client providers: the scenario store (so every page and the
// floating assistant share the same plans) plus the assistant itself.

import { StoreProvider } from '@/lib/store';
import ChatAssistant from './ChatAssistant';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      {children}
      <ChatAssistant />
    </StoreProvider>
  );
}
