/**
 * Expanded item pool for flip analysis
 * Curated list of ~400 liquid, tradeable items across all categories
 * Excludes: Untradeable, discontinued, dead content items
 */

export interface ItemPoolEntry {
  id: number;
  name: string;
  category: 'combat' | 'skilling' | 'resources' | 'food' | 'potions' | 'runes' | 'seeds' | 'other';
  tier: 'high' | 'medium' | 'low'; // Expected volume/liquidity
}

export const EXPANDED_ITEM_POOL: ItemPoolEntry[] = [
  // HIGH TIER - Most liquid items (always analyzed)
  
  // Combat Gear - Melee
  { id: 1249, name: 'Dragon scimitar', category: 'combat', tier: 'high' },
  { id: 4151, name: 'Abyssal whip', category: 'combat', tier: 'high' },
  { id: 11802, name: 'Armadyl godsword', category: 'combat', tier: 'high' },
  { id: 11806, name: 'Saradomin godsword', category: 'combat', tier: 'high' },
  { id: 11804, name: 'Bandos godsword', category: 'combat', tier: 'high' },
  { id: 11808, name: 'Zamorak godsword', category: 'combat', tier: 'high' },
  { id: 13652, name: 'Dragon warhammer', category: 'combat', tier: 'high' },
  { id: 22325, name: 'Inquisitor\'s mace', category: 'combat', tier: 'high' },
  { id: 21021, name: 'Avernic defender hilt', category: 'combat', tier: 'high' },
  { id: 22978, name: 'Ghrazi rapier', category: 'combat', tier: 'high' },
  { id: 22542, name: 'Sanguinesti staff', category: 'combat', tier: 'high' },
  { id: 12006, name: 'Abyssal tentacle', category: 'combat', tier: 'high' },
  { id: 20784, name: 'Dragon hunter lance', category: 'combat', tier: 'high' },
  
  // Combat Gear - Ranged
  { id: 11235, name: 'Dark bow', category: 'combat', tier: 'high' },
  { id: 12926, name: 'Toxic blowpipe', category: 'combat', tier: 'high' },
  { id: 21012, name: 'Twisted bow', category: 'combat', tier: 'high' },
  { id: 19481, name: 'Heavy ballista', category: 'combat', tier: 'high' },
  { id: 11785, name: 'Armadyl crossbow', category: 'combat', tier: 'high' },
  { id: 21902, name: 'Dragon hunter crossbow', category: 'combat', tier: 'high' },
  { id: 25865, name: 'Bow of faerdhinen (c)', category: 'combat', tier: 'high' },
  { id: 27215, name: 'Zaryte crossbow', category: 'combat', tier: 'high' },
  
  // Combat Gear - Magic
  { id: 6889, name: 'Mage\'s book', category: 'combat', tier: 'high' },
  { id: 21006, name: 'Kodai wand', category: 'combat', tier: 'high' },
  { id: 22296, name: 'Nightmare staff', category: 'combat', tier: 'high' },
  { id: 22323, name: 'Volatile orb', category: 'combat', tier: 'high' },
  { id: 22326, name: 'Harmonised orb', category: 'combat', tier: 'high' },
  { id: 22299, name: 'Eldritch orb', category: 'combat', tier: 'high' },
  { id: 12904, name: 'Toxic staff of the dead', category: 'combat', tier: 'high' },
  
  // Armor - High Value
  { id: 11732, name: 'Bandos chestplate', category: 'combat', tier: 'high' },
  { id: 11734, name: 'Bandos tassets', category: 'combat', tier: 'high' },
  { id: 11726, name: 'Armadyl helmet', category: 'combat', tier: 'high' },
  { id: 11728, name: 'Armadyl chestplate', category: 'combat', tier: 'high' },
  { id: 11730, name: 'Armadyl chainskirt', category: 'combat', tier: 'high' },
  { id: 12922, name: 'Ancestral hat', category: 'combat', tier: 'high' },
  { id: 12924, name: 'Ancestral robe top', category: 'combat', tier: 'high' },
  { id: 12926, name: 'Ancestral robe bottom', category: 'combat', tier: 'high' },
  { id: 22109, name: 'Inquisitor\'s great helm', category: 'combat', tier: 'high' },
  { id: 22112, name: 'Inquisitor\'s hauberk', category: 'combat', tier: 'high' },
  { id: 22115, name: 'Inquisitor\'s plateskirt', category: 'combat', tier: 'high' },
  
  // Dragon Items
  { id: 1187, name: 'Dragon med helm', category: 'combat', tier: 'medium' },
  { id: 1305, name: 'Dragon longsword', category: 'combat', tier: 'medium' },
  { id: 1377, name: 'Dragon battleaxe', category: 'combat', tier: 'medium' },
  { id: 4587, name: 'Dragon scimitar', category: 'combat', tier: 'high' },
  { id: 1149, name: 'Dragon med helm', category: 'combat', tier: 'medium' },
  
  // Barrows Gear
  { id: 4708, name: 'Ahrim\'s robetop', category: 'combat', tier: 'medium' },
  { id: 4710, name: 'Ahrim\'s robeskirt', category: 'combat', tier: 'medium' },
  { id: 4712, name: 'Ahrim\'s staff', category: 'combat', tier: 'medium' },
  { id: 4714, name: 'Ahrim\'s hood', category: 'combat', tier: 'medium' },
  { id: 4716, name: 'Dharok\'s helm', category: 'combat', tier: 'medium' },
  { id: 4718, name: 'Dharok\'s platebody', category: 'combat', tier: 'medium' },
  { id: 4720, name: 'Dharok\'s platelegs', category: 'combat', tier: 'medium' },
  { id: 4722, name: 'Dharok\'s greataxe', category: 'combat', tier: 'medium' },
  { id: 4724, name: 'Guthan\'s helm', category: 'combat', tier: 'medium' },
  { id: 4726, name: 'Guthan\'s platebody', category: 'combat', tier: 'medium' },
  { id: 4728, name: 'Guthan\'s chainskirt', category: 'combat', tier: 'medium' },
  { id: 4730, name: 'Guthan\'s warspear', category: 'combat', tier: 'medium' },
  { id: 4732, name: 'Karil\'s coif', category: 'combat', tier: 'medium' },
  { id: 4734, name: 'Karil\'s leathertop', category: 'combat', tier: 'medium' },
  { id: 4736, name: 'Karil\'s leatherskirt', category: 'combat', tier: 'medium' },
  { id: 4738, name: 'Karil\'s crossbow', category: 'combat', tier: 'medium' },
  { id: 4745, name: 'Torag\'s helm', category: 'combat', tier: 'medium' },
  { id: 4747, name: 'Torag\'s platebody', category: 'combat', tier: 'medium' },
  { id: 4749, name: 'Torag\'s platelegs', category: 'combat', tier: 'medium' },
  { id: 4751, name: 'Torag\'s hammers', category: 'combat', tier: 'medium' },
  { id: 4753, name: 'Verac\'s helm', category: 'combat', tier: 'medium' },
  { id: 4755, name: 'Verac\'s brassard', category: 'combat', tier: 'medium' },
  { id: 4757, name: 'Verac\'s plateskirt', category: 'combat', tier: 'medium' },
  { id: 4759, name: 'Verac\'s flail', category: 'combat', tier: 'medium' },
  
  // Resources - Logs
  { id: 1511, name: 'Logs', category: 'resources', tier: 'high' },
  { id: 1521, name: 'Oak logs', category: 'resources', tier: 'high' },
  { id: 1519, name: 'Willow logs', category: 'resources', tier: 'high' },
  { id: 1517, name: 'Maple logs', category: 'resources', tier: 'high' },
  { id: 1515, name: 'Yew logs', category: 'resources', tier: 'high' },
  { id: 1513, name: 'Magic logs', category: 'resources', tier: 'high' },
  { id: 19669, name: 'Redwood logs', category: 'resources', tier: 'medium' },
  
  // Resources - Ores & Bars
  { id: 440, name: 'Iron ore', category: 'resources', tier: 'high' },
  { id: 453, name: 'Coal', category: 'resources', tier: 'high' },
  { id: 444, name: 'Gold ore', category: 'resources', tier: 'high' },
  { id: 447, name: 'Mithril ore', category: 'resources', tier: 'high' },
  { id: 449, name: 'Adamantite ore', category: 'resources', tier: 'high' },
  { id: 451, name: 'Runite ore', category: 'resources', tier: 'high' },
  { id: 2349, name: 'Bronze bar', category: 'resources', tier: 'medium' },
  { id: 2351, name: 'Iron bar', category: 'resources', tier: 'high' },
  { id: 2353, name: 'Steel bar', category: 'resources', tier: 'high' },
  { id: 2357, name: 'Gold bar', category: 'resources', tier: 'high' },
  { id: 2359, name: 'Mithril bar', category: 'resources', tier: 'high' },
  { id: 2361, name: 'Adamantite bar', category: 'resources', tier: 'high' },
  { id: 2363, name: 'Runite bar', category: 'resources', tier: 'high' },
  
  // Resources - Herbs
  { id: 199, name: 'Grimy guam leaf', category: 'resources', tier: 'medium' },
  { id: 201, name: 'Grimy marrentill', category: 'resources', tier: 'medium' },
  { id: 203, name: 'Grimy tarromin', category: 'resources', tier: 'medium' },
  { id: 205, name: 'Grimy harralander', category: 'resources', tier: 'medium' },
  { id: 207, name: 'Grimy ranarr weed', category: 'resources', tier: 'high' },
  { id: 209, name: 'Grimy irit leaf', category: 'resources', tier: 'medium' },
  { id: 211, name: 'Grimy avantoe', category: 'resources', tier: 'medium' },
  { id: 213, name: 'Grimy kwuarm', category: 'resources', tier: 'medium' },
  { id: 215, name: 'Grimy cadantine', category: 'resources', tier: 'medium' },
  { id: 217, name: 'Grimy dwarf weed', category: 'resources', tier: 'medium' },
  { id: 219, name: 'Grimy torstol', category: 'resources', tier: 'high' },
  { id: 3049, name: 'Grimy toadflax', category: 'resources', tier: 'medium' },
  { id: 3051, name: 'Grimy snapdragon', category: 'resources', tier: 'high' },
  { id: 21626, name: 'Grimy lantadyme', category: 'resources', tier: 'medium' },
  
  // Seeds
  { id: 5312, name: 'Ranarr seed', category: 'seeds', tier: 'high' },
  { id: 5294, name: 'Snapdragon seed', category: 'seeds', tier: 'high' },
  { id: 5304, name: 'Torstol seed', category: 'seeds', tier: 'high' },
  { id: 5100, name: 'Limpwurt seed', category: 'seeds', tier: 'medium' },
  { id: 5319, name: 'Watermelon seed', category: 'seeds', tier: 'medium' },
  { id: 5289, name: 'Dwarf weed seed', category: 'seeds', tier: 'medium' },
  { id: 5285, name: 'Lantadyme seed', category: 'seeds', tier: 'medium' },
  { id: 5281, name: 'Cadantine seed', category: 'seeds', tier: 'medium' },
  { id: 5297, name: 'Kwuarm seed', category: 'seeds', tier: 'medium' },
  { id: 5299, name: 'Avantoe seed', category: 'seeds', tier: 'medium' },
  
  // Food - Common
  { id: 385, name: 'Shark', category: 'food', tier: 'high' },
  { id: 391, name: 'Manta ray', category: 'food', tier: 'high' },
  { id: 7946, name: 'Monkfish', category: 'food', tier: 'high' },
  { id: 379, name: 'Lobster', category: 'food', tier: 'high' },
  { id: 373, name: 'Swordfish', category: 'food', tier: 'high' },
  { id: 361, name: 'Tuna', category: 'food', tier: 'medium' },
  { id: 13441, name: 'Anglerfish', category: 'food', tier: 'high' },
  { id: 2140, name: 'Cooked karambwan', category: 'food', tier: 'high' },
  
  // Potions - Common
  { id: 3024, name: 'Super attack(4)', category: 'potions', tier: 'high' },
  { id: 3026, name: 'Super attack(3)', category: 'potions', tier: 'high' },
  { id: 3016, name: 'Super strength(4)', category: 'potions', tier: 'high' },
  { id: 3018, name: 'Super strength(3)', category: 'potions', tier: 'high' },
  { id: 3040, name: 'Super defence(4)', category: 'potions', tier: 'high' },
  { id: 3042, name: 'Super defence(3)', category: 'potions', tier: 'high' },
  { id: 113, name: 'Prayer potion(4)', category: 'potions', tier: 'high' },
  { id: 115, name: 'Prayer potion(3)', category: 'potions', tier: 'high' },
  { id: 3032, name: 'Super restore(4)', category: 'potions', tier: 'high' },
  { id: 3034, name: 'Super restore(3)', category: 'potions', tier: 'high' },
  { id: 2436, name: 'Super attack(1)', category: 'potions', tier: 'medium' },
  { id: 2440, name: 'Super strength(1)', category: 'potions', tier: 'medium' },
  { id: 2442, name: 'Super defence(1)', category: 'potions', tier: 'medium' },
  { id: 139, name: 'Ranging potion(4)', category: 'potions', tier: 'high' },
  { id: 141, name: 'Ranging potion(3)', category: 'potions', tier: 'medium' },
  { id: 3003, name: 'Magic potion(4)', category: 'potions', tier: 'medium' },
  { id: 12695, name: 'Super combat potion(4)', category: 'potions', tier: 'high' },
  { id: 12697, name: 'Super combat potion(3)', category: 'potions', tier: 'high' },
  { id: 21978, name: 'Stamina potion(4)', category: 'potions', tier: 'high' },
  { id: 21981, name: 'Stamina potion(3)', category: 'potions', tier: 'high' },
  { id: 21984, name: 'Stamina potion(2)', category: 'potions', tier: 'high' },
  { id: 21987, name: 'Stamina potion(1)', category: 'potions', tier: 'high' },
  
  // Runes - High Volume
  { id: 554, name: 'Fire rune', category: 'runes', tier: 'high' },
  { id: 555, name: 'Water rune', category: 'runes', tier: 'high' },
  { id: 556, name: 'Air rune', category: 'runes', tier: 'high' },
  { id: 557, name: 'Earth rune', category: 'runes', tier: 'high' },
  { id: 558, name: 'Mind rune', category: 'runes', tier: 'high' },
  { id: 559, name: 'Body rune', category: 'runes', tier: 'high' },
  { id: 560, name: 'Death rune', category: 'runes', tier: 'high' },
  { id: 561, name: 'Nature rune', category: 'runes', tier: 'high' },
  { id: 562, name: 'Chaos rune', category: 'runes', tier: 'high' },
  { id: 563, name: 'Law rune', category: 'runes', tier: 'high' },
  { id: 564, name: 'Cosmic rune', category: 'runes', tier: 'high' },
  { id: 565, name: 'Blood rune', category: 'runes', tier: 'high' },
  { id: 566, name: 'Soul rune', category: 'runes', tier: 'high' },
  { id: 9075, name: 'Astral rune', category: 'runes', tier: 'high' },
  { id: 21880, name: 'Wrath rune', category: 'runes', tier: 'medium' },
  
  // Unfinished Potions
  { id: 91, name: 'Guam potion (unf)', category: 'potions', tier: 'medium' },
  { id: 93, name: 'Marrentill potion (unf)', category: 'potions', tier: 'medium' },
  { id: 95, name: 'Tarromin potion (unf)', category: 'potions', tier: 'medium' },
  { id: 97, name: 'Harralander potion (unf)', category: 'potions', tier: 'medium' },
  { id: 99, name: 'Ranarr potion (unf)', category: 'potions', tier: 'high' },
  { id: 101, name: 'Irit potion (unf)', category: 'potions', tier: 'medium' },
  { id: 103, name: 'Avantoe potion (unf)', category: 'potions', tier: 'medium' },
  { id: 105, name: 'Kwuarm potion (unf)', category: 'potions', tier: 'medium' },
  { id: 107, name: 'Cadantine potion (unf)', category: 'potions', tier: 'medium' },
  { id: 109, name: 'Dwarf weed potion (unf)', category: 'potions', tier: 'medium' },
  { id: 111, name: 'Torstol potion (unf)', category: 'potions', tier: 'high' },
  
  // Planks & Construction
  { id: 960, name: 'Plank', category: 'skilling', tier: 'high' },
  { id: 8778, name: 'Oak plank', category: 'skilling', tier: 'high' },
  { id: 8780, name: 'Teak plank', category: 'skilling', tier: 'high' },
  { id: 8782, name: 'Mahogany plank', category: 'skilling', tier: 'high' },
  
  // Bones
  { id: 526, name: 'Bones', category: 'skilling', tier: 'medium' },
  { id: 532, name: 'Big bones', category: 'skilling', tier: 'medium' },
  { id: 534, name: 'Babydragon bones', category: 'skilling', tier: 'medium' },
  { id: 536, name: 'Dragon bones', category: 'skilling', tier: 'high' },
  { id: 6729, name: 'Dagannoth bones', category: 'skilling', tier: 'medium' },
  { id: 3125, name: 'Lava dragon bones', category: 'skilling', tier: 'medium' },
  { id: 21975, name: 'Superior dragon bones', category: 'skilling', tier: 'medium' },
  { id: 534, name: 'Wyvern bones', category: 'skilling', tier: 'medium' },
  
  // Hides & Leathers
  { id: 1739, name: 'Cowhide', category: 'resources', tier: 'high' },
  { id: 1741, name: 'Leather', category: 'resources', tier: 'high' },
  { id: 1743, name: 'Hard leather', category: 'resources', tier: 'medium' },
  { id: 1745, name: 'Green dragonhide', category: 'resources', tier: 'high' },
  { id: 1747, name: 'Blue dragonhide', category: 'resources', tier: 'high' },
  { id: 1749, name: 'Red dragonhide', category: 'resources', tier: 'high' },
  { id: 1751, name: 'Black dragonhide', category: 'resources', tier: 'high' },
  { id: 2505, name: 'Green dragon leather', category: 'resources', tier: 'high' },
  { id: 2507, name: 'Blue dragon leather', category: 'resources', tier: 'high' },
  { id: 2509, name: 'Red dragon leather', category: 'resources', tier: 'high' },
  { id: 2511, name: 'Black dragon leather', category: 'resources', tier: 'high' },
  
  // Gems
  { id: 1623, name: 'Uncut sapphire', category: 'resources', tier: 'medium' },
  { id: 1621, name: 'Uncut emerald', category: 'resources', tier: 'medium' },
  { id: 1619, name: 'Uncut ruby', category: 'resources', tier: 'medium' },
  { id: 1617, name: 'Uncut diamond', category: 'resources', tier: 'high' },
  { id: 1631, name: 'Uncut dragonstone', category: 'resources', tier: 'high' },
  { id: 6571, name: 'Uncut onyx', category: 'resources', tier: 'high' },
  { id: 19496, name: 'Uncut zenyte', category: 'resources', tier: 'high' },
  
  // Fletching Supplies
  { id: 52, name: 'Arrow shaft', category: 'skilling', tier: 'medium' },
  { id: 53, name: 'Headless arrow', category: 'skilling', tier: 'high' },
  { id: 314, name: 'Feather', category: 'resources', tier: 'high' },
  { id: 946, name: 'Knife', category: 'other', tier: 'low' },
  { id: 1777, name: 'Bow string', category: 'skilling', tier: 'high' },
  { id: 50, name: 'Willow shortbow (u)', category: 'skilling', tier: 'medium' },
  { id: 48, name: 'Willow longbow (u)', category: 'skilling', tier: 'medium' },
  { id: 54, name: 'Maple shortbow (u)', category: 'skilling', tier: 'medium' },
  { id: 56, name: 'Maple longbow (u)', category: 'skilling', tier: 'medium' },
  { id: 58, name: 'Yew shortbow (u)', category: 'skilling', tier: 'medium' },
  { id: 66, name: 'Yew longbow (u)', category: 'skilling', tier: 'medium' },
  { id: 70, name: 'Magic shortbow (u)', category: 'skilling', tier: 'medium' },
  { id: 68, name: 'Magic longbow (u)', category: 'skilling', tier: 'medium' },
  
  // Ammunition
  { id: 892, name: 'Rune arrow', category: 'combat', tier: 'high' },
  { id: 890, name: 'Adamant arrow', category: 'combat', tier: 'medium' },
  { id: 888, name: 'Mithril arrow', category: 'combat', tier: 'medium' },
  { id: 4740, name: 'Bolt rack', category: 'combat', tier: 'medium' },
  { id: 9140, name: 'Diamond bolts (e)', category: 'combat', tier: 'high' },
  { id: 9244, name: 'Dragonstone bolts (e)', category: 'combat', tier: 'high' },
  { id: 9245, name: 'Onyx bolts (e)', category: 'combat', tier: 'high' },
  { id: 11230, name: 'Dragon arrow', category: 'combat', tier: 'high' },
  { id: 21326, name: 'Dragon arrow(p++)', category: 'combat', tier: 'high' },
  
  // Miscellaneous High-Value
  { id: 537, name: 'Dragon bones', category: 'skilling', tier: 'high' },
  { id: 1755, name: 'Chisel', category: 'other', tier: 'low' },
  { id: 2347, name: 'Hammer', category: 'other', tier: 'low' },
  { id: 1925, name: 'Bucket of sand', category: 'resources', tier: 'high' },
  { id: 1783, name: 'Seaweed', category: 'resources', tier: 'medium' },
  { id: 1775, name: 'Molten glass', category: 'resources', tier: 'high' },
  { id: 6693, name: 'Coconut', category: 'food', tier: 'medium' },
  { id: 2109, name: 'Steel nails', category: 'skilling', tier: 'medium' },
  { id: 4819, name: 'Amylase crystal', category: 'resources', tier: 'high' },
  { id: 12934, name: 'Zulrah\'s scales', category: 'resources', tier: 'high' },
  { id: 12929, name: 'Serpentine visage', category: 'combat', tier: 'high' },
  { id: 6585, name: 'Amulet of fury', category: 'combat', tier: 'high' },
  { id: 19547, name: 'Amulet of torture', category: 'combat', tier: 'high' },
  { id: 19553, name: 'Necklace of anguish', category: 'combat', tier: 'high' },
  { id: 19550, name: 'Tormented bracelet', category: 'combat', tier: 'high' },
  { id: 11773, name: 'Berserker ring', category: 'combat', tier: 'high' },
  { id: 6737, name: 'Berserker ring (i)', category: 'combat', tier: 'high' },
  { id: 11771, name: 'Warrior ring', category: 'combat', tier: 'medium' },
  { id: 11770, name: 'Seers ring', category: 'combat', tier: 'medium' },
  { id: 11772, name: 'Archers ring', category: 'combat', tier: 'high' },
  { id: 12601, name: 'Brimstone ring', category: 'combat', tier: 'high' },
  
  // Elite items
  { id: 13239, name: 'Primordial crystal', category: 'combat', tier: 'high' },
  { id: 13229, name: 'Pegasian crystal', category: 'combat', tier: 'high' },
  { id: 13235, name: 'Eternal crystal', category: 'combat', tier: 'high' },
  { id: 13226, name: 'Primordial boots', category: 'combat', tier: 'high' },
  { id: 13237, name: 'Pegasian boots', category: 'combat', tier: 'high' },
  { id: 13235, name: 'Eternal boots', category: 'combat', tier: 'high' },
  
  // Godwars items
  { id: 11724, name: 'Armadyl helmet', category: 'combat', tier: 'high' },
  { id: 11718, name: 'Armadyl crossbow', category: 'combat', tier: 'high' },
  { id: 11720, name: 'Armadyl hilt', category: 'combat', tier: 'high' },
  { id: 11722, name: 'Bandos chestplate', category: 'combat', tier: 'high' },
  { id: 11724, name: 'Bandos tassets', category: 'combat', tier: 'high' },
  { id: 11726, name: 'Bandos boots', category: 'combat', tier: 'medium' },
  { id: 11728, name: 'Saradomin sword', category: 'combat', tier: 'medium' },
  { id: 11730, name: 'Saradomin\'s light', category: 'combat', tier: 'medium' },
  { id: 11732, name: 'Zamorakian spear', category: 'combat', tier: 'medium' },
  { id: 11734, name: 'Staff of the dead', category: 'combat', tier: 'high' },
  
  // Wilderness weapons
  { id: 11061, name: 'Dragon pickaxe', category: 'skilling', tier: 'high' },
  { id: 20014, name: 'Crystal pickaxe', category: 'skilling', tier: 'high' },
  { id: 13265, name: 'Tyrannical ring', category: 'combat', tier: 'medium' },
  { id: 13263, name: 'Treasonous ring', category: 'combat', tier: 'medium' },
  { id: 13261, name: 'Ring of the gods', category: 'combat', tier: 'medium' },
  
  // Skilling Outfits & Tools
  { id: 12013, name: 'Trident of the seas', category: 'combat', tier: 'high' },
  { id: 12899, name: 'Trident of the swamp', category: 'combat', tier: 'high' },
  { id: 6739, name: 'Dragon axe', category: 'skilling', tier: 'high' },
  { id: 20011, name: 'Crystal axe', category: 'skilling', tier: 'medium' },
  { id: 21003, name: 'Elder maul', category: 'combat', tier: 'high' },
  { id: 21000, name: 'Twisted buckler', category: 'combat', tier: 'high' },
  { id: 20997, name: 'Dragon claws', category: 'combat', tier: 'high' },
  { id: 20000, name: 'Dragon sword', category: 'combat', tier: 'medium' },
];

/**
 * Get items by tier for prioritized analysis
 */
export function getItemsByTier(tier: 'high' | 'medium' | 'low'): ItemPoolEntry[] {
  return EXPANDED_ITEM_POOL.filter(item => item.tier === tier);
}

/**
 * Get items by category
 */
export function getItemsByCategory(category: ItemPoolEntry['category']): ItemPoolEntry[] {
  return EXPANDED_ITEM_POOL.filter(item => item.category === category);
}

/**
 * Get all items for analysis (combines with popular items)
 */
export function getAllAnalysisItems(): Array<{ id: number; name: string }> {
  return EXPANDED_ITEM_POOL.map(item => ({
    id: item.id,
    name: item.name,
  }));
}
