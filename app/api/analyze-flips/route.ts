import { NextResponse } from 'next/server';
import { analyzeFlipsWithAI, clearAnalysisCache } from '@/lib/aiAnalysis';
import { getItemPrice, getItemHistory } from '@/lib/api/osrs';

export async function POST(request: Request) {
  try {
    const items = await request.json();
    const cappedItems = Array.isArray(items) ? items : [];
    
    // Clear cache on each request (manual refresh behavior)
    clearAnalysisCache();
    
    const itemsWithData: Array<{
      id: number;
      name: string;
      currentPrice: number;
      history30: any[];
      history90: any[];
      history180: any[];
      history365: any[];
    }> = [];

    for (const item of cappedItems) {
      try {
        if (!item?.id || !item?.name) continue;

        const price = await getItemPrice(item.id);
        const currentPrice = price ? (price.high + price.low) / 2 : undefined;

        if (!currentPrice) continue;

        const history30 = await getItemHistory(item.id, 30 * 24 * 60 * 60, currentPrice);
        const history90 = await getItemHistory(item.id, 90 * 24 * 60 * 60, currentPrice);
        const history180 = await getItemHistory(item.id, 180 * 24 * 60 * 60, currentPrice);
        const history365 = await getItemHistory(item.id, 365 * 24 * 60 * 60, currentPrice);

        // Skip items with only simulated history (too narrow price range = unreliable data)
        // Real data should have wider spreads; simulated data clusters within ±15% of current
        if (history365 && history365.length > 0) {
          const prices365 = history365.map(p => p.price);
          const minPrice = Math.min(...prices365);
          const maxPrice = Math.max(...prices365);
          const spread = ((maxPrice - minPrice) / currentPrice) * 100;
          
          // If spread is less than 15%, data is likely simulated (only ±7.5% variation)
          // Real trading data has wider swings
          if (spread < 15) {
            console.log(`  ⊘ Skipping ${item.name}: spread only ${spread.toFixed(1)}% (likely simulated data)`);
            continue;
          }
        }

        if (history30 && history30.length > 0) {
          itemsWithData.push({
            id: item.id,
            name: item.name,
            currentPrice,
            history30,
            history90: history90 && history90.length > 0 ? history90 : history30,
            history180: history180 && history180.length > 0 ? history180 : history30,
            history365: history365 && history365.length > 0 ? history365 : history30,
          });
        }
      } catch (error) {
        console.error(`Error fetching data for ${item?.name ?? 'unknown item'}:`, error);
      }
    }

    // Log pool composition for debugging
    console.log(`📊 POOL ANALYSIS STARTED`);
    console.log(`   Requested: ${cappedItems.length} items`);
    console.log(`   Passed spread filter (>15%): ${itemsWithData.length} items`);
    
    if (itemsWithData.length === 0) {
      console.log(`   ⚠️  NO ITEMS WITH ADEQUATE PRICE SPREAD - All items may have simulated data`);
      return NextResponse.json([]);
    }

    itemsWithData.forEach(item => {
      const prices = item.history30.map(p => p.price);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const spread = ((max - min) / item.currentPrice) * 100;
      console.log(`   ✓ ${item.name}: spread=${spread.toFixed(1)}%, range ${min}-${max}`);
    });

    if (itemsWithData.length === 0) {
      return NextResponse.json([]);
    }

    const opportunities = await analyzeFlipsWithAI(itemsWithData);
    
    console.log(`\n📈 AI ANALYSIS COMPLETE`);
    console.log(`   Returned: ${opportunities.length} opportunities`);
    if (opportunities.length > 0) {
      opportunities.slice(0, 10).forEach(opp => {
        console.log(`   • ${opp.itemName}: score=${opp.opportunityScore}, confidence=${opp.confidence}%, discount=${opp.deviation.toFixed(1)}%`);
      });
    } else {
      console.log(`   ⚠️  WARNING: AI returned NO opportunities from ${itemsWithData.length} items`);
    }
    
    return NextResponse.json(opportunities);
  } catch (error: any) {
    console.error('AI analysis API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze opportunities' },
      { status: 500 }
    );
  }
}
