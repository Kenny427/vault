-- SQL to support user-specific AI analysis cache
-- Run this in your Supabase SQL Editor after SUPABASE_MULTIPLE_RSNS.sql

-- 1. Create table for AI analysis cache per user
CREATE TABLE IF NOT EXISTS ai_analysis_cache (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  insights JSONB NOT NULL,
  market_overview TEXT NOT NULL,
  top_opportunities INTEGER[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Enable RLS on the new table
ALTER TABLE ai_analysis_cache ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policy for viewing own cache
DROP POLICY IF EXISTS "Users can view their own AI cache" ON ai_analysis_cache;
CREATE POLICY "Users can view their own AI cache"
  ON ai_analysis_cache FOR SELECT
  USING (auth.uid() = user_id);

-- 4. Create RLS policy for inserting/updating own cache
DROP POLICY IF EXISTS "Users can upsert their own AI cache" ON ai_analysis_cache;
CREATE POLICY "Users can upsert their own AI cache"
  ON ai_analysis_cache FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own AI cache" ON ai_analysis_cache;
CREATE POLICY "Users can update their own AI cache"
  ON ai_analysis_cache FOR UPDATE
  USING (auth.uid() = user_id);

-- 5. Create RLS policy for deleting own cache
DROP POLICY IF EXISTS "Users can delete their own AI cache" ON ai_analysis_cache;
CREATE POLICY "Users can delete their own AI cache"
  ON ai_analysis_cache FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ai_analysis_cache_user_id ON ai_analysis_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_cache_expires_at ON ai_analysis_cache(expires_at);

-- 7. Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS ai_cache_updated_at ON ai_analysis_cache;
CREATE TRIGGER ai_cache_updated_at
  BEFORE UPDATE ON ai_analysis_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_cache_updated_at();

-- That's it! The AI analysis cache is now user-specific and synced across devices.
