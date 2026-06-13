-- Cloud save for "When can I retire?" — run this once in the Supabase SQL
-- editor (Dashboard → SQL Editor → New query → paste → Run).
-- Creates the per-user scenarios table with row-level security so each
-- signed-in user can only ever see and change their own plans.

create table if not exists public.scenarios (
  id text not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null default 'My plan',
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.scenarios enable row level security;

create policy "select own scenarios" on public.scenarios
  for select using (auth.uid() = user_id);
create policy "insert own scenarios" on public.scenarios
  for insert with check (auth.uid() = user_id);
create policy "update own scenarios" on public.scenarios
  for update using (auth.uid() = user_id);
create policy "delete own scenarios" on public.scenarios
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Usage telemetry + per-identity daily limits + admin stats (already applied
-- as migration "usage_tracking_and_admin"). Identities are SHA-256 hashes of
-- caller IPs; raw addresses are never stored.

create table if not exists public.usage_events (
  id bigint generated always as identity primary key,
  identity text not null,
  user_id uuid,
  kind text not null,
  cost_usd numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists usage_events_identity_kind_time
  on public.usage_events (identity, kind, created_at);

alter table public.usage_events enable row level security;
-- No direct policies: all reads/writes go through the security-definer
-- functions below, so anonymous callers can neither read nor tamper.

create or replace function public.log_usage(
  p_identity text, p_kind text, p_cost_usd numeric, p_daily_limit int
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  cnt int;
  total int;
  ceiling int;
begin
  if p_identity is null or length(p_identity) > 64
     or p_kind not in ('chat', 'interpret', 'signin') then
    return false;
  end if;
  -- The caller-supplied limit can only tighten the server-side ceiling, so a
  -- direct call with the public anon key cannot raise it.
  ceiling := least(coalesce(p_daily_limit, 0), case p_kind
    when 'chat' then 60
    when 'interpret' then 12
    else 20 end);
  if ceiling <= 0 then
    return false;
  end if;
  select count(*) into cnt from usage_events
    where identity = p_identity and kind = p_kind
      and created_at > now() - interval '24 hours';
  if cnt >= ceiling then
    return false;
  end if;
  -- Global per-identity cap bounds table growth from any single caller.
  select count(*) into total from usage_events
    where identity = p_identity and created_at > now() - interval '24 hours';
  if total >= 200 then
    return false;
  end if;
  insert into usage_events (identity, kind, cost_usd, user_id)
    values (p_identity, p_kind, least(greatest(p_cost_usd, 0), 2), auth.uid());
  return true;
end $$;

revoke all on function public.log_usage from public;
grant execute on function public.log_usage to anon, authenticated;

create or replace function public.admin_stats()
returns json
language plpgsql security definer set search_path = public as $$
declare result json;
begin
  -- Pinned to the owner's immutable user UUID as well as the email claim,
  -- so a forged/unverified email claim alone is never sufficient.
  if auth.uid() is distinct from '92e7e394-872c-42f5-ac69-d1d38ef953a4'::uuid
     or coalesce(auth.jwt() ->> 'email', '') <> 'alexcbradley@gmail.com' then
    raise exception 'not authorised';
  end if;
  select json_build_object(
    'signedInUsers', (select count(distinct user_id) from scenarios),
    'savedPlans', (select count(*) from scenarios),
    'totals', (select json_build_object(
        'events', count(*), 'costUsd', coalesce(sum(cost_usd), 0),
        'uniqueCallers', count(distinct identity))
      from usage_events),
    'byDay', (select coalesce(json_agg(t), '[]'::json) from (
        select date_trunc('day', created_at)::date as day, kind,
               count(*) as events, round(sum(cost_usd)::numeric, 4) as cost_usd,
               count(distinct identity) as callers
        from usage_events
        group by 1, 2 order by 1 desc, 2 limit 90) t),
    'users', (select coalesce(json_agg(t), '[]'::json) from (
        select u.email, count(s.id) as plans, max(s.updated_at) as last_active
        from scenarios s join auth.users u on u.id = s.user_id
        group by u.email order by max(s.updated_at) desc limit 100) t)
  ) into result;
  return result;
end $$;

revoke all on function public.admin_stats from public;
grant execute on function public.admin_stats to authenticated;
