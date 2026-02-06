-- Quick test to verify pool items are accessible
-- Run this in Supabase SQL Editor

-- Test 1: Check if items exist
SELECT COUNT(*) as total_items FROM custom_pool_items;

-- Test 2: Check if enabled items exist
SELECT COUNT(*) as enabled_items FROM custom_pool_items WHERE enabled = true;

-- Test 3: Try to fetch items as the query does
SELECT item_id, item_name, category, priority, enabled, tags
FROM custom_pool_items
WHERE enabled = true
ORDER BY priority DESC, item_name ASC
LIMIT 5;

-- Test 4: Check RLS policies
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'custom_pool_items';
