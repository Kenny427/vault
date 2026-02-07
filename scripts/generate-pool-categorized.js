const fs = require('fs');

// Load item IDs
const itemIdsRaw = fs.readFileSync('./itemids.json', 'utf-8');
const itemIds = itemIdsRaw
  .split('\n')
  .map(line => line.trim())
  .filter(line => line && !isNaN(parseInt(line)))
  .map(line => parseInt(line));

console.log(`✅ Loaded ${itemIds.length} item IDs`);

// OSRS Item mapping with category and bot likelihood
const itemMapping = {
  // RUNES - Very High Bot Activity
  563: { name: "Law rune", category: "Runes", botLikelihood: "very_high", volume: "massive" },
  560: { name: "Death rune", category: "Runes", botLikelihood: "very_high", volume: "massive" },
  565: { name: "Blood rune", category: "Runes", botLikelihood: "very_high", volume: "massive" },
  566: { name: "Soul rune", category: "Runes", botLikelihood: "very_high", volume: "high" },
  9075: { name: "Astral rune", category: "Runes", botLikelihood: "very_high", volume: "high" },
  21880: { name: "Wrath rune", category: "Runes", botLikelihood: "high", volume: "high" },
  556: { name: "Air rune", category: "Runes", botLikelihood: "very_high", volume: "massive" },
  558: { name: "Water rune", category: "Runes", botLikelihood: "very_high", volume: "massive" },
  557: { name: "Earth rune", category: "Runes", botLikelihood: "very_high", volume: "massive" },
  554: { name: "Fire rune", category: "Runes", botLikelihood: "very_high", volume: "massive" },
  561: { name: "Chaos rune", category: "Runes", botLikelihood: "high", volume: "high" },
  562: { name: "Nature rune", category: "Runes", botLikelihood: "high", volume: "high" },
  564: { name: "Cosmic rune", category: "Runes", botLikelihood: "high", volume: "high" },

  // AMMUNITION - High Bot Activity
  11875: { name: "Broad bolts", category: "Ammunition", botLikelihood: "very_high", volume: "massive" },
  892: { name: "Rune arrow", category: "Ammunition", botLikelihood: "high", volume: "massive" },
  9144: { name: "Runite bolts", category: "Ammunition", botLikelihood: "high", volume: "high" },
  21316: { name: "Amethyst broad bolts", category: "Ammunition", botLikelihood: "high", volume: "high" },
  25849: { name: "Amethyst dart", category: "Ammunition", botLikelihood: "high", volume: "high" },
  21326: { name: "Amethyst arrow", category: "Ammunition", botLikelihood: "high", volume: "high" },
  811: { name: "Rune dart", category: "Ammunition", botLikelihood: "high", volume: "high" },
  9243: { name: "Diamond bolts (e)", category: "Ammunition", botLikelihood: "high", volume: "high" },
  9242: { name: "Ruby bolts (e)", category: "Ammunition", botLikelihood: "high", volume: "high" },
  11212: { name: "Dragon arrow", category: "Ammunition", botLikelihood: "medium", volume: "high" },
  11230: { name: "Dragon dart", category: "Ammunition", botLikelihood: "medium", volume: "high" },
  21905: { name: "Dragon bolts", category: "Ammunition", botLikelihood: "medium", volume: "high" },
  21944: { name: "Ruby dragon bolts (e)", category: "Ammunition", botLikelihood: "medium", volume: "high" },
  21946: { name: "Diamond dragon bolts (e)", category: "Ammunition", botLikelihood: "medium", volume: "high" },
  10033: { name: "Chinchompa", category: "Ammunition", botLikelihood: "very_high", volume: "high" },
  10034: { name: "Red chinchompa", category: "Ammunition", botLikelihood: "very_high", volume: "high" },
  11959: { name: "Black chinchompa", category: "Ammunition", botLikelihood: "very_high", volume: "high" },

  // LOGS - Very High Bot Activity
  1513: { name: "Magic logs", category: "Resources", botLikelihood: "very_high", volume: "massive" },
  1515: { name: "Yew logs", category: "Resources", botLikelihood: "very_high", volume: "massive" },
  6332: { name: "Mahogany logs", category: "Resources", botLikelihood: "high", volume: "high" },
  1519: { name: "Willow logs", category: "Resources", botLikelihood: "high", volume: "high" },
  1521: { name: "Oak logs", category: "Resources", botLikelihood: "high", volume: "high" },
  1517: { name: "Maple logs", category: "Resources", botLikelihood: "high", volume: "high" },
  6333: { name: "Teak logs", category: "Resources", botLikelihood: "high", volume: "high" },

  // ORES & BARS - High Bot Activity
  453: { name: "Coal", category: "Resources", botLikelihood: "very_high", volume: "massive" },
  451: { name: "Runite ore", category: "Resources", botLikelihood: "high", volume: "high" },
  449: { name: "Adamantite ore", category: "Resources", botLikelihood: "high", volume: "high" },
  440: { name: "Iron ore", category: "Resources", botLikelihood: "very_high", volume: "massive" },
  2363: { name: "Runite bar", category: "Resources", botLikelihood: "high", volume: "high" },
  2361: { name: "Adamantite bar", category: "Resources", botLikelihood: "high", volume: "high" },
  2353: { name: "Steel bar", category: "Resources", botLikelihood: "high", volume: "massive" },
  2359: { name: "Mithril bar", category: "Resources", botLikelihood: "high", volume: "high" },

  // HERBS - High Bot Activity
  257: { name: "Ranarr weed", category: "Herbs", botLikelihood: "very_high", volume: "high" },
  3051: { name: "Grimy snapdragon", category: "Herbs", botLikelihood: "very_high", volume: "high" },
  3000: { name: "Snapdragon", category: "Herbs", botLikelihood: "high", volume: "high" },
  205: { name: "Grimy harralander", category: "Herbs", botLikelihood: "high", volume: "high" },
  255: { name: "Harralander", category: "Herbs", botLikelihood: "high", volume: "high" },
  213: { name: "Grimy kwuarm", category: "Herbs", botLikelihood: "high", volume: "high" },
  263: { name: "Kwuarm", category: "Herbs", botLikelihood: "high", volume: "high" },
  207: { name: "Grimy ranarr weed", category: "Herbs", botLikelihood: "very_high", volume: "high" },
  209: { name: "Grimy irit leaf", category: "Herbs", botLikelihood: "high", volume: "high" },
  259: { name: "Irit leaf", category: "Herbs", botLikelihood: "high", volume: "high" },
  215: { name: "Grimy cadantine", category: "Herbs", botLikelihood: "high", volume: "high" },
  265: { name: "Cadantine", category: "Herbs", botLikelihood: "high", volume: "high" },
  217: { name: "Grimy dwarf weed", category: "Herbs", botLikelihood: "high", volume: "high" },
  219: { name: "Grimy torstol", category: "Herbs", botLikelihood: "medium", volume: "high" },
  269: { name: "Torstol", category: "Herbs", botLikelihood: "medium", volume: "high" },
  211: { name: "Grimy avantoe", category: "Herbs", botLikelihood: "high", volume: "high" },
  2485: { name: "Grimy lantadyme", category: "Herbs", botLikelihood: "high", volume: "high" },
  3049: { name: "Grimy toadflax", category: "Herbs", botLikelihood: "high", volume: "high" },
  261: { name: "Avantoe", category: "Herbs", botLikelihood: "high", volume: "high" },

  // BONES - High Bot Activity
  536: { name: "Dragon bones", category: "Bones", botLikelihood: "high", volume: "high" },
  22124: { name: "Superior dragon bones", category: "Bones", botLikelihood: "medium", volume: "medium" },
  6812: { name: "Wyvern bones", category: "Bones", botLikelihood: "medium", volume: "medium" },
  534: { name: "Babydragon bones", category: "Bones", botLikelihood: "medium", volume: "medium" },

  // POTIONS - High Demand
  2434: { name: "Prayer potion(4)", category: "Potions", botLikelihood: "medium", volume: "high" },
  3024: { name: "Super restore(4)", category: "Potions", botLikelihood: "medium", volume: "high" },
  2444: { name: "Ranging potion(4)", category: "Potions", botLikelihood: "medium", volume: "high" },
  12695: { name: "Super combat potion(4)", category: "Potions", botLikelihood: "low", volume: "medium" },
  6685: { name: "Saradomin brew(4)", category: "Potions", botLikelihood: "low", volume: "medium" },
  12625: { name: "Stamina potion(4)", category: "Potions", botLikelihood: "low", volume: "medium" },

  // FOOD - Medium Bot Activity
  379: { name: "Lobster", category: "Food", botLikelihood: "high", volume: "high" },
  385: { name: "Shark", category: "Food", botLikelihood: "high", volume: "high" },
  391: { name: "Manta ray", category: "Food", botLikelihood: "high", volume: "high" },
  383: { name: "Raw shark", category: "Food", botLikelihood: "high", volume: "high" },
  3144: { name: "Cooked karambwan", category: "Food", botLikelihood: "medium", volume: "high" },
  13441: { name: "Anglerfish", category: "Food", botLikelihood: "high", volume: "high" },

  // SECONDARIES - High Bot Activity
  225: { name: "Limpwurt root", category: "Secondaries", botLikelihood: "high", volume: "high" },
  231: { name: "Snape grass", category: "Secondaries", botLikelihood: "high", volume: "high" },
  239: { name: "White berries", category: "Secondaries", botLikelihood: "high", volume: "high" },
  223: { name: "Red spiders' eggs", category: "Secondaries", botLikelihood: "high", volume: "high" },

  // HIDES & LEATHER
  1751: { name: "Blue dragonhide", category: "Resources", botLikelihood: "high", volume: "high" },
  1753: { name: "Green dragonhide", category: "Resources", botLikelihood: "high", volume: "high" },
  1747: { name: "Black dragonhide", category: "Resources", botLikelihood: "high", volume: "high" },
  1749: { name: "Red dragonhide", category: "Resources", botLikelihood: "high", volume: "high" },
  2507: { name: "Red dragon leather", category: "Resources", botLikelihood: "medium", volume: "medium" },
  2505: { name: "Blue dragon leather", category: "Resources", botLikelihood: "medium", volume: "medium" },
  2509: { name: "Black dragon leather", category: "Resources", botLikelihood: "medium", volume: "medium" },
  1745: { name: "Green dragon leather", category: "Resources", botLikelihood: "medium", volume: "high" },

  // WEAPONS & ARMOR
  859: { name: "Magic longbow", category: "Crafted", botLikelihood: "medium", volume: "high" },
  1391: { name: "Battlestaff", category: "Crafted", botLikelihood: "medium", volume: "high" },
  855: { name: "Yew longbow", category: "Crafted", botLikelihood: "medium", volume: "high" },
  70: { name: "Magic longbow(u)", category: "Crafted", botLikelihood: "low", volume: "high" },
  66: { name: "Yew longbow(u)", category: "Crafted", botLikelihood: "low", volume: "high" },
};

// Priority calculation
function getPriority(item) {
  let priority = 50; // Base
  
  // Bot likelihood bonus
  if (item.botLikelihood === "very_high") priority += 35;
  else if (item.botLikelihood === "high") priority += 20;
  else if (item.botLikelihood === "medium") priority += 10;
  
  // Volume bonus
  if (item.volume === "massive") priority += 15;
  else if (item.volume === "high") priority += 10;
  
  // Category bonus
  if (item.category === "Runes") priority += 10;
  else if (item.category === "Ammunition") priority += 8;
  else if (item.category === "Resources") priority += 5;
  
  return Math.min(Math.max(priority, 50), 95); // Clamp 50-95
}

// Tags generation
function getTags(item) {
  const tags = [];
  
  // Category tag
  tags.push(item.category.toLowerCase());
  
  // Bot likelihood tag
  if (item.botLikelihood === "very_high") tags.push("very_high_bot");
  else if (item.botLikelihood === "high") tags.push("high_bot");
  else if (item.botLikelihood === "medium") tags.push("medium_bot");
  else tags.push("low_bot");
  
  // Volume tag
  if (item.volume === "massive") tags.push("massive_volume");
  else if (item.volume === "high") tags.push("high_volume");
  else tags.push("medium_volume");
  
  // Demand type
  if (item.category === "Potions" || item.category === "Food") tags.push("pvm");
  else if (item.category === "Resources" || item.category === "Herbs") tags.push("crafting");
  else if (item.category === "Runes") tags.push("runecrafting");
  else if (item.category === "Ammunition") tags.push("pvm");
  
  return tags;
}

// Process items
const sqlLines = itemIds.map(id => {
  const itemData = itemMapping[id] || { name: `Item ${id}`, category: "Resources", botLikelihood: "low", volume: "medium" };
  const escapedName = itemData.name.replace(/'/g, "''");
  const priority = getPriority(itemData);
  const tags = getTags(itemData);
  const tagsJson = JSON.stringify(tags).replace(/"/g, '\\"');
  
  return `INSERT INTO custom_pool_items (item_id, item_name, category, priority, tags, enabled, added_date) VALUES (${id}, '${escapedName}', '${itemData.category}', ${priority}, '"[${tags.map(t => `\\"${t}\\"`).join(', ')}]"'::jsonb, true, NOW());`;
});

const sqlContent = `-- OPTIMIZED ITEM POOL (${itemIds.length} items)
-- Volume Threshold: > 10,000 daily units
-- Price Threshold: >= 50gp
-- Generated: ${new Date().toISOString()}
--
-- Total items: ${itemIds.length}
-- Categories: Runes, Ammunition, Resources, Herbs, Bones, Potions, Food, Secondaries, Crafted
-- Priority: 50-95 (based on bot likelihood + volume)
-- Tags: Automatically assigned based on item type and characteristics
--
-- INSTRUCTIONS:
-- 1. Copy this entire SQL script
-- 2. Go to: https://supabase.com → Your Project → SQL Editor
-- 3. Paste and run it (wrapped in transaction)
-- 4. Verify: SELECT COUNT(*) FROM custom_pool_items WHERE enabled = true;

BEGIN;

${sqlLines.join('\n')}

COMMIT;

-- To rollback if needed: ROLLBACK;`;

fs.writeFileSync('./optimized-pool-full-categorized.sql', sqlContent);
console.log(`✅ Generated: optimized-pool-full-categorized.sql (${itemIds.length} items with categories, priority, and tags)`);
console.log(`   File size: ${Math.round(sqlContent.length / 1024)}KB`);
console.log(`\n📊 PRIORITY SCALE:`);
console.log(`   50:  Base (low bot, medium volume)`);
console.log(`   60:  Medium bot + medium volume`);
console.log(`   70:  High bot + high volume`);
console.log(`   85:  Very high bot + massive volume`);
console.log(`   95:  Max priority (Runes with very high bot + massive volume)`);
