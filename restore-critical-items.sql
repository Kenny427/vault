-- RESTORE CRITICAL HIGH-VOLUME ITEMS
-- These were mistakenly removed but are essential for mean-reversion trading
BEGIN;

-- Insert critical items back into pool
INSERT INTO custom_pool_items (item_id, item_name, category, enabled, priority, tags) VALUES
  (223, 'Red spiders'' eggs', 'Resources', true, 75, ARRAY['resources', 'bot_farmed', 'high_volume', 'secondaries']),
  (440, 'Iron ore', 'Resources', true, 85, ARRAY['resources', 'very_high_bot', 'massive_volume', 'skilling']),
  (9075, 'Astral rune', 'Runes', true, 90, ARRAY['runes', 'very_high_bot', 'massive_volume', 'constant_demand']),
  (7946, 'Monkfish', 'Food', true, 75, ARRAY['food', 'high_bot', 'high_volume', 'pvm']),
  (12934, 'Zulrah''s scales', 'PvM Drops', true, 95, ARRAY['pvm_drops', 'very_high_bot', 'massive_volume', 'pvm']),
  (21622, 'Volcanic ash', 'Resources', true, 75, ARRAY['resources', 'high_bot', 'high_volume', 'skilling']),
  (8778, 'Oak plank', 'Resources', true, 80, ARRAY['resources', 'high_bot', 'massive_volume', 'construction'])
ON CONFLICT (item_id) DO UPDATE SET
  enabled = true,
  priority = EXCLUDED.priority,
  tags = EXCLUDED.tags,
  updated_at = NOW();

COMMIT;

-- VERIFICATION:
-- Run this to confirm the items are back:
-- SELECT item_id, item_name, enabled FROM custom_pool_items WHERE item_id IN (223, 440, 9075, 7946, 12934, 21622, 8778) ORDER BY item_id;
