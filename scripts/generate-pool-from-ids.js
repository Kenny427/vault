const axios = require('axios');
const fs = require('fs');

// Load item IDs from the JSON file
const itemIdsRaw = fs.readFileSync('./itemids.json', 'utf-8');
const itemIds = itemIdsRaw
  .split('\n')
  .map(line => line.trim())
  .filter(line => line && !isNaN(parseInt(line)))
  .map(line => parseInt(line));

console.log(`✅ Loaded ${itemIds.length} item IDs from itemids.json`);

// Create a lookup set for fast checking
const idSet = new Set(itemIds);

async function fetchItemMapping() {
  console.log('\n📦 Fetching item names from Wiki API...');
  
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    try {
      attempts++;
      console.log(`   Attempt ${attempts}/${maxAttempts}...`);
      
      const response = await axios.get('https://services.runescape.wiki/api/m/ge_mapping', {
        timeout: 30000
      });
      
      console.log(`✅ Successfully fetched ${response.data.length} items from Wiki API`);
      return response.data;
    } catch (error) {
      console.log(`   ⚠️  Attempt ${attempts} failed: ${error.message}`);
      if (attempts < maxAttempts) {
        console.log(`   Waiting 3 seconds before retry...`);
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  }
  
  console.error('\n❌ Could not connect to Wiki API after 3 attempts');
  console.error('   Network may be unavailable or Wiki API is down');
  process.exit(1);
}

async function generatePool() {
  const allItems = await fetchItemMapping();
  
  // Filter to only items in our ID list
  const poolItems = allItems.filter(item => idSet.has(item.id));
  
  console.log(`\n🎯 Matched items: ${poolItems.length} / ${itemIds.length}`);
  
  if (poolItems.length === 0) {
    console.error('❌ No items matched! Check item IDs.');
    process.exit(1);
  }
  
  // Generate SQL
  const sqlLines = poolItems.map(item => {
    const escapedName = item.name.replace(/'/g, "''");
    return `INSERT INTO custom_pool_items (item_id, item_name, category, enabled, added_date) VALUES (${item.id}, '${escapedName}', 'resources', true, NOW());`;
  });
  
  const sqlContent = `-- OPTIMIZED ITEM POOL (${poolItems.length} items)
-- Volume Threshold: > 10,000 daily units
-- Price Threshold: >= 50gp
-- Generated: ${new Date().toISOString()}
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

  fs.writeFileSync('./optimized-pool-full.sql', sqlContent);
  
  // Generate CSV
  const csvContent = `Item ID,Item Name\n${poolItems.map(item => `${item.id},"${item.name}"`).join('\n')}`;
  fs.writeFileSync('./optimized-pool-full.csv', csvContent);
  
  console.log(`\n✅ GENERATED FILES:`);
  console.log(`   📄 optimized-pool-full.sql (${poolItems.length} INSERT statements)`);
  console.log(`   📄 optimized-pool-full.csv (reference spreadsheet)`);
  
  console.log(`\n📊 POOL DETAILS:`);
  console.log(`   Total items: ${poolItems.length}`);
  console.log(`   Ready for Supabase import: YES ✅`);
  
  console.log(`\n🚀 NEXT STEPS:`);
  console.log(`   1. Open optimized-pool-full.sql`);
  console.log(`   2. Copy all content`);
  console.log(`   3. Go to Supabase → SQL Editor`);
  console.log(`   4. Paste and run`);
  console.log(`   5. Done! Your pool is updated with ${poolItems.length} items`);
}

generatePool().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
