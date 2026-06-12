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
