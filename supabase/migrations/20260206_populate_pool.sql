-- Populate custom_pool_items with existing EXPANDED_ITEM_POOL items
-- This migration adds all 113 items from the code-based pool to the database

INSERT INTO custom_pool_items (item_id, item_name, category, priority, enabled, tags) VALUES
-- === RUNES (Heavily Botted) ===
(563, 'Law rune', 'Runes', 90, TRUE, ARRAY['runes', 'very_high_bot', 'massive_volume', 'constant_demand']),
(560, 'Death rune', 'Runes', 90, TRUE, ARRAY['runes', 'very_high_bot', 'massive_volume', 'pvm']),
(565, 'Blood rune', 'Runes', 90, TRUE, ARRAY['runes', 'very_high_bot', 'massive_volume', 'pvm']),
(566, 'Soul rune', 'Runes', 85, TRUE, ARRAY['runes', 'very_high_bot', 'high_volume', 'pvm']),
(21880, 'Wrath rune', 'Runes', 80, TRUE, ARRAY['runes', 'high_bot', 'high_volume', 'pvm']),
(9075, 'Astral rune', 'Runes', 85, TRUE, ARRAY['runes', 'very_high_bot', 'high_volume', 'constant_demand']),

-- === AMMUNITION (PvM Essential) ===
(11875, 'Broad bolts', 'Ammunition', 90, TRUE, ARRAY['ammo', 'very_high_bot', 'massive_volume', 'pvm']),
(21316, 'Amethyst broad bolts', 'Ammunition', 80, TRUE, ARRAY['ammo', 'high_bot', 'high_volume', 'pvm']),
(9144, 'Runite bolts', 'Ammunition', 80, TRUE, ARRAY['ammo', 'high_bot', 'high_volume', 'pvm']),
(21905, 'Dragon bolts', 'Ammunition', 75, TRUE, ARRAY['ammo', 'medium_bot', 'high_volume', 'pvm']),
(9242, 'Ruby bolts (e)', 'Ammunition', 90, TRUE, ARRAY['ammo', 'high_bot', 'massive_volume', 'pvm']),
(9243, 'Diamond bolts (e)', 'Ammunition', 90, TRUE, ARRAY['ammo', 'high_bot', 'massive_volume', 'pvm']),
(21944, 'Ruby dragon bolts (e)', 'Ammunition', 75, TRUE, ARRAY['ammo', 'medium_bot', 'high_volume', 'pvm']),
(21946, 'Diamond dragon bolts (e)', 'Ammunition', 75, TRUE, ARRAY['ammo', 'medium_bot', 'high_volume', 'pvm']),
(11212, 'Dragon arrow', 'Ammunition', 75, TRUE, ARRAY['ammo', 'medium_bot', 'high_volume', 'pvm']),
(21326, 'Amethyst arrow', 'Ammunition', 70, TRUE, ARRAY['ammo', 'high_bot', 'medium_volume', 'pvm']),
(892, 'Rune arrow', 'Ammunition', 80, TRUE, ARRAY['ammo', 'high_bot', 'high_volume', 'pvm']),
(11230, 'Dragon dart', 'Ammunition', 75, TRUE, ARRAY['ammo', 'medium_bot', 'high_volume', 'pvm']),
(25849, 'Amethyst dart', 'Ammunition', 70, TRUE, ARRAY['ammo', 'high_bot', 'medium_volume', 'pvm']),
(811, 'Rune dart', 'Ammunition', 80, TRUE, ARRAY['ammo', 'high_bot', 'high_volume', 'pvm']),
(10033, 'Chinchompa', 'Ammunition', 85, TRUE, ARRAY['ammo', 'very_high_bot', 'high_volume', 'pvm']),
(10034, 'Red chinchompa', 'Ammunition', 90, TRUE, ARRAY['ammo', 'very_high_bot', 'massive_volume', 'pvm']),
(11959, 'Black chinchompa', 'Ammunition', 85, TRUE, ARRAY['ammo', 'very_high_bot', 'high_volume', 'pvm']),

-- === RESOURCES (Bot Farmed) ===
(1513, 'Magic logs', 'Resources', 90, TRUE, ARRAY['resources', 'very_high_bot', 'massive_volume', 'skilling']),
(1515, 'Yew logs', 'Resources', 90, TRUE, ARRAY['resources', 'very_high_bot', 'massive_volume', 'skilling']),
(6332, 'Mahogany logs', 'Resources', 85, TRUE, ARRAY['resources', 'very_high_bot', 'high_volume', 'skilling']),
(6333, 'Teak logs', 'Resources', 85, TRUE, ARRAY['resources', 'very_high_bot', 'high_volume', 'skilling']),
(451, 'Runite ore', 'Resources', 85, TRUE, ARRAY['resources', 'very_high_bot', 'high_volume', 'skilling']),
(449, 'Adamantite ore', 'Resources', 85, TRUE, ARRAY['resources', 'very_high_bot', 'high_volume', 'skilling']),
(453, 'Coal', 'Resources', 90, TRUE, ARRAY['resources', 'very_high_bot', 'massive_volume', 'skilling']),
(440, 'Iron ore', 'Resources', 90, TRUE, ARRAY['resources', 'very_high_bot', 'massive_volume', 'skilling']),
(2363, 'Runite bar', 'Resources', 80, TRUE, ARRAY['resources', 'high_bot', 'high_volume', 'skilling']),
(2361, 'Adamantite bar', 'Resources', 80, TRUE, ARRAY['resources', 'high_bot', 'high_volume', 'skilling']),
(2353, 'Steel bar', 'Resources', 80, TRUE, ARRAY['resources', 'high_bot', 'high_volume', 'skilling']),
(1777, 'Bow string', 'Resources', 90, TRUE, ARRAY['resources', 'very_high_bot', 'massive_volume', 'skilling']),
(1753, 'Green dragonhide', 'Resources', 90, TRUE, ARRAY['resources', 'very_high_bot', 'massive_volume', 'skilling']),
(1751, 'Blue dragonhide', 'Resources', 90, TRUE, ARRAY['resources', 'very_high_bot', 'massive_volume', 'skilling']),
(1749, 'Red dragonhide', 'Resources', 85, TRUE, ARRAY['resources', 'very_high_bot', 'high_volume', 'skilling']),
(1747, 'Black dragonhide', 'Resources', 85, TRUE, ARRAY['resources', 'very_high_bot', 'high_volume', 'skilling']),
(1745, 'Green dragon leather', 'Resources', 80, TRUE, ARRAY['resources', 'high_bot', 'high_volume', 'skilling']),
(2505, 'Blue dragon leather', 'Resources', 80, TRUE, ARRAY['resources', 'high_bot', 'high_volume', 'skilling']),
(2507, 'Red dragon leather', 'Resources', 70, TRUE, ARRAY['resources', 'high_bot', 'medium_volume', 'skilling']),
(2509, 'Black dragon leather', 'Resources', 70, TRUE, ARRAY['resources', 'high_bot', 'medium_volume', 'skilling']),

-- === BONES (Heavily Botted) ===
(536, 'Dragon bones', 'Bones', 90, TRUE, ARRAY['bones', 'very_high_bot', 'massive_volume', 'skilling']),
(534, 'Babydragon bones', 'Bones', 70, TRUE, ARRAY['bones', 'high_bot', 'medium_volume', 'skilling']),
(6812, 'Wyvern bones', 'Bones', 70, TRUE, ARRAY['bones', 'high_bot', 'medium_volume', 'skilling']),
(22124, 'Superior dragon bones', 'Bones', 75, TRUE, ARRAY['bones', 'medium_bot', 'medium_volume', 'skilling']),

-- === FOOD (PvM Essential) ===
(385, 'Shark', 'Food', 90, TRUE, ARRAY['food', 'very_high_bot', 'massive_volume', 'pvm']),
(383, 'Raw shark', 'Food', 90, TRUE, ARRAY['food', 'very_high_bot', 'massive_volume', 'pvm']),
(3144, 'Cooked karambwan', 'Food', 90, TRUE, ARRAY['food', 'very_high_bot', 'massive_volume', 'pvm']),
(3142, 'Raw karambwan', 'Food', 90, TRUE, ARRAY['food', 'very_high_bot', 'massive_volume', 'pvm']),
(13441, 'Anglerfish', 'Food', 90, TRUE, ARRAY['food', 'high_bot', 'massive_volume', 'pvm']),
(13439, 'Raw anglerfish', 'Food', 85, TRUE, ARRAY['food', 'high_bot', 'high_volume', 'pvm']),
(391, 'Manta ray', 'Food', 80, TRUE, ARRAY['food', 'high_bot', 'high_volume', 'pvm']),
(7946, 'Monkfish', 'Food', 85, TRUE, ARRAY['food', 'very_high_bot', 'high_volume', 'pvm']),
(379, 'Lobster', 'Food', 85, TRUE, ARRAY['food', 'very_high_bot', 'high_volume', 'pvm']),

-- === POTIONS (PvM Essential) ===
(2434, 'Prayer potion(4)', 'Potions', 90, TRUE, ARRAY['potions', 'high_bot', 'massive_volume', 'pvm']),
(3024, 'Super restore(4)', 'Potions', 90, TRUE, ARRAY['potions', 'high_bot', 'massive_volume', 'pvm']),
(6685, 'Saradomin brew(4)', 'Potions', 90, TRUE, ARRAY['potions', 'high_bot', 'massive_volume', 'pvm']),
(12625, 'Stamina potion(4)', 'Potions', 85, TRUE, ARRAY['potions', 'high_bot', 'high_volume', 'pvm']),
(12695, 'Super combat potion(4)', 'Potions', 90, TRUE, ARRAY['potions', 'high_bot', 'massive_volume', 'pvm']),
(2444, 'Ranging potion(4)', 'Potions', 85, TRUE, ARRAY['potions', 'high_bot', 'high_volume', 'pvm']),
(22461, 'Bastion potion(4)', 'Potions', 75, TRUE, ARRAY['potions', 'medium_bot', 'high_volume', 'pvm']),
(21978, 'Super antifire potion(4)', 'Potions', 85, TRUE, ARRAY['potions', 'high_bot', 'high_volume', 'pvm']),
(22209, 'Extended super antifire(4)', 'Potions', 70, TRUE, ARRAY['potions', 'medium_bot', 'medium_volume', 'pvm']),
(23685, 'Divine super combat potion(4)', 'Potions', 75, TRUE, ARRAY['potions', 'medium_bot', 'high_volume', 'pvm']),
(23733, 'Divine ranging potion(4)', 'Potions', 75, TRUE, ARRAY['potions', 'medium_bot', 'high_volume', 'pvm']),

-- === HERBS (Bot Farmed) ===
(207, 'Grimy ranarr weed', 'Herbs', 90, TRUE, ARRAY['herbs', 'very_high_bot', 'massive_volume', 'skilling']),
(3051, 'Grimy snapdragon', 'Herbs', 90, TRUE, ARRAY['herbs', 'very_high_bot', 'massive_volume', 'skilling']),
(219, 'Grimy torstol', 'Herbs', 85, TRUE, ARRAY['herbs', 'very_high_bot', 'high_volume', 'skilling']),
(2485, 'Grimy lantadyme', 'Herbs', 85, TRUE, ARRAY['herbs', 'very_high_bot', 'high_volume', 'skilling']),
(213, 'Grimy kwuarm', 'Herbs', 85, TRUE, ARRAY['herbs', 'very_high_bot', 'high_volume', 'skilling']),
(215, 'Grimy cadantine', 'Herbs', 85, TRUE, ARRAY['herbs', 'very_high_bot', 'high_volume', 'skilling']),
(209, 'Grimy irit leaf', 'Herbs', 85, TRUE, ARRAY['herbs', 'very_high_bot', 'high_volume', 'skilling']),
(3049, 'Grimy toadflax', 'Herbs', 85, TRUE, ARRAY['herbs', 'very_high_bot', 'high_volume', 'skilling']),
(205, 'Grimy harralander', 'Herbs', 85, TRUE, ARRAY['herbs', 'very_high_bot', 'high_volume', 'skilling']),
(217, 'Grimy dwarf weed', 'Herbs', 80, TRUE, ARRAY['herbs', 'high_bot', 'high_volume', 'skilling']),
(211, 'Grimy avantoe', 'Herbs', 80, TRUE, ARRAY['herbs', 'high_bot', 'high_volume', 'skilling']),
(257, 'Ranarr weed', 'Herbs', 80, TRUE, ARRAY['herbs', 'high_bot', 'high_volume', 'skilling']),
(3000, 'Snapdragon', 'Herbs', 80, TRUE, ARRAY['herbs', 'high_bot', 'high_volume', 'skilling']),
(269, 'Torstol', 'Herbs', 80, TRUE, ARRAY['herbs', 'high_bot', 'high_volume', 'skilling']),
(2481, 'Lantadyme', 'Herbs', 80, TRUE, ARRAY['herbs', 'high_bot', 'high_volume', 'skilling']),
(263, 'Kwuarm', 'Herbs', 80, TRUE, ARRAY['herbs', 'high_bot', 'high_volume', 'skilling']),
(265, 'Cadantine', 'Herbs', 80, TRUE, ARRAY['herbs', 'high_bot', 'high_volume', 'skilling']),
(259, 'Irit leaf', 'Herbs', 80, TRUE, ARRAY['herbs', 'high_bot', 'high_volume', 'skilling']),
(2998, 'Toadflax', 'Herbs', 80, TRUE, ARRAY['herbs', 'high_bot', 'high_volume', 'skilling']),
(255, 'Harralander', 'Herbs', 80, TRUE, ARRAY['herbs', 'high_bot', 'high_volume', 'skilling']),
(261, 'Avantoe', 'Herbs', 80, TRUE, ARRAY['herbs', 'high_bot', 'high_volume', 'skilling']),

-- === SECONDARY INGREDIENTS (Bot Gathered) ===
(231, 'Snape grass', 'Secondaries', 85, TRUE, ARRAY['secondaries', 'very_high_bot', 'high_volume', 'skilling']),
(225, 'Limpwurt root', 'Secondaries', 85, TRUE, ARRAY['secondaries', 'very_high_bot', 'high_volume', 'skilling']),
(2970, 'Mort myre fungus', 'Secondaries', 85, TRUE, ARRAY['secondaries', 'very_high_bot', 'high_volume', 'skilling']),
(3138, 'Potato cactus', 'Secondaries', 85, TRUE, ARRAY['secondaries', 'very_high_bot', 'high_volume', 'skilling']),
(239, 'White berries', 'Secondaries', 85, TRUE, ARRAY['secondaries', 'very_high_bot', 'high_volume', 'skilling']),
(243, 'Blue dragon scale', 'Secondaries', 85, TRUE, ARRAY['secondaries', 'very_high_bot', 'high_volume', 'skilling']),
(223, 'Red spiders'' eggs', 'Secondaries', 85, TRUE, ARRAY['secondaries', 'very_high_bot', 'high_volume', 'skilling']),
(235, 'Unicorn horn dust', 'Secondaries', 80, TRUE, ARRAY['secondaries', 'high_bot', 'high_volume', 'skilling']),
(241, 'Dragon scale dust', 'Secondaries', 70, TRUE, ARRAY['secondaries', 'high_bot', 'medium_volume', 'skilling']),
(6693, 'Crushed nest', 'Secondaries', 70, TRUE, ARRAY['secondaries', 'high_bot', 'medium_volume', 'skilling']),

-- === PVM DROPS (High Volume) ===
(12934, 'Zulrah''s scales', 'PvM Drops', 90, TRUE, ARRAY['pvm_drops', 'very_high_bot', 'massive_volume', 'pvm']),
(21622, 'Volcanic ash', 'PvM Drops', 80, TRUE, ARRAY['pvm_drops', 'high_bot', 'high_volume', 'skilling']),
(1391, 'Battlestaff', 'PvM Drops', 80, TRUE, ARRAY['pvm_drops', 'high_bot', 'high_volume', 'skilling']),

-- === CRAFTED ITEMS ===
(855, 'Yew longbow', 'Crafted', 80, TRUE, ARRAY['resources', 'high_bot', 'high_volume', 'skilling']),
(66, 'Yew longbow(u)', 'Crafted', 80, TRUE, ARRAY['resources', 'high_bot', 'high_volume', 'skilling']),
(859, 'Magic longbow', 'Crafted', 80, TRUE, ARRAY['resources', 'high_bot', 'high_volume', 'skilling']),
(70, 'Magic longbow(u)', 'Crafted', 80, TRUE, ARRAY['resources', 'high_bot', 'high_volume', 'skilling']),
(575, 'Air orb', 'Crafted', 80, TRUE, ARRAY['secondaries', 'high_bot', 'high_volume', 'skilling']),
(571, 'Water orb', 'Crafted', 80, TRUE, ARRAY['secondaries', 'high_bot', 'high_volume', 'skilling']),
(569, 'Fire orb', 'Crafted', 80, TRUE, ARRAY['secondaries', 'high_bot', 'high_volume', 'skilling']),
(573, 'Earth orb', 'Crafted', 80, TRUE, ARRAY['secondaries', 'high_bot', 'high_volume', 'skilling']),
(13573, 'Dynamite', 'Crafted', 65, TRUE, ARRAY['secondaries', 'medium_bot', 'medium_volume', 'skilling']),
(7936, 'Pure essence', 'Resources', 90, TRUE, ARRAY['resources', 'very_high_bot', 'massive_volume', 'skilling']),
(1783, 'Bucket of sand', 'Secondaries', 90, TRUE, ARRAY['secondaries', 'very_high_bot', 'massive_volume', 'skilling']),
(8778, 'Oak plank', 'Resources', 90, TRUE, ARRAY['resources', 'high_bot', 'massive_volume', 'skilling'])

ON CONFLICT (item_id) DO NOTHING;

-- Add comment
COMMENT ON TABLE custom_pool_items IS 'Database-driven item pool - migrated from EXPANDED_ITEM_POOL (113 items)';
