'use client';

// Optional cloud sync: Google sign-in via Supabase with scenarios saved per
// user. Entirely optional — when the two NEXT_PUBLIC_SUPABASE_* variables are
// absent the planner runs exactly as before, browser-only.

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { Scenario } from './engine/types';

let client: SupabaseClient | null | undefined;

export function cloudClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createClient(url, key) : null;
  return client;
}

export function cloudEnabled(): boolean {
  return cloudClient() !== null;
}

export async function signInWithGoogle(): Promise<void> {
  await cloudClient()?.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href },
  });
}

export async function signOut(): Promise<void> {
  await cloudClient()?.auth.signOut();
}

/** Subscribe to auth state; fires immediately with the current user. */
export function onAuthChange(cb: (user: User | null) => void): () => void {
  const c = cloudClient();
  if (!c) return () => {};
  c.auth.getSession().then(({ data }) => cb(data.session?.user ?? null));
  const { data } = c.auth.onAuthStateChange((_event, session) => cb(session?.user ?? null));
  return () => data.subscription.unsubscribe();
}

export async function fetchCloudScenarios(): Promise<Scenario[]> {
  const c = cloudClient();
  if (!c) return [];
  const { data, error } = await c.from('scenarios').select('data');
  if (error || !data) return [];
  return data
    .map((row) => row.data as Scenario)
    .filter((s) => s && s.people?.length && s.spending && s.assumptions);
}

/** True only when the row demonstrably reached the account. */
export async function upsertCloudScenario(s: Scenario): Promise<boolean> {
  const c = cloudClient();
  if (!c) return false;
  const { data: auth } = await c.auth.getSession();
  const userId = auth.session?.user.id;
  if (!userId) return false;
  const { error } = await c.from('scenarios').upsert(
    { id: s.id, user_id: userId, name: s.name, data: s, updated_at: s.updatedAt },
    { onConflict: 'user_id,id' },
  );
  if (error) console.warn('cloud save failed:', error.message);
  return !error;
}

export async function deleteCloudScenario(id: string): Promise<void> {
  await cloudClient()?.from('scenarios').delete().eq('id', id);
}
