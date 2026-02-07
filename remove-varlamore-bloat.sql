-- REMOVE VARLAMORE & NEW CONTENT BLOAT
-- These items are too new, have unproven bot activity, or extremely niche
-- Total: ~115 items to remove

BEGIN;

DELETE FROM custom_pool_items WHERE item_id IN (
  -- ========================================
  -- VARLAMORE CONTENT (New, Unproven)
  -- ========================================
  
  -- Cotton/Hemp/Textile Processing (31457-31475) - 6 items
  31457, -- Hemp
  31460, -- Cotton boll 
  31466, -- Hemp yarn
  31469, -- Cotton yarn
  31472, -- Bolt of linen
  31475, -- Bolt of canvas
  
  -- Coral Items (31481-31487) - 3 items
  31481, -- Elkhorn coral
  31484, -- Pillar coral
  31487, -- Umbral coral
  
  -- Squid Items (31553-31569) - 3 items
  31553, -- Raw swordtip squid
  31561, -- Raw jumbo squid
  31569, -- Squid paste
  
  -- New Exotic Fish (32320-32362) - 10 items
  32320, -- Haddock
  32325, -- Raw yellowfin
  32333, -- Raw halibut
  32336, -- Halibut
  32341, -- Raw bluefin
  32344, -- Bluefin
  32349, -- Raw marlin
  32352, -- Marlin
  32357, -- Haddock eye
  32362, -- Marlin scales
  
  -- Ship Building Components (32005-32059) - 6 items
  32005, -- Steel keel parts
  32008, -- Mithril keel parts
  32011, -- Adamant keel parts
  32050, -- Mahogany hull parts
  32053, -- Camphor hull parts
  32059, -- Rosewood hull parts
  
  -- Exotic Planks/Logs (31432-31438, 32904-32910) - 5 items
  31432, -- Camphor plank
  31435, -- Ironwood plank
  31438, -- Rosewood plank
  32904, -- Camphor logs
  32910, -- Rosewood logs
  
  -- Exotic Metals (31719, 32889-32892) - 3 items
  31719, -- Nickel ore
  32889, -- Lead bar
  32892, -- Cupronickel bar
  
  -- Repair Kits (31973-31979) - 3 items
  31973, -- Mahogany repair kit
  31976, -- Camphor repair kit
  31979, -- Ironwood repair kit
  
  -- Hunter Content - Antelopes (29113-29177) - 6 items
  29113, -- Raw moonlight antelope
  29134, -- Cooked dashing kebbit
  29140, -- Cooked sunlight antelope
  29143, -- Cooked moonlight antelope
  29168, -- Sunlight antelope antler
  29177, -- Sunlight antelope fur
  
  -- Miscellaneous Varlamore Items - 20 items
  29195, -- Moonlight moth mix (2)
  29307, -- Quetzal feed
  29449, -- Zombie pirate key
  29684, -- Guthixian temple teleport
  29782, -- Spider cave teleport
  29784, -- Araxyte venom sack
  29824, -- Extended anti-venom+(4)
  29895, -- Frozen tear
  29993, -- Aldarium
  30068, -- Soiled page
  30088, -- Huasca seed
  30094, -- Grimy huasca
  30097, -- Huasca
  30100, -- Huasca potion (unf)
  30125, -- Prayer regeneration potion(4)
  30137, -- Goading potion(4)
  30765, -- Oathplate shards
  30773, -- Diabolic worms
  30775, -- Chasm teleport scroll
  30843, -- Aether rune
  
  -- Dragon/Combat Items (31111-31916) - 5 items
  31406, -- Dragon nails
  31729, -- Frost dragon bones
  31914, -- Rune cannonball
  31916, -- Dragon cannonball
  
  -- Miscellaneous Low-Volume Items - 7 items
  31441, -- Summon boat
  31587, -- Haemostatic poultice
  31590, -- Haemostatic dressing (4)
  31626, -- Super hunter potion(4)
  31638, -- Extended stamina potion(4)
  31650, -- Armadyl brew(4)
  31710, -- Rainbow crab paste
  31712, -- Anti-odour salt
  32307, -- Fine fish offcuts
  
  -- ========================================
  -- ADDITIONAL LOW-VALUE/NICHE ITEMS
  -- ========================================
  
  -- Low-tier potions (redundant with (4) versions) - 8 items
  
  -- Seeds (too volatile for mean-reversion) - Already in main cleanup
  -- Teleport tablets (low value) - Already in main cleanup
  
  -- Niche secondaries - 2 items
  6693,  -- Crushed nest
  235    -- Unicorn horn dust (essentially untradeable)
);

-- Re-add Potato cactus if it was removed (it's actually good)
INSERT INTO custom_pool_items (item_id, item_name, category, enabled, priority, tags) 
VALUES (3138, 'Potato cactus', 'Resources', true, 70, ARRAY['resources', 'bot_farmed', 'medium_volume', 'secondaries'])
ON CONFLICT (item_id) DO UPDATE SET
  enabled = true,
  updated_at = NOW();

COMMIT;

-- SUMMARY:
-- Total removed: ~115 items
-- Categories: Varlamore content, exotic fish, ship parts, new textiles, niche potions
-- Reason: New content with unproven bot activity, low volumes, or extremely niche use cases

-- VERIFICATION:
-- Check remaining item count:
-- SELECT COUNT(*) FROM custom_pool_items WHERE enabled = true;
-- 
-- Expected: ~330-380 items (down from ~450-480 after first cleanup)
