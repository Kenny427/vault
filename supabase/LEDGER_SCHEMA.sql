-- Durable DINK ledger + thesis schema
-- Run in Supabase SQL editor

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS ge_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rsn TEXT,
  source TEXT NOT NULL DEFAULT 'dink',
  source_event_id TEXT NOT NULL,
  event_time TIMESTAMPTZ NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  item_id INTEGER,
  item_name TEXT,
  qty INTEGER,
  price_each INTEGER,
  total BIGINT GENERATED ALWAYS AS ((COALESCE(qty, 0)::BIGINT * COALESCE(price_each, 0)::BIGINT)) STORED,
  raw_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source, source_event_id)
);

CREATE TABLE IF NOT EXISTS theses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL,
  horizon TEXT,
  catalyst TEXT,
  entry_plan JSONB,
  exit_plan JSONB,
  invalidation JSONB,
  confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  engine TEXT NOT NULL,
  item_id INTEGER NOT NULL,
  horizon TEXT,
  score INTEGER,
  features JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS thesis_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
  evaluated_at TIMESTAMPTZ NOT NULL,
  paper_return_pct NUMERIC,
  max_drawdown_pct NUMERIC,
  did_hit_invalidation BOOLEAN,
  grade TEXT,
  notes TEXT
);

-- Map RSNs to users so webhooks can be attributed even when not authenticated
CREATE TABLE IF NOT EXISTS user_rsn_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rsn TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, rsn),
  UNIQUE (rsn)
);

-- Indexes for query patterns
CREATE INDEX IF NOT EXISTS idx_ge_events_user_time ON ge_events(user_id, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_ge_events_user_rsn_time ON ge_events(user_id, rsn, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_ge_events_user_item_time ON ge_events(user_id, item_id, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_ge_events_source_event ON ge_events(source, source_event_id);

CREATE INDEX IF NOT EXISTS idx_theses_user_status_created ON theses(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_theses_user_item_horizon ON theses(user_id, item_id, horizon);

CREATE INDEX IF NOT EXISTS idx_signals_user_created ON signals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_user_item_horizon_created ON signals(user_id, item_id, horizon, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_engine_item ON signals(engine, item_id);

CREATE INDEX IF NOT EXISTS idx_thesis_outcomes_thesis_eval ON thesis_outcomes(thesis_id, evaluated_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_rsn_accounts_user ON user_rsn_accounts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_rsn_accounts_rsn ON user_rsn_accounts(rsn);

-- Enable RLS
ALTER TABLE ge_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE theses ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE thesis_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rsn_accounts ENABLE ROW LEVEL SECURITY;

-- ge_events policies
DROP POLICY IF EXISTS "Users can select own ge_events" ON ge_events;
CREATE POLICY "Users can select own ge_events"
  ON ge_events FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own ge_events" ON ge_events;
CREATE POLICY "Users can insert own ge_events"
  ON ge_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own ge_events" ON ge_events;
CREATE POLICY "Users can update own ge_events"
  ON ge_events FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own ge_events" ON ge_events;
CREATE POLICY "Users can delete own ge_events"
  ON ge_events FOR DELETE
  USING (auth.uid() = user_id);

-- theses policies
DROP POLICY IF EXISTS "Users can select own theses" ON theses;
CREATE POLICY "Users can select own theses"
  ON theses FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own theses" ON theses;
CREATE POLICY "Users can insert own theses"
  ON theses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own theses" ON theses;
CREATE POLICY "Users can update own theses"
  ON theses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own theses" ON theses;
CREATE POLICY "Users can delete own theses"
  ON theses FOR DELETE
  USING (auth.uid() = user_id);

-- signals policies
DROP POLICY IF EXISTS "Users can select own signals" ON signals;
CREATE POLICY "Users can select own signals"
  ON signals FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own signals" ON signals;
CREATE POLICY "Users can insert own signals"
  ON signals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own signals" ON signals;
CREATE POLICY "Users can update own signals"
  ON signals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own signals" ON signals;
CREATE POLICY "Users can delete own signals"
  ON signals FOR DELETE
  USING (auth.uid() = user_id);

-- thesis_outcomes policies (scoped via parent thesis owner)
DROP POLICY IF EXISTS "Users can select own thesis outcomes" ON thesis_outcomes;
CREATE POLICY "Users can select own thesis outcomes"
  ON thesis_outcomes FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM theses t
      WHERE t.id = thesis_outcomes.thesis_id
      AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own thesis outcomes" ON thesis_outcomes;
CREATE POLICY "Users can insert own thesis outcomes"
  ON thesis_outcomes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM theses t
      WHERE t.id = thesis_outcomes.thesis_id
      AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own thesis outcomes" ON thesis_outcomes;
CREATE POLICY "Users can update own thesis outcomes"
  ON thesis_outcomes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM theses t
      WHERE t.id = thesis_outcomes.thesis_id
      AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM theses t
      WHERE t.id = thesis_outcomes.thesis_id
      AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own thesis outcomes" ON thesis_outcomes;
CREATE POLICY "Users can delete own thesis outcomes"
  ON thesis_outcomes FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM theses t
      WHERE t.id = thesis_outcomes.thesis_id
      AND t.user_id = auth.uid()
    )
  );

-- user_rsn_accounts policies
DROP POLICY IF EXISTS "Users can select own rsn accounts" ON user_rsn_accounts;
CREATE POLICY "Users can select own rsn accounts"
  ON user_rsn_accounts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own rsn accounts" ON user_rsn_accounts;
CREATE POLICY "Users can insert own rsn accounts"
  ON user_rsn_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own rsn accounts" ON user_rsn_accounts;
CREATE POLICY "Users can delete own rsn accounts"
  ON user_rsn_accounts FOR DELETE
  USING (auth.uid() = user_id);
