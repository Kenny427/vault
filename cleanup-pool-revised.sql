-- REVISED: Remove low-quality items from pool (FIXED VERSION)
-- Based on comprehensive analysis of 795-item pool
-- Removes trash tier, low-volume, and niche items
-- Keeps high-volume bot-farmed essentials
BEGIN;

DELETE FROM custom_pool_items WHERE item_id IN (
  -- TRASH TIER (<100gp) - Remove most but keep HIGH VOLUME exceptions
  2,     -- Steel cannonball (230gp but low volume)
  43,    -- Adamant arrowtips (105gp)
  44,    -- Rune arrowtips (259gp but niche)
  47,    -- Barb bolttips
  58,    -- Willow longbow (u)
  62,    -- Maple longbow (u) 
  64,    -- Maple shortbow (u)
  68,    -- Yew shortbow (u)
  91,    -- Guam potion (unf)
  93,    -- Marrentill potion (unf)
  95,    -- Tarromin potion (unf)
  111,   -- Torstol potion (unf) - keep grimy only
  113,   -- Strength potion(4)
  115,   -- Strength potion(3)
  127,   -- Restore potion(3)
  199,   -- Grimy guam leaf
  201,   -- Grimy marrentill
  203,   -- Grimy tarromin
  -- 205 REMOVE - Grimy harralander - ACTUALLY KEEP (good volume)
  -- 223 REMOVED FROM DELETE - Red spiders' eggs - KEEP IT
  225,   -- Limpwurt root (declining demand)
  231,   -- Snape grass (low efficiency)
  235,   -- Unicorn horn dust (untradeable volume)
  237,   -- Unicorn horn
  239,   -- White berries
  241,   -- Dragon scale dust
  247,   -- Jangerberries
  249,   -- Guam leaf  
  251,   -- Marrentill
  253,   -- Tarromin
  299,   -- Mithril seeds
  319,   -- Anchovies
  329,   -- Salmon (cooked)
  331,   -- Raw salmon
  335,   -- Raw trout
  345,   -- Raw herring
  347,   -- Herring
  349,   -- Raw pike
  351,   -- Pike
  359,   -- Raw tuna
  361,   -- Tuna
  365,   -- Bass
  371,   -- Raw swordfish
  373,   -- Swordfish
  377,   -- Raw lobster
  379,   -- Lobster
  434,   -- Clay
  -- 440 REMOVED FROM DELETE - Iron ore - KEEP IT (massive volume)
  447,   -- Mithril ore
  532,   -- Big bones
  561,   -- Nature rune (95gp, low for rune standards)
  562,   -- Chaos rune (75gp)
  564,   -- Cosmic rune (97gp)
  567,   -- Unpowered orb
  592,   -- Ashes
  805,   -- Rune thrownaxe
  816,   -- Adamant dart(p)
  817,   -- Rune dart(p)
  821,   -- Steel dart tip
  822,   -- Mithril dart tip
  823,   -- Adamant dart tip
  830,   -- Rune javelin
  845,   -- Oak longbow
  847,   -- Willow longbow
  849,   -- Willow shortbow
  851,   -- Maple longbow
  853,   -- Maple shortbow
  857,   -- Yew shortbow
  866,   -- Mithril knife
  867,   -- Adamant knife
  868,   -- Rune knife
  869,   -- Black knife
  890,   -- Adamant arrow
  960,   -- Plank
  1115,  -- Iron platebody
  1339,  -- Steel warhammer
  1438,  -- Air talisman
  1444,  -- Water talisman
  1523,  -- Lockpick
  1609,  -- Opal
  1611,  -- Jade
  1625,  -- Uncut opal
  1627,  -- Uncut jade
  1635,  -- Gold ring
  1637,  -- Sapphire ring
  1654,  -- Gold necklace
  1656,  -- Sapphire necklace
  1673,  -- Gold amulet (u)
  1675,  -- Sapphire amulet (u)
  1692,  -- Gold amulet
  1716,  -- Unblessed symbol
  1739,  -- Cowhide
  1741,  -- Leather
  1743,  -- Hard leather
  1759,  -- Ball of wool
  1761,  -- Soft clay
  1775,  -- Molten glass
  1823,  -- Waterskin(4)
  1891,  -- Cake
  1897,  -- Chocolate cake
  1917,  -- Beer
  1927,  -- Bucket of milk
  1933,  -- Pot of flour
  1951,  -- Redberries
  1953,  -- Pastry dough
  1955,  -- Cooking apple
  1975,  -- Chocolate dust
  1985,  -- Cheese
  2003,  -- Stew
  2007,  -- Spice
  2011,  -- Curry
  2015,  -- Vodka
  2108,  -- Orange
  2114,  -- Pineapple
  2116,  -- Pineapple chunks
  2118,  -- Pineapple ring
  2142,  -- Cooked meat
  2283,  -- Pizza base
  2289,  -- Plain pizza
  2297,  -- Anchovy pizza
  2309,  -- Bread
  2315,  -- Pie shell
  2317,  -- Uncooked apple pie
  2323,  -- Apple pie
  2349,  -- Bronze bar
  2351,  -- Iron bar
  2355,  -- Silver bar
  2357,  -- Gold bar
  2430,  -- Restore potion(4)
  2446,  -- Antipoison(4)
  2862,  -- Achey tree logs
  2864,  -- Ogre arrow shaft
  2865,  -- Flighted ogre arrow
  2866,  -- Ogre arrow
  3008,  -- Energy potion(4)
  3010,  -- Energy potion(3)
  3040,  -- Magic potion(4)
  3042,  -- Magic potion(3)
  -- 3138 REMOVE - Potato cactus - KEEP (bot-farmed secondary)
  3239,  -- Bark
  3420,  -- Limestone brick
  3422,  -- Olive oil(4)
  3801,  -- Keg of beer
  4012,  -- Monkey nuts
  4460,  -- Cup of hot water
  4694,  -- Steam rune
  4695,  -- Mist rune
  4697,  -- Smoke rune
  4698,  -- Mud rune
  4740,  -- Bolt rack
  4793,  -- Mithril brutal
  4798,  -- Adamant brutal
  4822,  -- Mithril nails
  4823,  -- Adamantite nails
  5003,  -- Cave eel
  5288,  -- Papaya tree seed
  5290,  -- Calquat tree seed
  5296,  -- Toadflax seed
  5297,  -- Irit seed
  5298,  -- Avantoe seed (keep herb, remove seed)
  5299,  -- Kwuarm seed
  5301,  -- Cadantine seed
  5302,  -- Lantadyme seed
  5303,  -- Dwarf weed seed
  5311,  -- Wildblood seed
  5312,  -- Acorn
  5313,  -- Willow seed
  5321,  -- Watermelon seed
  5386,  -- Apples(5)
  5416,  -- Bananas(5)
  5504,  -- Strawberry
  5525,  -- Tiara
  5626,  -- Adamant arrow(p++)
  5667,  -- Rune knife(p++)
  5931,  -- Jute fibre
  5935,  -- Coconut milk
  5970,  -- Curry leaf
  5980,  -- Calquat fruit
  5986,  -- Sweetcorn
  6018,  -- Poison ivy berries
  6024,  -- Willow leaves
  6028,  -- Maple leaves
  6030,  -- Magic leaves
  6034,  -- Supercompost
  6055,  -- Weeds
  6705,  -- Potato with cheese
  7056,  -- Egg potato
  7076,  -- Uncooked egg
  7178,  -- Garden pie
  7188,  -- Fish pie
  7329,  -- Red firelighter
  7331,  -- Blue firelighter
  -- 7946 REMOVED FROM DELETE - Monkfish - KEEP IT
  8007,  -- Varrock teleport (tablet)
  8008,  -- Lumbridge teleport (tablet)
  8009,  -- Falador teleport (tablet)
  8010,  -- Camelot teleport (tablet)
  8011,  -- Ardougne teleport (tablet)
  8013,  -- Teleport to house (tablet)
  8014,  -- Bones to bananas (tablet)
  8015,  -- Bones to peaches (tablet)
  -- 8778 REMOVED FROM DELETE - Oak plank - KEEP IT
  9042,  -- Stone seal
  -- 9075 REMOVED FROM DELETE - Astral rune - KEEP IT (massive volume)
  9141,  -- Steel bolts
  9188,  -- Topaz bolt tips
  9190,  -- Emerald bolt tips
  9191,  -- Ruby bolt tips
  9336,  -- Topaz bolts
  9337,  -- Sapphire bolts
  9338,  -- Emerald bolts
  9339,  -- Ruby bolts
  9340,  -- Diamond bolts
  9378,  -- Steel bolts (unf)
  9379,  -- Mithril bolts (unf)
  9736,  -- Goat horn dust
  9739,  -- Combat potion(4)
  9741,  -- Combat potion(3)
  10127, -- Dashing kebbit fur
  10158, -- Kebbit bolts
  10327, -- White firelighter
  10810, -- Arctic pine logs
  10937, -- Nail beast nails
  11069, -- Gold bracelet
  11072, -- Sapphire bracelet
  11240, -- Young impling jar
  11250, -- Nature impling jar
  11326, -- Caviar
  -- 11875 REMOVE - Broad bolts - KEEP (essential PvM ammo)
  11876, -- Unfinished broad bolts
  11957, -- Extended antifire(1)
  11992, -- Lava scale
  12405, -- Lunar isle teleport
  12407, -- Pest control teleport
  12408, -- Piscatoris teleport
  12409, -- Tai bwo wannai teleport
  12410, -- Iorwerth camp teleport
  12775, -- Annakarl teleport (tablet)
  -- 12934 REMOVED FROM DELETE - Zulrah's scales - CRITICAL KEEP
  13431, -- Sandworms
  13475, -- Ensouled giant head
  19578, -- Adamant javelin tips
  19580, -- Rune javelin tips
  19613, -- Arceuus library teleport (tablet)
  19615, -- Draynor manor teleport (tablet)
  19617, -- Mind altar teleport (tablet)
  19619, -- Salve graveyard teleport (tablet)
  19623, -- West ardougne teleport (tablet)
  19629, -- Barrows teleport (tablet)
  20849, -- Dragon thrownaxe
  21318, -- Amethyst javelin
  21483, -- Ultracompost
  21488, -- Mahogany seed
  21490, -- Seaweed spore
  21504, -- Giant seaweed
  -- 21622 REMOVED FROM DELETE - Volcanic ash - KEEP IT
  21754, -- Rock thrownhammer
  21802, -- Revenant cave teleport
  21820, -- Revenant ether
  22198, -- Yew bird house
  22201, -- Magic bird house
  22204, -- Redwood bird house
  22257, -- Maple shield
  22593, -- Te salt
  22595, -- Efh salt
  22597, -- Urt salt
  22795, -- Dragonfruit pie
  22818, -- Fish chunks
  23387, -- Watson teleport
  24336, -- Target teleport
  24589, -- Blighted manta ray
  24592, -- Blighted anglerfish
  24595, -- Blighted karambwan
  24607, -- Blighted ancient ice sack
  24613, -- Blighted entangle sack
  24615, -- Blighted teleport spell sack
  24621, -- Blighted vengeance sack
  24949, -- Moonclan teleport (tablet)
  24953, -- Waterbirth teleport (tablet)
  24961, -- Catherby teleport (tablet)
  25769, -- Vile ashes
  25772, -- Malicious ashes
  25775, -- Abyssal ashes
  25778, -- Infernal ashes
  28161, -- Secateurs attachment
  28790, -- Kourend castle teleport (tablet)
  28824, -- Civitas illa fortis teleport
  28872, -- Moonlight antler bolts
  28878, -- Sunlight antler bolts
  28896, -- Rum
  28899, -- Wyrmling bones
  28924, -- Sunfire splinters
  28929, -- Sunfire rune
  28991, -- Atlatl dart
  29110, -- Raw pyre fox
  29116, -- Raw sunlight antelope
  29125, -- Raw kyatt
  29174, -- Moonlight antelope fur
  29458, -- Adamant seeds
  30771, -- Aether catalyst
  30800, -- Demonic tallow
  30848, -- Crushed infernal shale
  30900, -- Shark lure
  30998, -- Atlatl dart tips
  31004, -- Atlatl dart shaft
  31010, -- Headless atlatl dart
  31045, -- Bale of flax
  31443, -- Teleport to boat
  31543, -- Hemp seed
  31545, -- Cotton seed
  31665, -- Pillar potion (unf)
  31668, -- Umbral potion (unf)
  31708, -- Crab paste
  31716, -- Lead ore
  31910, -- Mithril cannonball
  31912, -- Adamant cannonball
  31967, -- Oak repair kit
  31970, -- Teak repair kit
  32309, -- Raw giant krill
  32312, -- Giant krill
  32317, -- Raw haddock
  32360, -- Yellow fin
  32907  -- Ironwood logs
);

-- ADDITIONAL REMOVALS: New Varlamore content (unproven bot activity)
DELETE FROM custom_pool_items WHERE item_id IN (
  -- Cotton/Hemp/Textile items (new, low bot activity)
  31457, -- Hemp
  31460, -- Cotton boll 
  31466, -- Hemp yarn
  31469, -- Cotton yarn
  31472, -- Bolt of linen
  31475, -- Bolt of canvas
  
  -- Coral items (niche, low volume)
  31481, -- Elkhorn coral
  31484, -- Pillar coral
  31487, -- Umbral coral
  
  -- Squid items (new content, unproven)
  31553, -- Raw swordtip squid
  31561, -- Raw jumbo squid
  31569, -- Squid paste
  
  -- New exotic fish (insufficient data)
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
  
  -- Ship building parts (niche construction content
)
  32005, -- Steel keel parts
  32008, -- Mithril keel parts
  32011, -- Adamant keel parts
  32050, -- Mahogany hull parts
  32053, -- Camphor hull parts
  32059, -- Rosewood hull parts
  
  -- Exotic planks/logs (new, unproven volumes) 
  31432, -- Camphor plank
  31435, -- Ironwood plank
  31438, -- Rosewood plank
  32904, -- Camphor logs
  32910, -- Rosewood logs
  
  -- Exotic metals (new content)
  31719, -- Nickel ore
  32889, -- Lead bar
  32892, -- Cupronickel bar
  
  -- New repair kits (niche)
  31973, -- Mahogany repair kit
  31976, -- Camphor repair kit
  31979, -- Ironwood repair kit
  
  -- Niche Varlamore items
  29113, -- Raw moonlight antelope
  29134, -- Cooked dashing kebbit
  29140, -- Cooked sunlight antelope
  29143, -- Cooked moonlight antelope
  29168, -- Sunlight antelope antler
  29177, -- Sunlight antelope fur
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
  31111, -- Demon tear
  31406, -- Dragon nails
  31441, -- Summon boat
  31587, -- Haemostatic poultice
  31590, -- Haemostatic dressing (4)
  31626, -- Super hunter potion(4)
  31638, -- Extended stamina potion(4)
  31650, -- Armadyl brew(4)
  31710, -- Rainbow crab paste
  31712, -- Anti-odour salt
  31729, -- Frost dragon bones
  31914, -- Rune cannonball
  31916, -- Dragon cannonball
  32307  -- Fine fish offcuts
);

COMMIT;

-- SUMMARY:
-- Removed: ~400-450 items (trash tier, low volume, niche, new unproven content)
-- Kept: ~350-400 items (high-volume bot-farmed essentials)
-- Key fixes: Kept Zulrah's scales, Astral runes, Iron ore, Oak planks, Volcanic ash
