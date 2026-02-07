const axios = require('axios');
const fs = require('fs');

// Rate limiting
const RATE_LIMIT_MS = 100; // ms between API calls
let lastRequestTime = 0;

async function rateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    await new Promise(r => setTimeout(r, RATE_LIMIT_MS - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();
}

async function fetchItemMapping() {
  console.log('📦 Fetching all items from Wiki API mapping...');
  await rateLimit();
  
  try {
    const response = await axios.get('https://services.runescape.wiki/api/m/ge_mapping');
    console.log(`✅ Found ${response.data.length} total tradeable items`);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch item mapping:', error.message);
    return [];
  }
}

async function getItemData(itemId, itemName) {
  await rateLimit();
  
  try {
    const response = await axios.get(
      `https://services.runescape.wiki/api/m/ge/timeseries?item=${itemId}&timestep=24h`
    );
    
    if (!response.data || response.data.length === 0) {
      return null;
    }

    // Get the most recent price and calculate daily volume
    const latestData = response.data[response.data.length - 1];
    const currentPrice = latestData.avgHighPrice || latestData.avgLowPrice || 0;
    
    // Daily volume = sum of high and low volumes for the 24h period
    const dailyVolume = (latestData.highPriceVolume || 0) + (latestData.lowPriceVolume || 0);

    return {
      itemId,
      itemName,
      currentPrice,
      dailyVolume
    };
  } catch (error) {
    return null;
  }
}

async function generateOptimizedPool() {
  const items = await fetchItemMapping();
  
  if (items.length === 0) {
    console.error('⚠️ No items fetched, aborting');
    return;
  }

  const MIN_VOLUME = 10000;
  const MIN_PRICE = 50;
  
  console.log(`\n🔍 Filtering items: Volume > ${MIN_VOLUME.toLocaleString()} && Price >= ${MIN_PRICE}gp`);
  console.log(`\n⏳ Fetching price data for ${items.length} items (this will take ~${Math.ceil(items.length * 0.1 / 60)} minutes)...`);

  const qualifiedItems = [];
  let processed = 0;
  let skipped = 0;
  
  for (const item of items) {
    processed++;
    
    if (processed % 100 === 0) {
      console.log(`   Progress: ${processed}/${items.length} (${qualifiedItems.length} qualified so far)`);
    }

    const data = await getItemData(item.id, item.name);
    
    if (!data) {
      skipped++;
      continue;
    }

    // Apply filters
    if (data.dailyVolume >= MIN_VOLUME && data.currentPrice >= MIN_PRICE) {
      qualifiedItems.push(data);
    }
  }

  console.log(`\n✅ Complete!`);
  console.log(`   Total items processed: ${processed}`);
  console.log(`   Items skipped (no data): ${skipped}`);
  console.log(`   Items qualified: ${qualifiedItems.length}`);

  // Sort by daily volume descending
  qualifiedItems.sort((a, b) => b.dailyVolume - a.dailyVolume);

  // Generate SQL
  const sqlLines = qualifiedItems.map(item => {
    const escapedName = item.itemName.replace(/'/g, "''");
    return `INSERT INTO custom_pool_items (item_id, item_name, category, enabled, added_date) VALUES (${item.itemId}, '${escapedName}', 'resources', true, NOW());`;
  });

  const sqlContent = `-- Optimized Pool: Items with Volume > 10k && Price >= 50gp
-- Generated: ${new Date().toISOString()}
-- Total items: ${qualifiedItems.length}

BEGIN;

${sqlLines.join('\n')}

COMMIT;`;

  // Save SQL file
  const sqlFilePath = './optimized-pool.sql';
  fs.writeFileSync(sqlFilePath, sqlContent);
  console.log(`\n📄 SQL generated: ${sqlFilePath}`);

  // Save CSV for reference
  const csvContent = `Item Name,Item ID,Daily Volume,Price (gp)\n${qualifiedItems.map(
    item => `"${item.itemName}",${item.itemId},${item.dailyVolume},${item.currentPrice}`
  ).join('\n')}`;

  const csvFilePath = './optimized-pool.csv';
  fs.writeFileSync(csvFilePath, csvContent);
  console.log(`📄 CSV reference: ${csvFilePath}`);

  // Print summary
  console.log(`\n📊 SUMMARY:`);
  console.log(`   Total qualified items: ${qualifiedItems.length}`);
  console.log(`   Total daily volume: ${qualifiedItems.reduce((sum, i) => sum + i.dailyVolume, 0).toLocaleString()} units`);
  console.log(`   Average volume per item: ${Math.round(qualifiedItems.reduce((sum, i) => sum + i.dailyVolume, 0) / qualifiedItems.length).toLocaleString()} units`);
  
  // Top 10
  console.log(`\n🏆 TOP 10 ITEMS BY VOLUME:`);
  qualifiedItems.slice(0, 10).forEach((item, idx) => {
    console.log(`   ${idx + 1}. ${item.itemName} (ID: ${item.itemId}): ${item.dailyVolume.toLocaleString()} vol @ ${item.currentPrice}gp`);
  });

  console.log(`\n✨ Ready to import! Copy the SQL from optimized-pool.sql into Supabase SQL Editor`);
  console.log(`   WARNING: This will add ${qualifiedItems.length} items to your pool. Use a transaction (BEGIN/COMMIT) to rollback if needed.`);
}

generateOptimizedPool().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
