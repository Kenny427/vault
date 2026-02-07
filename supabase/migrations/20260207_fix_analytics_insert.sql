-- Migration: Fix system_analytics insert permissions
-- Date: 2026-02-07
-- Issue: RLS blocks all inserts because no INSERT policy exists

-- Add INSERT policy to allow system to track analytics
-- Uses service_role bypass OR allows any authenticated user to insert

CREATE POLICY "Service role can insert analytics"
  ON system_analytics FOR INSERT
  WITH CHECK (true);

-- Alternative: If you want users to be able to insert their own analytics
-- Uncomment this and comment out the above policy:
-- CREATE POLICY "Users can insert their own analytics"
--   ON system_analytics FOR INSERT
--   WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Add index for better query performance on cost/token aggregations
CREATE INDEX IF NOT EXISTS idx_analytics_cost ON system_analytics(cost_usd) WHERE cost_usd IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_tokens ON system_analytics(tokens_used) WHERE tokens_used IS NOT NULL;
