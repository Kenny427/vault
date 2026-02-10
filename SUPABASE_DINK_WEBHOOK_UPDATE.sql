-- Add dink_webhook_id column to pending_transactions table for improved webhook handling
-- Run this in your Supabase SQL Editor

-- Add the column if it doesn't exist
ALTER TABLE pending_transactions 
ADD COLUMN IF NOT EXISTS dink_webhook_id TEXT;

-- Create index for faster lookups by webhook ID
CREATE INDEX IF NOT EXISTS idx_pending_transactions_dink_webhook_id 
ON pending_transactions(dink_webhook_id);

-- Update RLS policy to allow service role to insert (for webhook endpoint)
-- The webhook uses service role key, so it can write to any user's pending_transactions
-- RLS will still filter reads by user_id

-- Note: Service role bypasses RLS, so no policy changes needed for inserts
-- Users still can only SELECT/DELETE their own transactions via existing policies
