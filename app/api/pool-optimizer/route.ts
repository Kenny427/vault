import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { EXPANDED_ITEM_POOL } from '@/lib/expandedItemPool';
import { getCustomPoolItems } from '@/lib/poolManagement';
import { getItemPrice, getItemHistoryWithVolumes } from '@/lib/api/osrs';

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
  aiScore?: number;
  aiRecommendation?: 'HOLD' | 'PROMOTE' | 'DEMOTE' | 'REMOVE';
  aiConfidence?: 'low' | 'medium' | 'high';
  aiReasoning?: string;
  aiRiskFlags?: string[];
}

interface AiItemResult {
  id: number;
  aiScore: number;
  recommendation: 'HOLD' | 'PROMOTE' | 'DEMOTE' | 'REMOVE';
  confidence: 'low' | 'medium' | 'high';
  reasoning: string;
  riskFlags: string[];
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const aiCache = new Map<number, { timestamp: number; result: AiItemResult }>();

function isCacheValid(entry: { timestamp: number }, ttlMs: number) {
  return Date.now() - entry.timestamp < ttlMs;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Pool Optimizer API - Scores all items in the pool for mean-reversion fitness
 * Can be run monthly or on-demand to optimize the item pool
 * 
 * Usage:
 * POST /api/pool-optimizer
 * Body: { sampleSize?: number (default 20), fullScan?: boolean (default false) }
 * 
 * fullScan=true runs analysis on all items (slower, more API calls)
 * fullScan=false samples 20-30 items for quick evaluation
 */
export async function POST(request: Request) {
  try {
    const {
      sampleSize = 20,
      fullScan = true,
      batchSize = 40,
      cacheHours = 24,
      skipLowSignal = true,
      useAi = true,
    } = await request.json();

    const cacheTtlMs = Math.max(1, cacheHours) * 60 * 60 * 1000;

    // Fetch pool from Supabase database
    let poolItems;
    try {
      const dbPool = await getCustomPoolItems();
      if (dbPool && dbPool.length > 0) {
        poolItems = dbPool
          .filter(item => item.enabled !== false)
          .map(item => ({
            id: item.item_id,
            name: item.item_name,
            category: (item.category || 'resources') as any,
            botLikelihood: 'high' as const,
            volumeTier: 'high' as const,
            demandType: 'constant' as const
          }));
      } else {
        throw new Error('Empty pool from database');
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch pool from Supabase, using fallback:', error);
      poolItems = EXPANDED_ITEM_POOL;
    }

    // Select items to analyze
    const itemsToAnalyze = fullScan
      ? poolItems
      : poolItems.sort(() => Math.random() - 0.5).slice(0, sampleSize);

    console.log(`🔄 [POOL OPTIMIZER] Analyzing ${itemsToAnalyze.length} items...`);

    // Fetch current data for all items
    const itemDataPromises = itemsToAnalyze.map(async (item) => {
      try {
        const [price, history] = await Promise.all([
          getItemPrice(item.id),
          getItemHistoryWithVolumes(item.id, 365 * 24 * 60 * 60),
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
          recentAvg,
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

    let aiInsights = 'AI analysis disabled';
    let aiAnalyzedCount = 0;

    if (useAi) {
      // Build AI input list (skip low-signal items unless forced)
      const itemsForAi = itemsWithData.filter((item) => {
        if (!skipLowSignal) return true;
        const lowVolume = item.avgVolume < 100;
        const tooVolatile = item.volatility > 60;
        return !(lowVolume || tooVolatile);
      });

      const uncached = itemsForAi.filter((item) => {
        const cached = aiCache.get(item.id);
        if (!cached) return true;
        return Date.now() - cached.timestamp >= cacheTtlMs;
      });

      const batches = chunkArray(uncached, Math.max(10, batchSize));

      for (const batch of batches) {
        const prompt = `You are an OSRS Grand Exchange flipping strategist. Analyze items for SAFE mean-reversion flipping.

STRATEGY RULES (must follow):
- Avoid structural downtrends and value traps.
- Prefer stable bot-fed supply, high liquidity, and 10–30% natural volatility.
- Penalize thin volume, extreme volatility, or manipulation risk.
- Only PROMOTE when price action is stable or recovering with support.
- Provide concise JSON only.

Return JSON in this exact format:
{
  "items": [
    {
      "id": 0,
      "aiScore": 0,
      "recommendation": "HOLD|PROMOTE|DEMOTE|REMOVE",
      "confidence": "low|medium|high",
      "reasoning": "short sentence",
      "riskFlags": ["flag1", "flag2"]
    }
  ]
}

ITEMS:
${batch
            .map(
              (item) =>
                `- ID:${item.id} Name:${item.name} Category:${item.category} Bot:${item.botLikelihood} VolumeTier:${item.volumeTier} AvgVol:${Math.round(
                  item.avgVolume
                )} Volatility:${item.volatility.toFixed(1)}% Trend:${item.trend} RecentAvg:${Math.round(
                  item.recentAvg
                )} AvgPrice:${Math.round(item.avgPrice)}`
            )
            .join('\n')}
`;

        const aiResponse = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          max_tokens: 1200,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        const responseText = aiResponse.choices[0]?.message.content || '';
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { items: [] };

        if (Array.isArray(parsed.items)) {
          parsed.items.forEach((result: AiItemResult) => {
            aiCache.set(result.id, { timestamp: Date.now(), result });
            aiAnalyzedCount += 1;
          });
        }
      }

      // Summary insights (lightweight)
      aiInsights = `AI analyzed ${aiAnalyzedCount} items (cache TTL ${cacheHours}h, batch size ${batchSize}).`;
    }

    // Merge AI results into scores
    scores.forEach((score) => {
      const cached = aiCache.get(score.id);
      if (cached && isCacheValid(cached, cacheTtlMs)) {
        score.aiScore = cached.result.aiScore;
        score.aiRecommendation = cached.result.recommendation;
        score.aiConfidence = cached.result.confidence;
        score.aiReasoning = cached.result.reasoning;
        score.aiRiskFlags = cached.result.riskFlags;
      }
    });

    // Build response
    const summary = {
      totalAnalyzed: scores.length,
      averageScore: Math.round(scores.reduce((sum, s) => sum + s.currentScore, 0) / scores.length),
      topPerformers: scores.slice(0, 5),
      needsAttention: scores.filter((s) => s.recommendation !== 'HOLD'),
      aiInsights,
      aiAnalyzedCount,
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
