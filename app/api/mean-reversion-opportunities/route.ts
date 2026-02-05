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

// No caching - fresh analysis every time for live prices

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
  buyIfDropsTo?: number;
  sellAtMin?: number;
  sellAtMax?: number;
  abortIfRisesAbove?: number;
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
    const batchSize = parseInt(searchParams.get('batchSize') || '15'); // Reduced from 40 to 15 for reliable JSON parsing
    
    console.log(`🔍 Fresh analysis - AI-first opportunities (confidence>=${minConfidence}%, potential>=${minPotential}%)`);
    
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

    // Fetch price data and analyze each item (AI will decide final inclusion)
    const analysisPromises = priorityItems.map(async (item) => {
      try {

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

    // Track which items get filtered out and why
    const filteredItems: { itemId: number; itemName: string; reason: string }[] = [];

    // Apply conservative pre-filtering before sending to AI
    // Keep filters minimal - let AI be the main decision maker
    completedSignals = completedSignals.filter((s) => {
      // Only filter obvious non-starters to reduce AI cost
      // AI will make the final smart decisions
      
      // 1. Must be below at least ONE historical average (basic requirement for mean-reversion)
      if (s.currentPrice >= s.mediumTerm.avgPrice && s.currentPrice >= s.longTerm.avgPrice) {
        filteredItems.push({
          itemId: s.itemId,
          itemName: s.itemName,
          reason: 'Above both 90d and 365d averages (no discount)'
        });
        return false;
      }
      
      // 2. Must have minimal signal (but very lenient - AI decides quality)
      if (s.confidenceScore < 15 || s.reversionPotential < 3) {
        filteredItems.push({
          itemId: s.itemId,
          itemName: s.itemName,
          reason: `Very weak signal (confidence ${s.confidenceScore}%, potential ${s.reversionPotential.toFixed(1)}%)`
        });
        return false;
      }
      
      // 3. Must have minimal liquidity (can't flip items with zero volume)
      if (s.liquidityScore < 2) {
        filteredItems.push({
          itemId: s.itemId,
          itemName: s.itemName,
          reason: `Nearly illiquid (score ${s.liquidityScore}/10)`
        });
        return false;
      }
      
      // All other decisions left to AI - it's smarter than hard rules
      return true;
    });
    
    console.log(`📈 Completed analysis: ${completedSignals.length}/${priorityItems.length} items had sufficient data`);
    
    let topOpportunities: MeanReversionSignal[] = [];
    let aiAnalyzedCount = 0;
    let aiApprovedCount = 0;

    if (completedSignals.length > 0 && process.env.OPENAI_API_KEY) {
      console.log(`🤖 Starting AI analysis on ${completedSignals.length} items...`);
      const batches = chunkArray(completedSignals, Math.max(10, batchSize));

      for (const batch of batches) {
        // Compressed prompt - let AI be the expert, minimal fluff
        const prompt = `OSRS mean-reversion analyzer. Evaluate ALL items below.

INCLUDE items with:
- 10-30% below 90d/365d avg (mean-reversion window)
- Strong liquidity + stable supply
- No structural downtrends or value traps
- Multi-timeframe alignment preferred

EXCLUDE items with:
- Structural downtrends (consistently declining)
- Very low liquidity (<3)
- Extreme volatility without support

Format: ID|Name|Cur|Avg90|Avg365|Dev7%|Dev90%|Dev365%|Vol7|Vol365|Pot%|Conf|Liq|Sup|Bot|Risk

${batch
  .map(
    (s) =>
      `${s.itemId}|${s.itemName}|${s.currentPrice}|${Math.round(
        s.mediumTerm.avgPrice
      )}|${Math.round(s.longTerm.avgPrice)}|${s.shortTerm.currentDeviation.toFixed(
        1
      )}|${s.mediumTerm.currentDeviation.toFixed(1)}|${s.longTerm.currentDeviation.toFixed(
        1
      )}|${s.shortTerm.volatility.toFixed(1)}|${s.longTerm.volatility.toFixed(
        1
      )}|${s.reversionPotential.toFixed(1)}|${s.confidenceScore}|${s.liquidityScore}|${
        s.supplyStability
      }|${s.botLikelihood}|${s.volatilityRisk}`
  )
  .join('\n')}

For INCLUDED items, provide detailed reasoning with three parts:
1) Why buy: Price vs historical, supply/demand signals, liquidity status
2) When to sell: Price target, alternative exit conditions
3) Key risks: Market factors, bot activity, volatility concerns

Also provide:
- buyIfDropsTo: Aggressive entry price (5-10% below current)
- sellAtMin/sellAtMax: Price range for exit (min after GE tax recovery, max for greed)
- abortIfRisesAbove: Stop-loss price if reversal fails

Return JSON for ALL ${batch.length} items (set include=false for rejects).
CRITICAL: Return ONLY raw JSON, no markdown blocks, no code fences, no explanations.
Use valid JSON: double quotes, proper booleans, no trailing commas.
Example: {"items":[{"id":563,"include":true,"confidenceScore":72,"investmentGrade":"A","targetSellPrice":250,"estimatedHoldingPeriod":"2-4w","suggestedInvestment":500000,"volatilityRisk":"low","buyIfDropsTo":225,"sellAtMin":250,"sellAtMax":270,"abortIfRisesAbove":200,"reasoning":"15% below 90d avg ($250 vs $265). Stable demand for runes during high-activity seasons. Sell once price recovers to historical range."}]}`;

        const aiResponse = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          max_tokens: 3000, // Increased for 15 items (~200 tokens each)
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        // Log token usage for cost tracking
        const usage = aiResponse.usage;
        if (usage) {
          const inputCost = (usage.prompt_tokens / 1000) * 0.00015; // GPT-4o-mini: $0.00015/1K
          const outputCost = (usage.completion_tokens / 1000) * 0.0006; // GPT-4o-mini: $0.0006/1K
          const totalCost = inputCost + outputCost;
          console.log(`💰 Batch ${batches.indexOf(batch) + 1}/${batches.length}: ${usage.prompt_tokens} in + ${usage.completion_tokens} out = ${usage.total_tokens} tokens | Cost: $${totalCost.toFixed(4)} ($${inputCost.toFixed(4)} in + $${outputCost.toFixed(4)} out)`);
        }

        const responseText = aiResponse.choices[0]?.message.content || '';
        
        // Strip markdown code blocks if present
        let cleanedText = responseText.trim();
        if (cleanedText.startsWith('```json')) {
          cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
        } else if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```\s*/, '').replace(/```\s*$/, '');
        }
        
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        
        let parsed = { items: [] };
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch (parseError) {
            console.error(`❌ AI returned invalid JSON for batch. Error: ${parseError}`);
            console.error(`   Response preview: ${responseText.substring(0, 500)}...`);
            // Try to fix common JSON issues
            try {
              // Replace single quotes with double quotes and fix true/false
              const fixed = jsonMatch[0]
                .replace(/'/g, '"')
                .replace(/include:\s*(true|false)/g, '"include":$1')
                .replace(/(\w+):/g, '"$1":'); // Quote unquoted keys
              parsed = JSON.parse(fixed);
              console.log(`   ✓ Fixed JSON and parsed successfully`);
            } catch (fixError) {
              console.error(`   ❌ Could not fix JSON, skipping batch`);
              parsed = { items: [] };
            }
          }
        }

        if (Array.isArray(parsed.items)) {
          parsed.items.forEach((decision: AiOpportunityDecision) => {
            const base = batch.find((b) => b.itemId === decision.id);
            if (!base) return;
            aiAnalyzedCount += 1;

            if (!decision.include) {
              return; // AI rejected this opportunity
            }

            aiApprovedCount += 1;
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
              buyIfDropsTo: decision.buyIfDropsTo,
              sellAtMin: decision.sellAtMin,
              sellAtMax: decision.sellAtMax,
              abortIfRisesAbove: decision.abortIfRisesAbove,
              reversionPotential,
            };

            topOpportunities.push(merged);
          });
        }
      }
      console.log(`🤖 AI analysis complete: processed ${batches.length} batches`);
      console.log(`   📊 Sent ${completedSignals.length} items to AI, received decisions for ${aiAnalyzedCount} items`);
      console.log(`   ✅ AI approved ${aiApprovedCount} items (before threshold filtering)`);
    } else if (completedSignals.length > 0) {
      // Fallback to rule-based if AI not configured
      console.log(`⚠️ No OpenAI key found - using rule-based analysis only`);
      topOpportunities = [...completedSignals];
    }

    // Apply minimum thresholds after AI
    const beforeThresholdCount = topOpportunities.length;
    topOpportunities = topOpportunities.filter(
      (s) => s.confidenceScore >= minConfidence && s.reversionPotential >= minPotential
    );

    console.log(
      `✅ Final result: ${topOpportunities.length} opportunities (${beforeThresholdCount - topOpportunities.length} filtered by thresholds: confidence>=${minConfidence}%, potential>=${minPotential}%)`
    );
    
    // Include filter stats in response for frontend tracking
    const filterStats = filteredItems.map(item => ({
      itemId: item.itemId,
      itemName: item.itemName,
      reason: item.reason,
      timestamp: new Date().toISOString()
    }));
    
    // Generate detailed reasoning for top 3 opportunities
    let detailedReasonings: { itemId: number; itemName: string; detailedAnalysis: string }[] = [];
    
    if (topOpportunities.length > 0 && process.env.OPENAI_API_KEY) {
      const top3 = topOpportunities.slice(0, 3);
      
      const detailPrompt = `Deep analysis for OSRS flip opportunities. For each:
1. Why undervalued (timeframes)
2. Support/resistance + dynamics
3. Risk factors
4. Timeline + catalysts

${top3.map(s => 
  `${s.itemId}|${s.itemName}|Cur:${s.currentPrice}|90d:${Math.round(s.mediumTerm.avgPrice)}|365d:${Math.round(s.longTerm.avgPrice)}|Dev:${s.shortTerm.currentDeviation.toFixed(1)}/${s.mediumTerm.currentDeviation.toFixed(1)}/${s.longTerm.currentDeviation.toFixed(1)}%|Tgt:${s.targetSellPrice}|Pot:${s.reversionPotential.toFixed(1)}%|${s.investmentGrade}|${s.volatilityRisk}|Liq:${s.liquidityScore}|Sup:${s.supplyStability}`
).join('\n')}

Return JSON array: [{"itemId":0,"detailedAnalysis":"3-4 sentences"}]`;

      const detailResponse = await client.chat.completions.create({
        model: 'gpt-4-turbo',
        max_tokens: 600, // Reduced from 800
        messages: [
          {
            role: 'user',
            content: detailPrompt,
          },
        ],
      });

      const detailText = detailResponse.choices[0]?.message.content || '';
      
      try {
        // Try to parse JSON array first
        const jsonMatch = detailText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed)) {
            detailedReasonings = parsed.map((item: any) => ({
              itemId: item.itemId,
              itemName: top3.find(t => t.itemId === item.itemId)?.itemName || '',
              detailedAnalysis: item.detailedAnalysis,
            }));
          }
        } else {
          // Try to parse individual objects separated by newlines
          const objects = detailText.split(/}\s*{/);
          objects.forEach((obj, idx) => {
            const wrapped = (idx === 0 ? obj : '{' + obj) + (idx === objects.length - 1 ? '}' : '');
            try {
              const parsed = JSON.parse(wrapped);
              detailedReasonings.push({
                itemId: parsed.itemId,
                itemName: top3.find(t => t.itemId === parsed.itemId)?.itemName || '',
                detailedAnalysis: parsed.detailedAnalysis,
              });
            } catch {
              // Skip parsing errors
            }
          });
        }
      } catch (e) {
        console.error('Failed to parse detailed reasoning:', e);
      }
    }
    
    // Calculate summary statistics
    const summary = {
      totalAnalyzed: priorityItems.length,
      viableOpportunities: topOpportunities.length,
      aiAnalyzedCount,
      aiApprovedCount,
      preFilteredCount: completedSignals.length,
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
      detailedReasonings,
      summary,
      filteredItems,
      filterStats,
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
