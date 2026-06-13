// Server-side usage logging + per-identity daily rate limits, backed by a
// Supabase RPC (see supabase-setup.sql). Identities are SHA-256 hashes of the
// caller's IP — raw addresses are never stored. Fails open if Supabase is
// unavailable so a telemetry outage can't take the AI features down, but a
// definite "over the limit" answer always blocks.

import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

export function callerIdentity(req: NextRequest): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  return createHash('sha256').update(`wcir:${ip}`).digest('hex').slice(0, 32);
}

export async function checkAndLogUsage(
  req: NextRequest,
  kind: 'chat' | 'interpret',
  estCostUsd: number,
  dailyLimit: number,
): Promise<{ allowed: boolean }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { allowed: true };
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await supabase.rpc('log_usage', {
      p_identity: callerIdentity(req),
      p_kind: kind,
      p_cost_usd: estCostUsd,
      p_daily_limit: dailyLimit,
    });
    if (error) {
      console.warn('usage logging unavailable:', error.message);
      return { allowed: true };
    }
    return { allowed: data === true };
  } catch (e) {
    console.warn('usage logging failed:', e);
    return { allowed: true };
  }
}
