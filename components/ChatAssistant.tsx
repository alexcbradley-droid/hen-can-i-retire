'use client';

// Floating assistant, available on every page. It sees the active plan and its
// computed results, can explain how figures were derived, and can propose
// changes to the plan — applied only after the user confirms.

import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { Scenario } from '@/lib/engine/types';

interface Change { path: string; label: string; value: string | number | boolean }
interface Msg { role: 'user' | 'assistant'; content: string; changes?: Change[]; changesPlanId?: string }

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

// Segments that walk the prototype chain are never legitimate plan fields.
const FORBIDDEN_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

function applyChange(target: Scenario, path: string, value: unknown): boolean {
  if (!/^[a-zA-Z0-9_.[\]]+$/.test(path)) return false;
  const parts = path.split('.').flatMap((p) => p.split(/[[\]]/).filter(Boolean));
  if (!parts.length || !EDITABLE_ROOTS.has(parts[0])) return false;
  if (parts.some((p) => FORBIDDEN_SEGMENTS.has(p))) return false;
  let obj: unknown = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = /^\d+$/.test(parts[i]) ? Number(parts[i]) : parts[i];
    // Own properties only — `in` would match inherited keys and allow the
    // walk to escape the plan object (prototype pollution).
    if (obj === null || typeof obj !== 'object'
      || !Object.prototype.hasOwnProperty.call(obj, key)) return false;
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
  // Context memo: re-simulating is pointless while the plan hasn't changed.
  const contextRef = useRef<{ key: string; value: unknown } | null>(null);

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
      const key = `${store.active.id}:${store.active.updatedAt}`;
      let context: unknown;
      if (contextRef.current?.key === key) {
        context = contextRef.current.value;
      } else {
        // Engine loaded on demand so the marketing pages stay light.
        context = { scenario: store.active, metrics: null as unknown, warnings: [] as string[] };
        try {
          const { simulate } = await import('@/lib/engine/engine');
          const r = simulate(store.active);
          context = { scenario: store.active, metrics: r.metrics, warnings: r.warnings };
        } catch { /* a broken draft plan still gets scenario-only context */ }
        contextRef.current = { key, value: context };
      }
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
        changesPlanId: store.active.id,
      }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Sorry, I could not reach the assistant. Please try again.' }]);
    } finally {
      setBusy(false);
    }
  };

  const applyChanges = async (idx: number, changes: Change[], changesPlanId?: string) => {
    const finish = (note: string, clearCard: boolean) => {
      setMessages((m) => {
        const cleared = clearCard ? m.map((msg, i) => (i === idx ? { ...msg, changes: undefined } : msg)) : m;
        return [...cleared, { role: 'assistant' as const, content: note }];
      });
    };
    // The proposal was made against a specific plan — never apply it to another.
    if (changesPlanId && changesPlanId !== store.active.id) {
      finish(`These changes were proposed for a different plan. Switch back to that plan (My plans) to apply them, or ask again for “${store.active.name}”.`, false);
      return;
    }
    const copy: Scenario = JSON.parse(JSON.stringify(store.active));
    const failed: string[] = [];
    for (const c of changes) {
      if (!applyChange(copy, c.path, c.value)) failed.push(c.label || c.path);
    }
    if (failed.length === changes.length) {
      finish('I couldn’t apply those changes — the fields didn’t match your plan. Try the "Your details" tab, or ask me again more specifically.', true);
      return;
    }
    try {
      const { simulate } = await import('@/lib/engine/engine');
      simulate(copy); // sanity check: never apply a change that breaks the engine
    } catch {
      finish('Those changes would break the plan, so I have not applied them.', false);
      return;
    }
    copy.updatedAt = new Date().toISOString();
    store.replaceActive(copy);
    finish(
      failed.length
        ? `Applied, except: ${failed.join(', ')}. Check those on the "Your details" tab.`
        : 'Done — your plan has been updated. The results recalculate automatically.',
      true,
    );
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
                    <button className="btn small cta" onClick={() => void applyChanges(i, m.changes!, m.changesPlanId)}>Apply changes</button>
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
