import { NextResponse } from 'next/server';
import { scoreOpportunitiesByMeanReversion } from '@/lib/analysis';
import { analyzeFlipsWithAI } from '@/lib/aiAnalysis';
import { fetchItemMapping, getItemPrice, getItemHistory, getItemVolume1h } from '@/lib/api/osrs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payloadItems = Array.isArray(body) ? body : Array.isArray(body?.items) ? body.items : [];
    const cappedItems = payloadItems;
    const enableAi = typeof body?.enableAi === 'boolean' ? body.enableAi : true;
    const aiTopN = Number.isFinite(body?.aiTopN) ? Math.min(Math.max(5, body.aiTopN), 30) : 12;
    const aiMinScore = Number.isFinite(body?.aiMinScore) ? Math.min(Math.max(0, body.aiMinScore), 100) : 45;

    // Build mapping lookup to ensure id/name consistency (prevents dose mismatches)
    const mapping = await fetchItemMapping();
    const mapById = new Map(mapping.map(item => [item.id, item]));
    const mapByName = new Map(mapping.map(item => [item.name.toLowerCase(), item]));
    
    const itemsWithData: Array<{
      id: number;
      name: string;
      currentPrice: number;
      volume1h?: number;
      history30: any[];
      history90: any[];
      history180: any[];
      history365: any[];
    }> = [];

    for (const item of cappedItems) {
      try {
        if (!item?.name) continue;

        let resolvedId: number | null = null;
        let resolvedName: string = item.name;

        const mappedByName = mapByName.get(item.name.toLowerCase());
        if (mappedByName) {
          resolvedId = mappedByName.id;
          resolvedName = mappedByName.name;
        }

        if (!resolvedId && typeof item?.id === 'number') {
          const mappedById = mapById.get(item.id);
          if (mappedById) {
            resolvedId = mappedById.id;
            resolvedName = mappedById.name;
          }
        }

        if (!resolvedId) continue;

        const price = await getItemPrice(resolvedId);
        const currentPrice = price ? (price.high + price.low) / 2 : undefined;

        if (!currentPrice) continue;

        const volumeData = await getItemVolume1h(resolvedId);
        const volume1h = volumeData
          ? (volumeData.highPriceVolume ?? 0) + (volumeData.lowPriceVolume ?? 0)
          : undefined;

        const history30 = await getItemHistory(resolvedId, 30 * 24 * 60 * 60, currentPrice);
        const history90 = await getItemHistory(resolvedId, 90 * 24 * 60 * 60, currentPrice);
        const history180 = await getItemHistory(resolvedId, 180 * 24 * 60 * 60, currentPrice);
        const history365 = await getItemHistory(resolvedId, 365 * 24 * 60 * 60, currentPrice);

        // Skip items with only simulated history (too narrow price range = unreliable data)
        // Real data should have wider spreads; simulated data clusters within ±5% of current
        if (history365 && history365.length > 0) {
          const prices365 = history365.map(p => p.price);
          const minPrice = Math.min(...prices365);
          const maxPrice = Math.max(...prices365);
          const spread = ((maxPrice - minPrice) / currentPrice) * 100;
          
          // If spread is less than 8%, data is likely simulated (only ±4% variation)
          // Real trading data has wider swings, even for stable items
          if (spread < 8) {
            console.log(`  ⊘ Skipping ${item.name}: spread only ${spread.toFixed(1)}% (likely simulated data)`);
            continue;
          }
        }

        if (history30 && history30.length > 0) {
          itemsWithData.push({
            id: resolvedId,
            name: resolvedName,
            currentPrice,
            volume1h,
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
      return NextResponse.json({
        opportunities: [],
        diagnostic: {
          requested: cappedItems.length,
          passedFilter: 0,
          itemsPassedFilter: [],
          analysisType: 'rule-based-mean-reversion'
        }
      });
    }

    itemsWithData.forEach(item => {
      const prices = item.history30.map(p => p.price);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const spread = ((max - min) / item.currentPrice) * 100;
      console.log(`   ✓ ${item.name}: spread=${spread.toFixed(1)}%, range ${min}-${max}`);
    });

    // Rule-based analysis: no AI needed, pure math-based mean-reversion scoring
    let opportunities = scoreOpportunitiesByMeanReversion(itemsWithData);

    // Optional AI enhancement for top candidates (cost-controlled)
    if (enableAi && process.env.OPENAI_API_KEY) {
      const topCandidates = opportunities
        .filter(op => op.opportunityScore >= aiMinScore)
        .sort((a, b) => b.opportunityScore - a.opportunityScore)
        .slice(0, aiTopN);

      const topIds = new Set(topCandidates.map(op => op.itemId));
      const aiItems = itemsWithData.filter(item => topIds.has(item.id));

      if (aiItems.length > 0) {
        try {
          const aiOpps = await analyzeFlipsWithAI(aiItems);
          const aiMap = new Map(aiOpps.map(op => [op.itemId, op]));

          opportunities = opportunities.map(op => {
            const ai = aiMap.get(op.itemId);
            if (!ai) return op;
            return {
              ...op,
              recommendation: ai.recommendation ?? op.recommendation,
              confidence: ai.confidence ?? op.confidence,
              opportunityScore: Math.max(op.opportunityScore, ai.opportunityScore ?? 0),
              buyWhen: ai.buyWhen || op.buyWhen,
              sellWhen: ai.sellWhen || op.sellWhen,
              estimatedHoldTime: ai.estimatedHoldTime || op.estimatedHoldTime,
              profitPerUnit: ai.profitPerUnit ?? op.profitPerUnit,
              roi: ai.roi ?? op.roi,
              riskLevel: ai.riskLevel || op.riskLevel,
            };
          });
        } catch (error) {
          console.error('AI enhancement failed, using rule-based results:', error);
        }
      }
    }
    
    console.log(`\n📈 ANALYSIS COMPLETE (Rule-Based Mean-Reversion)`);
    console.log(`   Returned: ${opportunities.length} opportunities`);
    if (opportunities.length > 0) {
      opportunities.slice(0, 10).forEach(opp => {
        console.log(`   • ${opp.itemName}: score=${opp.opportunityScore}, confidence=${opp.confidence}%, upside=${((opp.historicalHigh - opp.currentPrice) / opp.currentPrice * 100).toFixed(1)}%`);
      });
    } else {
      console.log(`   ℹ️  No opportunities found (all items scored below 40)`);
    }
    
    // Return both opportunities and diagnostic info
    const response = {
      opportunities,
      diagnostic: {
        requested: cappedItems.length,
        passedFilter: itemsWithData.length,
        itemsPassedFilter: itemsWithData.map(item => {
          const prices = item.history30.map(p => p.price);
          const min = Math.min(...prices);
          const max = Math.max(...prices);
          const spread = ((max - min) / item.currentPrice) * 100;
          return {
            name: item.name,
            spread: parseFloat(spread.toFixed(1)),
            min,
            max,
            current: item.currentPrice
          };
        }),
        analysisType: enableAi ? 'rule-based + ai-shortlist' : 'rule-based-mean-reversion',
        timestamp: new Date().toISOString()
      }
    };
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Analysis API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze opportunities' },
      { status: 500 }
    );
  }
}
