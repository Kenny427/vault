const fs = require('fs');

// Read item IDs
const idsFile = './itemids.json';
if (!fs.existsSync(idsFile)) {
  console.error(`❌ ${idsFile} not found`);
  process.exit(1);
}

const itemIds = fs.readFileSync(idsFile, 'utf-8')
  .split('\n')
  .map(line => parseInt(line.trim()))
  .filter(id => !isNaN(id));

console.log(`✅ Loaded ${itemIds.length} item IDs`);

// Item name mapping (known items)
const itemNameMap = {
  553: 'Mind Rune', 554: 'Water Rune', 555: 'Air Rune', 556: 'Fire Rune', 557: 'Earth Rune',
  558: 'Body Rune', 559: 'Cosmic Rune', 560: 'Chaos Rune', 561: 'Nature Rune', 562: 'Law Rune',
  // Add more as needed - most will default to "Item [ID]"
};

// Categories and priorities
function getCategory(id) {
  // Simple heuristics based on item ID ranges
  if (id >= 553 && id <= 564) return 'Runes';
  if (id >= 4740 && id <= 4748) return 'Ammunition';
  if ((id >= 5 && id <= 12) || id === 1511 || id === 1512) return 'Food';
  if ((id >= 227 && id <= 242) || id === 256) return 'Bones';
  if ((id >= 249 && id <= 252) || id === 2003 || id === 221 || id === 245 || id === 247) return 'Potions';
  if ((id >= 249 && id <= 260) || (id >= 2003 && id <= 2090)) return 'Herbs';
  return 'Resources';
}

function getPriority(id) {
  const category = getCategory(id);
  let priority = 50;

  // Category bonus
  if (category === 'Runes') priority += 10;
  else if (category === 'Ammunition') priority += 8;
  else if (category === 'Resources') priority += 5;

  // Volume bonus (approximated by item ID distribution)
  if (id < 5000) priority += 10;

  // Bot likelihood bonus
  if (category === 'Runes') priority += 20;
  else if (category === 'Ammunition') priority += 15;

  return Math.min(95, Math.max(50, priority));
}

function getTags(id) {
  const category = getCategory(id);
  const tags = [];

  // Category tags
  if (category === 'Runes') tags.push('runes');
  else if (category === 'Ammunition') tags.push('ammunition');
  else if (category === 'Herbs') tags.push('herbs');
  else if (category === 'Potions') tags.push('potions');
  else if (category === 'Food') tags.push('food');
  else if (category === 'Bones') tags.push('bones', 'crafting');
  else tags.push('resources', 'crafting');

  // Bot likelihood tag
  if (getPriority(id) >= 75) tags.push('very_high_bot');
  else if (getPriority(id) >= 70) tags.push('high_bot');
  else tags.push('low_bot');

  // Volume tag
  if (getPriority(id) >= 75) tags.push('massive_volume');
  else if (getPriority(id) >= 65) tags.push('high_volume');
  else tags.push('medium_volume');

  return tags;
}

// Generate SQL
const sql = [];
sql.push('-- OPTIMIZED ITEM POOL (text[] format)');
sql.push('-- Generated: ' + new Date().toISOString());
sql.push('--');
sql.push('BEGIN;');
sql.push('');

for (const id of itemIds) {
  const itemName = itemNameMap[id] || `Item ${id}`;
  const category = getCategory(id);
  const priority = getPriority(id);
  const tags = getTags(id);

  // Format tags as PostgreSQL text array: ARRAY['tag1', 'tag2', 'tag3']
  const tagsArray = `ARRAY[${tags.map(tag => `'${tag}'`).join(', ')}]`;

  // Use ON CONFLICT to handle duplicates - update existing items
  const insert = `INSERT INTO custom_pool_items (item_id, item_name, category, priority, tags, enabled) VALUES (${id}, '${itemName.replace(/'/g, "''")}', '${category}', ${priority}, ${tagsArray}, true) ON CONFLICT (item_id) DO UPDATE SET item_name = EXCLUDED.item_name, category = EXCLUDED.category, priority = EXCLUDED.priority, tags = EXCLUDED.tags, enabled = EXCLUDED.enabled;`;
  sql.push(insert);
}

sql.push('');
sql.push('COMMIT;');

// Write to file
const output = sql.join('\n');
fs.writeFileSync('./optimized-pool-full-categorized.sql', output);

console.log(`✅ Generated optimized-pool-full-categorized.sql (${itemIds.length} items)`);
console.log(`📊 Format: ARRAY['tag1', 'tag2', 'tag3'] (PostgreSQL text[])`);
