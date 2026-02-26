-- Passive Copilot MVP schema
-- Safe to run multiple times.

create extension if not exists pgcrypto;

create table if not exists public.items (
  item_id bigint primary key,
  name text not null,
  examine text,
  buy_limit integer,
  alch_value bigint,
  members boolean,
  updated_at timestamptz not null default now()
);

create table if not exists public.market_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id bigint not null references public.items(item_id) on delete cascade,
  last_price numeric,
  last_high numeric,
  last_low numeric,
  price_5m_high numeric,
  price_5m_low numeric,
  price_1h_high numeric,
  price_1h_low numeric,
  margin numeric,
  volume_5m numeric,
  volume_1h numeric,
  snapshot_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, item_id)
);

create table if not exists public.theses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id bigint not null references public.items(item_id) on delete cascade,
  item_name text not null,
  target_buy numeric,
  target_sell numeric,
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id bigint not null references public.items(item_id) on delete cascade,
  item_name text not null,
  quantity numeric not null default 0,
  avg_buy_price numeric not null default 0,
  last_price numeric,
  realized_profit numeric not null default 0,
  unrealized_profit numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, item_id)
);

create table if not exists public.order_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id bigint not null references public.items(item_id) on delete cascade,
  item_name text,
  side text not null check (side in ('buy', 'sell')),
  quantity numeric not null,
  price numeric not null,
  status text not null default 'open',
  source text not null default 'manual',
  placed_at timestamptz,
  created_at timestamptz not null default now(),
  event_hash text,
  raw_payload jsonb
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id bigint references public.items(item_id) on delete set null,
  severity text not null default 'medium' check (severity in ('high', 'medium', 'low')),
  title text not null,
  message text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.learning_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ge_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  profile_id text,
  rsn text,
  item_id bigint references public.items(item_id) on delete set null,
  item_name text,
  quantity numeric,
  price numeric,
  side text,
  status text,
  occurred_at timestamptz,
  created_at timestamptz not null default now(),
  event_hash text,
  raw_payload jsonb not null default '{}'::jsonb
);

create index if not exists idx_market_snapshots_user_item on public.market_snapshots(user_id, item_id);
create index if not exists idx_positions_user_item on public.positions(user_id, item_id);
create index if not exists idx_theses_user_active on public.theses(user_id, active);
create index if not exists idx_order_attempts_user_created on public.order_attempts(user_id, created_at desc);
create index if not exists idx_alerts_user_resolved on public.alerts(user_id, resolved_at);
create index if not exists idx_ge_events_user_time on public.ge_events(user_id, occurred_at desc);
create unique index if not exists ge_events_event_hash_uq on public.ge_events(event_hash) where event_hash is not null;
create unique index if not exists order_attempts_event_hash_uq on public.order_attempts(event_hash) where event_hash is not null;

alter table public.market_snapshots enable row level security;
alter table public.theses enable row level security;
alter table public.positions enable row level security;
alter table public.order_attempts enable row level security;
alter table public.alerts enable row level security;
alter table public.learning_events enable row level security;
alter table public.ge_events enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'market_snapshots' and policyname = 'market_snapshots_user_policy') then
    create policy market_snapshots_user_policy on public.market_snapshots
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'theses' and policyname = 'theses_user_policy') then
    create policy theses_user_policy on public.theses
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'positions' and policyname = 'positions_user_policy') then
    create policy positions_user_policy on public.positions
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'order_attempts' and policyname = 'order_attempts_user_policy') then
    create policy order_attempts_user_policy on public.order_attempts
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'alerts' and policyname = 'alerts_user_policy') then
    create policy alerts_user_policy on public.alerts
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'learning_events' and policyname = 'learning_events_user_policy') then
    create policy learning_events_user_policy on public.learning_events
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ge_events' and policyname = 'ge_events_user_policy') then
    create policy ge_events_user_policy on public.ge_events
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end;
$$;
