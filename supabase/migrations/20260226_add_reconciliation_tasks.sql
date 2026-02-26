-- Add reconciliation_tasks for DINK ledger mismatches / manual approval
-- Safe to run multiple times.

create extension if not exists pgcrypto;

create table if not exists public.reconciliation_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id bigint references public.items(item_id) on delete set null,
  item_name text,
  side text not null check (side in ('buy', 'sell')),
  quantity numeric not null,
  price numeric not null,
  occurred_at timestamptz,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'resolved')),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reconciliation_tasks_user_status_created
  on public.reconciliation_tasks(user_id, status, created_at desc);

alter table public.reconciliation_tasks enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'reconciliation_tasks'
      and policyname = 'reconciliation_tasks_user_policy'
  ) then
    create policy reconciliation_tasks_user_policy on public.reconciliation_tasks
      for all using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end;
$$;
