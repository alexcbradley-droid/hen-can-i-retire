'use client';

// Scenario store: all plans live in the browser (localStorage), with JSON
// export/import for backup and moving between devices.

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Scenario } from './engine/types';
import { emptyScenario, sampleScenario, uid, SAMPLE_SCENARIO_NAME } from './engine/defaults';
import {
  cloudEnabled, onAuthChange, signInWithGoogle, signOut,
  fetchCloudScenarios, upsertCloudScenario, deleteCloudScenario,
} from './cloud';

const STORAGE_KEY = 'wcir-scenarios-v1';

interface StoreShape {
  scenarios: Scenario[];
  activeId: string;
  active: Scenario;
  setActive: (id: string) => void;
  update: (mutate: (draft: Scenario) => void) => void;
  replaceActive: (scenario: Scenario) => void;
  create: (kind: 'empty' | 'sample') => void;
  duplicate: (id?: string) => void;
  remove: (id?: string) => void;
  importJson: (text: string) => string | null; // returns error message or null
  exportJson: () => string;
  /** Persist immediately (local + cloud when signed in). True if saved to the account. */
  saveNow: () => Promise<boolean>;
  /** Open the sample household, creating it if needed. */
  openSample: () => void;
  loaded: boolean;
  // Optional cloud account (Google sign-in via Supabase)
  cloudOn: boolean;
  userEmail: string | null;
  signIn: () => void;
  signOutUser: () => void;
}

const Ctx = createContext<StoreShape | null>(null);

export function useStore(): StoreShape {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside provider');
  return v;
}

export function StoreProvider({ children, startWithDemo }: { children: React.ReactNode; startWithDemo?: boolean }) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeId, setActiveId] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Scenarios edited since load — only these are auto-uploaded, so merely
  // visiting a page never writes an untouched empty plan to the account.
  const dirtyIds = useRef(new Set<string>());

  useEffect(() => onAuthChange((u) => {
    setUserEmail(u?.email ?? null);
    setUserId(u?.id ?? null);
  }), []);

  // On sign-in: merge cloud scenarios with local ones (newer edit wins per
  // scenario) and upload anything the account doesn't have yet.
  useEffect(() => {
    if (!userId || !loaded) return;
    let cancelled = false;
    fetchCloudScenarios().then((cloud) => {
      if (cancelled) return;
      setScenarios((local) => {
        const byId = new Map(local.map((s) => [s.id, s]));
        for (const cs of cloud) {
          const ls = byId.get(cs.id);
          if (!ls || cs.updatedAt > ls.updatedAt) byId.set(cs.id, cs);
        }
        const merged = Array.from(byId.values());
        const cloudById = new Map(cloud.map((s) => [s.id, s]));
        for (const s of merged) {
          const cs = cloudById.get(s.id);
          const hasContent = s.employments.length + s.accounts.length + s.dcPensions.length
            + s.dbPensions.length + s.properties.length > 0;
          if ((!cs || cs.updatedAt < s.updatedAt) && hasContent) void upsertCloudScenario(s);
        }
        return merged;
      });
    });
    return () => { cancelled = true; };
  }, [userId, loaded]);

  useEffect(() => {
    let list: Scenario[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.scenarios)) list = parsed.scenarios;
        if (parsed.activeId) setActiveId(parsed.activeId);
      }
    } catch { /* corrupted storage: start fresh */ }
    if (!list.length) {
      list = startWithDemo ? [sampleScenario()] : [emptyScenario()];
    } else if (startWithDemo && !list.some((s) => s.name === SAMPLE_SCENARIO_NAME)) {
      list = [...list, sampleScenario()];
    }
    setScenarios(list);
    setActiveId((prev) => {
      if (startWithDemo) {
        // The demo link should open the sample household specifically.
        const sample = list.find((s) => s.name === SAMPLE_SCENARIO_NAME);
        if (sample) return sample.id;
      }
      return prev && list.some((s) => s.id === prev) ? prev : list[list.length - 1].id;
    });
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ scenarios, activeId })); } catch { /* quota */ }
      if (userId && dirtyIds.current.has(activeId)) {
        const current = scenarios.find((s) => s.id === activeId);
        if (current) {
          void upsertCloudScenario(current).then((ok) => { if (ok) dirtyIds.current.delete(current.id); });
        }
      }
    }, 400);
  }, [scenarios, activeId, loaded, userId]);

  const active = useMemo(
    () => scenarios.find((s) => s.id === activeId) ?? scenarios[0] ?? emptyScenario(),
    [scenarios, activeId],
  );

  const api: StoreShape = {
    scenarios,
    activeId: active.id,
    active,
    loaded,
    setActive: setActiveId,
    update: (mutate) => {
      dirtyIds.current.add(active.id);
      setScenarios((prev) => prev.map((s) => {
        if (s.id !== active.id) return s;
        const draft: Scenario = JSON.parse(JSON.stringify(s));
        mutate(draft);
        draft.updatedAt = new Date().toISOString();
        return draft;
      }));
    },
    replaceActive: (scenario) => {
      dirtyIds.current.add(active.id);
      setScenarios((prev) => prev.map((s) => (s.id === active.id ? { ...scenario, id: active.id } : s)));
    },
    create: (kind) => {
      const s = kind === 'sample' ? sampleScenario() : emptyScenario(`Plan ${scenarios.length + 1}`);
      setScenarios((prev) => [...prev, s]);
      setActiveId(s.id);
    },
    duplicate: (id) => {
      const src = scenarios.find((s) => s.id === id) ?? active;
      const copy: Scenario = JSON.parse(JSON.stringify(src));
      copy.id = uid('scn');
      copy.name = `${src.name} (copy)`;
      copy.createdAt = new Date().toISOString();
      dirtyIds.current.add(copy.id);
      setScenarios((prev) => [...prev, copy]);
      setActiveId(copy.id);
    },
    remove: (id) => {
      const targetId = id ?? active.id;
      if (userId) void deleteCloudScenario(targetId);
      setScenarios((prev) => {
        const rest = prev.filter((s) => s.id !== targetId);
        const next = rest.length ? rest : [emptyScenario()];
        setActiveId((cur) => (cur === targetId || !rest.length ? next[next.length - 1].id : cur));
        return next;
      });
    },
    importJson: (text) => {
      try {
        const parsed = JSON.parse(text);
        const raw: Scenario[] = Array.isArray(parsed) ? parsed : [parsed];
        const list: Scenario[] = [];
        for (const s of raw) {
          if (!s.people?.length || !s.spending || !s.assumptions) return 'That file does not look like an exported plan.';
          // Merge onto a fresh scenario so a partial/older export can never
          // leave undefined arrays behind that crash the engine or UI.
          const base = emptyScenario(s.name || 'Imported plan');
          list.push({
            ...base,
            ...s,
            id: uid('scn'),
            employments: s.employments ?? [],
            dcPensions: s.dcPensions ?? [],
            dbPensions: s.dbPensions ?? [],
            statePensions: s.statePensions ?? [],
            accounts: s.accounts ?? [],
            properties: s.properties ?? [],
            events: s.events ?? [],
            goals: s.goals ?? {},
            spending: { ...base.spending, ...s.spending, oneOffs: s.spending.oneOffs ?? [] },
            assumptions: { ...base.assumptions, ...s.assumptions },
          });
        }
        for (const s of list) dirtyIds.current.add(s.id);
        setScenarios((prev) => [...prev, ...list]);
        setActiveId(list[list.length - 1].id);
        return null;
      } catch {
        return 'Could not read that file — it should be a JSON export from this planner.';
      }
    },
    exportJson: () => JSON.stringify(active, null, 2),
    saveNow: async () => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ scenarios, activeId: active.id })); } catch { /* quota */ }
      if (!userId) return false;
      const ok = await upsertCloudScenario(active);
      if (ok) dirtyIds.current.delete(active.id);
      return ok;
    },
    openSample: () => {
      // Functional update so a double invocation (StrictMode) or a stale
      // closure can never create two samples.
      setScenarios((prev) => {
        const existing = prev.find((s) => s.name === SAMPLE_SCENARIO_NAME);
        if (existing) {
          setActiveId(existing.id);
          return prev;
        }
        const s = sampleScenario();
        dirtyIds.current.add(s.id);
        setActiveId(s.id);
        return [...prev, s];
      });
    },
    cloudOn: cloudEnabled(),
    userEmail,
    signIn: () => { void signInWithGoogle(); },
    signOutUser: () => { void signOut(); },
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
