-- Fix RLS permissions for item_performance_tracking
-- Run this in Supabase SQL Editor

-- First, disable RLS temporarily to see if data exists
ALTER TABLE item_performance_tracking DISABLE ROW LEVEL SECURITY;

-- Check if any data exists
SELECT COUNT(*) as total_records FROM item_performance_tracking;

-- View all data
SELECT * FROM item_performance_tracking ORDER BY times_analyzed DESC LIMIT 20;

-- If you want to re-enable RLS with proper policies, run these:
-- ALTER TABLE item_performance_tracking ENABLE ROW LEVEL SECURITY;

-- DROP POLICY IF EXISTS "Allow all operations on performance tracking" ON item_performance_tracking;
-- CREATE POLICY "Allow all operations on performance tracking"
-- ON item_performance_tracking
-- FOR ALL
-- USING (true)
-- WITH CHECK (true);
