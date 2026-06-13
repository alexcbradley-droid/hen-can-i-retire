'use client';

// Owner dashboard: sign-ins, saved plans, AI usage and estimated cost.
// Authorisation happens in the database (the admin_stats function rejects any
// caller whose verified JWT email is not the owner's), so this page is safe to
// ship publicly — it simply has nothing to show anyone else.

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { cloudClient } from '@/lib/cloud';
import { LIMITS } from '@/lib/limits';

interface Stats {
  signedInUsers: number;
  savedPlans: number;
  totals: { events: number; costUsd: number; uniqueCallers: number };
  byDay: { day: string; kind: string; events: number; cost_usd: number; callers: number }[];
  users: { email: string; plans: number; last_active: string }[];
}

export default function AdminPage() {
  const store = useStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!store.userEmail) return;
    const c = cloudClient();
    if (!c) { setError('Cloud features are not configured.'); return; }
    Promise.resolve(c.rpc('admin_stats')).then(({ data, error: e }) => {
      if (e) {
        // Distinguish "you are not the owner" from "the service is down".
        setError(/not authorised/i.test(e.message)
          ? 'Not authorised — this page is for the site owner.'
          : `Could not load stats (${e.message}). Try again in a minute.`);
      } else setStats(data as Stats);
    }).catch(() => setError('Could not reach the database. Try again in a minute.'));
  }, [store.userEmail]);

  if (!store.userEmail) {
    return (
      <main className="container" style={{ paddingTop: 24 }}>
        <h1>Admin</h1>
        <p className="muted">Sign in (top right) with the site owner account to view usage.</p>
      </main>
    );
  }
  if (error) {
    return <main className="container" style={{ paddingTop: 24 }}><h1>Admin</h1><p className="notice">{error}</p></main>;
  }
  if (!stats) {
    return <main className="container" style={{ paddingTop: 24 }}><h1>Admin</h1><p className="muted">Loading…</p></main>;
  }

  return (
    <main className="container" style={{ paddingTop: 24 }}>
      <h1>Admin</h1>
      <div className="tiles" style={{ marginBottom: 18 }}>
        <div className="tile"><div className="bar" /><div className="k">Signed-in users</div><div className="v">{stats.signedInUsers}</div><div className="sub">accounts with at least one saved plan</div></div>
        <div className="tile"><div className="bar" /><div className="k">Saved plans</div><div className="v">{stats.savedPlans}</div></div>
        <div className="tile"><div className="bar" /><div className="k">AI requests</div><div className="v">{stats.totals.events}</div><div className="sub">{stats.totals.uniqueCallers} unique callers</div></div>
        <div className="tile"><div className="bar" /><div className="k">Estimated AI cost</div><div className="v">${Number(stats.totals.costUsd).toFixed(2)}</div><div className="sub">since tracking began</div></div>
      </div>

      <div className="card">
        <h3>AI usage by day</h3>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Day</th><th>Feature</th><th>Requests</th><th>Unique callers</th><th>Est. cost</th></tr></thead>
            <tbody>
              {stats.byDay.map((r, i) => (
                <tr key={i}>
                  <td>{r.day}</td><td>{r.kind}</td><td>{r.events}</td><td>{r.callers}</td><td>${Number(r.cost_usd).toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>Users</h3>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Email</th><th>Saved plans</th><th>Last active</th></tr></thead>
            <tbody>
              {stats.users.map((u) => (
                <tr key={u.email}>
                  <td>{u.email}</td><td>{u.plans}</td>
                  <td>{new Date(u.last_active).toLocaleString('en-GB')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>Cost controls in place</h3>
        <ul className="small" style={{ lineHeight: 1.9 }}>
          <li><b>Per-caller daily limits</b> — {LIMITS.chatPerDay} chat messages and {LIMITS.interpretPerDay} spreadsheet imports per caller (hashed IP) per 24 hours, enforced in the database before any AI call is made.</li>
          <li><b>Payload caps</b> — chat history limited to {LIMITS.chatHistoryMessages} messages of {LIMITS.chatMessageChars.toLocaleString()} characters; spreadsheet content capped at {LIMITS.sheetTotalChars.toLocaleString()} characters; plan context capped at {LIMITS.chatContextChars.toLocaleString()} characters.</li>
          <li><b>Output caps</b> — chat replies max ~{LIMITS.chatMaxOutputTokens.toLocaleString()} tokens at low effort; the engine itself runs in the browser at no cost.</li>
          <li><b>Bots</b> — limits are per-IP-hash so a scripted client hits the daily cap quickly; for stronger protection enable Vercel&apos;s Bot Protection / Attack Challenge Mode (Project → Firewall), and set a monthly spend limit in the Anthropic console as a backstop.</li>
        </ul>
      </div>
    </main>
  );
}
