'use client';

import { useRef, useState } from 'react';

interface Msg { role: 'user' | 'assistant'; content: string }

export default function ChatWidget() {
  const [messages, setMessages] = useState<Msg[]>([{
    role: 'assistant',
    content: 'Hello! Ask me anything about using the planner — for example "where do I find my State Pension forecast?" or "what counts as a defined benefit pension?"',
  }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const send = async () => {
    const q = input.trim();
    if (!q || busy) return;
    const next: Msg[] = [...messages, { role: 'user', content: q }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.slice(-12) }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: 'assistant', content: data.reply || data.error || 'Sorry, something went wrong.' }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Sorry, I could not reach the assistant. Please try again.' }]);
    } finally {
      setBusy(false);
      setTimeout(() => logRef.current?.scrollTo({ top: 1e6, behavior: 'smooth' }), 50);
    }
  };

  return (
    <div className="chat-box card">
      <div className="chat-log" ref={logRef}>
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role === 'user' ? 'user' : 'bot'}`}>{m.content}</div>
        ))}
        {busy && <div className="chat-msg bot">Thinking…</div>}
      </div>
      <div className="chat-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          placeholder="Ask a question about the planner…"
          aria-label="Your question"
        />
        <button className="btn primary" onClick={send} disabled={busy}>Send</button>
      </div>
      <p className="small muted" style={{ margin: '8px 0 0' }}>
        Guidance only — the assistant cannot give financial advice or recommend products.
      </p>
    </div>
  );
}
