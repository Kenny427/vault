const fs = require('fs');
const https = require('https');

// Extract item IDs from SQL file
const sqlFile = fs.readFileSync('./optimized-pool-full-categorized.sql', 'utf-8');
const itemIds = new Set();
const itemNames = {};

const regex = /VALUES \((\d+), '([^']+)'/g;
let match;
while ((match = regex.exec(sqlFile)) !== null) {
  itemIds.add(parseInt(match[1]));
  itemNames[match[1]] = match[2];
}

const ids = Array.from(itemIds).sort((a, b) => a - b);
console.log(`\n📊 Analyzing ${ids.length} items for REAL volume data...\n`);

// Fetch volume data from OSRS Wiki API
async function fetchVolumeData() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'prices.runescape.wiki',
      path: '/api/v1/osrs/latest',
      method: 'GET',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          // The API returns an object where keys are item IDs and values are price info
          resolve(parsed || {});
        } catch (e) {
          console.error('Response status:', res.statusCode);
          console.error('First 500 chars:', data.substring(0, 500));
          reject(new Error(`JSON parse error: ${e.message}`));
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    req.end();
  });
}

async function analyze() {
  try {
    console.log('⏳ Fetching price data from OSRS Wiki API...');
    const apiResponse = await fetchVolumeData();
    
    // API response is wrapped in {data: {...}} structure
    const priceData = apiResponse.data || apiResponse;

    // Analyze items by volume
    const itemsWithVolume = [];
    const itemsNoData = [];

    for (const id of ids) {
      const name = itemNames[id];
      // API keys are strings!
      const data = priceData[String(id)];

      if (data && data.high !== undefined) {
        const highPrice = data.high || 0;
        const lowPrice = data.low || 0;
        
        itemsWithVolume.push({
          id,
          name,
          highPrice,
          lowPrice,
          avgPrice: (highPrice + lowPrice) / 2,
        });
      } else {
        itemsNoData.push({ id, name });
      }
    }

    // Sort by price and identify problematic items
    itemsWithVolume.sort((a, b) => b.highPrice - a.highPrice);

    console.log(`\n✅ Got data for: ${itemsWithVolume.length} items`);
    console.log(`❌ No data for: ${itemsNoData.length} items\n`);

    // Items with NO API data (likely dead/cosmetic)
    if (itemsNoData.length > 0) {
      console.log('=' .repeat(80));
      console.log('🚨 ITEMS WITH NO PRICE DATA (Likely dead/cosmetic/untradeable):');
      console.log('=' .repeat(80));
      itemsNoData.slice(0, 100).forEach(item => {
        console.log(`  ${item.id.toString().padEnd(6)} | ${item.name}`);
      });
      if (itemsNoData.length > 100) {
        console.log(`\n  ... and ${itemsNoData.length - 100} more items without price data`);
      }
      console.log(`\n⚠️  Total: ${itemsNoData.length} items - THESE SHOULD BE REMOVED\n`);
    }

    // Items under 100 GP (trash tier)
    const trashTier = itemsWithVolume.filter(i => i.highPrice < 100);
    if (trashTier.length > 0) {
      console.log('=' .repeat(80));
      console.log(`🗑️  TRASH TIER (<100 GP) - ${trashTier.length} items:`);
      console.log('=' .repeat(80));
      trashTier.slice(0, 50).forEach(item => {
        console.log(`  ${item.id.toString().padEnd(6)} | ${item.avgPrice.toFixed(0).padEnd(6)}gp | ${item.name}`);
      });
      if (trashTier.length > 50) {
        console.log(`  ... and ${trashTier.length - 50} more trash items`);
      }
      console.log(`\n⚠️  Total: ${trashTier.length} items - CONSIDER REMOVING\n`);
    }

    // Items under 500 GP (potential consumables/junk)
    const lowTierItems = itemsWithVolume.filter(i => i.highPrice < 500 && i.highPrice >= 100);
    if (lowTierItems.length > 0) {
      console.log('=' .repeat(80));
      console.log(`📉 LOW TIER (100-500 GP) - ${lowTierItems.length} items (REVIEW THESE):`);
      console.log('=' .repeat(80));
      lowTierItems.slice(0, 40).forEach(item => {
        console.log(`  ${item.id.toString().padEnd(6)} | ${item.avgPrice.toFixed(0).padEnd(6)}gp | ${item.name}`);
      });
      if (lowTierItems.length > 40) {
        console.log(`  ... and ${lowTierItems.length - 40} more low-tier items`);
      }
      console.log(`\n⚠️  Total: ${lowTierItems.length} items\n`);
    }

    // Medium tier (500-5000)
    const mediumTier = itemsWithVolume.filter(i => i.highPrice >= 500 && i.highPrice < 5000);
    if (mediumTier.length > 0) {
      console.log('=' .repeat(80));
      console.log(`📈 MEDIUM TIER (500-5000 GP) - ${mediumTier.length} items:`);
      console.log('=' .repeat(80));
      mediumTier.slice(0, 40).forEach(item => {
        console.log(`  ${item.id.toString().padEnd(6)} | ${item.avgPrice.toFixed(0).padEnd(7)}gp | ${item.name}`);
      });
      if (mediumTier.length > 40) {
        console.log(`  ... and ${mediumTier.length - 40} more medium-tier items`);
      }
      console.log();
    }

    // High-value items (keepers)
    const highTier = itemsWithVolume.filter(i => i.highPrice >= 5000);
    if (highTier.length > 0) {
      console.log('=' .repeat(80));
      console.log(`✅ HIGH TIER (5000+ GP) - ${highTier.length} items:`);
      console.log('=' .repeat(80));
      highTier.slice(0, 40).forEach(item => {
        console.log(`  ${item.id.toString().padEnd(6)} | ${item.avgPrice.toFixed(0).padEnd(7)}gp | ${item.name}`);
      });
      if (highTier.length > 40) {
        console.log(`  ... and ${highTier.length - 40} more high-tier items`);
      }
      console.log();
    }

    console.log('=' .repeat(80));
    console.log('📈 SUMMARY:');
    console.log('=' .repeat(80));
    console.log(`Total items analyzed: ${ids.length}`);
    console.log(`With pricing data: ${itemsWithVolume.length} (${(itemsWithVolume.length/ids.length*100).toFixed(1)}%)`);
    console.log(`No price data: ${itemsNoData.length} (${(itemsNoData.length/ids.length*100).toFixed(1)}%)`);
    console.log();
    console.log(`Trash tier <100gp: ${trashTier.length}`);
    console.log(`Low tier 100-500gp: ${lowTierItems.length}`);
    console.log(`Medium tier 500-5000gp: ${mediumTier.length}`);
    console.log(`High tier 5000+gp: ${highTier.length}`);
    console.log();
    console.log(`SUGGESTED REMOVALS: ~${itemsNoData.length + trashTier.length + Math.floor(lowTierItems.length * 0.3)} items`);
    console.log(`SUGGESTED KEEP: ~${mediumTier.length + highTier.length} items\n`);

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      totalAnalyzed: ids.length,
      withData: itemsWithVolume.length,
      noData: itemsNoData.map(i => ({ id: i.id, name: i.name })),
      trashTier: trashTier.map(i => ({ id: i.id, name: i.name, price: i.highPrice })),
      lowTier: lowTierItems.map(i => ({ id: i.id, name: i.name, price: i.highPrice })),
      mediumTier: mediumTier.map(i => ({ id: i.id, name: i.name, price: i.highPrice })),
      highTier: highTier.map(i => ({ id: i.id, name: i.name, price: i.highPrice })),
      suggestedRemove: [
        ...itemsNoData.map(i => i.id),
        ...trashTier.map(i => i.id),
        ...lowTierItems.slice(0, Math.floor(lowTierItems.length * 0.3)).map(i => i.id)
      ]
    };

    fs.writeFileSync('./pool-volume-analysis.json', JSON.stringify(report, null, 2));
    console.log('📁 Detailed report saved to: pool-volume-analysis.json');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

analyze();
