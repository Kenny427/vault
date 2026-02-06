-- Check if migrations have been applied
-- Run this in Supabase SQL Editor to verify

-- 1. Check if custom_pool_items table exists and has data
SELECT COUNT(*) as pool_items_count FROM custom_pool_items;

-- 2. Check if item_performance_tracking table exists
SELECT COUNT(*) as performance_tracking_count FROM item_performance_tracking;

-- 3. List all items in pool
SELECT item_id, item_name, enabled, priority FROM custom_pool_items ORDER BY priority DESC LIMIT 10;

-- 4. Check if RLS policies are set up
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('custom_pool_items', 'item_performance_tracking')
ORDER BY tablename, policyname;
