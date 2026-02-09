/**
 * Calculate profit/loss from selling all max gear 12h ago and rebuying now
 */

// Price changes from the previous analysis
const priceChanges = [
  { name: 'Twisted bow', oldPrice: 15100000, newPrice: 14800000 },
  { name: "Tumeken's shadow", oldPrice: 921800000, newPrice: 916200000 },
  { name: 'Avernic defender hilt', oldPrice: 40600000, newPrice: 41500000 },
  { name: 'Elder maul', oldPrice: 97200000, newPrice: 97600000 },
  { name: 'Dragon claws', oldPrice: 47800000, newPrice: 47200000 },
  { name: 'Elysian spirit shield', oldPrice: 530300000, newPrice: 531000000 },
  { name: 'Torva full helm', oldPrice: 238200000, newPrice: 243500000 },
  { name: 'Torva platebody', oldPrice: 216600000, newPrice: 215800000 },
  { name: 'Torva platelegs', oldPrice: 158300000, newPrice: 156400000 },
  { name: 'Ancestral hat', oldPrice: 62300000, newPrice: 63400000 },
  { name: 'Ancestral robe top', oldPrice: 153000000, newPrice: 153300000 },
  { name: 'Ancestral robe bottom', oldPrice: 109000000, newPrice: 108800000 },
  { name: "Inquisitor's great helm", oldPrice: 35600000, newPrice: 35500000 },
  { name: "Inquisitor's hauberk", oldPrice: 83400000, newPrice: 78400000 },
  { name: "Inquisitor's plateskirt", oldPrice: 83200000, newPrice: 79300000 },
  { name: 'Masori mask (f)', oldPrice: 25200000, newPrice: 24700000 },
  { name: 'Masori body (f)', oldPrice: 90500000, newPrice: 90200000 },
  { name: 'Masori chaps (f)', oldPrice: 63000000, newPrice: 63300000 },
  { name: 'Zaryte vambraces', oldPrice: 90400000, newPrice: 91000000 },
  { name: 'Fang', oldPrice: 23800000, newPrice: 23800000 },
  { name: 'Dragon warhammer', oldPrice: 15200000, newPrice: 14300000 },
  { name: 'Armadyl crossbow', oldPrice: 31600000, newPrice: 31300000 },
  { name: 'Dragon hunter crossbow', oldPrice: 47100000, newPrice: 47300000 },
  { name: 'Bandos chestplate', oldPrice: 27100000, newPrice: 26300000 },
  { name: 'Bandos tassets', oldPrice: 18600000, newPrice: 17900000 },
  { name: 'Primordial boots', oldPrice: 23300000, newPrice: 22700000 },
  { name: 'Pegasian boots', oldPrice: 23000000, newPrice: 23000000 },
  { name: 'Eternal boots', oldPrice: 5300000, newPrice: 5300000 },
];

function formatGP(num) {
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

console.log('💰 MAX GEAR FLIP PROFIT/LOSS CALCULATOR\n');
console.log('Scenario: Sold all gear 12 hours ago, rebuying now\n');
console.log('═'.repeat(80));

let totalProfit = 0;
let totalOldValue = 0;
let totalNewValue = 0;

const winners = [];
const losers = [];

priceChanges.forEach((item) => {
  const profit = item.oldPrice - item.newPrice; // Sold at old, buy at new
  const percentChange = ((item.newPrice - item.oldPrice) / item.oldPrice) * 100;
  
  totalProfit += profit;
  totalOldValue += item.oldPrice;
  totalNewValue += item.newPrice;

  const result = {
    name: item.name,
    profit,
    percentChange,
    oldPrice: item.oldPrice,
    newPrice: item.newPrice
  };

  if (profit > 0) {
    winners.push(result);
  } else if (profit < 0) {
    losers.push(result);
  }

  const emoji = profit > 0 ? '✅' : profit < 0 ? '❌' : '➡️';
  const sign = profit > 0 ? '+' : '';
  const color = profit > 0 ? '\x1b[32m' : profit < 0 ? '\x1b[31m' : '\x1b[33m';
  const reset = '\x1b[0m';

  console.log(`${emoji} ${item.name.padEnd(30)} ${color}${sign}${formatGP(profit)}${reset} (${percentChange.toFixed(2)}%)`);
});

console.log('\n' + '═'.repeat(80));
console.log('\n📊 SUMMARY\n');

// Sort winners and losers
winners.sort((a, b) => b.profit - a.profit);
losers.sort((a, b) => a.profit - b.profit);

console.log(`💵 Total value sold 12h ago: ${formatGP(totalOldValue)}`);
console.log(`💵 Total cost to rebuy now:  ${formatGP(totalNewValue)}`);
console.log('');

if (totalProfit > 0) {
  console.log(`\x1b[32m🎉 NET PROFIT: +${formatGP(totalProfit)} GP\x1b[0m`);
  console.log(`\x1b[32m   (${((totalProfit / totalOldValue) * 100).toFixed(2)}% return)\x1b[0m\n`);
} else if (totalProfit < 0) {
  console.log(`\x1b[31m📉 NET LOSS: ${formatGP(totalProfit)} GP\x1b[0m`);
  console.log(`\x1b[31m   (${((totalProfit / totalOldValue) * 100).toFixed(2)}% loss)\x1b[0m\n`);
} else {
  console.log('➡️  BREAK EVEN\n');
}

if (winners.length > 0) {
  console.log('✅ Top 5 Winning Items:');
  winners.slice(0, 5).forEach((item, idx) => {
    console.log(`   ${idx + 1}. ${item.name}: +${formatGP(item.profit)}`);
  });
  console.log('');
}

if (losers.length > 0) {
  console.log('❌ Top 5 Losing Items:');
  losers.slice(0, 5).forEach((item, idx) => {
    console.log(`   ${idx + 1}. ${item.name}: ${formatGP(item.profit)}`);
  });
  console.log('');
}

console.log(`📈 Winning items: ${winners.length}`);
console.log(`📉 Losing items: ${losers.length}`);
console.log(`➡️  Unchanged items: ${priceChanges.length - winners.length - losers.length}`);

console.log('\n' + '═'.repeat(80));

if (totalProfit > 0) {
  console.log('\n💡 Conclusion: Selling 12h ago was PROFITABLE! Market dipped 📉');
} else if (totalProfit < 0) {
  console.log('\n💡 Conclusion: Should have held! Market went up 📈');
} else {
  console.log('\n💡 Conclusion: No significant change ➡️');
}
