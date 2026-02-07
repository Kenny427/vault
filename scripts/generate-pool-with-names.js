const fs = require('fs');
const https = require('https');

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
console.log(`⏳ Fetching item names from OSRS Wiki API...`);

// Fetch all items from OSRS Wiki API
const options = {
  hostname: 'prices.runescape.wiki',
  path: '/api/v1/osrs/mapping',
  headers: {
    'User-Agent': 'OSRS Flipping Dashboard'
  }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const allItems = JSON.parse(data);
      const itemMap = new Map(allItems.map(item => [item.id, item.name]));
      
      console.log(`✅ Fetched ${allItems.length} items from API`);
      console.log(`🔍 Mapping names for your ${itemIds.length} items...`);

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
      sql.push('-- OPTIMIZED ITEM POOL (with real item names)');
      sql.push('-- Generated: ' + new Date().toISOString());
      sql.push('--');
      sql.push('BEGIN;');
      sql.push('');

      let found = 0;
      let notFound = 0;

      for (const id of itemIds) {
        const itemName = itemMap.get(id) || `Item ${id}`;
        if (itemMap.has(id)) {
          found++;
        } else {
          notFound++;
        }

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

      console.log(`✅ Generated optimized-pool-full-categorized.sql`);
      console.log(`📊 Item names found: ${found}/${itemIds.length}`);
      if (notFound > 0) {
        console.log(`⚠️  Items without names (will show as "Item [ID]"): ${notFound}`);
      }
    } catch (error) {
      console.error('❌ Error parsing API response:', error);
      process.exit(1);
    }
  });
}).on('error', err => {
  console.error('❌ Network error:', err);
  process.exit(1);
});
