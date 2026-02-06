-- Quick test to see if the update_item_performance function exists
-- Run this in Supabase SQL Editor

-- Test if function exists
SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'update_item_performance'
) as function_exists;

-- If it exists, test it
SELECT update_item_performance(
    p_item_id := 554,
    p_item_name := 'Test Item',
    p_approved := true,
    p_roi_potential := 15.5,
    p_confidence_score := 75
);

-- Check if data was inserted
SELECT * FROM item_performance_tracking WHERE item_id = 554;
