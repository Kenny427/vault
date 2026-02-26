-- Add event_hash for idempotent ingest of external events (e.g. DINK webhook)

alter table if exists public.ge_events
  add column if not exists event_hash text;

create unique index if not exists ge_events_event_hash_uq
  on public.ge_events (event_hash)
  where event_hash is not null;

alter table if exists public.order_attempts
  add column if not exists event_hash text;

create unique index if not exists order_attempts_event_hash_uq
  on public.order_attempts (event_hash)
  where event_hash is not null;
