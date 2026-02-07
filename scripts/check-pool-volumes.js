/**
 * Check daily volume for all items in the custom pool
 */

const fs = require('fs');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Read env file
const envPath = '.env.local';
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;
const OSRS_WIKI_API = 'https://prices.runescape.wiki/api/v1/osrs';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error(`URL: ${SUPABASE_URL ? 'Found' : 'Missing'}`);
  console.error(`Key: ${SUPABASE_SERVICE_KEY ? 'Found' : 'Missing'}`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

async function getPoolItems() {
  try {
    const { data, error } = await supabase
      .from('custom_pool_items')
      .select('*')
      .order('priority', { ascending: false })
      .order('item_name', { ascending: true });

    if (error) {
      console.error('❌ Error fetching pool items:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Failed to fetch pool items:', error);
    return [];
  }
}

async function getItemVolumeData(itemId) {
  try {
    const response = await axios.get(`${OSRS_WIKI_API}/timeseries`, {
      params: {
        id: itemId,
        timestep: '24h', // Daily data
      },
    });

    const data = response.data?.data;
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    // Get the last (most recent) data point
    const latest = data[data.length - 1];
    
    return {
      timestamp: latest.timestamp,
      price: latest.avgHighPrice || latest.high || 0,
      highVolume: latest.highPriceVolume || 0,
      lowVolume: latest.lowPriceVolume || 0,
      totalVolume: (latest.highPriceVolume || 0) + (latest.lowPriceVolume || 0),
    };
  } catch (error) {
    console.error(`  ⚠️ Failed to fetch data for item ${itemId}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('📊 Fetching pool items...\n');

  const items = await getPoolItems();

  if (items.length === 0) {
    console.log('❌ No items found in pool');
    return;
  }

  console.log(`✅ Found ${items.length} items in pool\n`);
  console.log('Item Name'.padEnd(30) + 'ID'.padEnd(8) + 'Daily Volume'.padEnd(15) + 'Price');
  console.log('─'.repeat(80));

  let itemsWithVolume = 0;
  let totalVolume = 0;

  for (const item of items) {
    process.stdout.write(`${item.item_name.padEnd(30)}`);
    
    const volumeData = await getItemVolumeData(item.item_id);
    
    if (volumeData && volumeData.totalVolume > 0) {
      itemsWithVolume++;
      totalVolume += volumeData.totalVolume;
      
      console.log(
        String(item.item_id).padEnd(8) +
        String(volumeData.totalVolume).padEnd(15) +
        `${volumeData.price}gp`
      );
    } else {
      console.log(
        String(item.item_id).padEnd(8) +
        'No data'.padEnd(15) +
        '-'
      );
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('─'.repeat(80));
  console.log(`\n📈 Summary:`);
  console.log(`   Total items: ${items.length}`);
  console.log(`   Items with volume data: ${itemsWithVolume}`);
  console.log(`   Total daily volume: ${totalVolume.toLocaleString()} units`);
  console.log(`   Average daily volume per item: ${(totalVolume / itemsWithVolume).toFixed(0)} units`);
}

main().catch(console.error);
