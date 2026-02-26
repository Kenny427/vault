-- Add raw webhook storage for Dink events
-- Purpose: keep an immutable copy of incoming payloads for reconciliation/debugging.

create table if not exists public.webhook_raw_events (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  user_id uuid references auth.users(id) on delete set null,
  received_at timestamptz not null default now(),
  headers jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  process_error text
);

create index if not exists idx_webhook_raw_events_source_time on public.webhook_raw_events(source, received_at desc);
create index if not exists idx_webhook_raw_events_user_time on public.webhook_raw_events(user_id, received_at desc);

alter table public.webhook_raw_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'webhook_raw_events'
      and policyname = 'webhook_raw_events_user_policy'
  ) then
    create policy webhook_raw_events_user_policy on public.webhook_raw_events
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end;
$$;
