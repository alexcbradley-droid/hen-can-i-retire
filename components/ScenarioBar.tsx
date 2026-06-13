'use client';

import { useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { useSignInGate } from './Gate';
import { downloadFile, slugify } from '@/lib/download';

export default function ScenarioBar() {
  const store = useStore();
  const { gated, signIn } = useSignInGate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved-cloud' | 'saved-local' | 'failed'>('idle');

  const savePlan = async () => {
    setSaveState('saving');
    try {
      const cloud = await store.saveNow();
      // saveNow always writes locally; `cloud` is true only when the account
      // write demonstrably succeeded.
      setSaveState(cloud ? 'saved-cloud' : store.userEmail ? 'failed' : 'saved-local');
    } catch {
      setSaveState('failed');
    }
    setTimeout(() => setSaveState('idle'), 4000);
  };

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
        <button className="btn small cta" onClick={savePlan} disabled={saveState === 'saving'}
          title="Plans auto-save in this browser; sign in to keep them in your account too">
          {saveState === 'saving' ? 'Saving…'
            : saveState === 'saved-cloud' ? 'Saved to your account ✓'
            : saveState === 'saved-local' ? 'Saved in this browser ✓'
            : saveState === 'failed' ? 'Account save failed — saved locally'
            : 'Save plan'}
        </button>
        <button className="btn small" onClick={() => store.create('empty')}>New</button>
        <button className="btn small" onClick={() => store.duplicate()}>Duplicate</button>
        <button className="btn small" onClick={() => store.create('sample')}>Sample</button>
        <button className="btn small" onClick={gated ? signIn : exportFile}
          title={gated ? 'Sign in to download your plan' : 'Download this plan as a file'}>
          {gated ? 'Sign in to export' : 'Export'}
        </button>
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
