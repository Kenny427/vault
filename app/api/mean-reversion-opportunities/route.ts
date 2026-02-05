import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getItemHistoryWithVolumes } from '@/lib/api/osrs';
import { 
  analyzeMeanReversionOpportunity,
  rankInvestmentOpportunities,
  MeanReversionSignal
} from '@/lib/meanReversionAnalysis';
import { EXPANDED_ITEM_POOL } from '@/lib/expandedItemPool';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const aiOpportunityCache = new Map<number, { timestamp: number; signal: MeanReversionSignal }>();

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

type AiOpportunityDecision = {
  id: number;
  include: boolean;
  confidenceScore: number;
  investmentGrade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D';
  targetSellPrice: number;
  estimatedHoldingPeriod: string;
  suggestedInvestment: number;
  volatilityRisk: 'low' | 'medium' | 'high';
  reasoning: string;
};


/**
 * GET /api/mean-reversion-opportunities
 * 
 * Analyzes the entire item pool for mean-reversion investment opportunities
 * Returns ranked list of items with deviation from historical averages
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Configuration
    const minConfidence = parseInt(searchParams.get('minConfidence') || '40');
    const minPotential = parseInt(searchParams.get('minPotential') || '10');
    const categoryFilter = searchParams.get('category');
    const botFilter = searchParams.get('botLikelihood');
    const batchSize = parseInt(searchParams.get('batchSize') || '40');
    const cacheHours = parseInt(searchParams.get('cacheHours') || '24');
    const skipLowSignal = searchParams.get('skipLowSignal') !== 'false';
    
    console.log(`🔍 Analyzing AI-first opportunities (confidence>=${minConfidence}%, potential>=${minPotential}%)`);
    
    // Filter item pool based on criteria
    let itemsToAnalyze = EXPANDED_ITEM_POOL;
    
    if (categoryFilter) {
      itemsToAnalyze = itemsToAnalyze.filter(i => i.category === categoryFilter);
    }
    
    if (botFilter) {
      itemsToAnalyze = itemsToAnalyze.filter(i => i.botLikelihood === botFilter);
    }
    
    // Analyze all items in the pool (including lower-tier items)
    // Focus on botted items but don't exclude any
    const priorityItems = itemsToAnalyze;
    
    console.log(`📊 Analyzing ${priorityItems.length} items from pool`);
    
    const cacheTtlMs = Math.max(1, cacheHours) * 60 * 60 * 1000;
    const cachedSignals: MeanReversionSignal[] = [];

    // Fetch price data and analyze each item (AI will decide final inclusion)
    const analysisPromises = priorityItems.map(async (item) => {
      try {
        const cached = aiOpportunityCache.get(item.id);
        if (cached && isCacheValid(cached, cacheTtlMs)) {
          cachedSignals.push(cached.signal);
          return null;
        }

        // Fetch 1 year of price history with volume data
        const priceData = await getItemHistoryWithVolumes(item.id, 365 * 24 * 60 * 60);
        
        if (!priceData) {
          console.log(`⚠️ Item ${item.id} (${item.name}): No price history available`);
          return null;
        }

        console.log(`📈 Item ${item.id} (${item.name}): Retrieved ${priceData.length} data points`);
        
        if (priceData.length < 5) {
          console.log(`   ⚠️ Only ${priceData.length} data points (need >= 5)`);
          return null;
        }
        
        // Analyze for mean reversion metrics (AI makes final decision)
        const signal = await analyzeMeanReversionOpportunity(
          item.id,
          item.name,
          priceData
        );
        
        if (signal) {
          console.log(`✓ ${item.name}: confidence=${signal.confidenceScore}%, potential=${signal.reversionPotential.toFixed(1)}%, grade=${signal.investmentGrade}`);
        }
        
        return signal;
      } catch (error) {
        console.error(`❌ Failed to analyze item ${item.id} (${item.name}):`, error);
        return null;
      }
    });
    
    // Wait for all analyses to complete
    const allSignals = await Promise.all(analysisPromises);
    let completedSignals = allSignals.filter((s): s is MeanReversionSignal => s !== null);

    if (skipLowSignal) {
      completedSignals = completedSignals.filter((s) => s.confidenceScore >= 25 && s.reversionPotential >= 5);
    }

    // Hard guardrail: only consider items truly below medium & long-term averages
    completedSignals = completedSignals.filter(
      (s) => s.currentPrice < s.mediumTerm.avgPrice && s.currentPrice < s.longTerm.avgPrice
    );
    
    console.log(`📈 Completed analysis: ${completedSignals.length}/${priorityItems.length} items had sufficient data`);
    
    let topOpportunities: MeanReversionSignal[] = [...cachedSignals];
    let aiAnalyzedCount = 0;

    if (completedSignals.length > 0 && process.env.OPENAI_API_KEY) {
      const batches = chunkArray(completedSignals, Math.max(10, batchSize));

      for (const batch of batches) {
        const prompt = `You are an elite OSRS Grand Exchange flipping strategist. Apply the user's mean-reversion strategy with strict risk control.

      STRATEGY RULES (must follow):
      - Prefer items 10–30% below 90d/365d averages (mean-reversion window).
      - Reject structural downtrends or value traps (big drawdowns without support).
      - Require strong liquidity and stable bot-fed supply.
      - Penalize extreme volatility or thin volume.
      - Favor multi-timeframe alignment: short-term stabilizing and long-term undervalued.
      - Only INCLUDE if risk is controlled and upside is meaningful.

Return JSON only in this exact format:
{
  "items": [
    {
      "id": 0,
      "include": true,
      "confidenceScore": 0,
      "investmentGrade": "A+|A|B+|B|C|D",
      "targetSellPrice": 0,
      "estimatedHoldingPeriod": "2-4 weeks",
      "suggestedInvestment": 0,
      "volatilityRisk": "low|medium|high",
      "reasoning": "short sentence"
    }
  ]
}

ITEMS:
${batch
  .map(
    (s) =>
      `- ID:${s.itemId} Name:${s.itemName} Current:${s.currentPrice} Avg90:${Math.round(
        s.mediumTerm.avgPrice
      )} Avg365:${Math.round(s.longTerm.avgPrice)} Dev7:${s.shortTerm.currentDeviation.toFixed(
        1
      )}% Dev90:${s.mediumTerm.currentDeviation.toFixed(1)}% Dev365:${s.longTerm.currentDeviation.toFixed(
        1
      )}% Vol7:${s.shortTerm.volatility.toFixed(1)} Vol365:${s.longTerm.volatility.toFixed(
        1
      )} Potential:${s.reversionPotential.toFixed(1)}% Confidence:${s.confidenceScore} Liquidity:${s.liquidityScore} Supply:${
        s.supplyStability
      } Bot:${s.botLikelihood} VolRisk:${s.volatilityRisk}`
  )
  .join('\n')}
`;

        const aiResponse = await client.chat.completions.create({
          model: 'gpt-4-turbo',
          max_tokens: 1400,
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
          parsed.items.forEach((decision: AiOpportunityDecision) => {
            const base = batch.find((b) => b.itemId === decision.id);
            if (!base) return;
            aiAnalyzedCount += 1;

            if (!decision.include) {
              return; // Not cached, reanalyze next refresh
            }

            const targetSell = decision.targetSellPrice > 0 ? decision.targetSellPrice : base.targetSellPrice;
            const reversionPotential = ((targetSell - base.currentPrice) / base.currentPrice) * 100;

            const merged: MeanReversionSignal = {
              ...base,
              confidenceScore: Math.max(0, Math.min(100, decision.confidenceScore)),
              investmentGrade: decision.investmentGrade,
              targetSellPrice: targetSell,
              estimatedHoldingPeriod: decision.estimatedHoldingPeriod,
              suggestedInvestment: decision.suggestedInvestment > 0 ? decision.suggestedInvestment : base.suggestedInvestment,
              volatilityRisk: decision.volatilityRisk,
              reasoning: decision.reasoning,
              reversionPotential,
            };

            aiOpportunityCache.set(base.itemId, { timestamp: Date.now(), signal: merged });
            topOpportunities.push(merged);
          });
        }
      }
    } else if (completedSignals.length > 0) {
      // Fallback to rule-based if AI not configured
      topOpportunities = [...topOpportunities, ...completedSignals];
    }

    // Apply minimum thresholds after AI
    topOpportunities = topOpportunities.filter(
      (s) => s.confidenceScore >= minConfidence && s.reversionPotential >= minPotential
    );

    console.log(
      `✅ Found ${topOpportunities.length} AI-approved opportunities (AI analyzed: ${aiAnalyzedCount}, cached: ${cachedSignals.length})`
    );
    
    // Calculate summary statistics
    const summary = {
      totalAnalyzed: priorityItems.length,
      viableOpportunities: topOpportunities.length,
      avgConfidence: topOpportunities.length > 0
        ? topOpportunities.reduce((sum, s) => sum + s.confidenceScore, 0) / topOpportunities.length
        : 0,
      avgPotential: topOpportunities.length > 0
        ? topOpportunities.reduce((sum, s) => sum + s.reversionPotential, 0) / topOpportunities.length
        : 0,
      totalSuggestedInvestment: topOpportunities.reduce((sum, s) => sum + s.suggestedInvestment, 0),
      gradeDistribution: {
        'A+': topOpportunities.filter(s => s.investmentGrade === 'A+').length,
        'A': topOpportunities.filter(s => s.investmentGrade === 'A').length,
        'B+': topOpportunities.filter(s => s.investmentGrade === 'B+').length,
        'B': topOpportunities.filter(s => s.investmentGrade === 'B').length,
        'C': topOpportunities.filter(s => s.investmentGrade === 'C').length,
      }
    };
    
    return NextResponse.json({
      success: true,
      opportunities: topOpportunities,
      summary,
      filters: {
        minConfidence,
        minPotential,
        category: categoryFilter,
        botLikelihood: botFilter
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Mean reversion analysis failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze opportunities',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mean-reversion-opportunities
 * 
 * Analyze specific items for mean-reversion opportunities
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { itemIds } = body;
    
    if (!itemIds || !Array.isArray(itemIds)) {
      return NextResponse.json(
        { success: false, error: 'itemIds array required' },
        { status: 400 }
      );
    }
    
    console.log(`🔍 Analyzing ${itemIds.length} specific items`);
    
    // Find items in pool
    const items = EXPANDED_ITEM_POOL.filter(i => itemIds.includes(i.id));
    
    // Analyze each
    const analysisPromises = items.map(async (item) => {
      try {
        const priceData = await getItemHistoryWithVolumes(item.id, 365 * 24 * 60 * 60);
        if (!priceData || priceData.length < 30) return null;
        
        return await analyzeMeanReversionOpportunity(
          item.id,
          item.name,
          priceData
        );
      } catch (error) {
        console.error(`Failed to analyze item ${item.id}:`, error);
        return null;
      }
    });
    
    const signals = (await Promise.all(analysisPromises)).filter((s): s is MeanReversionSignal => s !== null);
    const ranked = rankInvestmentOpportunities(signals);
    
    return NextResponse.json({
      success: true,
      opportunities: ranked,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Specific item analysis failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze items',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
