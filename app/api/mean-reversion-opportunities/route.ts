import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getItemHistoryWithVolumes } from '@/lib/api/osrs';
import {
  analyzeMeanReversionOpportunity,
  rankInvestmentOpportunities,
  MeanReversionSignal
} from '@/lib/meanReversionAnalysis';
import { EXPANDED_ITEM_POOL } from '@/lib/expandedItemPool';
import { getCustomPoolItems } from '@/lib/poolManagement';
import { supabase } from '@/lib/supabase';

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

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const verboseAnalysisLogging = process.env.VAULT_VERBOSE_ALPHA === '1';


type AiOpportunityDecision = {

  id: number;
  include: boolean;
  confidenceScore: number;
  entryNow?: number;
  entryRangeLow?: number;
  entryRangeHigh?: number;
  exitBase?: number;
  exitStretch?: number;
  targetSellPrice?: number;
  stopLoss?: number;
  holdWeeks?: number;
  suggestedInvestment?: number;

  volatilityRisk: 'low' | 'medium' | 'high';
  // Phase 3: Structured Logic
  logic: {
    thesis: string; // The "Why"
    vulnerability: string; // The "Bear Case"
    trigger: string; // The invalidation point
  };
  riskFactors?: string[]; // Bear case / Counter-thesis
  buyIfDropsTo?: number;
  sellAtMin?: number;
  sellAtMax?: number;
  abortIfRisesAbove?: number;
  notes?: string;
  holdNarrative?: string;
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
    const minConfidence = parseInt(searchParams.get('minConfidence') || '0');
    const minPotential = parseInt(searchParams.get('minPotential') || '0');
    const categoryFilter = searchParams.get('category');
    const botFilter = searchParams.get('botLikelihood');

    if (verboseAnalysisLogging) {
      console.log(`ðŸ” Fresh analysis - AI-first opportunities (confidence>=${minConfidence}%, potential>=${minPotential}%)`);
    }

    // Fetch item pool from database
    console.log('[API] Fetching item pool from database...');

    console.log(`[API] Pool has ${EXPANDED_ITEM_POOL.length} items available`);

    if (EXPANDED_ITEM_POOL.length === 0) {
      console.warn('âš ï¸ Database pool is empty! Run migrations to populate.');
      return NextResponse.json({
        success: false,
        error: 'Item pool not configured. Please run database migrations.',
        opportunities: [],
        summary: { totalAnalyzed: 0, viableOpportunities: 0 }
      });
    }

    // Fetch item pool from Supabase database
    let itemsToAnalyze: any[] = [];
    try {
      const dbPool = await getCustomPoolItems();
      if (dbPool && dbPool.length > 0) {
        // Map database pool items to analysis format
        itemsToAnalyze = dbPool
          .filter((item: any) => item.enabled !== false) // Only include enabled items
          .map((item: any) => ({
            id: item.item_id,
            name: item.item_name,
            category: (item.category || 'resources') as any,
            botLikelihood: 'high' as const,
            volumeTier: 'high' as const,
            demandType: 'constant' as const
          }));
        console.log(`📊 Fetched ${itemsToAnalyze.length} enabled items from Supabase pool`);
      } else {
        throw new Error('Empty pool from database');
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch pool from Supabase, using fallback:', error);
      itemsToAnalyze = EXPANDED_ITEM_POOL;
      console.log(`📊 Using fallback pool with ${itemsToAnalyze.length} items`);
    }

    if (itemsToAnalyze.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Item pool is empty. Please add items via /admin/',
        opportunities: [],
        summary: { totalAnalyzed: 0, viableOpportunities: 0 }
      });
    }

    if (categoryFilter) {
      itemsToAnalyze = itemsToAnalyze.filter((i: any) => i.category === categoryFilter);
    }

    if (botFilter) {
      itemsToAnalyze = itemsToAnalyze.filter((i: any) => i.botLikelihood === botFilter);
    }

    // Analyze all items in the pool (including lower-tier items)
    // Focus on botted items but don't exclude any
    const priorityItems = itemsToAnalyze;

    if (verboseAnalysisLogging) {
      console.log(`ðŸ“Š Analyzing ${priorityItems.length} items from pool`);
    }

    // Fetch price data and analyze each item (AI will decide final inclusion)
    // Batch processing to avoid API rate limiting (OSRS Wiki API)
    const analysisResults: MeanReversionSignal[] = [];
    const filteredOutItems: { itemId: number; itemName: string; reason: string }[] = [];

    // Process in smaller serial batches for API stability
    const API_BATCH_SIZE = 5;
    const itemChunks = chunkArray(priorityItems, API_BATCH_SIZE);

    console.log(`[API] Starting analysis in ${itemChunks.length} batches of ${API_BATCH_SIZE}...`);

    for (let batchIdx = 0; batchIdx < itemChunks.length; batchIdx++) {
      const chunk = itemChunks[batchIdx];
      if (verboseAnalysisLogging) {
        console.log(`ðŸ“¦ Processing API batch ${batchIdx + 1}/${itemChunks.length}...`);
      }

      const batchPromises = chunk.map(async (item: any) => {
        try {
          // Fetch 365 days of price history with volume data
          const priceData = await getItemHistoryWithVolumes(item.id, 365 * 24 * 60 * 60);

          if (!priceData) {
            filteredOutItems.push({ itemId: item.id, itemName: item.name, reason: 'No price history' });
            return null;
          }

          if (priceData.length < 5) {
            filteredOutItems.push({ itemId: item.id, itemName: item.name, reason: `Insufficient data (${priceData.length})` });
            return null;
          }

          // Analyze for mean reversion metrics
          const signal = await analyzeMeanReversionOpportunity(item.id, item.name, priceData);

          if (!signal) {
            // Create minimal signal for AI evaluation
            const avgPrice = priceData.reduce((sum, p) => sum + (p.avgHighPrice + p.avgLowPrice) / 2, 0) / priceData.length;
            const currentPrice = (priceData[priceData.length - 1].avgHighPrice + priceData[priceData.length - 1].avgLowPrice) / 2;

            return {
              itemId: item.id,
              itemName: item.name,
              currentPrice,
              maxDeviation: 0,
              reversionPotential: 0,
              confidenceScore: 0,
              targetSellPrice: currentPrice,
              entryPriceNow: currentPrice,
              stopLoss: currentPrice * 0.95,
              suggestedInvestment: 0,
              volumeVelocity: 1,

              volatilityRisk: 'high' as const,
              liquidityScore: 0,
              supplyStability: 0,
              botLikelihood: (item.botLikelihood === 'very_high' ? 'very high' : item.botLikelihood || 'medium') as any,
              shortTerm: { period: '7d' as const, avgPrice, currentDeviation: 0, volatility: 0, volumeAvg: 0 },
              mediumTerm: { period: '90d' as const, avgPrice, currentDeviation: 0, volatility: 0, volumeAvg: 0 },
              longTerm: { period: '365d' as const, avgPrice, currentDeviation: 0, volatility: 0, volumeAvg: 0 },
              botDumpScore: 0,
              capitulationSignal: 'Insufficient pattern',
              recoverySignal: 'Insufficient pattern',
              expectedRecoveryWeeks: 0,
              holdNarrative: 'Insufficient pattern',
              entryRangeLow: currentPrice,
              entryRangeHigh: currentPrice,
              exitPriceBase: currentPrice,
              exitPriceStretch: currentPrice,
              strategicNarrative: 'AI evaluation requested'
            };
          }

          return signal;
        } catch (error) {
          console.error(`âŒ Batch error for ${item.name}:`, error);
          return null;
        }
      });

      const chunkResults = await Promise.all(batchPromises);
      analysisResults.push(...chunkResults.filter((s): s is MeanReversionSignal => s !== null));

      // Mandatory cooldown to prevent 429s
      await new Promise(r => setTimeout(r, 200));
    }

    let completedSignals = analysisResults;


    // Log filtering summary
    console.log(`\nðŸ“Š FILTERING SUMMARY:`);
    console.log(`   Total items in pool: ${priorityItems.length}`);
    console.log(`   Items with sufficient data: ${completedSignals.length}`);
    console.log(`   Items filtered out: ${filteredOutItems.length}`);

    if (filteredOutItems.length > 0) {
      console.log(`\nâŒ FILTERED OUT ITEMS (${filteredOutItems.length}):`);
      filteredOutItems.forEach(item => {
        console.log(`   - ${item.itemName} (ID: ${item.itemId}): ${item.reason}`);
      });
    }

    // Maintain compatibility with frontend diagnostics; AI now decides all filtering.
    const filteredItems: { itemId: number; itemName: string; reason: string }[] = filteredOutItems;

    if (verboseAnalysisLogging) {
      console.log(`[API] Completed analysis: ${completedSignals.length}/${priorityItems.length} items had sufficient data`);
    }

    let topOpportunities: MeanReversionSignal[] = [];

    let aiAnalyzedCount = 0;
    let aiApprovedCount = 0;
    let aiMissingCount = 0;
    let totalTokens = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCostUSD = 0;

    // --- PHASE 1: GLOBAL MARKET CONTEXT ---
    const globalPanicItems = completedSignals.filter(s => s.reversionPotential > 10).length;
    const globalPanicIndex = Math.round((globalPanicItems / Math.max(1, completedSignals.length)) * 100);
    const avgConfidence = completedSignals.length > 0
      ? completedSignals.reduce((sum, s) => sum + s.confidenceScore, 0) / completedSignals.length
      : 0;

    // Sector-specific trends
    const categories = Array.from(new Set(priorityItems.map(i => i.category || 'Uncategorized')));
    const sectorTrends = categories.map(cat => {
      const catItems = completedSignals.filter(s => {
        const pItem = priorityItems.find(pi => pi.id === s.itemId);
        return (pItem?.category || 'Uncategorized') === cat;
      });
      if (catItems.length === 0) return null;
      const catPanic = catItems.filter(s => s.reversionPotential > 10).length;
      return `${cat}: ${Math.round((catPanic / catItems.length) * 100)}% dumping`;
    }).filter(Boolean).join(', ');

    const marketContext = `GLOBAL MARKET HEALTH:
- Panic Index: ${globalPanicIndex}% (higher means sector-wide crash, lower means isolated dumps)
- Avg Confidence: ${avgConfidence.toFixed(1)}%
- Sector Trends: ${sectorTrends}`;

    console.log(`ðŸŒ Market Context Calculated: Panic Index ${globalPanicIndex}%`);
    // --- END CONTEXT ---

    const batches = chunkArray(completedSignals, 10);
    const trackingPromises: Promise<any>[] = [];
    const filterStats = filteredItems.map(item => ({
      itemId: item.itemId,
      itemName: item.itemName,
      reason: item.reason,
      timestamp: new Date().toISOString()
    }));

    let beforeThresholdCount = 0;
    let afterThresholdCount = 0;
    let detailedReasonings: any[] = [];

    if (completedSignals.length > 0 && process.env.OPENAI_API_KEY) {
      if (verboseAnalysisLogging) {
        console.log(`[AI] Starting AI analysis on ${completedSignals.length} items in ${batches.length} batches...`);
      }

      // Process batches in parallel to reduce total latency significantly
      const batchPromises = batches.map(async (batch, batchIdx) => {
        try {
          // Enhanced prompt for unique, item-specific reasoning
          const prompt = `You are an expert OSRS market analyst. Analyze each item with UNIQUE, SPECIFIC reasoning based on its individual market dynamics.

CRITICAL INSTRUCTIONS:
1. You MUST return a decision for EVERY item listed (${batch.length} items total)
2. Each item has different supply/demand patterns - your analysis MUST reflect these differences
3. Avoid generic templates - be specific about THIS item's situation
4. Account for 2% GE Tax (rounds down to nearest whole GP)
5. **STRICT HORIZON**: Every opportunity MUST have a \`holdWeeks\` value between 1 and 4. Do NOT suggest any flips requiring more than 4 weeks to play out.

For each item, provide:
- WHY is this item undervalued RIGHT NOW? (Be specific - mention deviations, bot activity, market events)
- WHAT makes this item's pattern unique compared to others in the batch?
- WHAT are the specific risks for THIS item (not generic risks)?

EXAMPLES OF GOOD REASONING (SHORT-TERM):
✅ "Rune arrows down 46.1% vs blended avg. Recent bot purge created supply shock. Historical pattern shows 7-10 day recovery post-ban. 83.8% upside to 90d avg."
✅ "Karambwan at 534gp vs 90d avg 980gp (45% discount). ToB/CoX demand stable but bot supply spiked. Support held at 520gp. Expecting 2-week mean reversion."

EXAMPLES OF BAD (GENERIC) REASONING:
❌ "Trading below average. Capitulation detected. Recovery expected."
❌ "Bot supply pattern. Monitor for bounce confirmation."

MARKET CONTEXT:
${marketContext}

ITEMS TO ANALYZE (${batch.length} total - YOU MUST RETURN ALL ${batch.length}):

${batch
              .map((s: any) => {
                const entryLow = Math.round(s.entryRangeLow ?? s.entryPriceNow ?? s.currentPrice);
                const entryHigh = Math.round(s.entryRangeHigh ?? s.entryPriceNow ?? s.currentPrice);
                const exitBase = Math.round(s.exitPriceBase ?? s.targetSellPrice ?? s.currentPrice);
                const exitStretch = Math.round(s.exitPriceStretch ?? exitBase);
                const stop = Math.round(s.stopLoss ?? s.entryPriceNow ?? s.currentPrice * 0.9);
                return `ID:${s.itemId} | ${s.itemName}
Current: ${Math.round(s.currentPrice)}gp | Entry: ${entryLow}-${entryHigh}gp | Exit: ${exitBase}-${exitStretch}gp | Stop: ${stop}gp
Deviations: 7d=${s.shortTerm.currentDeviation.toFixed(1)}% | 90d=${s.mediumTerm.currentDeviation.toFixed(1)}% | 365d=${s.longTerm.currentDeviation.toFixed(1)}%
Bot Dump Score: ${s.botDumpScore.toFixed(0)} | Confidence: ${s.confidenceScore} | Liquidity: ${s.liquidityScore} | Supply Stability: ${s.supplyStability}
Bot Likelihood: ${s.botLikelihood} | Risk: ${s.volatilityRisk} | Potential: ${s.reversionPotential.toFixed(1)}%
Capitulation: ${s.capitulationSignal}
Recovery: ${s.recoverySignal}
Plan: ${s.holdNarrative}`;
              })
              .join('\n\n---\n\n')}

Return ONLY valid JSON: {"items":[{"id":number,"include":boolean,"confidenceScore":number,"reasoning":"unique 2-3 sentence analysis","entryNow":number,"entryRangeLow":number,"entryRangeHigh":number,"exitBase":number,"exitStretch":number,"stopLoss":number,"holdWeeks":number,"suggestedInvestment":number,"volatilityRisk":"low|medium|high","logic":{"thesis":"why undervalued","vulnerability":"specific risk","trigger":"invalidation price"}}]}

REMEMBER: Return ALL ${batch.length} items in your response. Hold time (holdWeeks) MUST be 1, 2, 3, or 4.`;


          const aiResponse = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            max_tokens: 4500, // Increased from 3200 to allow more detailed, unique reasoning
            temperature: 0.3, // Slightly higher for more creative, varied responses
            response_format: { type: 'json_object' },
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
            const inputCost = (usage.prompt_tokens / 1000) * 0.00015;
            const outputCost = (usage.completion_tokens / 1000) * 0.0006;
            const batchCost = inputCost + outputCost;

            totalInputTokens += usage.prompt_tokens;
            totalOutputTokens += usage.completion_tokens;
            totalTokens += usage.total_tokens;
            totalCostUSD += batchCost;

            if (verboseAnalysisLogging) {
              console.log(`[AI] Batch ${batchIdx + 1}/${batches.length}: ${usage.total_tokens} tokens | Cost: $${batchCost.toFixed(4)}`);
            }
          }

          const responseText = aiResponse.choices[0]?.message?.content || '{}';
          let parsed: { items?: AiOpportunityDecision[] } = {};

          try {
            parsed = JSON.parse(responseText);
          } catch (parseError) {
            console.error(`[AI] Failed to parse JSON for batch ${batchIdx + 1}`, parseError);
            return;
          }

          if (Array.isArray(parsed.items)) {
            const returnedIds = new Set<number>();

            parsed.items.forEach((decision: AiOpportunityDecision) => {
              if (typeof decision.id !== 'number') return;
              returnedIds.add(decision.id);

              const base = batch.find((b) => b.itemId === decision.id);
              if (!base) return;

              aiAnalyzedCount += 1;
              const includeDecision = decision.include === undefined ? true : decision.include;

              if (!includeDecision) {
                trackingPromises.push(
                  supabase.rpc('update_item_performance', {
                    p_item_id: base.itemId,
                    p_item_name: base.itemName,
                    p_approved: false,
                    p_roi_potential: 0,
                    p_confidence: decision.confidenceScore ?? base.confidenceScore
                  }).catch(() => { })
                );
                return;
              }

              const entryNow = Math.round(decision.entryNow ?? base.entryPriceNow ?? base.currentPrice);
              const exitBase = Math.round(decision.exitBase ?? decision.targetSellPrice ?? base.exitPriceBase ?? base.currentPrice);
              const exitStretch = Math.round(decision.exitStretch ?? base.exitPriceStretch ?? exitBase);
              const stopLoss = Math.round(decision.stopLoss ?? base.stopLoss ?? entryNow * 0.93);
              const holdWeeks = Math.max(1, Math.round(decision.holdWeeks ?? base.expectedRecoveryWeeks ?? 4));
              const reversionPotential = ((exitBase - base.currentPrice) / base.currentPrice) * 100;

              const gatingFailure = reversionPotential < 12 || (base.confidenceScore ?? 0) < 35;
              if (gatingFailure) return;

              aiApprovedCount += 1;
              trackingPromises.push(
                supabase.rpc('update_item_performance', {
                  p_item_id: base.itemId,
                  p_item_name: base.itemName,
                  p_approved: true,
                  p_roi_potential: reversionPotential,
                  p_confidence: decision.confidenceScore ?? base.confidenceScore
                }).catch(() => { })
              );

              uniqueOpportunities.set(base.itemId, {
                ...base,
                confidenceScore: clamp(decision.confidenceScore ?? base.confidenceScore, 0, 100),
                targetSellPrice: exitBase,
                suggestedInvestment: decision.suggestedInvestment || base.suggestedInvestment,
                volatilityRisk: decision.volatilityRisk ?? base.volatilityRisk,
                strategicNarrative: decision.logic?.thesis ?? (decision as any).reasoning ?? base.strategicNarrative,
                logic: decision.logic,
                reversionPotential,
                entryPriceNow: entryNow,
                exitPriceBase: exitBase,
                exitPriceStretch: exitStretch,
                stopLoss,
                expectedRecoveryWeeks: holdWeeks,
              });
            });
          }
        } catch (err) {
          console.error(`[AI] Error processing batch ${batchIdx + 1}:`, err);
        }
      });

      // Initialize uniqueOpportunities Map before promises
      const uniqueOpportunities = new Map<number, MeanReversionSignal>();
      await Promise.all(batchPromises);
      topOpportunities = Array.from(uniqueOpportunities.values());

      if (verboseAnalysisLogging) {
        console.log(`[AI] Analysis complete. Found ${topOpportunities.length} opportunities.`);
      }

      // Skip cost logging and detailed reasoning if empty to save time
      if (topOpportunities.length > 0) {
        try {
          // --- DETAILED REASONING (Parallel) ---
          const top3 = topOpportunities.slice(0, 3);
          const detailPrompt = `Deep analysis for OSRS flip opportunities: ${top3.map(s => s.itemName).join(', ')}. Return JSON array: [{"itemId":0,"detailedAnalysis":"3-4 sentences"}]`;

          const detailResponse = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            max_tokens: 600,
            messages: [{ role: 'user', content: detailPrompt }],
          });

          const detailText = detailResponse.choices[0]?.message.content || '[]';
          const detailMatch = detailText.match(/\[[\s\S]*\]/);
          if (detailMatch) {
            detailedReasonings = JSON.parse(detailMatch[0]);
          }
        } catch (err) {
          console.warn('[AI] Detailed reasoning failed:', err);
        }

        try {
          // --- AUDITOR PASS ---
          const auditorCandidates = topOpportunities.slice(0, 5);
          const auditorPrompt = `Be a SKEPTICAL OSRS market auditor. Return ONLY JSON: {"audit":[{"itemId":0,"decision":"approve|reject","auditorNote":"..."}]}. Items: ${auditorCandidates.map(s => s.itemName).join(', ')}`;

          const auditorResponse = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            max_tokens: 500,
            messages: [{ role: 'user', content: auditorPrompt }],
            response_format: { type: 'json_object' }
          });

          const auditData = JSON.parse(auditorResponse.choices[0]?.message.content || '{}');
          if (Array.isArray(auditData.audit)) {
            auditData.audit.forEach((auditItem: any) => {
              const opp = topOpportunities.find(o => o.itemId === auditItem.itemId);
              if (opp) {
                opp.auditorDecision = auditItem.decision;
                opp.auditorNotes = auditItem.auditorNote;
                if (auditItem.decision === 'reject') opp.confidenceScore = Math.max(0, opp.confidenceScore - 20);
              }
            });
          }
        } catch (err) {
          console.warn('[AI] Auditor pass failed:', err);
        }
      }
      // --- END PHASE 2 ---
    }

    // Apply final thresholds
    beforeThresholdCount = topOpportunities.length;
    topOpportunities = topOpportunities.filter(
      (s) => s.confidenceScore >= minConfidence && s.reversionPotential >= minPotential
    );
    afterThresholdCount = topOpportunities.length;

    // Calculate summary statistics
    const summary = {
      totalAnalyzed: priorityItems.length,
      viableOpportunities: topOpportunities.length,
      aiAnalyzedCount,
      aiApprovedCount,
      aiMissingCount,
      preFilteredCount: completedSignals.length,
      preThresholdCount: beforeThresholdCount,
      filteredByThreshold: beforeThresholdCount - afterThresholdCount,

      avgConfidence: topOpportunities.length > 0
        ? topOpportunities.reduce((sum, s) => sum + s.confidenceScore, 0) / topOpportunities.length
        : 0,

      avgPotential: topOpportunities.length > 0
        ? topOpportunities.reduce((sum, s) => sum + s.reversionPotential, 0) / topOpportunities.length
        : 0,
      totalSuggestedInvestment: topOpportunities.reduce((sum, s) => sum + s.suggestedInvestment, 0),
      openaiCost: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        totalTokens: totalTokens,
        costUSD: parseFloat(totalCostUSD.toFixed(4)),
        breakdown: {
          model: 'gpt-4o-mini ($0.00015/1K input, $0.0006/1K output)',
          inputCostUSD: parseFloat(((totalInputTokens / 1000) * 0.00015).toFixed(4)),
          outputCostUSD: parseFloat(((totalOutputTokens / 1000) * 0.0006).toFixed(4)),
          estimatedTokensPerRefresh: totalTokens
        }
      }
    };

    if (totalCostUSD > 0) {
      const inputCost = (totalInputTokens / 1000) * 0.00015;
      const outputCost = (totalOutputTokens / 1000) * 0.0006;
      console.log(`\nðŸ’° === TOTAL COST BREAKDOWN ===`);
      console.log(`   Input tokens: ${totalInputTokens.toLocaleString()} Ã— $0.00015/1K = $${inputCost.toFixed(4)}`);
      console.log(`   Output tokens: ${totalOutputTokens.toLocaleString()} Ã— $0.0006/1K = $${outputCost.toFixed(4)}`);
      console.log(`   Total: ${totalTokens.toLocaleString()} tokens = $${totalCostUSD.toFixed(4)}`);
      console.log(`   Model: gpt-4o-mini`);
      console.log(`===========================\n`);
    }

    // Await all performance tracking updates before returning
    if (trackingPromises.length > 0) {
      if (verboseAnalysisLogging) {
        console.log(`ðŸ’¾ Awaiting ${trackingPromises.length} performance tracking updates...`);
      }
      await Promise.all(trackingPromises).catch(err => {
        console.error('Error awaiting tracking promises:', err);
      });
    }

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
    console.error('âŒ Mean reversion analysis failed:');
    console.error('Error:', error);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
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

    if (verboseAnalysisLogging) {
      console.log(`ðŸ” Analyzing ${itemIds.length} specific items`);
    }

    // Fetch item pool from database


    // Find items in pool

    const items = EXPANDED_ITEM_POOL.filter((i: any) => itemIds.includes(i.id));

    // Analyze each
    const analysisPromises = items.map(async (item: any) => {
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

    const signals = (await Promise.all(analysisPromises)).filter((s: any): s is MeanReversionSignal => s !== null);
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
