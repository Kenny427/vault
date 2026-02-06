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

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

// Decisions are handled via any in logic for flexibility

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Configuration
    const minConfidence = parseInt(searchParams.get('minConfidence') || '0');
    const minPotential = parseInt(searchParams.get('minPotential') || '0');
    const categoryFilter = searchParams.get('category');
    const botFilter = searchParams.get('botLikelihood');

    console.log(`[API] Fresh analysis (minConf:${minConfidence}, minPot:${minPotential})`);

    // Fetch item pool
    let itemsToAnalyze: any[] = [];
    try {
      const dbPool = await getCustomPoolItems();
      if (dbPool && dbPool.length > 0) {
        itemsToAnalyze = dbPool
          .filter((item: any) => item.enabled !== false)
          .map((item: any) => ({
            id: item.item_id,
            name: item.item_name,
            category: (item.category || 'resources'),
            botLikelihood: 'high',
          }));
      } else {
        throw new Error('Empty pool');
      }
    } catch (error) {
      itemsToAnalyze = EXPANDED_ITEM_POOL;
    }

    if (itemsToAnalyze.length === 0) {
      return NextResponse.json({ success: false, error: 'Empty pool', opportunities: [] });
    }

    if (categoryFilter) itemsToAnalyze = itemsToAnalyze.filter(i => i.category === categoryFilter);
    if (botFilter) itemsToAnalyze = itemsToAnalyze.filter(i => i.botLikelihood === botFilter);

    // Analyze items in pool
    const initialPoolSize = itemsToAnalyze.length;
    const analysisResults: MeanReversionSignal[] = [];
    const filteredOutItems: any[] = [];
    const API_BATCH_SIZE = 5;
    const itemChunks = chunkArray(itemsToAnalyze, API_BATCH_SIZE);

    for (let batchIdx = 0; batchIdx < itemChunks.length; batchIdx++) {
      const chunk = itemChunks[batchIdx];
      const batchPromises = chunk.map(async (item: any) => {
        try {
          const priceData = await getItemHistoryWithVolumes(item.id, 365 * 24 * 60 * 60);

          if (!priceData) {
            filteredOutItems.push({ itemId: item.id, itemName: item.name, reason: 'Wiki API returned null history' });
            return null;
          }

          if (priceData.length < 5) {
            filteredOutItems.push({ itemId: item.id, itemName: item.name, reason: `Insufficient history (${priceData.length} days)` });
            return null;
          }

          const result = await analyzeMeanReversionOpportunity(item.id, item.name, priceData);
          if (!result) {
            filteredOutItems.push({ itemId: item.id, itemName: item.name, reason: 'Analysis logic failed (unknown error)' });
            return null;
          }

          return result;
        } catch (error) {
          filteredOutItems.push({ itemId: item.id, itemName: item.name, reason: error instanceof Error ? error.message : 'Unknown exception' });
          return null;
        }
      });

      const results = await Promise.all(batchPromises);
      analysisResults.push(...results.filter((s): s is MeanReversionSignal => s !== null));
      await new Promise(r => setTimeout(r, 100)); // Rate limit safety
    }

    const completedSignals = analysisResults;

    console.log(`[API] Step 1 Summary: ${completedSignals.length}/${initialPoolSize} signals captured. ${filteredOutItems.length} filtered at Step 1.`);

    if (filteredOutItems.length > 0) {
      console.log(`[API] Dropped items (first 10): ${filteredOutItems.slice(0, 10).map(i => i.itemName).join(', ')}${filteredOutItems.length > 10 ? '...' : ''}`);
    }

    // Step 2: Parallel AI Analysis with Concurrency Limit
    const uniqueOpportunities = new Map<number, MeanReversionSignal>();
    let aiAnalyzedCount = 0;
    let aiApprovedCount = 0;
    let totalTokens = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let accTotalCost = 0;

    const batches = chunkArray(completedSignals, 10);
    const CONCURRENCY_LIMIT = 5;

    if (completedSignals.length > 0 && process.env.OPENAI_API_KEY) {
      for (let i = 0; i < batches.length; i += CONCURRENCY_LIMIT) {
        const batchSet = batches.slice(i, i + CONCURRENCY_LIMIT);
        console.log(`[AI] Processing batches ${i + 1} to ${Math.min(i + CONCURRENCY_LIMIT, batches.length)}...`);

        const batchPromises = batchSet.map(async (batch, subIdx) => {
          const batchIdx = i + subIdx;
          try {
            const prompt = `You are an expert OSRS market analyst. Analyze items for mean reversion. 
Return ONLY JSON: {"items":[{"id":number,"include":boolean,"confidenceScore":number,"reasoning":"...","entryNow":number,"exitBase":number,"holdWeeks":number,"logic":{"thesis":"...","vulnerability":"...","trigger":"..."}}]}
Items: ${batch.map(s => `ID:${s.itemId} | ${s.itemName} | P:${Math.round(s.currentPrice)} | Pot:${s.reversionPotential.toFixed(1)}%`).join(', ')}`;

            const aiResponse = await client.chat.completions.create({
              model: 'gpt-4o-mini',
              temperature: 0.3,
              response_format: { type: 'json_object' },
              messages: [{ role: 'user', content: prompt }],
            });

            // Usage tracking
            const usage = aiResponse.usage;
            if (usage) {
              totalInputTokens += usage.prompt_tokens;
              totalOutputTokens += usage.completion_tokens;
              totalTokens += usage.total_tokens;
              accTotalCost += (usage.prompt_tokens / 1000 * 0.00015) + (usage.completion_tokens / 1000 * 0.0006);
            }

            const parsed = JSON.parse(aiResponse.choices[0]?.message?.content || '{}');
            if (Array.isArray(parsed.items)) {
              parsed.items.forEach((decision: any) => {
                const numericId = typeof decision.id === 'string' ? parseInt(decision.id) : decision.id;
                const base = batch.find(b => b.itemId === numericId);
                if (!base) return;

                aiAnalyzedCount++;
                if (decision.include === false) return;

                const exitBase = Math.round(decision.exitBase ?? base.exitPriceBase ?? base.currentPrice);
                const pot = ((exitBase - base.currentPrice) / base.currentPrice) * 100;

                // Final threshold check inside AI loop (can be relaxed)
                if (pot < 10) return;

                aiApprovedCount++;
                uniqueOpportunities.set(base.itemId, {
                  ...base,
                  confidenceScore: clamp(decision.confidenceScore ?? base.confidenceScore, 0, 100),
                  targetSellPrice: exitBase,
                  strategicNarrative: decision.logic?.thesis ?? decision.reasoning ?? base.strategicNarrative,
                  logic: decision.logic,
                  reversionPotential: pot,
                  expectedRecoveryWeeks: Math.max(1, Math.min(4, Math.round(decision.holdWeeks ?? 4))),
                });
              });
            }
          } catch (err) {
            console.error(`[AI] Batch ${batchIdx + 1} failed:`, err);
          }
        });
        await Promise.all(batchPromises);
      }
    }

    let topOpportunities = Array.from(uniqueOpportunities.values());

    // Final global filtering by requested thresholds
    const beforeThresholdCount = topOpportunities.length;
    topOpportunities = topOpportunities.filter(s => s.confidenceScore >= minConfidence && s.reversionPotential >= minPotential);
    const afterThresholdCount = topOpportunities.length;

    const finalCostUSD = parseFloat(accTotalCost.toFixed(4));

    const summary = {
      totalAnalyzed: initialPoolSize,
      viableOpportunities: topOpportunities.length,
      aiAnalyzedCount,
      aiApprovedCount,
      aiMissingCount: completedSignals.length - aiAnalyzedCount,
      preFilteredCount: completedSignals.length, // CAPTURED = Successful algorithmic analysis
      preThresholdCount: beforeThresholdCount,
      filteredAtStep1: filteredOutItems.length,
      filteredByThreshold: beforeThresholdCount - afterThresholdCount,
      openaiCost: {
        totalTokens: totalTokens,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        costUSD: finalCostUSD,
        breakdown: {
          model: 'gpt-4o-mini',
          inputCostUSD: parseFloat((totalInputTokens / 1000 * 0.00015).toFixed(4)),
          outputCostUSD: parseFloat((totalOutputTokens / 1000 * 0.0006).toFixed(4))
        }
      }
    };

    console.log(`[API] Done. Evaluated: ${aiAnalyzedCount}, Approved: ${aiApprovedCount}, Result: ${topOpportunities.length}`);

    return NextResponse.json({
      success: true,
      opportunities: topOpportunities,
      detailedReasonings: [], // Placeholder for frontend
      summary,
      filteredItems: filteredOutItems.map(i => ({ itemId: i.itemId, itemName: i.itemName, reason: i.reason })),
      filterStats: [], // Placeholder for frontend
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API] Critical failure:', error);
    return NextResponse.json({ success: false, error: 'Critical failure' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { itemIds } = body;
    if (!itemIds || !Array.isArray(itemIds)) return NextResponse.json({ success: false, error: 'itemIds required' }, { status: 400 });

    const items = EXPANDED_ITEM_POOL.filter((i: any) => itemIds.includes(i.id));
    const analysisPromises = items.map(async (item: any) => {
      const priceData = await getItemHistoryWithVolumes(item.id, 365 * 24 * 60 * 60);
      if (!priceData || priceData.length < 30) return null;
      return await analyzeMeanReversionOpportunity(item.id, item.name, priceData);
    });

    const signals = (await Promise.all(analysisPromises)).filter((s: any): s is MeanReversionSignal => s !== null);
    return NextResponse.json({ success: true, opportunities: rankInvestmentOpportunities(signals) });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'POST failed' }, { status: 500 });
  }
}
