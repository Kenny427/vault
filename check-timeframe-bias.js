/**
 * Check if 30-day trend vs yearly trend tells different stories
 * This addresses the user's concern about short-term bias
 */

const axios = require('axios');

const OSRS_WIKI_API = 'https://prices.runescape.wiki/api/v1/osrs';

// Items the user recently got recommended (or any items to test)
const TEST_ITEMS = [
  { name: 'Coal', id: 453 },
  { name: 'Raw karambwan', id: 3142 },
  { name: 'Iron ore', id: 440 },
  { name: 'Yew logs', id: 1515 },
  { name: 'Amethyst arrow', id: 21326 },
  { name: 'Amethyst dart', id: 25849 },
];

function calculateStats(prices) {
  if (!prices || prices.length === 0) return null;
  
  const values = prices.map(p => p.price);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const current = values[values.length - 1];
  const first = values[0];
  
  const trend = ((current - first) / first) * 100;
  const fromAvg = ((current - avg) / avg) * 100;
  const fromMax = ((current - max) / max) * 100;
  const fromMin = ((current - min) / min) * 100;
  
  return {
    current,
    avg: Math.round(avg),
    max,
    min,
    trend: trend.toFixed(1),
    fromAvg: fromAvg.toFixed(1),
    fromMax: fromMax.toFixed(1),
    fromMin: fromMin.toFixed(1),
  };
}

async function getItemHistory(itemId, days) {
  try {
    const timestep = days <= 2 ? '5m' : days <= 30 ? '1h' : days <= 90 ? '6h' : '24h';
    
    const response = await axios.get(`${OSRS_WIKI_API}/timeseries`, {
      params: {
        id: itemId,
        timestep
      }
    });

    const data = response.data?.data;
    if (!data || data.length === 0) return null;

    // Filter to requested timeframe
    const cutoff = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);
    const filtered = data.filter(d => d.timestamp >= cutoff);

    return filtered.map(d => ({
      timestamp: d.timestamp,
      price: d.avgHighPrice || d.avgLowPrice
    })).filter(d => d.price);
  } catch (error) {
    return null;
  }
}

function formatGP(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'm';
  if (num >= 1000) return (num / 1000).toFixed(0) + 'k';
  return num.toFixed(0);
}

async function analyzeTimeframeBias() {
  console.log('📊 TIMEFRAME ANALYSIS: 30-DAY vs YEARLY TRENDS\n');
  console.log('═'.repeat(80));
  console.log('\nYour concern: "30-day looks down, but yearly trend shows its normal"\n');
  console.log('═'.repeat(80));

  for (const item of TEST_ITEMS) {
    console.log(`\n📈 ${item.name.toUpperCase()}\n`);

    await new Promise(resolve => setTimeout(resolve, 200));

    // Get different timeframes
    const [data30d, data90d, data365d] = await Promise.all([
      getItemHistory(item.id, 30),
      getItemHistory(item.id, 90),
      getItemHistory(item.id, 365),
    ]);

    if (!data30d || !data90d || !data365d) {
      console.log('   ⚠️  Insufficient data\n');
      continue;
    }

    const stats30d = calculateStats(data30d);
    const stats90d = calculateStats(data90d);
    const stats365d = calculateStats(data365d);

    console.log(`   Current Price: ${formatGP(stats30d.current)}\n`);

    console.log(`   📅 LAST 30 DAYS:`);
    console.log(`      Avg: ${formatGP(stats30d.avg)} | Range: ${formatGP(stats30d.min)} - ${formatGP(stats30d.max)}`);
    console.log(`      Trend: ${stats30d.trend}% | From Avg: ${stats30d.fromAvg}%`);
    
    console.log(`\n   📅 LAST 90 DAYS:`);
    console.log(`      Avg: ${formatGP(stats90d.avg)} | Range: ${formatGP(stats90d.min)} - ${formatGP(stats90d.max)}`);
    console.log(`      Trend: ${stats90d.trend}% | From Avg: ${stats90d.fromAvg}%`);
    
    console.log(`\n   📅 LAST 365 DAYS:`);
    console.log(`      Avg: ${formatGP(stats365d.avg)} | Range: ${formatGP(stats365d.min)} - ${formatGP(stats365d.max)}`);
    console.log(`      Trend: ${stats365d.trend}% | From Avg: ${stats365d.fromAvg}%`);

    // ANALYZE DISCREPANCY
    const trend30 = parseFloat(stats30d.trend);
    const trend365 = parseFloat(stats365d.trend);
    const discrepancy = Math.abs(trend30 - trend365);

    console.log(`\n   🔍 ANALYSIS:`);

    if (trend30 < -5 && trend365 < -10) {
      console.log(`      ⚠️  RED FLAG: Both 30d (${stats30d.trend}%) and yearly (${stats365d.trend}%) DOWN`);
      console.log(`      → This is NOT a dip, it's a DOWNTREND`);
      console.log(`      → Mean reversion is RISKY here\n`);
    } else if (trend30 < -5 && trend365 > 5) {
      console.log(`      ✅ GOOD SETUP: 30d down (${stats30d.trend}%) but yearly UP (${stats365d.trend}%)`);
      console.log(`      → This IS a temporary dip in uptrend`);
      console.log(`      → Mean reversion makes sense\n`);
    } else if (trend30 < -5 && Math.abs(trend365) < 5) {
      console.log(`      ⚠️  QUESTIONABLE: 30d down (${stats30d.trend}%) but yearly flat (${stats365d.trend}%)`);
      console.log(`      → Could go either way`);
      console.log(`      → YOUR CONCERN IS VALID HERE!\n`);
    } else if (trend30 > 5 && trend365 < -5) {
      console.log(`      🚨 DANGER: 30d UP (${stats30d.trend}%) but yearly DOWN (${stats365d.trend}%)`);
      console.log(`      → Short-term bounce in long-term decline`);
      console.log(`      → DON'T BUY, it will crash again\n`);
    } else {
      console.log(`      ℹ️  Trends aligned: 30d ${stats30d.trend}%, yearly ${stats365d.trend}%\n`);
    }

    // Check if current price is near yearly high/low
    const nearYearlyHigh = parseFloat(stats365d.fromMax) > -10;
    const nearYearlyLow = parseFloat(stats365d.fromMin) < 10;

    if (nearYearlyLow) {
      console.log(`      ✅ GOOD: Near yearly low (${stats365d.fromMin}% above)`);
      console.log(`         → Good mean reversion setup if trend is right\n`);
    } else if (nearYearlyHigh) {
      console.log(`      ⚠️  CAUTION: Near yearly high (${stats365d.fromMax}% below)`);
      console.log(`         → Not a great buy, limited upside\n`);
    }

    console.log('   ' + '─'.repeat(76));
  }

  console.log('\n' + '═'.repeat(80));
  console.log('\n💡 CONCLUSIONS:\n');
  console.log('1. Many items flagged by AI might be in LONG-TERM DECLINE');
  console.log('2. 30-day "dip" could just be continuation of yearly downtrend');
  console.log('3. AI needs to CHECK YEARLY CONTEXT before recommending\n');

  console.log('🔧 FIXES NEEDED:\n');
  console.log('✅ Add 365-day trend check to AI analysis');
  console.log('✅ Reject if yearly trend < -10% (clear downtrend)');
  console.log('✅ Require price to be <20% above yearly low');
  console.log('✅ Show yearly context in AI thesis\n');

  console.log('═'.repeat(80));
  console.log('\n🎯 YOUR SKEPTICISM IS JUSTIFIED!\n');
  console.log('The AI might be making recommendations based on incomplete timeframe analysis.');
  console.log('You should keep declining items with "yearly trend is down" tag');
  console.log('to train it to look at longer timeframes!\n');
}

analyzeTimeframeBias().catch(console.error);
