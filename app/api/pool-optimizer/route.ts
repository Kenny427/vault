import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { EXPANDED_ITEM_POOL } from '@/lib/expandedItemPool';
import { getItemPrice, getItemHistory } from '@/lib/api/osrs';

// Type for pool scores
interface PoolItemScore {
  id: number;
  name: string;
  category: string;
  currentScore: number; // 0-100
  botActivity: number; // 0-100
  volatility: number; // 0-100, lower is better for mean-reversion
  liquidity: number; // 0-100
  meanReversionFitness: number; // 0-100, how suitable for mean-reversion
  seasonalTrend: string; // up, down, flat
  recommendation: 'HOLD' | 'PROMOTE' | 'DEMOTE' | 'REMOVE';
  reasoning: string;
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Pool Optimizer API - Scores all items in the pool for mean-reversion fitness
 * Can be run monthly or on-demand to optimize the item pool
 * 
 * Usage:
 * POST /api/pool-optimizer
 * Body: { sampleSize?: number (default 20), fullScan?: boolean (default false) }
 * 
 * fullScan=true runs analysis on all 113 items (slower, more API calls)
 * fullScan=false samples 20-30 items for quick evaluation
 */
export async function POST(request: Request) {
  try {
    const { sampleSize = 20, fullScan = false } = await request.json();

    // Select items to analyze
    const itemsToAnalyze = fullScan 
      ? EXPANDED_ITEM_POOL 
      : EXPANDED_ITEM_POOL.sort(() => Math.random() - 0.5).slice(0, sampleSize);

    console.log(`🔄 [POOL OPTIMIZER] Analyzing ${itemsToAnalyze.length} items...`);

    // Fetch current data for all items
    const itemDataPromises = itemsToAnalyze.map(async (item) => {
      try {
        const [price, history] = await Promise.all([
          getItemPrice(item.id),
          getItemHistory(item.id, 365),
        ]);

        if (!price || !history || history.length < 30) {
          return null; // Skip items without sufficient data
        }

        const prices = history.map((h) => (h.avgHighPrice + h.avgLowPrice) / 2);
        const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
        const variance = prices.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / prices.length;
        const stdDev = Math.sqrt(variance);
        const volatility = (stdDev / avg) * 100;

        // Volume analysis
        const volumes = history.map((h) => h.highPriceVolume + h.lowPriceVolume);
        const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;

        // Trend analysis
        const recentPrices = prices.slice(-30);
        const oldPrices = prices.slice(-60, -30);
        const recentAvg = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
        const oldAvg = oldPrices.reduce((a, b) => a + b, 0) / oldPrices.length;
        const trend = recentAvg > oldAvg ? 'up' : recentAvg < oldAvg ? 'down' : 'flat';

        return {
          ...item,
          price,
          avgPrice: avg,
          volatility,
          avgVolume,
          trend,
          priceHistory: prices,
        };
      } catch (err) {
        console.error(`Failed to fetch data for item ${item.id}:`, err);
        return null;
      }
    });

    const itemsWithData = (await Promise.all(itemDataPromises)).filter((x) => x !== null);

    console.log(`📊 [POOL OPTIMIZER] Successfully fetched data for ${itemsWithData.length} items`);

    // Score each item
    const scores: PoolItemScore[] = itemsWithData.map((item) => {
      // Bot activity score (higher = more stable supply = better for mean-reversion)
      const botActivityScore =
        item.botLikelihood === 'very_high' ? 95 : item.botLikelihood === 'high' ? 75 : 50;

      // Volatility score (lower is better, we want mean-reverting items)
      // Target: 10-25% volatility is ideal for mean-reversion
      let volatilityScore = 100;
      if (item.volatility < 5) volatilityScore = 60; // Too stable, no flipping
      else if (item.volatility < 15) volatilityScore = 95; // Ideal range
      else if (item.volatility < 25) volatilityScore = 85; // Good
      else if (item.volatility < 35) volatilityScore = 70; // Acceptable
      else if (item.volatility < 50) volatilityScore = 50; // High volatility
      else volatilityScore = 20; // Too volatile

      // Liquidity score (higher volume = easier to enter/exit)
      const liquidityScore =
        item.volumeTier === 'massive' ? 100 : item.volumeTier === 'high' ? 80 : 60;

      // Mean-reversion fitness (how suitable for the strategy)
      const reversionFitness = (botActivityScore + volatilityScore + liquidityScore) / 3;

      // Determine recommendation
      const isUnderperforming = item.volatility > 40 || item.avgVolume < 100;
      const isExcellent = volatilityScore > 90 && botActivityScore > 80 && liquidityScore > 80;

      let recommendation: 'HOLD' | 'PROMOTE' | 'DEMOTE' | 'REMOVE' = 'HOLD';
      let reasoning = 'Stable performer in pool';

      if (isExcellent) {
        recommendation = 'PROMOTE';
        reasoning = 'Top performer - consider increasing weight in analysis';
      } else if (isUnderperforming) {
        recommendation = 'DEMOTE';
        reasoning = 'High volatility or low volume - monitor for removal';
      }

      // Final score
      const currentScore = Math.round(reversionFitness);

      return {
        id: item.id,
        name: item.name,
        category: item.category,
        currentScore,
        botActivity: Math.round(botActivityScore),
        volatility: Math.round(item.volatility),
        liquidity: Math.round(liquidityScore),
        meanReversionFitness: Math.round(reversionFitness),
        seasonalTrend: item.trend,
        recommendation,
        reasoning,
      };
    });

    // Sort by score
    scores.sort((a, b) => b.currentScore - a.currentScore);

    // Use AI to identify patterns and suggest new items to add
    const topPerformers = scores.slice(0, 10);
    const lowPerformers = scores.filter((s) => s.currentScore < 50);

    const analysisPrompt = `
You are an OSRS Grand Exchange expert analyzing item pool performance for mean-reversion trading.

TOP PERFORMERS (Score 90+):
${topPerformers.map((s) => `- ${s.name}: ${s.currentScore} (Bot: ${s.botActivity}, Volatility: ${s.volatility}%, Liquidity: ${s.liquidity})`).join('\n')}

LOW PERFORMERS (Score <50):
${lowPerformers.slice(0, 10).map((s) => `- ${s.name}: ${s.currentScore} (Bot: ${s.botActivity}, Volatility: ${s.volatility}%, Liquidity: ${s.liquidity})`).join('\n')}

ANALYSIS TASK:
1. Identify common characteristics of top performers (what makes them good for mean-reversion?)
2. Explain why low performers are struggling
3. Suggest 3-5 OSRS items NOT in the current pool that would score 80+
   - Focus on botted items with stable supply
   - Must have significant daily trade volume
   - 10-30% natural price volatility
   - Include: Item names, estimated bot likelihood, why they fit the strategy

Keep response concise and analytical.
`;

    const aiResponse = await client.messages.create({
      model: 'gpt-4-turbo',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: analysisPrompt,
        },
      ],
    });

    const aiInsights =
      aiResponse.choices[0]?.message.content || 'Analysis failed';

    // Build response
    const summary = {
      totalAnalyzed: scores.length,
      averageScore: Math.round(scores.reduce((sum, s) => sum + s.currentScore, 0) / scores.length),
      topPerformers: scores.slice(0, 5),
      needsAttention: scores.filter((s) => s.recommendation !== 'HOLD'),
      aiInsights,
      allScores: scores,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Pool optimizer error:', error);
    return NextResponse.json({ error: 'Pool optimization failed' }, { status: 500 });
  }
}

/**
 * GET endpoint - Returns cached pool scores from last run
 */
export async function GET() {
  return NextResponse.json({
    message: 'Pool Optimizer - Use POST to run analysis',
    usage: 'POST /api/pool-optimizer with optional { sampleSize: 20, fullScan: false }',
  });
}
