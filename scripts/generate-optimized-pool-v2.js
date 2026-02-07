const axios = require('axios');
const fs = require('fs');

// Rate limiting
const RATE_LIMIT_MS = 150; // ms between API calls
let lastRequestTime = 0;

async function rateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    await new Promise(r => setTimeout(r, RATE_LIMIT_MS - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();
}

async function fetchWithRetry(url, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await rateLimit();
      const response = await axios.get(url, { timeout: 10000 });
      return response.data;
    } catch (error) {
      console.log(`   ⚠️ Attempt ${attempt}/${maxRetries} failed: ${error.message}`);
      if (attempt === maxRetries) throw error;
      await new Promise(r => setTimeout(r, 2000 * attempt)); // Exponential backoff
    }
  }
}

async function fetchItemMapping() {
  console.log('📦 Fetching all tradeable items from Wiki API mapping...');
  try {
    const data = await fetchWithRetry('https://services.runescape.wiki/api/m/ge_mapping');
    console.log(`✅ Found ${data.length} total tradeable items`);
    return data;
  } catch (error) {
    console.error(`\n❌ Network error: Cannot reach Wiki API`);
    console.error(`   ${error.message}`);
    console.error(`\n💡 Troubleshooting:`);
    console.error(`   - Check your internet connection`);
    console.error(`   - Try again in a moment`);
    console.error(`   - The Wiki API might be temporarily down`);
    process.exit(1);
  }
}

async function getItemData(itemId, itemName) {
  try {
    const data = await fetchWithRetry(
      `https://services.runescape.wiki/api/m/ge/timeseries?item=${itemId}&timestep=24h`,
      2
    );
    
    if (!data || data.length === 0) {
      return null;
    }

    // Get the most recent price and calculate daily volume
    const latestData = data[data.length - 1];
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
    process.exit(1);
  }

  const MIN_VOLUME = 10000;
  const MIN_PRICE = 50;
  
  console.log(`\n🔍 FILTERING CRITERIA:`);
  console.log(`   └─ Daily Volume: > ${MIN_VOLUME.toLocaleString()} units`);
  console.log(`   └─ Price: >= ${MIN_PRICE}gp`);
  console.log(`\n⏳ Fetching price data for ${items.length} items...`);
  console.log(`   (Estimated time: ${Math.ceil(items.length * 0.15 / 60)} - ${Math.ceil(items.length * 0.2 / 60)} minutes with API rate limiting)\n`);

  const qualifiedItems = [];
  let processed = 0;
  let skipped = 0;
  let lastLog = Date.now();
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    processed++;
    
    // Log progress every 50 items or every 5 seconds
    const now = Date.now();
    if (processed % 50 === 0 || now - lastLog > 5000) {
      const pct = Math.round((processed / items.length) * 100);
      const eta = Math.round(((items.length - processed) * 0.15) / 60);
      console.log(`   [${pct}%] Processed: ${processed}/${items.length} | Qualified: ${qualifiedItems.length} | ETA: ${eta}m`);
      lastLog = now;
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

  console.log(`\n✅ COMPLETE!`);
  console.log(`   Total items scanned: ${processed}`);
  console.log(`   Items with no data: ${skipped}`);
  console.log(`   Items qualified: ${qualifiedItems.length}`);

  // Sort by daily volume descending
  qualifiedItems.sort((a, b) => b.dailyVolume - a.dailyVolume);

  // Generate SQL with proper escaping
  const sqlLines = qualifiedItems.map((item, idx) => {
    const escapedName = item.itemName.replace(/'/g, "''");
    return `INSERT INTO custom_pool_items (item_id, item_name, category, enabled, added_date) VALUES (${item.itemId}, '${escapedName}', 'resources', true, NOW());`;
  });

  const sqlContent = `-- OPTIMIZED ITEM POOL - Mean Reversion Strategy
-- Generated: ${new Date().toISOString()}
-- Criteria: Daily Volume > 10,000 units AND Price >= 50gp
-- Total Items: ${qualifiedItems.length}
--
-- WARNING: This will INSERT ${qualifiedItems.length} items into custom_pool_items table.
-- The transaction (BEGIN/COMMIT) allows rollback if needed.
-- To rollback: ROLLBACK; instead of COMMIT;

BEGIN;

-- Delete existing pool first (optional - comment out to append)
-- DELETE FROM custom_pool_items WHERE enabled = true;

${sqlLines.join('\n')}

COMMIT;`;

  // Save SQL file
  const sqlFilePath = './optimized-pool-full.sql';
  fs.writeFileSync(sqlFilePath, sqlContent);
  console.log(`\n📄 SQL script saved: ${sqlFilePath}`);

  // Save CSV for reference  
  const csvContent = `Item Name,Item ID,Daily Volume,Price (gp)\n${qualifiedItems.map(
    item => `"${item.itemName}",${item.itemId},${item.dailyVolume},${item.currentPrice}`
  ).join('\n')}`;

  const csvFilePath = './optimized-pool-full.csv';
  fs.writeFileSync(csvFilePath, csvContent);
  console.log(`📄 CSV reference saved: ${csvFilePath}`);

  // Print summary statistics
  const totalVolume = qualifiedItems.reduce((sum, i) => sum + i.dailyVolume, 0);
  const avgVolume = Math.round(totalVolume / qualifiedItems.length);
  const avgPrice = Math.round(qualifiedItems.reduce((sum, i) => sum + i.currentPrice, 0) / qualifiedItems.length);
  
  console.log(`\n📊 POOL STATISTICS:`);
  console.log(`   Total items: ${qualifiedItems.length}`);
  console.log(`   Total daily volume: ${totalVolume.toLocaleString()} units`);
  console.log(`   Average volume per item: ${avgVolume.toLocaleString()} units`);
  console.log(`   Average item price: ${avgPrice}gp`);
  
  // Volume distribution
  const volumeByTier = {
    'massive (>1M)': qualifiedItems.filter(i => i.dailyVolume > 1000000).length,
    'high (100k-1M)': qualifiedItems.filter(i => i.dailyVolume >= 100000 && i.dailyVolume <= 1000000).length,
    'medium (10k-100k)': qualifiedItems.filter(i => i.dailyVolume >= 10000 && i.dailyVolume < 100000).length,
  };
  
  console.log(`\n📈 VOLUME DISTRIBUTION:`);
  Object.entries(volumeByTier).forEach(([tier, count]) => {
    const pct = Math.round((count / qualifiedItems.length) * 100);
    console.log(`   ${tier}: ${count} items (${pct}%)`);
  });
  
  // Top 15
  console.log(`\n🏆 TOP 15 ITEMS BY VOLUME:`);
  qualifiedItems.slice(0, 15).forEach((item, idx) => {
    const pct = ((item.dailyVolume / totalVolume) * 100).toFixed(1);
    console.log(`   ${String(idx + 1).padStart(2)}. ${item.itemName.padEnd(35)} | ${String(item.dailyVolume).padStart(9)} units (${String(pct).padStart(4)}%) @ ${String(item.currentPrice).padStart(5)}gp`);
  });

  console.log(`\n✨ NEXT STEPS:`);
  console.log(`   1. Open Supabase dashboard → SQL Editor`);
  console.log(`   2. Copy entire content from: ${sqlFilePath}`);
  console.log(`   3. Run the SQL (transaction will rollback if any error happens)`);
  console.log(`   4. Your pool will be updated with ${qualifiedItems.length} items`);
  console.log(`\n⚠️  WARNING: This will add ${qualifiedItems.length} items. Make sure custom_pool_items table is configured!`);
}

generateOptimizedPool().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
