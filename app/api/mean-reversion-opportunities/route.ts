import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getItemHistoryWithVolumes } from '@/lib/api/osrs';
import {
  analyzeMeanReversionOpportunity,
  rankInvestmentOpportunities,
  MeanReversionSignal
} from '@/lib/meanReversionAnalysis';
import { EXPANDED_ITEM_POOL } from '@/lib/expandedItemPool';
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
    const batchSize = parseInt(searchParams.get('batchSize') || '15'); // Reduced from 40 to 15 for reliable JSON parsing

    if (verboseAnalysisLogging) {
      console.log(`ðŸ” Fresh analysis - AI-first opportunities (confidence>=${minConfidence}%, potential>=${minPotential}%)`);
    }

    // Fetch item pool from database
    console.log('ðŸ“Š Fetching item pool from database...');

    console.log(`ðŸ“Š Fetched ${EXPANDED_ITEM_POOL.length} items from database`);

    if (EXPANDED_ITEM_POOL.length === 0) {
      console.warn('âš ï¸ Database pool is empty! Run migrations to populate.');
      return NextResponse.json({
        success: false,
        error: 'Item pool not configured. Please run database migrations.',
        opportunities: [],
        summary: { totalAnalyzed: 0, viableOpportunities: 0 }
      });
    }

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

    console.log(`ðŸš€ Starting analysis in ${itemChunks.length} batches of ${API_BATCH_SIZE}...`);

    for (let batchIdx = 0; batchIdx < itemChunks.length; batchIdx++) {
      const chunk = itemChunks[batchIdx];
      if (verboseAnalysisLogging) {
        console.log(`ðŸ“¦ Processing API batch ${batchIdx + 1}/${itemChunks.length}...`);
      }

      const batchPromises = chunk.map(async (item) => {
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
      console.log(`ðŸ“ˆ Completed analysis: ${completedSignals.length}/${priorityItems.length} items had sufficient data (all forwarded to AI)`);
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

    const trackingPromises: Promise<any>[] = [];

    if (completedSignals.length > 0 && process.env.OPENAI_API_KEY) {
      if (verboseAnalysisLogging) {
        console.log(`ðŸ¤– Starting AI analysis on ${completedSignals.length} items...`);
      }
      const batches = chunkArray(completedSignals, Math.max(10, batchSize));


      for (const batch of batches) {
        // Compressed prompt - let AI be the expert, minimal fluff
        const prompt = `OSRS flip strategist focused on botted mean-reversion dumps. Evaluate EVERY item below and return a JSON decision. Account for 2% GE Tax (rounds down to nearest whole GP); profit must clear tax.

Required JSON per item:
- include (boolean)
- confidenceScore (0-100)
- logic: object ({ "thesis": "behavioral narrative", "vulnerability": "risk factor", "trigger": "invalidation price" })
- entryNow, entryRangeLow, entryRangeHigh (gp)
- exitBase, exitStretch (gp)
- stopLoss (gp)
- holdWeeks (integer)
- suggestedInvestment (gp)
- volatilityRisk (low|medium|high)

MARKET CONTEXT:
${marketContext}

DATA (ID|Name|Cur|EntryRange|ExitRange|Stop|Dev7|Dev90|Dev365|BotDump|Conf|Liq|Supply|HoldWk|Bot|Risk|Pot%|VolVel):

${batch
            .map((s) => {
              const entryLow = Math.round(s.entryRangeLow ?? s.entryPriceNow ?? s.currentPrice);
              const entryHigh = Math.round(s.entryRangeHigh ?? s.entryPriceNow ?? s.currentPrice);
              const exitBase = Math.round(s.exitPriceBase ?? s.targetSellPrice ?? s.currentPrice);
              const exitStretch = Math.round(s.exitPriceStretch ?? exitBase);
              const stop = Math.round(s.stopLoss ?? s.entryPriceNow ?? s.currentPrice * 0.9);
              return `${s.itemId}|${s.itemName}|${Math.round(s.currentPrice)}|${entryLow}-${entryHigh}|${exitBase}-${exitStretch}|${stop}|${s.shortTerm.currentDeviation.toFixed(1)}|${s.mediumTerm.currentDeviation.toFixed(1)}|${s.longTerm.currentDeviation.toFixed(1)}|${s.botDumpScore.toFixed(0)}|${s.confidenceScore}|${s.liquidityScore}|${s.supplyStability}|${s.expectedRecoveryWeeks}|${s.botLikelihood}|${s.volatilityRisk}|${s.reversionPotential.toFixed(1)}|${(s.volumeVelocity ?? 1).toFixed(2)}\nCap:${s.capitulationSignal}\nRec:${s.recoverySignal}\nPlan:${s.holdNarrative}`;
            })
            .join('\n\n')}

Return ONLY valid JSON in the form {"items":[{...}]} (no markdown, no comments, no additional text).`;


        const aiResponse = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          max_tokens: 3200,
          temperature: 0.2,
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
          const inputCost = (usage.prompt_tokens / 1000) * 0.00015; // GPT-4o-mini: $0.00015/1K
          const outputCost = (usage.completion_tokens / 1000) * 0.0006; // GPT-4o-mini: $0.0006/1K
          const batchCost = inputCost + outputCost;

          // Accumulate totals
          totalInputTokens += usage.prompt_tokens;
          totalOutputTokens += usage.completion_tokens;
          totalTokens += usage.total_tokens;
          totalCostUSD += batchCost;

          if (verboseAnalysisLogging) {
            console.log(`ðŸ’° Batch ${batches.indexOf(batch) + 1}/${batches.length}: ${usage.prompt_tokens} in + ${usage.completion_tokens} out = ${usage.total_tokens} tokens | Cost: $${batchCost.toFixed(4)} ($${inputCost.toFixed(4)} in + $${outputCost.toFixed(4)} out)`);
          }
        }


        const rawContent = aiResponse.choices[0]?.message?.content as unknown;
        let responseText = '';
        if (typeof rawContent === 'string') {
          responseText = rawContent;
        } else if (Array.isArray(rawContent)) {
          responseText = (rawContent as Array<any>)
            .map((part) => {
              if (typeof part === 'string') return part;
              if (part?.type === 'text') return part.text?.value ?? '';
              return '';
            })
            .join('');
        }


        let parsed: { items?: AiOpportunityDecision[] } = {};
        try {
          parsed = JSON.parse(responseText);
        } catch (parseError) {
          console.error('âŒ AI returned invalid JSON for batch.', parseError);
          console.error(`   Response preview: ${responseText.substring(0, 500)}...`);
          parsed = {};
        }

        if (!Array.isArray(parsed.items) && verboseAnalysisLogging) {
          console.warn('âš ï¸ AI response missing valid items array. Raw preview:', responseText.substring(0, 400));
        }

        if (Array.isArray(parsed.items)) {
          if (verboseAnalysisLogging) {
            console.log(`ðŸ¤– AI returned ${parsed.items.length} item decisions in batch`);
          }


          const returnedIds = new Set<number>();

          parsed.items.forEach((decision: AiOpportunityDecision, index: number) => {
            if (typeof decision.id !== 'number') {
              const fallbackId = index < batch.length ? batch[index]?.itemId : undefined;
              if (typeof fallbackId === 'number') {
                decision.id = fallbackId;
              } else {
                return;
              }
            }

            returnedIds.add(decision.id);
            const base = batch.find((b) => b.itemId === decision.id);
            if (!base) {
              return;
            }

            aiAnalyzedCount += 1;


            const includeDecision = decision.include === undefined ? true : decision.include;
            if (!includeDecision) {
              // Track item performance: AI rejected this item
              trackingPromises.push(
                supabase.rpc('update_item_performance', {
                  p_item_id: base.itemId,
                  p_item_name: base.itemName,
                  p_approved: false,
                  p_roi_potential: 0,
                  p_confidence: decision.confidenceScore ?? base.confidenceScore
                }).then(({ error }: { error: any }) => {
                  if (error) {
                    console.error(`âŒ Failed to track rejected item ${base.itemName}:`, error);
                  }
                })
              );
              return;
            }


            const entryNow = Math.round(decision.entryNow ?? base.entryPriceNow ?? base.currentPrice);
            const entryRangeLow = Math.round(decision.entryRangeLow ?? base.entryRangeLow ?? entryNow);
            const entryRangeHigh = Math.round(decision.entryRangeHigh ?? base.entryRangeHigh ?? entryNow);

            const exitBase = Math.round(
              decision.exitBase ??
              decision.targetSellPrice ??
              base.exitPriceBase ??
              base.targetSellPrice ??
              base.currentPrice
            );
            const exitStretch = Math.round(decision.exitStretch ?? base.exitPriceStretch ?? exitBase);
            const stopLoss = Math.round(decision.stopLoss ?? base.stopLoss ?? entryNow * 0.93);
            const holdWeeks = Math.max(1, Math.round(decision.holdWeeks ?? base.expectedRecoveryWeeks ?? 4));
            const reversionPotential = ((exitBase - base.currentPrice) / base.currentPrice) * 100;

            const gatingFailure =
              reversionPotential < 12 ||
              (base.confidenceScore ?? 0) < 35 ||
              (base.liquidityScore ?? 0) < 25 ||
              (base.botDumpScore ?? 0) < 25;

            if (gatingFailure) {
              if (verboseAnalysisLogging) {
                console.log(
                  `âš ï¸ Server gate rejected ${base.itemName} (id ${base.itemId}) â€” pot ${reversionPotential.toFixed(
                    1
                  )}%, conf ${base.confidenceScore}, liq ${base.liquidityScore}, dump ${base.botDumpScore}`
                );
              }

              trackingPromises.push(
                supabase.rpc('update_item_performance', {
                  p_item_id: base.itemId,
                  p_item_name: base.itemName,
                  p_approved: false,
                  p_roi_potential: reversionPotential,
                  p_confidence: base.confidenceScore
                }).then(({ error }: { error: any }) => {
                  if (error) {
                    console.error(`âŒ Failed to track gate rejected item ${base.itemName}:`, error);
                  }
                })
              );
              return;
            }


            aiApprovedCount += 1;

            // Track item performance: AI approved this item
            trackingPromises.push(
              supabase.rpc('update_item_performance', {
                p_item_id: base.itemId,
                p_item_name: base.itemName,
                p_approved: true,
                p_roi_potential: reversionPotential,
                p_confidence: decision.confidenceScore ?? base.confidenceScore
              }).then(({ error }: { error: any }) => {
                if (error) {
                  console.error(`âŒ Failed to track approved item ${base.itemName}:`, error);
                }
              })
            );

            const merged: MeanReversionSignal = {

              ...base,
              confidenceScore: clamp(decision.confidenceScore ?? base.confidenceScore, 0, 100),
              targetSellPrice: exitBase,
              suggestedInvestment:
                decision.suggestedInvestment && decision.suggestedInvestment > 0
                  ? decision.suggestedInvestment
                  : base.suggestedInvestment,
              volatilityRisk: decision.volatilityRisk ?? base.volatilityRisk,
              strategicNarrative: decision.logic?.thesis ?? (decision as any).reasoning ?? base.strategicNarrative,
              logic: decision.logic,
              sellAtMin: decision.sellAtMin ?? base.sellAtMin ?? exitBase,
              sellAtMax: decision.sellAtMax ?? base.sellAtMax ?? exitStretch,

              abortIfRisesAbove: decision.abortIfRisesAbove ?? base.abortIfRisesAbove ?? stopLoss,
              reversionPotential,
              entryPriceNow: entryNow,
              entryRangeLow,
              entryRangeHigh,
              exitPriceBase: exitBase,
              exitPriceStretch: exitStretch,
              stopLoss,
              expectedRecoveryWeeks: holdWeeks,
              holdNarrative: decision.holdNarrative ?? base.holdNarrative,
            };

            topOpportunities.push(merged);
          });

          const missingInBatch = batch.filter((item) => !returnedIds.has(item.itemId));
          if (missingInBatch.length > 0) {
            aiMissingCount += missingInBatch.length;
            if (verboseAnalysisLogging) {
              console.warn(
                `âš ï¸ AI omitted ${missingInBatch.length} item(s) from response: ${missingInBatch
                  .map((item) => item.itemId)
                  .join(', ')}`
              );
            }
            missingInBatch.forEach((item) => {
              trackingPromises.push(
                supabase.rpc('update_item_performance', {
                  p_item_id: item.itemId,
                  p_item_name: item.itemName,
                  p_approved: false,
                  p_roi_potential: 0,
                  p_confidence: item.confidenceScore || 0
                }).then(({ error }: { error: any }) => {
                  if (error) {
                    console.error(`âŒ Failed to track omitted item ${item.itemName}:`, error);
                  }
                })
              );

              filteredItems.push({
                itemId: item.itemId,
                itemName: item.itemName,
                reason: 'AI omitted entry; auto-rejected by server gate',
              });
            });
          }


        }

      }

      // Deduplicate by item (keep highest confidence / upside)
      const uniqueMap = new Map<number, MeanReversionSignal>();
      for (const opp of topOpportunities) {
        const existing = uniqueMap.get(opp.itemId);
        if (!existing) {
          uniqueMap.set(opp.itemId, opp);
          continue;
        }
        const existingConfidence = existing.confidenceScore ?? 0;
        const oppConfidence = opp.confidenceScore ?? 0;
        if (
          oppConfidence > existingConfidence ||
          (oppConfidence === existingConfidence && (opp.reversionPotential ?? 0) > (existing.reversionPotential ?? 0))
        ) {
          uniqueMap.set(opp.itemId, opp);
        }
      }
      topOpportunities = Array.from(uniqueMap.values());

      const MAX_AI_APPROVED = 36;
      if (topOpportunities.length > MAX_AI_APPROVED) {

        topOpportunities = topOpportunities
          .sort((a, b) => {
            const confDiff = (b.confidenceScore ?? 0) - (a.confidenceScore ?? 0);
            if (confDiff !== 0) return confDiff;
            const potDiff = (b.reversionPotential ?? 0) - (a.reversionPotential ?? 0);
            if (potDiff !== 0) return potDiff;
            return (b.liquidityScore ?? 0) - (a.liquidityScore ?? 0);
          })
          .slice(0, MAX_AI_APPROVED);
      }


    } else if (completedSignals.length > 0) {

      // Fallback to rule-based if AI not configured
      if (verboseAnalysisLogging) {
        console.log(`âš ï¸ No OpenAI key found - using rule-based analysis only`);
      }
      topOpportunities = [...completedSignals];
    }


    // Apply minimum thresholds after AI
    const beforeThresholdCount = topOpportunities.length;
    topOpportunities = topOpportunities.filter(
      (s) => s.confidenceScore >= minConfidence && s.reversionPotential >= minPotential
    );
    const afterThresholdCount = topOpportunities.length;

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
        `${s.itemId}|${s.itemName}|Cur:${s.currentPrice}|90d:${Math.round(s.mediumTerm.avgPrice)}|Dev:${s.shortTerm.currentDeviation.toFixed(1)}/${s.mediumTerm.currentDeviation.toFixed(1)}%|Tgt:${s.targetSellPrice}|Pot:${s.reversionPotential.toFixed(1)}%|Vol:${s.volatilityRisk}|Liq:${s.liquidityScore}`
      ).join('\n')}

Return JSON array: [{"itemId":0,"detailedAnalysis":"3-4 sentences"}]`;

      const detailResponse = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 600, // Reduced from 800
        messages: [
          {
            role: 'user',
            content: detailPrompt,
          },
        ],
      });

      // Track detailed analysis cost
      const detailUsage = detailResponse.usage;
      if (detailUsage) {
        const detailInputCost = (detailUsage.prompt_tokens / 1000) * 0.00015; // GPT-4o-mini: $0.00015/1K
        const detailOutputCost = (detailUsage.completion_tokens / 1000) * 0.0006; // GPT-4o-mini: $0.0006/1K
        const detailBatchCost = detailInputCost + detailOutputCost;

        totalInputTokens += detailUsage.prompt_tokens;
        totalOutputTokens += detailUsage.completion_tokens;
        totalTokens += detailUsage.total_tokens;
        totalCostUSD += detailBatchCost;

        if (verboseAnalysisLogging) {
          console.log(`ðŸ’° Detailed analysis: ${detailUsage.prompt_tokens} in + ${detailUsage.completion_tokens} out = ${detailUsage.total_tokens} tokens | Cost: $${detailBatchCost.toFixed(4)} ($${detailInputCost.toFixed(4)} in + $${detailOutputCost.toFixed(4)} out)`);
        }
      }

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

      // --- PHASE 2: THE CRITIC (AUDITOR PASS) ---
      // We take the top opportunities (even beyond top 3) and subject them to a final validity check
      const auditingCandidates = topOpportunities.slice(0, 5);
      if (verboseAnalysisLogging) {
        console.log(`ðŸ§ Starting Auditor Pass on top ${auditingCandidates.length} items...`);
      }

      const auditorPrompt = `You are a SKEPTICAL OSRS market auditor. Your job is to find reasons NOT to take the following trades.
Analyze these potential opportunities and identify the "hidden traps" (e.g., structural decline, fake volume).

DATA (Item | Confidence | Strategist Thesis):
${auditingCandidates.map(s =>
        `${s.itemName} | Conf:${s.confidenceScore} | Thesis:${s.strategicNarrative}`
      ).join('\n')}

Instructions:
- For each item, provide a "decision" (approve|caution|reject) and a 1-sentence "auditorNote" which is your SKEPTICAL critique of the strategist's thesis.
- If you reject an item, give it a 25% confidence penalty.
- Return ONLY JSON: {"audit":[{"itemId":0,"decision":"approve","auditorNote":"..."}]}`;

      const auditorResponse = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 500,
        messages: [{ role: 'user', content: auditorPrompt }],
        response_format: { type: 'json_object' }
      });

      const auditorUsage = auditorResponse.usage;
      if (auditorUsage) {
        const cost = (auditorUsage.prompt_tokens / 1000) * 0.00015 + (auditorUsage.completion_tokens / 1000) * 0.0006;
        totalCostUSD += cost;
        totalTokens += auditorUsage.total_tokens;
      }

      try {
        const auditText = auditorResponse.choices[0]?.message.content || '{}';
        const parsedAudit = JSON.parse(auditText);
        if (Array.isArray(parsedAudit.audit)) {
          parsedAudit.audit.forEach((auditItem: any) => {
            const opp = topOpportunities.find(o => o.itemId === auditItem.itemId);
            if (opp) {
              opp.auditorDecision = auditItem.decision;
              opp.auditorNotes = auditItem.auditorNote;

              if (auditItem.decision === 'reject') {
                opp.confidenceScore = Math.max(0, opp.confidenceScore - 25);
              } else if (auditItem.decision === 'caution') {
                opp.confidenceScore = Math.max(0, opp.confidenceScore - 10);
              }
            }
          });
        }
      } catch (err) {
        console.error('Failed to parse auditor response:', err);
      }
      // --- END PHASE 2 ---
    }

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
