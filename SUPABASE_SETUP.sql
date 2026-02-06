-- Run this SQL in your Supabase SQL Editor to complete the setup
-- This ensures all tables are properly configured for account-based data persistence

-- 1. Verify user_profiles has RSN column
ALTER TABLE IF EXISTS user_profiles 
ADD COLUMN IF NOT EXISTS rsn TEXT UNIQUE;

-- 2. Create analyses table if not exists (for cached alpha feed)
CREATE TABLE IF NOT EXISTS analyses (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- 3. Ensure all tables have proper indexes for user_id queries
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_items_user_id ON portfolio_items(user_id);
CREATE INDEX IF NOT EXISTS idx_item_notes_user_id ON item_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_transactions_user_id ON pending_transactions(user_id);

-- 4. Enable RLS on analyses if not already enabled
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for analyses table
DROP POLICY IF EXISTS "Users can view their own analyses" ON analyses;
CREATE POLICY "Users can view their own analyses"
  ON analyses FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own analyses" ON analyses;
CREATE POLICY "Users can insert their own analyses"
  ON analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own analyses" ON analyses;
CREATE POLICY "Users can delete their own analyses"
  ON analyses FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Verify existing RLS policies are in place for all tables
-- (If any are missing, they will be created)

-- For favorites
DROP POLICY IF EXISTS "Users can view their own favorites" ON favorites;
CREATE POLICY "Users can view their own favorites"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own favorites" ON favorites;
CREATE POLICY "Users can insert their own favorites"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own favorites" ON favorites;
CREATE POLICY "Users can delete their own favorites"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);

-- For portfolio_items
DROP POLICY IF EXISTS "Users can view their own portfolio items" ON portfolio_items;
CREATE POLICY "Users can view their own portfolio items"
  ON portfolio_items FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own portfolio items" ON portfolio_items;
CREATE POLICY "Users can insert their own portfolio items"
  ON portfolio_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own portfolio items" ON portfolio_items;
CREATE POLICY "Users can update their own portfolio items"
  ON portfolio_items FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own portfolio items" ON portfolio_items;
CREATE POLICY "Users can delete their own portfolio items"
  ON portfolio_items FOR DELETE
  USING (auth.uid() = user_id);

-- For item_notes
DROP POLICY IF EXISTS "Users can view their own item notes" ON item_notes;
CREATE POLICY "Users can view their own item notes"
  ON item_notes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own item notes" ON item_notes;
CREATE POLICY "Users can insert their own item notes"
  ON item_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own item notes" ON item_notes;
CREATE POLICY "Users can update their own item notes"
  ON item_notes FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own item notes" ON item_notes;
CREATE POLICY "Users can delete their own item notes"
  ON item_notes FOR DELETE
  USING (auth.uid() = user_id);

-- For price_alerts
DROP POLICY IF EXISTS "Users can view their own price alerts" ON price_alerts;
CREATE POLICY "Users can view their own price alerts"
  ON price_alerts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own price alerts" ON price_alerts;
CREATE POLICY "Users can insert their own price alerts"
  ON price_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own price alerts" ON price_alerts;
CREATE POLICY "Users can delete their own price alerts"
  ON price_alerts FOR DELETE
  USING (auth.uid() = user_id);

-- For pending_transactions
DROP POLICY IF EXISTS "Users can view their own pending transactions" ON pending_transactions;
CREATE POLICY "Users can view their own pending transactions"
  ON pending_transactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own pending transactions" ON pending_transactions;
CREATE POLICY "Users can insert their own pending transactions"
  ON pending_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own pending transactions" ON pending_transactions;
CREATE POLICY "Users can delete their own pending transactions"
  ON pending_transactions FOR DELETE
  USING (auth.uid() = user_id);

-- For user_profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Verify all tables have RLS enabled
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Done! All tables are now configured for account-based data persistence
