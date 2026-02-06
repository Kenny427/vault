-- ============================================
-- VERIFICATION QUERIES
-- Run these in Supabase SQL Editor to verify everything works
-- ============================================

-- ✅ TEST 1: Verify 113 items were inserted
SELECT 
  COUNT(*) as total_items,
  COUNT(*) FILTER (WHERE enabled = true) as enabled_items,
  COUNT(*) FILTER (WHERE enabled = false) as disabled_items
FROM custom_pool_items;
-- Expected: total_items = 113, enabled_items = 113, disabled_items = 0


-- ✅ TEST 2: Check item distribution by category
SELECT 
  category,
  COUNT(*) as item_count,
  AVG(priority)::INTEGER as avg_priority
FROM custom_pool_items
GROUP BY category
ORDER BY item_count DESC;
-- Should show: Herbs (21), Resources (20), Ammunition (17), etc.


-- ✅ TEST 3: Verify highest priority items
SELECT 
  item_id,
  item_name,
  category,
  priority,
  tags
FROM custom_pool_items
WHERE priority >= 90
ORDER BY priority DESC, item_name
LIMIT 10;
-- Should show items like Law rune, Broad bolts, Dragon bones, etc.


-- ✅ TEST 4: Check performance tracking table is ready
SELECT 
  COUNT(*) as tracked_items,
  COUNT(*) FILTER (WHERE times_analyzed > 0) as items_with_data
FROM item_performance_tracking;
-- Expected: tracked_items = 0 (no scans yet), items_with_data = 0


-- ✅ TEST 5: Test the update_item_performance function
-- This simulates what happens when AI approves an item
SELECT update_item_performance(
  563,  -- Law rune item_id
  'Law rune',
  true,  -- approved
  25.5,  -- ROI potential %
  85     -- confidence score
);

-- Now check if it was tracked
SELECT 
  item_name,
  times_analyzed,
  times_approved,
  times_rejected,
  success_rate,
  avg_confidence_score,
  total_roi_potential
FROM item_performance_tracking
WHERE item_id = 563;
-- Expected: times_analyzed = 1, times_approved = 1, success_rate = 100.00


-- ✅ TEST 6: Verify tags are working for filtering
SELECT 
  COUNT(*) as very_high_bot_items
FROM custom_pool_items
WHERE 'very_high_bot' = ANY(tags);
-- Should return a significant number (items with very high bot activity)


-- ✅ TEST 7: Check rate limits table exists
SELECT COUNT(*) FROM rate_limits;
-- Expected: 0 (no users have limits set yet)


-- ============================================
-- CLEANUP TEST DATA (optional)
-- ============================================
-- If you want to remove the test performance tracking entry:
-- DELETE FROM item_performance_tracking WHERE item_id = 563;
