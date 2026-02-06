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

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const verboseAnalysisLogging = process.env.VAULT_VERBOSE_ALPHA === '1';


type AiOpportunityDecision = {

  id: number;
  include: boolean;
  confidenceScore: number;
  investmentGrade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D';
  entryNow?: number;
  entryRangeLow?: number;
  entryRangeHigh?: number;
    exitBase?: number;
  exitStretch?: number;
    targetSellPrice?: number;
  stopLoss?: number;
  holdWeeks?: number;
  estimatedHoldingPeriod?: string;
  suggestedInvestment?: number;

  volatilityRisk: 'low' | 'medium' | 'high';
  reasoning: string;
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
      console.log(`🔍 Fresh analysis - AI-first opportunities (confidence>=${minConfidence}%, potential>=${minPotential}%)`);
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
      console.log(`📊 Analyzing ${priorityItems.length} items from pool`);
    }

    // Fetch price data and analyze each item (AI will decide final inclusion)

    const analysisPromises = priorityItems.map(async (item) => {
      try {

        // Fetch 1 year of price history with volume data
        const priceData = await getItemHistoryWithVolumes(item.id, 365 * 24 * 60 * 60);
        
                if (!priceData) {
          if (verboseAnalysisLogging) {
            console.log(`⚠️ Item ${item.id} (${item.name}): No price history available`);
          }
          return null;
        }

        if (verboseAnalysisLogging) {
          console.log(`📈 Item ${item.id} (${item.name}): Retrieved ${priceData.length} data points`);
        }
        
        if (priceData.length < 5) {
          if (verboseAnalysisLogging) {
            console.log(`   ⚠️ Only ${priceData.length} data points (need >= 5)`);
          }
          return null;
        }
        
        // Analyze for mean reversion metrics (AI makes final decision)
        const signal = await analyzeMeanReversionOpportunity(
          item.id,
          item.name,
          priceData
        );
        
        if (signal && verboseAnalysisLogging) {
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

        // Maintain compatibility with frontend diagnostics; AI now decides all filtering.
    const filteredItems: { itemId: number; itemName: string; reason: string }[] = [];
    
        if (verboseAnalysisLogging) {
      console.log(`📈 Completed analysis: ${completedSignals.length}/${priorityItems.length} items had sufficient data (all forwarded to AI)`);
    }
    
        let topOpportunities: MeanReversionSignal[] = [];

    let aiAnalyzedCount = 0;
    let aiApprovedCount = 0;
    let aiMissingCount = 0;


        if (completedSignals.length > 0 && process.env.OPENAI_API_KEY) {
      if (verboseAnalysisLogging) {
        console.log(`🤖 Starting AI analysis on ${completedSignals.length} items...`);
      }
      const batches = chunkArray(completedSignals, Math.max(10, batchSize));


      for (const batch of batches) {
        // Compressed prompt - let AI be the expert, minimal fluff
                const prompt = `OSRS flip strategist focused on botted mean-reversion dumps. Evaluate EVERY item below and return a JSON decision (include=false for rejects). User wants to buy now—entries must be executable immediately (within ±1% of current unless explicitly rejecting).

Hard rules:
- You must return one JSON entry per item listed (do not omit items). Default to include=false.
- You may set include=true for at most 30 items in this batch; all remaining entries must still appear with include=false.
- Auto-reject (include=false) when: confidence < 35, expected upside < 12%, liquidityScore < 25, or botDump score < 25.
- Favor items with strong bot-dump signatures and recovery signals; reject structural downtrends.

Required JSON fields per item:
- include (boolean) — true to trade now, false to skip
- confidenceScore (0-100) and investmentGrade (A+/A/B+/B/C/D)
- entryNow (gp), entryRangeLow, entryRangeHigh — actionable entry window anchored to current price
- exitBase and exitStretch — primary and stretch sell targets (gp)
- stopLoss — defensive exit (gp)
- holdWeeks (integer) + estimatedHoldingPeriod (string)
- suggestedInvestment (gp) sized for personal trading
- volatilityRisk (low|medium|high)
- reasoning — 2 tight sentences referencing timeframes, bot-dump, recovery, risks
Optional (include when useful): buyIfDropsTo, sellAtMin, sellAtMax, abortIfRisesAbove, notes, holdNarrative.

DATA (ID|Name|Cur|EntryRange|ExitRange|Stop|Dev7|Dev90|Dev365|BotDump|Conf|Liq|Supply|HoldWk|Bot|Risk|Pot%):

${batch

  .map((s) => {
    const entryLow = Math.round(s.entryRangeLow ?? s.entryPriceNow ?? s.currentPrice);
    const entryHigh = Math.round(s.entryRangeHigh ?? s.entryPriceNow ?? s.currentPrice);
    const exitBase = Math.round(s.exitPriceBase ?? s.targetSellPrice ?? s.currentPrice);
    const exitStretch = Math.round(s.exitPriceStretch ?? exitBase);
    const stop = Math.round(s.stopLoss ?? s.entryPriceNow ?? s.currentPrice * 0.9);
        return `${s.itemId}|${s.itemName}|${Math.round(s.currentPrice)}|${entryLow}-${entryHigh}|${exitBase}-${exitStretch}|${stop}|${s.shortTerm.currentDeviation.toFixed(1)}|${s.mediumTerm.currentDeviation.toFixed(1)}|${s.longTerm.currentDeviation.toFixed(1)}|${s.botDumpScore.toFixed(0)}|${s.confidenceScore}|${s.liquidityScore}|${s.supplyStability}|${s.expectedRecoveryWeeks}|${s.botLikelihood}|${s.volatilityRisk}|${s.reversionPotential.toFixed(1)}\nCap:${s.capitulationSignal}\nRec:${s.recoverySignal}\nPlan:${s.holdNarrative}`;

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
                if (usage && verboseAnalysisLogging) {
          const inputCost = (usage.prompt_tokens / 1000) * 0.00015; // GPT-4o-mini: $0.00015/1K
          const outputCost = (usage.completion_tokens / 1000) * 0.0006; // GPT-4o-mini: $0.0006/1K
          const totalCost = inputCost + outputCost;
          console.log(`💰 Batch ${batches.indexOf(batch) + 1}/${batches.length}: ${usage.prompt_tokens} in + ${usage.completion_tokens} out = ${usage.total_tokens} tokens | Cost: $${totalCost.toFixed(4)} ($${inputCost.toFixed(4)} in + $${outputCost.toFixed(4)} out)`);
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
          console.error('❌ AI returned invalid JSON for batch.', parseError);
          console.error(`   Response preview: ${responseText.substring(0, 500)}...`);
          parsed = {};
        }

                        if (!Array.isArray(parsed.items) && verboseAnalysisLogging) {
          console.warn('⚠️ AI response missing valid items array. Raw preview:', responseText.substring(0, 400));
        }

                if (Array.isArray(parsed.items)) {
          if (verboseAnalysisLogging) {
            console.log(`🤖 AI returned ${parsed.items.length} item decisions in batch`);
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
                  `⚠️ Server gate rejected ${base.itemName} (id ${base.itemId}) — pot ${reversionPotential.toFixed(
                    1
                  )}%, conf ${base.confidenceScore}, liq ${base.liquidityScore}, dump ${base.botDumpScore}`
                );
              }

              filteredItems.push({
                itemId: base.itemId,
                itemName: base.itemName,
                reason: `Server gate: upside ${reversionPotential.toFixed(1)}%, conf ${base.confidenceScore}, liq ${base.liquidityScore}, dump ${base.botDumpScore}`,
              });
              return;
            }


            aiApprovedCount += 1;

            const merged: MeanReversionSignal = {

              ...base,
              confidenceScore: clamp(decision.confidenceScore ?? base.confidenceScore, 0, 100),
              investmentGrade: decision.investmentGrade ?? base.investmentGrade,
              targetSellPrice: exitBase,
              estimatedHoldingPeriod: decision.estimatedHoldingPeriod ?? base.estimatedHoldingPeriod,
              suggestedInvestment:
                decision.suggestedInvestment && decision.suggestedInvestment > 0
                  ? decision.suggestedInvestment
                  : base.suggestedInvestment,
                            volatilityRisk: decision.volatilityRisk ?? base.volatilityRisk,
              reasoning: decision.reasoning ?? base.reasoning,
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
                `⚠️ AI omitted ${missingInBatch.length} item(s) from response: ${missingInBatch
                  .map((item) => item.itemId)
                  .join(', ')}`
              );
            }
            missingInBatch.forEach((item) => {

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
        console.log(`⚠️ No OpenAI key found - using rule-based analysis only`);
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
    
        if (verboseAnalysisLogging) {
      console.log(`🔍 Analyzing ${itemIds.length} specific items`);
    }
    
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
