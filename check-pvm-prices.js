/**
 * Check price changes for high-tier PvM gear over the last 12 hours
 * Uses OSRS Wiki API to fetch historical data
 */

const axios = require('axios');

const OSRS_WIKI_API = 'https://prices.runescape.wiki/api/v1/osrs';

// High-tier PvM gear to check
const HIGH_TIER_ITEMS = {
    // Megarares
    'Twisted bow': 21015,
    'Scythe of vitur': 22325,
    'Tumeken\'s shadow': 27277,
    'Sanguinesti staff': 22323,
    'Ghrazi rapier': 23628,
    'Avernic defender hilt': 22477,
    'Elder maul': 21003,
    'Dragon claws': 13652,
    'Elysian spirit shield': 12819,

    // Torva set
    'Torva full helm': 26382,
    'Torva platebody': 26384,
    'Torva platelegs': 26386,

    // Ancestral set
    'Ancestral hat': 21018,
    'Ancestral robe top': 21021,
    'Ancestral robe bottom': 21024,

    // Other high-tier gear
    'Inquisitor\'s great helm': 24419,
    'Inquisitor\'s hauberk': 24420,
    'Inquisitor\'s plateskirt': 24421,
    'Masori mask (f)': 27235,
    'Masori body (f)': 27238,
    'Masori chaps (f)': 27241,
    'Zaryte vambraces': 26235,
    'Lightbearer': 25539,
    'Venator bow': 27651,
    'Fang': 26219,

    // Other expensive items
    'Dragon warhammer': 13576,
    'Armadyl crossbow': 11785,
    'Toxic blowpipe': 12926,
    'Dragon hunter crossbow': 21012,
    'Bandos chestplate': 11832,
    'Bandos tassets': 11834,
    'Primordial boots': 13239,
    'Pegasian boots': 13237,
    'Eternal boots': 13235,
};

async function getItemHistory12h(itemId) {
    try {
        // Fetch 5-minute data for the last 12 hours
        const response = await axios.get(`${OSRS_WIKI_API}/timeseries`, {
            params: {
                id: itemId,
                timestep: '5m' // 5-minute intervals
            }
        });

        const data = response.data?.data;
        if (!data || data.length === 0) {
            return null;
        }

        return data;
    } catch (error) {
        console.error(`Error fetching history for item ${itemId}:`, error.message);
        return null;
    }
}

async function getLatestPrice(itemId) {
    try {
        const response = await axios.get(`${OSRS_WIKI_API}/latest`, {
            params: { id: itemId }
        });

        const data = response.data?.data?.[itemId];
        if (!data) return null;

        // Use average of high and low
        return data.high && data.low ? (data.high + data.low) / 2 : data.high || data.low;
    } catch (error) {
        console.error(`Error fetching latest price for item ${itemId}:`, error.message);
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

function calculateOpportunity(currentPrice, percentChange) {
    const buyAt = currentPrice; // Assuming current price is the "Buy At" price for now
    const sellAt = currentPrice * 1.05; // Sell at 5% profit
    const profitPerUnit = sellAt - buyAt - (sellAt * 0.01); // Accounting for 1% GE tax
    const roi = ((profitPerUnit / buyAt) * 100);
    const riskLevel = (Math.abs(percentChange) > 5) ? 'High' : 'Low'; // Basic risk level
    const confidence = 75; // Placeholder confidence score

    return {
        buyAt,
        sellAt,
        profitPerUnit,
        roi,
        riskLevel,
        confidence
    };
}

async function checkPriceChanges() {
    console.log('🔍 Checking high-tier PvM gear price changes (last 12 hours)...\n');
    console.log('═'.repeat(80));

    const results = [];
    const now = Math.floor(Date.now() / 1000);
    const twelveHoursAgo = now - (12 * 60 * 60);

    for (const [itemName, itemId] of Object.entries(HIGH_TIER_ITEMS)) {
        try {
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));

            const history = await getItemHistory12h(itemId);
            if (!history || history.length === 0) {
                console.log(`⚠️  ${itemName}: No data available`);
                continue;
            }

            // Get current price (most recent data point)
            const currentPoint = history[history.length - 1];
            const currentPrice = currentPoint.avgHighPrice || currentPoint.avgLowPrice;

            if (!currentPrice) {
                console.log(`⚠️  ${itemName}: Price data missing`);
                continue;
            }

            // Find price from ~12 hours ago
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

            const opportunityData = calculateOpportunity(currentPrice, percentChange);

            results.push({
                name: itemName,
                oldPrice,
                currentPrice,
                priceChange,
                percentChange,
                hoursAgo,
                ...opportunityData  // Spread operator to include opportunity data
            });

            const arrow = percentChange > 0 ? '📈' : percentChange < 0 ? '📉' : '➡️';
            const sign = percentChange > 0 ? '+' : '';
            const color = percentChange > 0 ? '\x1b[32m' : percentChange < 0 ? '\x1b[31m' : '\x1b[33m';
            const reset = '\x1b[0m';

            console.log(`${arrow} ${itemName.padEnd(30)} ${color}${sign}${percentChange.toFixed(2)}%${reset} (${formatNumber(oldPrice)} → ${formatNumber(currentPrice)}) [${hoursAgo}h ago]`);

        } catch (error) {
            console.error(`Error processing ${itemName}:`, error.message);
        }
    }

    console.log('\n' + '═'.repeat(80));
    console.log('\n📊 Summary:\n');

    // Sort by percentage change
    results.sort((a, b) => b.percentChange - a.percentChange);

    const biggestGainers = results.slice(0, 5);
    const biggestLosers = results.slice(-5).reverse();

    console.log('🚀 Top 5 Gainers:');
    biggestGainers.forEach((item, idx) => {
        console.log(`   ${idx + 1}. ${item.name}: +${item.percentChange.toFixed(2)}% (${formatNumber(item.priceChange)} gp)`);
        console.log(  `   Buy At: ${formatNumber(results[idx].buyAt)} gp, Sell At: ${formatNumber(results[idx].sellAt)} gp, ROI: ${results[idx].roi.toFixed(2)}%`);
    });

    console.log('\n📉 Top 5 Losers:');
    biggestLosers.forEach((item, idx) => {
        console.log(`   ${idx + 1}. ${item.name}: ${item.percentChange.toFixed(2)}% (${formatNumber(item.priceChange)} gp)`);
        console.log(  `   Buy At: ${formatNumber(results[results.length - 1 - idx].buyAt)} gp, Sell At: ${formatNumber(results[results.length - 1 - idx].sellAt)} gp, ROI: ${results[results.length - 1 - idx].roi.toFixed(2)}%`);
    });

    // Calculate average change
    const avgChange = results.reduce((sum, item) => sum + item.percentChange, 0) / results.length;
    const avgColor = avgChange > 0 ? '\x1b[32m' : avgChange < 0 ? '\x1b[31m' : '\x1b[33m';
    console.log(`\n📈 Average price change: ${avgColor}${avgChange > 0 ? '+' : ''}${avgChange.toFixed(2)}%\x1b[0m`);

    // Count up/down/stable
    const up = results.filter(r => r.percentChange > 0.5).length;
    const down = results.filter(r => r.percentChange < -0.5).length;
    const stable = results.filter(r => Math.abs(r.percentChange) <= 0.5).length;

    console.log(`\n📊 Market sentiment: ${up} up, ${down} down, ${stable} stable (out of ${results.length} items)`);

    if (avgChange > 1) {
        console.log('\n✅ Overall market is UP 📈');
    } else if (avgChange < -1) {
        console.log('\n⚠️  Overall market is DOWN 📉');
    } else {
        console.log('\n➡️  Overall market is STABLE');
    }
}

// Run the check
checkPriceChanges().catch(console.error);