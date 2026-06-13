// Server-side verification of a Supabase session token. Used to gate the
// expensive AI upload endpoint to signed-in (Google-authenticated) humans,
// which keeps automated clients off the paid AI feature.

import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

export function cloudConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Returns the verified user, or null if the bearer token is missing/invalid. */
export async function verifyUser(req: NextRequest): Promise<{ id: string; email: string | null } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const header = req.headers.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    // getUser validates the JWT signature and expiry against Supabase, so a
    // forged or expired token is rejected here.
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  } catch {
    return null;
  }
}
