-- Fix DINK duplicates by preventing same webhook from being inserted twice
-- Run this in your Supabase SQL Editor

-- Step 1: Clean up existing duplicates
DELETE FROM pending_transactions a
USING pending_transactions b
WHERE a.id > b.id 
AND a.user_id = b.user_id
AND a.dink_webhook_id = b.dink_webhook_id
AND a.dink_webhook_id IS NOT NULL;

-- Step 2: Add unique constraint to prevent future duplicates
-- This ensures same dink_webhook_id can't be inserted twice for same user
ALTER TABLE pending_transactions 
ADD CONSTRAINT unique_user_webhook 
UNIQUE (user_id, dink_webhook_id);
