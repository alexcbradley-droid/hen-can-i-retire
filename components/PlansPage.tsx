'use client';

// My plans: find, recall, duplicate, export and delete saved plans.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { downloadFile, slugify } from '@/lib/download';
import { ymLabel } from '@/lib/format';

export default function PlansPage() {
  const store = useStore();
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (!store.loaded) {
    return <main className="container"><p className="muted" style={{ padding: 40 }}>Loading your plans…</p></main>;
  }

  const open = (id: string) => {
    store.setActive(id);
    router.push('/plan');
  };

  return (
    <main className="container" style={{ paddingTop: 24 }}>
      <div className="panel-title">
        <h1>My plans</h1>
        <span className="hint">
          {store.userEmail
            ? `Saved to your account (${store.userEmail}) and this browser.`
            : 'Saved in this browser. Sign in (top right) to keep them in your account across devices.'}
        </span>
      </div>
      <div className="btn-row" style={{ marginBottom: 16 }}>
        <button className="btn cta" onClick={() => { store.create('empty'); router.push('/plan'); }}>+ New plan</button>
        <button className="btn" onClick={() => { store.openSample(); router.push('/plan'); }}>Open the sample household</button>
      </div>
      <div className="plans-grid">
        {store.scenarios.map((s) => {
          const retire = s.employments[0]?.retirementDate;
          return (
            <div key={s.id} className={`card ${s.id === store.activeId ? 'active-plan' : ''}`}>
              <h3 style={{ marginBottom: 2 }}>{s.name}{s.id === store.activeId ? ' ' : ''}{s.id === store.activeId && <span className="pill">current</span>}</h3>
              <p className="small muted" style={{ margin: 0 }}>
                {s.people.map((p) => p.name).filter(Boolean).join(' & ') || 'No people yet'}
                {retire ? ` · retiring ${ymLabel(retire)}` : ''}
              </p>
              <p className="small muted" style={{ margin: 0 }}>
                Last edited {new Date(s.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              <div className="btn-row" style={{ marginTop: 'auto', paddingTop: 10 }}>
                <button className="btn small primary" onClick={() => open(s.id)}>Open</button>
                <button className="btn small" onClick={() => store.duplicate(s.id)}>Duplicate</button>
                <button className="btn small" onClick={() => downloadFile(`${slugify(s.name)}.json`, JSON.stringify(s, null, 2), 'application/json')}>Export</button>
                {confirmDelete === s.id ? (
                  <>
                    <button className="btn small danger" onClick={() => { store.remove(s.id); setConfirmDelete(null); }}>Confirm</button>
                    <button className="btn small" onClick={() => setConfirmDelete(null)}>Cancel</button>
                  </>
                ) : (
                  <button className="btn small danger" onClick={() => setConfirmDelete(s.id)}>Delete</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="small muted" style={{ marginTop: 18 }}>
        Compare plans side by side on the <a href="/compare">Compare page</a>, or in the planner&apos;s Compare tab.
      </p>
    </main>
  );
}
