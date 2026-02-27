-- Ensure table privileges exist for API roles.
-- RLS still applies for anon/authenticated; service_role bypasses RLS but still needs table privileges.

begin;

-- Core roles
-- Note: Supabase always has: anon, authenticated, service_role

grant usage on schema public to anon, authenticated, service_role;

-- Read-only public data
grant select on table public.items to anon, authenticated;

-- User-scoped tables (RLS enforced)
grant select, insert, update, delete on table public.market_snapshots to authenticated;
grant select, insert, update, delete on table public.theses to authenticated;
grant select, insert, update, delete on table public.positions to authenticated;
grant select, insert, update, delete on table public.order_attempts to authenticated;
grant select, insert, update, delete on table public.alerts to authenticated;
grant select, insert, update, delete on table public.learning_events to authenticated;
grant select, insert, update, delete on table public.ge_events to authenticated;

-- Server/admin usage
grant all privileges on table public.items to service_role;
grant all privileges on table public.market_snapshots to service_role;
grant all privileges on table public.theses to service_role;
grant all privileges on table public.positions to service_role;
grant all privileges on table public.order_attempts to service_role;
grant all privileges on table public.alerts to service_role;
grant all privileges on table public.learning_events to service_role;
grant all privileges on table public.ge_events to service_role;

-- Optional tables added later (safe if they exist)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='osrs_wiki_latest_ingests') then
    execute 'grant select, insert, update, delete on table public.osrs_wiki_latest_ingests to authenticated';
    execute 'grant all privileges on table public.osrs_wiki_latest_ingests to service_role';
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='reconciliation_tasks') then
    execute 'grant select, insert, update, delete on table public.reconciliation_tasks to authenticated';
    execute 'grant all privileges on table public.reconciliation_tasks to service_role';
  end if;
end$$;

commit;
