-- Reconciliation tasks for ingest events that require manual approval
-- Safe to run multiple times.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'reconciliation_tasks'
  ) then
    create table public.reconciliation_tasks (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id) on delete cascade,
      source text not null default 'unknown',
      order_attempt_id uuid references public.order_attempts(id) on delete set null,
      ge_event_id uuid references public.ge_events(id) on delete set null,
      status text not null default 'pending' check (status in ('pending','approved','rejected')),
      payload jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      decided_at timestamptz,
      decided_by uuid references auth.users(id) on delete set null,
      decision_notes text
    );

    create index idx_reconciliation_tasks_user_created on public.reconciliation_tasks(user_id, created_at desc);
    create index idx_reconciliation_tasks_status on public.reconciliation_tasks(status, created_at desc);
  end if;
end;
$$;

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
    create policy reconciliation_tasks_user_policy
      on public.reconciliation_tasks
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end;
$$;
