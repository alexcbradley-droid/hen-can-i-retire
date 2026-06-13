'use client';

// Floating assistant, available on every page. It sees the active plan and its
// computed results, can explain how figures were derived, and can propose
// changes to the plan — applied only after the user confirms.

import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { simulate } from '@/lib/engine/engine';
import { Scenario } from '@/lib/engine/types';

interface Change { path: string; label: string; value: string | number | boolean }
interface Msg { role: 'user' | 'assistant'; content: string; changes?: Change[] }

const STARTERS = [
  'When can I retire?',
  'How is "net worth at retirement" calculated?',
  'What does sustainable income mean?',
  'Set my retirement spending to £2,500/month',
];

// Only these top-level parts of a plan may be edited by the assistant.
const EDITABLE_ROOTS = new Set([
  'name', 'people', 'employments', 'dcPensions', 'dbPensions', 'statePensions',
  'accounts', 'properties', 'events', 'spending', 'assumptions', 'goals',
]);

function applyChange(target: Scenario, path: string, value: unknown): boolean {
  if (!/^[a-zA-Z0-9_.[\]]+$/.test(path)) return false;
  const parts = path.split('.').flatMap((p) => p.split(/[[\]]/).filter(Boolean));
  if (!parts.length || !EDITABLE_ROOTS.has(parts[0])) return false;
  let obj: unknown = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = /^\d+$/.test(parts[i]) ? Number(parts[i]) : parts[i];
    if (obj === null || typeof obj !== 'object' || !(key in (obj as object))) return false;
    obj = (obj as Record<string | number, unknown>)[key as string | number];
  }
  if (obj === null || typeof obj !== 'object') return false;
  const last = /^\d+$/.test(parts[parts.length - 1]) ? Number(parts[parts.length - 1]) : parts[parts.length - 1];
  (obj as Record<string | number, unknown>)[last as string | number] = value;
  return true;
}

export default function ChatAssistant() {
  const store = useStore();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([{
    role: 'assistant',
    content: 'Hi! I can see your current plan and its results, explain how any figure was calculated, and make changes for you (with your confirmation). What would you like to know?',
  }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: 1e6, behavior: 'smooth' });
  }, [messages, busy, open]);

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    const next: Msg[] = [...messages, { role: 'user', content: q }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      let context: unknown = null;
      try {
        const r = simulate(store.active);
        context = { scenario: store.active, metrics: r.metrics, warnings: r.warnings };
      } catch { /* a broken draft plan should not break chat */ }
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.slice(-12).map(({ role, content }) => ({ role, content })),
          context,
        }),
      });
      const data = await res.json();
      setMessages((m) => [...m, {
        role: 'assistant',
        content: data.reply || data.error || 'Sorry, something went wrong.',
        changes: Array.isArray(data.changes) && data.changes.length ? data.changes : undefined,
      }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Sorry, I could not reach the assistant. Please try again.' }]);
    } finally {
      setBusy(false);
    }
  };

  const applyChanges = (idx: number, changes: Change[]) => {
    const copy: Scenario = JSON.parse(JSON.stringify(store.active));
    const failed: string[] = [];
    for (const c of changes) {
      if (!applyChange(copy, c.path, c.value)) failed.push(c.label || c.path);
    }
    try {
      simulate(copy); // sanity check: never apply a change that breaks the engine
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Those changes would break the plan, so I have not applied them.' }]);
      return;
    }
    copy.updatedAt = new Date().toISOString();
    store.replaceActive(copy);
    setMessages((m) => m.map((msg, i) => (i === idx ? { ...msg, changes: undefined } : msg)));
    setMessages((m) => [...m, {
      role: 'assistant',
      content: failed.length
        ? `Applied, except: ${failed.join(', ')}. Check those on the "Your details" tab.`
        : 'Done — your plan has been updated. The results recalculate automatically.',
    }]);
  };

  const dismissChanges = (idx: number) => {
    setMessages((m) => m.map((msg, i) => (i === idx ? { ...msg, changes: undefined } : msg)));
  };

  if (!open) {
    return (
      <button className="chat-fab no-print" onClick={() => setOpen(true)} aria-label="Open the planner assistant">
        💬 Ask the assistant
      </button>
    );
  }

  return (
    <div className="chat-panel no-print" role="dialog" aria-label="Planner assistant">
      <div className="chat-panel-head">
        <b>Planner assistant</b>
        <button onClick={() => setOpen(false)} aria-label="Close assistant">✕</button>
      </div>
      <div className="chat-panel-body">
        <div className="chat-log" ref={logRef}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'contents' }}>
              <div className={`chat-msg ${m.role === 'user' ? 'user' : 'bot'}`}>{m.content}</div>
              {m.changes && (
                <div className="chat-changes">
                  <b>Proposed changes to “{store.active.name}”</b>
                  <ul>
                    {m.changes.map((c, j) => <li key={j}>{c.label || c.path}: <b>{String(c.value)}</b></li>)}
                  </ul>
                  <div className="btn-row">
                    <button className="btn small cta" onClick={() => applyChanges(i, m.changes!)}>Apply changes</button>
                    <button className="btn small" onClick={() => dismissChanges(i)}>Dismiss</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {busy && <div className="chat-msg bot">Thinking…</div>}
        </div>
        {messages.length <= 1 && (
          <div className="chat-chips">
            {STARTERS.map((sQ) => <button key={sQ} onClick={() => send(sQ)}>{sQ}</button>)}
          </div>
        )}
        <div className="chat-input">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
            placeholder="Ask about your plan…"
            aria-label="Your question"
          />
          <button className="btn primary" onClick={() => send()} disabled={busy}>Send</button>
        </div>
        <p className="small muted" style={{ margin: '6px 0 0' }}>
          Guidance only, not financial advice. Your plan data is sent to the AI service to answer.
        </p>
      </div>
    </div>
  );
}
