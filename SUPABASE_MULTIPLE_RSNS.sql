-- SQL to support multiple RuneScape accounts per user
-- Run this in your Supabase SQL Editor

-- 1. Create table for multiple RSN accounts per user
CREATE TABLE IF NOT EXISTS user_rsn_accounts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rsn TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, rsn)
);

-- 2. Enable RLS on the new table
ALTER TABLE user_rsn_accounts ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policy for viewing own RSN accounts
DROP POLICY IF EXISTS "Users can view their own RSN accounts" ON user_rsn_accounts;
CREATE POLICY "Users can view their own RSN accounts"
  ON user_rsn_accounts FOR SELECT
  USING (auth.uid() = user_id);

-- 4. Create RLS policy for inserting own RSN accounts
DROP POLICY IF EXISTS "Users can insert their own RSN accounts" ON user_rsn_accounts;
CREATE POLICY "Users can insert their own RSN accounts"
  ON user_rsn_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 5. Create RLS policy for deleting own RSN accounts
DROP POLICY IF EXISTS "Users can delete their own RSN accounts" ON user_rsn_accounts;
CREATE POLICY "Users can delete their own RSN accounts"
  ON user_rsn_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_rsn_accounts_user_id ON user_rsn_accounts(user_id);

-- 7. Optional: Drop the old single RSN column from user_profiles if you want
-- (Keep it if you want backwards compatibility)
-- ALTER TABLE user_profiles DROP COLUMN IF EXISTS rsn;

-- That's it! The new table is ready for use.
