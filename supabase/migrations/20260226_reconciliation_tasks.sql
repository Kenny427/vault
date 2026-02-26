-- Reconciliation tasks: approval gate for external ledgers (e.g., DINK webhooks)
-- Safe to run multiple times.

create extension if not exists pgcrypto;

create table if not exists public.reconciliation_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'unknown',
  kind text not null default 'ge_event' check (kind in ('ge_event')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  payload jsonb not null default '{}'::jsonb,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reconciliation_tasks_user_status_time
  on public.reconciliation_tasks(user_id, status, created_at desc);

alter table public.reconciliation_tasks enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'reconciliation_tasks'
      and policyname = 'reconciliation_tasks_user_policy'
  ) then
    create policy reconciliation_tasks_user_policy on public.reconciliation_tasks
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end;
$$;
