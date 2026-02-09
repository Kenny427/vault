/**
 * Check price changes for COMPLETE max gear setup over the last 12 hours
 */

const axios = require('axios');

const OSRS_WIKI_API = 'https://prices.runescape.wiki/api/v1/osrs';

// COMPLETE MAX GEAR SETUP
const FULL_MAX_GEAR = {
  // Main Megarares
  'Twisted bow': 21015,
  'Scythe of vitur (uncharged)': 22486,
  'Tumeken\'s shadow (uncharged)': 27275,
  'Sanguinesti staff (uncharged)': 22481,
  
  // Other expensive weapons
  'Ghrazi rapier': 23628,
  'Elder maul': 21003,
  'Dragon claws': 13652,
  'Dragon warhammer': 13576,
  'Osmumten\'s fang': 26219,
  'Bow of faerdhinen (c)': 25865,
  
  // Crossbows & ranged
  'Zaryte crossbow': 26374,
  'Armadyl crossbow': 11785,
  'Dragon hunter crossbow': 21012,
  'Venator bow': 27651,
  'Toxic blowpipe': 12926,
  
  // Defenders & off-hands
  'Avernic defender hilt': 22477,
  'Dragonfire ward': 22003,
  'Elysian spirit shield': 12819,
  'Spectral spirit shield': 12821,
  'Arcane spirit shield': 12825,
  
  // Torva set
  'Torva full helm': 26382,
  'Torva platebody': 26384,
  'Torva platelegs': 26386,
  
  // Ancestral set
  'Ancestral hat': 21018,
  'Ancestral robe top': 21021,
  'Ancestral robe bottom': 21024,
  
  // Inquisitor set
  'Inquisitor\'s great helm': 24419,
  'Inquisitor\'s hauberk': 24420,
  'Inquisitor\'s plateskirt': 24421,
  
  // Masori set (fortified)
  'Masori mask (f)': 27235,
  'Masori body (f)': 27238,
  'Masori chaps (f)': 27241,
  
  // Bandos
  'Bandos chestplate': 11832,
  'Bandos tassets': 11834,
  
  // Boots
  'Primordial boots': 13239,
  'Pegasian boots': 13237,
  'Eternal boots': 13235,
  
  // Rings
  'Ultor ring': 28307,
  'Venator ring': 28313,
  'Magus ring': 28319,
  'Bellator ring': 28301,
  'Lightbearer': 25539,
  'Ring of suffering (i)': 19550,
  'Berserker ring (i)': 11773,
  'Archers ring (i)': 11771,
  'Seers ring (i)': 11770,
  
  // Gloves & vambraces
  'Zaryte vambraces': 26235,
  'Tormented bracelet': 19544,
  'Ferocious gloves': 22981,
  
  // Amulets
  'Amulet of torture': 19553,
  'Necklace of anguish': 19547,
  'Occult necklace': 12002,
  'Amulet of fury': 6585,
  
  // Capes
  'Infernal cape': 21295,
  'Ava\'s assembler': 22109,
  
  // Scythe add-ons
  'Sanguine ornament kit': 24348,
  'Holy ornament kit': 24351,
  
  // Other valuable items
  'Abyssal bludgeon': 13263,
  'Abyssal dagger': 13265,
  'Kodai wand': 21006,
  'Harmonised nightmare staff': 24424,
  'Volatile nightmare staff': 24430,
  'Eldritch nightmare staff': 24427,
};

async function getItemHistory12h(itemId) {
  try {
    const response = await axios.get(`${OSRS_WIKI_API}/timeseries`, {
      params: {
        id: itemId,
        timestep: '5m'
      }
    });

    const data = response.data?.data;
    if (!data || data.length === 0) {
      return null;
    }

    return data;
  } catch (error) {
    return null;
  }
}

function formatNumber(num) {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(2) + 'b';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'm';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(0) + 'k';
  }
  return num.toFixed(0);
}

async function checkFullMaxGear() {
  console.log('💎 CHECKING COMPLETE MAX GEAR SETUP (LAST 12 HOURS)\n');
  console.log('═'.repeat(80));

  const results = [];
  const now = Math.floor(Date.now() / 1000);
  const twelveHoursAgo = now - (12 * 60 * 60);

  for (const [itemName, itemId] of Object.entries(FULL_MAX_GEAR)) {
    try {
      await new Promise(resolve => setTimeout(resolve, 100));

      const history = await getItemHistory12h(itemId);
      if (!history || history.length === 0) {
        console.log(`⚠️  ${itemName}: No data available`);
        continue;
      }

      const currentPoint = history[history.length - 1];
      const currentPrice = currentPoint.avgHighPrice || currentPoint.avgLowPrice;

      if (!currentPrice) {
        console.log(`⚠️  ${itemName}: Price data missing`);
        continue;
      }

      let oldestPoint = history[0];
      for (const point of history) {
        if (point.timestamp <= twelveHoursAgo) {
          oldestPoint = point;
        } else {
          break;
        }
      }

      const oldPrice = oldestPoint.avgHighPrice || oldestPoint.avgLowPrice;
      if (!oldPrice) {
        console.log(`⚠️  ${itemName}: Historical price missing`);
        continue;
      }

      const priceChange = currentPrice - oldPrice;
      const percentChange = (priceChange / oldPrice) * 100;
      const hoursAgo = ((now - oldestPoint.timestamp) / 3600).toFixed(1);

      results.push({
        name: itemName,
        oldPrice,
        currentPrice,
        priceChange,
        percentChange,
        hoursAgo
      });

      const arrow = percentChange > 0 ? '📈' : percentChange < 0 ? '📉' : '➡️';
      const sign = percentChange > 0 ? '+' : '';
      const color = percentChange > 0 ? '\x1b[32m' : percentChange < 0 ? '\x1b[31m' : '\x1b[33m';
      const reset = '\x1b[0m';

      console.log(`${arrow} ${itemName.padEnd(35)} ${color}${sign}${percentChange.toFixed(2)}%${reset} (${formatNumber(oldPrice)} → ${formatNumber(currentPrice)})`);

    } catch (error) {
      console.error(`Error processing ${itemName}:`, error.message);
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log('\n💰 PROFIT/LOSS CALCULATION\n');

  // Calculate if you sold 12h ago and rebuy now
  let totalProfit = 0;
  let totalOldValue = 0;
  let totalNewValue = 0;

  const winners = [];
  const losers = [];

  results.forEach((item) => {
    const profit = item.oldPrice - item.currentPrice; // Sold at old, buy at new
    
    totalProfit += profit;
    totalOldValue += item.oldPrice;
    totalNewValue += item.currentPrice;

    if (profit > 0) {
      winners.push({ ...item, profit });
    } else if (profit < 0) {
      losers.push({ ...item, profit });
    }
  });

  winners.sort((a, b) => b.profit - a.profit);
  losers.sort((a, b) => a.profit - b.profit);

  console.log(`💵 Total value sold 12h ago:  ${formatNumber(totalOldValue)}`);
  console.log(`💵 Total cost to rebuy now:   ${formatNumber(totalNewValue)}`);
  console.log(`📊 Items tracked: ${results.length}\n`);

  if (totalProfit > 0) {
    console.log(`\x1b[32m🎉 NET PROFIT: +${formatNumber(totalProfit)} GP\x1b[0m`);
    console.log(`\x1b[32m   (${((totalProfit / totalOldValue) * 100).toFixed(2)}% return)\x1b[0m\n`);
  } else if (totalProfit < 0) {
    console.log(`\x1b[31m📉 NET LOSS: ${formatNumber(totalProfit)} GP\x1b[0m`);
    console.log(`\x1b[31m   (${((totalProfit / totalOldValue) * 100).toFixed(2)}% loss)\x1b[0m\n`);
  } else {
    console.log('➡️  BREAK EVEN\n');
  }

  console.log('✅ Top 10 Winners (saved you money):');
  winners.slice(0, 10).forEach((item, idx) => {
    console.log(`   ${idx + 1}. ${item.name}: +${formatNumber(item.profit)}`);
  });

  console.log('\n❌ Top 10 Losers (cost you money):');
  losers.slice(0, 10).forEach((item, idx) => {
    console.log(`   ${idx + 1}. ${item.name}: ${formatNumber(item.profit)}`);
  });

  const avgChange = results.reduce((sum, item) => sum + item.percentChange, 0) / results.length;
  const avgColor = avgChange > 0 ? '\x1b[32m' : avgChange < 0 ? '\x1b[31m' : '\x1b[33m';
  
  console.log(`\n📈 Average price change: ${avgColor}${avgChange > 0 ? '+' : ''}${avgChange.toFixed(2)}%\x1b[0m`);
  console.log(`\n📊 ${winners.length} up, ${losers.length} down, ${results.length - winners.length - losers.length} stable\n`);
  console.log('═'.repeat(80));

  if (totalProfit > 0) {
    console.log('\n💡 Conclusion: Selling 12h ago was PROFITABLE! Market dipped 📉');
  } else if (totalProfit < 0) {
    console.log('\n💡 Conclusion: Should have held! Market went up 📈');
  } else {
    console.log('\n💡 Conclusion: No significant change ➡️');
  }
}

checkFullMaxGear().catch(console.error);
