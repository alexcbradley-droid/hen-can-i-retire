'use client';

import { useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { downloadFile, slugify } from '@/lib/download';

export default function ScenarioBar() {
  const store = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const exportFile = () => {
    downloadFile(`${slugify(store.active.name)}.json`, store.exportJson(), 'application/json');
  };

  return (
    <div className="card no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
      <select
        value={store.activeId}
        onChange={(e) => store.setActive(e.target.value)}
        style={{ width: 'auto', minWidth: 220, fontWeight: 600 }}
      >
        {store.scenarios.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <input
        type="text"
        value={store.active.name}
        onChange={(e) => store.update((d) => { d.name = e.target.value; })}
        style={{ width: 'auto', flex: '1 1 160px' }}
        aria-label="Scenario name"
      />
      <div className="btn-row">
        <button className="btn small" onClick={() => store.create('empty')}>New</button>
        <button className="btn small" onClick={() => store.duplicate()}>Duplicate</button>
        <button className="btn small" onClick={() => store.create('sample')}>Sample</button>
        <button className="btn small" onClick={exportFile}>Export</button>
        <button className="btn small" onClick={() => fileRef.current?.click()}>Import</button>
        {!confirmDelete ? (
          <button className="btn small danger" onClick={() => setConfirmDelete(true)}>Delete</button>
        ) : (
          <>
            <button className="btn small danger" onClick={() => { store.remove(); setConfirmDelete(false); }}>Confirm delete</button>
            <button className="btn small" onClick={() => setConfirmDelete(false)}>Cancel</button>
          </>
        )}
      </div>
      <input
        ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) setError(store.importJson(await f.text()));
          e.target.value = '';
        }}
      />
      {error && <span className="pill bad">{error}</span>}
      {store.cloudOn && (
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 8, alignItems: 'center' }}>
          {store.userEmail ? (
            <>
              <span className="pill good">Saved to your account · {store.userEmail}</span>
              <button className="btn small" onClick={store.signOutUser}>Sign out</button>
            </>
          ) : (
            <button className="btn small" onClick={store.signIn} title="Keep your plans across devices">
              Sign in with Google to save
            </button>
          )}
        </span>
      )}
    </div>
  );
}
