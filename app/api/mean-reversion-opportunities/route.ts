import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
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
const CACHE_TABLE = 'ai_opportunity_cache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;


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

type CacheRow = {
  item_id: number;
  payload: MeanReversionSignal;
  updated_at: string;
};

async function getCachedSignals(itemIds: number[], ttlMs: number) {
  const cachedSignals = new Map<number, MeanReversionSignal>();
  const cachedIds = new Set<number>();

  if (supabase) {
    const cutoff = new Date(Date.now() - ttlMs).toISOString();
    const batches = chunkArray(itemIds, 100);

    for (const batch of batches) {
      const { data, error } = await supabase
        .from(CACHE_TABLE)
        .select('item_id,payload,updated_at')
        .in('item_id', batch)
        .gte('updated_at', cutoff);

      if (error) {
        console.error('Cache fetch error:', error);
        continue;
      }

      (data as CacheRow[] | null)?.forEach((row) => {
        if (row?.payload) {
          cachedSignals.set(row.item_id, row.payload);
          cachedIds.add(row.item_id);
        }
      });
    }

    return { cachedSignals, cachedIds };
  }

  // Fallback to in-memory cache
  itemIds.forEach((id) => {
    const cached = aiOpportunityCache.get(id);
    if (cached && isCacheValid(cached, ttlMs)) {
      cachedSignals.set(id, cached.signal);
      cachedIds.add(id);
    }
  });

  return { cachedSignals, cachedIds };
}

async function saveCachedSignals(rows: CacheRow[]) {
  if (rows.length === 0) return;

  if (supabase) {
    const { error } = await supabase
      .from(CACHE_TABLE)
      .upsert(rows, { onConflict: 'item_id' });

    if (error) {
      console.error('Cache upsert error:', error);
    }
    return;
  }

  rows.forEach((row) => {
    aiOpportunityCache.set(row.item_id, { timestamp: Date.now(), signal: row.payload });
  });
}


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
    const { cachedSignals, cachedIds } = await getCachedSignals(
      priorityItems.map((i) => i.id),
      cacheTtlMs
    );

    const cachedSignalList = Array.from(cachedSignals.values());

    // Fetch price data and analyze each item (AI will decide final inclusion)
    const analysisPromises = priorityItems.map(async (item) => {
      try {
        if (cachedIds.has(item.id)) {
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
    
    let topOpportunities: MeanReversionSignal[] = [...cachedSignalList];
    let aiAnalyzedCount = 0;

    if (completedSignals.length > 0 && process.env.OPENAI_API_KEY) {
      const batches = chunkArray(completedSignals, Math.max(10, batchSize));

      for (const batch of batches) {
        const upsertRows: CacheRow[] = [];
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

            upsertRows.push({
              item_id: base.itemId,
              payload: merged,
              updated_at: new Date().toISOString(),
            });
            topOpportunities.push(merged);
          });
        }

        await saveCachedSignals(upsertRows);
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
      `✅ Found ${topOpportunities.length} AI-approved opportunities (AI analyzed: ${aiAnalyzedCount}, cached: ${cachedSignalList.length})`
    );
    
    // Calculate summary statistics
    const summary = {
      totalAnalyzed: priorityItems.length,
      viableOpportunities: topOpportunities.length,
      aiAnalyzedCount,
      cachedCount: cachedSignalList.length,
      cacheHours,
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
    const { itemIds, action } = body;

    if (action === 'clearCache') {
      aiOpportunityCache.clear();
      if (supabase) {
        const { error } = await supabase.from(CACHE_TABLE).delete().neq('item_id', 0);
        if (error) {
          return NextResponse.json({ success: false, error: 'Failed to clear cache' }, { status: 500 });
        }
      }
      return NextResponse.json({ success: true, cleared: true });
    }
    
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
