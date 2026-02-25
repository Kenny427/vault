import { NextResponse } from 'next/server';
import { getItemHistoryWithVolumes } from '@/lib/api/osrs';
import {
  analyzeMeanReversionOpportunity,
  rankInvestmentOpportunities,
  MeanReversionSignal
} from '@/lib/meanReversionAnalysis';
import { EXPANDED_ITEM_POOL } from '@/lib/expandedItemPool';
import { getCustomPoolItems } from '@/lib/poolManagement';
import { trackEvent, calculateAICost } from '@/lib/adminAnalytics';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { getOpenRouterClient } from '@/lib/ai/openrouter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const client = getOpenRouterClient();

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

    // Get user for tracking
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

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

    // Deduplicate signals by itemId (keep highest confidence if duplicates exist)
    const signalMap = new Map<number, MeanReversionSignal>();
    for (const signal of analysisResults) {
      const existing = signalMap.get(signal.itemId);
      if (!existing || signal.confidenceScore > existing.confidenceScore) {
        signalMap.set(signal.itemId, signal);
      }
    }
    const completedSignals = Array.from(signalMap.values());

    if (analysisResults.length !== completedSignals.length) {
      console.log(`[API] Deduplication: ${analysisResults.length} signals → ${completedSignals.length} unique items (removed ${analysisResults.length - completedSignals.length} duplicates)`);
    }

    console.log(`[API] Step 1 Summary: ${completedSignals.length}/${initialPoolSize} signals captured. ${filteredOutItems.length} filtered at Step 1.`);

    if (filteredOutItems.length > 0) {
      console.log(`[API] Dropped items (first 10): ${filteredOutItems.slice(0, 10).map(i => i.itemName).join(', ')}${filteredOutItems.length > 10 ? '...' : ''}`);
    }

    // Fetch recent feedback for AI learning context
    let feedbackContext = '';
    if (userId) {
      try {
        const { data: recentFeedback } = await supabase
          .from('ai_feedback')
          .select('feedback_type, tags, ai_confidence, ai_thesis, item_name')
          .eq('user_id', userId)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(30);

        if (recentFeedback && recentFeedback.length > 0) {
          // Aggregate patterns
          const declinePatterns = recentFeedback
            .filter(f => f.feedback_type === 'decline')
            .flatMap(f => f.tags || [])
            .filter(t => t);
          
          const acceptPatterns = recentFeedback
            .filter(f => f.feedback_type === 'accept')
            .flatMap(f => f.tags || [])
            .filter(t => t);
          
          const rejectionFeedback = recentFeedback
            .filter(f => f.feedback_type === 'wrong_rejection')
            .map(f => ({ item: f.item_name, tags: f.tags }));

          // Count patterns
          const declineCounts = declinePatterns.reduce((acc: any, tag) => {
            acc[tag] = (acc[tag] || 0) + 1;
            return acc;
          }, {});

          const acceptCounts = acceptPatterns.reduce((acc: any, tag) => {
            acc[tag] = (acc[tag] || 0) + 1;
            return acc;
          }, {});

          // Build feedback summary with actionable instructions
          const topDeclines = Object.entries(declineCounts)
            .sort(([,a]: any, [,b]: any) => b - a)
            .slice(0, 6)
            .map(([tag, count]) => `"${tag}" (${count}x)`)
            .join(', ');

          const topAccepts = Object.entries(acceptCounts)
            .sort(([,a]: any, [,b]: any) => b - a)
            .slice(0, 5)
            .map(([tag, count]) => `"${tag}" (${count}x)`)
            .join(', ');

          if (topDeclines || topAccepts || rejectionFeedback.length > 0) {
            feedbackContext = `\n\n🎓 USER'S FEEDBACK-BASED LEARNING (Last 30 Days - ${recentFeedback.length} decisions):\n\n`;
            
            if (topDeclines) {
              feedbackContext += `❌ USER FREQUENTLY DECLINES:\n   ${topDeclines}\n\n`;
              
              // Simplified adaptations based on new tags
              const adaptations: string[] = [];
              
              if (topDeclines.includes("Not clear it's bots")) {
                adaptations.push('   → REQUIRE stronger bot evidence: Favor items with clear dump patterns + high bot likelihood');
              }
              if (topDeclines.includes('Already rebounding')) {
                adaptations.push('   → CHECK entry timing: Reject if price recovering >3 days (entry window passed)');
              }
              if (topDeclines.includes('Long-term declining trend')) {
                adaptations.push('   → VERIFY yearly context: Be cautious with items showing multi-year decline');
              }
              if (topDeclines.includes('Too risky/unclear')) {
                adaptations.push('   → INCREASE clarity bar: Provide stronger thesis and clearer setups');
              }
              if (topDeclines.includes('Low volume/hard to trade')) {
                adaptations.push('   → INCREASE liquidity requirement: Favor items with consistent high volume');
              }
              
              if (adaptations.length > 0) {
                feedbackContext += `\n📊 ADAPTING ANALYSIS:\n${adaptations.join('\n')}\n\n`;
              }
            }
            
            if (topAccepts) {
              feedbackContext += `✅ USER FREQUENTLY ACCEPTS:\n   ${topAccepts}\n\n`;
              
              // Identify what user values
              const preferences: string[] = [];
              
              if (topAccepts.includes('Strong bot dump evidence')) {
                preferences.push('   → User trusts bot dump thesis - prioritize obvious bot activity');
              }
              if (topAccepts.includes('Price way below normal')) {
                preferences.push('   → User values big deviations - favor items >30% below averages');
              }
              if (topAccepts.includes('Good liquidity')) {
                preferences.push('   → User prioritizes tradeable items - emphasize volume in recommendations');
              }
              if (topAccepts.includes('Quick rebound likely')) {
                preferences.push('   → User prefers fast flips - favor 2-4 week timeframes over longer holds');
              }
              if (topAccepts.includes('Good risk/reward')) {
                preferences.push('   → User is conservative - emphasize clear setups with defined exit strategies');
              }
              
              if (preferences.length > 0) {
                feedbackContext += `\n🎯 USER PREFERENCES:\n${preferences.join('\n')}\n\n`;
              }
            }

            if (rejectionFeedback.length > 0) {
              feedbackContext += `⚠️ ITEMS USER WANTS APPROVED (${rejectionFeedback.length} false negatives):\n`;
              rejectionFeedback.slice(0, 3).forEach(f => {
                feedbackContext += `   • ${f.item}: ${(f.tags || []).join(', ')}\n`;
              });
              feedbackContext += `   → Filters may be too strict - review rejection criteria\n\n`;
            }

            feedbackContext += `⚡ Apply these patterns to analysis. User feedback = ground truth.\n`;
          }

          console.log(`[AI] Loaded ${recentFeedback.length} feedback entries for learning context`);
        }
      } catch (feedbackError) {
        console.log('[AI] No feedback available for learning (non-critical)');
      }
    }

    // STAGE 0: Software Pre-Filter (Aggressive - Quality Over Quantity)
    // Goal: Remove objectively unprofitable/unfeasible opportunities before AI analysis
    const stage0Filtered: any[] = [];
    const signalsForAI = completedSignals.filter(signal => {
      const currentPrice = signal.currentPrice;
      const exitBase = signal.exitPriceBase || currentPrice * 1.2;
      const avgPrice90d = signal.mediumTerm?.avgPrice || currentPrice;
      const projectedROI = ((exitBase - currentPrice) / currentPrice) * 100;
      const holdTimeWeeks = signal.expectedRecoveryWeeks || 4;

      // Filter 1: ROI < 10% (not worth GE tax + risk)
      if (projectedROI < 10) {
        stage0Filtered.push({ itemId: signal.itemId, itemName: signal.itemName, reason: `ROI too low (${projectedROI.toFixed(1)}% < 10% minimum)` });
        return false;
      }

      // Filter 2: Exit target < 1.12x current (too marginal)
      if (exitBase < currentPrice * 1.12) {
        stage0Filtered.push({ itemId: signal.itemId, itemName: signal.itemName, reason: `Exit target too marginal (${(exitBase/currentPrice).toFixed(2)}x < 1.12x minimum)` });
        return false;
      }

      // Filter 3: Current price >= 90d average (can't be suppressed if at/above average)
      if (currentPrice >= avgPrice90d) {
        stage0Filtered.push({ itemId: signal.itemId, itemName: signal.itemName, reason: `Price at/above 90d average (${currentPrice}gp >= ${Math.round(avgPrice90d)}gp) - no suppression` });
        return false;
      }

      // Filter 4: Hold time > 6 weeks (too long for active flipping)
      // EXCEPTION: Allow longer holds (up to 12 weeks) if ROI > 50% - worth the wait for exceptional returns
      if (holdTimeWeeks && holdTimeWeeks > 6) {
        if (projectedROI < 50) {
          stage0Filtered.push({ itemId: signal.itemId, itemName: signal.itemName, reason: `Hold time too long (${holdTimeWeeks} weeks > 6 weeks) with insufficient ROI (${projectedROI.toFixed(1)}% < 50% threshold for long holds)` });
          return false;
        }
        // If ROI >= 50%, allow longer holds (worth the capital commitment for high returns)
        // But cap at 12 weeks maximum (anything longer is too speculative)
        if (holdTimeWeeks > 12) {
          stage0Filtered.push({ itemId: signal.itemId, itemName: signal.itemName, reason: `Hold time too long (${holdTimeWeeks} weeks > 12 week maximum, even with high ROI)` });
          return false;
        }
      }

      // Filter 5: Very low liquidity (< 30 = hard to exit positions)
      if (signal.liquidityScore && signal.liquidityScore < 30) {
        stage0Filtered.push({ itemId: signal.itemId, itemName: signal.itemName, reason: `Liquidity too low (${signal.liquidityScore} < 30 minimum)` });
        return false;
      }

      return true; // Pass to AI for evaluation
    });

    console.log(`[API] Stage 0 Pre-Filter: ${signalsForAI.length}/${completedSignals.length} signals passed aggressive quality filter (removed ${stage0Filtered.length} unprofitable/unfeasible)`);
    if (stage0Filtered.length > 0) {
      console.log(`[API] Stage 0 filtered (first 10): ${stage0Filtered.slice(0, 10).map(i => `${i.itemName} (${i.reason})`).join(', ')}${stage0Filtered.length > 10 ? '...' : ''}`);
    }

    // Add Stage 0 filtered items to overall filtered list
    filteredOutItems.push(...stage0Filtered);

    // Step 2: Parallel AI Analysis with Concurrency Limit (Quality-focused filtering)
    const uniqueOpportunities = new Map<number, MeanReversionSignal>();
    const aiRejectedItems: Array<{
      itemId: number;
      itemName: string;
      systemScore: number;
      systemConfidence: number;
      aiDecision: string; // 'rejected_stage1_mandatory' | 'rejected_stage2_quality'
      aiReasoning: string;
      aiConfidence: number;
    }> = [];
    let aiAnalyzedCount = 0;
    let aiApprovedCount = 0;
    let totalTokens = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let accTotalCost = 0;

    // Send quality-filtered signals to AI for nuanced evaluation
    // Stage 0 removed obvious unprofitable items, AI handles temporal/structural analysis
    const batches = chunkArray(signalsForAI, 10);
    const CONCURRENCY_LIMIT = 5;

    if (completedSignals.length > 0) {
      for (let i = 0; i < batches.length; i += CONCURRENCY_LIMIT) {
        const batchSet = batches.slice(i, i + CONCURRENCY_LIMIT);
        console.log(`[AI] Processing batches ${i + 1} to ${Math.min(i + CONCURRENCY_LIMIT, batches.length)}...`);

        const batchPromises = batchSet.map(async (batch, subIdx) => {
          const batchIdx = i + subIdx;
          try {
            const prompt = `You are an expert OSRS economist analyzing mean-reversion opportunities in items suppressed by bot activity.

🎯 STRATEGY: Identify items trading below historical averages due to bot oversupply. Buy undervalued, hold 2-12 weeks, profit when price reverts to historical mean (driven by bot bans, supply normalization, mean-reversion).${feedbackContext}

� YOUR JOB: INDEPENDENTLY ANALYZE the price data provided. The system's calculated metrics are shown as REFERENCE ONLY - you should form your own conclusions from the raw data.

📊 ANALYZE THE DATA YOURSELF - STEP BY STEP:

**STAGE 1: Mandatory Rejection Check (check these FIRST)**
1. ⚠️ Check if Structural Repricing Risk = "VERY HIGH" → if yes, REJECT immediately
2. ⚠️ Check if Days Since Shift >90 AND Stability >70 → if yes, REJECT immediately
3. ⚠️ Check if Trend="falling" AND Momentum="accelerating_down" → if yes, REJECT immediately
4. ⚠️ Check if high stability (>80) contradicts bot dump claim → if yes, REJECT immediately

**STAGE 2: Quality Assessment (ONLY if Stage 1 passed - maintain high standards!)**
5. 📉 Verify current price vs 7d/90d/365d averages - is suppression genuinely 15%+ below longer-term?
6. 🧮 Calculate own % deviations - do they strongly support mean-reversion?
7. 🤖 Evaluate bot evidence - does bot likelihood + dump score genuinely align with price action?
8. 📊 Check if historical averages stable or declining - is this legitimate suppression?
9. ⏱️ Assess temporal data - is this recent suppression or long-term stability?
10. ⚖️ Evaluate if mean-reversion within 2-12 weeks is REALISTICALLY plausible
11. 🎯 Overall quality check - is this a STRONG opportunity worth recommending?

🚨 MANDATORY REJECTION CRITERIA (AUTO-REJECT - NO EXCEPTIONS):

1. **Structural Repricing Risk = "VERY HIGH"**
   → Item has been stable at current price for 90+ days with stability >70
   → This is a NEW EQUILIBRIUM, not temporary bot suppression
   → Historical averages are polluted by old distant prices
   → MUST REJECT with reasoning: "Structural repricing - stable {X} days at current price = new equilibrium"

2. **Long-Term Stability Pattern**
   → "Days Since Major Price Shift" >90 AND "Price Stability" >70
   → Item found new price floor 3+ months ago and hasn't moved since
   → MUST REJECT with reasoning: "Price stable {X} days - new equilibrium, not mean-reversion"

3. **Organic Decline Pattern**
   → Trend = "falling" AND Momentum = "accelerating_down"
   → This is dying demand, not bot suppression
   → MUST REJECT with reasoning: "Organic demand decline - not mean-reversion opportunity"

4. **Contradictory Data**
   → System claims "high bot activity" but Stability >80 (very stable)
   → Real bot dumps create volatility, not stability
   → MUST REJECT with reasoning: "Data inconsistency - high stability contradicts bot dump claim"

⚠️⚠️ CRITICAL: TWO-STAGE FILTERING PROCESS ⚠️⚠️

Passing the mandatory rejections above does NOT mean automatic approval!

🔹 STAGE 1: Mandatory Rejection Check
- If ANY of the 4 criteria above trigger → REJECT immediately
- These are hard filters that eliminate structural repricing and contradictory data

🔹 STAGE 2: Quality Standards Assessment (REQUIRED even if Stage 1 passed)
- Just because an item didn't trigger mandatory rejection doesn't mean it's a good opportunity
- You must STILL independently verify it meets ALL quality standards below
- Think critically: Is this genuinely a strong mean-reversion opportunity?
- Maintain HIGH standards - only approve STRONG opportunities

✅ APPROVE ONLY IF BOTH stages pass AND all these quality standards met:
- ✅ Passed Stage 1: No mandatory rejections triggered
- � **ROI ≥ 15% minimum** - verify projected gain is worth the effort (lower ROI = reject)
- 📉 **Price 20%+ below longer-term averages** (90d/180d/365d) - not just 3-5%, must be CLEAR suppression
- 🤖 **Bot activity STRONG** - high bot likelihood (>60%) + dump score aligns with actual price action
- 📊 **Historical averages stable** - not organic decline (verify year-over-year isn't falling >5%)
- 💎 **Active demand** - item still regularly traded, not obsolete content
- ⏱️ **Mean-reversion within 2-4 weeks** - not 2+ months (check momentum supports fast recovery)
- ⚖️ **Risk acceptable** - liquidity >40, not extreme volatility >80
- 🎯 **Strong confidence** - this is a TOP-TIER opportunity you'd personally invest in

❌ REJECT IF (Stage 1 mandatory OR Stage 2 quality failures):

**Stage 1 - Mandatory (auto-reject):**
- Any of the 4 mandatory criteria above triggered

**Stage 2 - Quality Standards (reject if ANY fail - maintain HIGH standards):**
- ❌ **ROI < 15%** - Not worth the risk/time (GE tax alone is 2%, need substantial margin)
- ❌ **Exit target < 1.15x entry** - Too marginal, any slippage = loss
- ❌ **Price suppression < 20%** below longer-term average - Not significant enough (3-5% deviation is noise)
- ❌ **Bot evidence weak** - Low bot likelihood (<50%) despite dump score
- ❌ **Organic decline** - Historical averages falling >5% year-over-year
- ❌ **Flash dump only** - Price crashed <7 days ago without sustained suppression
- ❌ **Recovery timeline >4 weeks** - Hold time too long for active flipping
- ❌ **Low liquidity** - Volume <40 makes exits difficult
- ❌ **Marginal setup** - Doesn't clearly pass quality bar, borderline case
- ❌ **Low confidence** - You wouldn't personally invest in this opportunity

⚠️ CRITICAL REMINDERS: 
- ⚠️⚠️ **QUALITY OVER QUANTITY**: Only approve TOP 10-15 opportunities, not 40+
- ⚠️⚠️ **TWO-STAGE FILTERING**: Passing Stage 1 ≠ auto-approve! Must ALSO pass Stage 2 quality standards!
- 💰 **15% ROI MINIMUM**: Reject anything <15% ROI - not worth time/risk for active flipping
- 📉 **20% SUPPRESSION MINIMUM**: Price must be CLEARLY below average (3-5% is noise)
- ⏱️ **2-4 WEEK RECOVERY**: Don't approve 2-month holds, focus on quick returns
- ❌ **BE SELECTIVE**: If borderline/marginal → REJECT. Only approve STRONG setups you'd personally trade
- CHECK MANDATORY REJECTIONS FIRST (Stage 1) - if any trigger, REJECT immediately
- IF Stage 1 passed → THEN carefully evaluate Stage 2 quality standards with VERY HIGH bar
- Verify the data yourself - don't blindly trust system confidence scores
- Structural Repricing Risk "VERY HIGH" = AUTO-REJECT (Stage 1)
- Days stable >90 + Stability >70 = AUTO-REJECT (Stage 1)

🎯 **TARGET: Approve only 10-15 TOP-TIER opportunities that clearly exceed all quality thresholds**
- Price only 5-10% below average = QUALITY FAILURE, REJECT (Stage 2)
- Return a decision for EVERY item (include: true/false for each)

EXAMPLE REJECTIONS:

Stage 1 Mandatory Rejection:
{
  "id": 11230,
  "include": false,
  "confidenceScore": 0,
  "reasoning": "STAGE 1 MANDATORY REJECTION: Structural repricing risk VERY HIGH. Item stable 210 days at current price (stability 85/100) - this is new equilibrium, not temporary bot suppression. 365d average polluted by old high prices.",
  ...
}

Stage 2 Quality Rejection:
{
  "id": 999,
  "include": false,
  "confidenceScore": 25,
  "reasoning": "STAGE 2 QUALITY REJECTION: Price only 8% below 90d average - insufficient suppression for strong opportunity. Bot evidence weak (medium likelihood). Marginal setup, does not meet quality bar.",
  ...
}

Return ONLY JSON in this exact format:
{
  "items": [
    {
      "id": number,
      "include": boolean (true = buy opportunity, false = reject),
      "confidenceScore": number (0-100, YOUR confidence based on your independent analysis of the data),
      "reasoning": "Your analysis: What does the price data show? For REJECTIONS, explicitly state which mandatory criterion was violated (if applicable) OR other reason for rejection. For APPROVALS, explain why this is genuine bot suppression with mean-reversion potential.",
      "entryNow": number (your suggested buy price based on current market data),
      "exitBase": number (your target price based on historical averages),
      "holdWeeks": number (2-12 weeks, YOUR estimate of realistic recovery time),
      "logic": {
        "thesis": "Your independent conclusion: What the data shows about suppression and reversion potential",
        "vulnerability": "Your risk assessment: Main concern if this trade fails",
        "trigger": "Your exit criteria: When to abort this opportunity"
      }
    }
  ]
}

YOUR TASK: Analyze each item independently using the price data. Form your own conclusions.

Items to analyze (verify the analysis makes sense based on the data):

${batch.map(s => {
  // Extract key data points for AI verification
  const current = Math.round(s.currentPrice);
  const avg7d = s.shortTerm?.avgPrice || current;
  const avg90d = s.mediumTerm?.avgPrice || current;
  const avg365d = s.longTerm?.avgPrice || current;
  
  // Show how bot dump score was calculated
  const dev7d = s.shortTerm?.currentDeviation || 0;
  const dev90d = s.mediumTerm?.currentDeviation || 0;
  const dev365d = s.longTerm?.currentDeviation || 0;
  
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 ${s.itemName} (ID: ${s.itemId})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 PRICE DATA (from OSRS Wiki API):
   Current Price: ${current}gp
   7-day Average: ${avg7d}gp (${dev7d.toFixed(1)}% deviation)
   90-day Average: ${avg90d}gp (${dev90d.toFixed(1)}% deviation)
   365-day Average: ${avg365d}gp (${dev365d.toFixed(1)}% deviation)
   📊 Yearly Trend: ${s.yearlyContext || 'N/A'}

🤖 BOT ACTIVITY ANALYSIS:
   Bot Likelihood: ${s.botLikelihood}
   Bot Dump Score: ${Math.round(s.botDumpScore)}/100
   Supply Stability: ${Math.round(s.supplyStability)}/100
   ${s.capitulationSignal || 'No major dump detected'}

⏱️ TEMPORAL ANALYSIS (Structural Repricing Detection):
   Price Stability (30d): ${s.priceStability30d}/100 (${s.priceStability30d > 70 ? 'Very Stable' : s.priceStability30d > 50 ? 'Moderate' : 'Volatile'})
   Trend Direction (90d): ${s.trendDirection}
   Days Since Major Price Shift: ${s.daysSinceLastMajorShift} days ${s.daysSinceLastMajorShift > 90 ? '⚠️ LONG-TERM STABLE' : ''}
   Recent Range (30d): ${s.priceRange30d.low}gp - ${s.priceRange30d.high}gp (${s.priceRange30d.spread}% spread)
   Price Momentum: ${s.momentum.replace(/_/g, ' ')}
   🚨 Structural Repricing Risk: ${s.structuralRepricingRisk.toUpperCase().replace(/_/g, ' ')}
   
   ⚠️ CRITICAL: If item has been stable >90 days at current price, this is likely a NEW EQUILIBRIUM,
   not temporary bot suppression. Averages may be polluted by old high prices!

📈 MEAN-REVERSION SETUP:
   Historical Target: ${Math.max(avg90d, avg365d)}gp
   Potential Gain: ${s.reversionPotential.toFixed(1)}% (if returns to avg)
   Confidence Score: ${Math.round(s.confidenceScore)}/100
   ${s.recoverySignal || 'Accumulation phase'}

⚠️ RISK FACTORS:
   Volatility: ${s.volatilityRisk}
   Liquidity: ${s.liquidityScore}/100
   Expected Recovery: ${s.expectedRecoveryWeeks} weeks

YOUR TASK: 
Verify this analysis makes sense. Is price truly suppressed below historical averages?
Is bot activity likely driving this? Would mean-reversion be reasonable within 2-12 weeks?
`;
}).join('\n')}`;

            const aiResponse = await client.chat.completions.create({
              model: 'openai/gpt-4o-mini',
              temperature: 0.3,
              response_format: { type: 'json_object' },
              messages: [{ role: 'user', content: prompt }],
            });

            const parsed = JSON.parse(aiResponse.choices[0]?.message?.content || '{}');

            // Usage tracking
            const usage = aiResponse.usage;
            if (usage) {
              const batchCost = calculateAICost('gpt-4o-mini', usage.prompt_tokens, usage.completion_tokens);

              totalInputTokens += usage.prompt_tokens;
              totalOutputTokens += usage.completion_tokens;
              totalTokens += (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);
              accTotalCost += batchCost;

              // Track analytics event (fire and forget - non-critical)
              trackEvent({
                userId,
                eventType: 'ai_scan_batch',
                metadata: {
                  batchSize: batch.length,
                  model: 'openai/gpt-4o-mini',
                  successfulItems: (parsed.items || []).length
                },
                costUsd: batchCost,
                tokensUsed: (usage.prompt_tokens || 0) + (usage.completion_tokens || 0)
              }).catch(() => {}); // Silently ignore analytics errors
            }

            if (Array.isArray(parsed.items)) {
              parsed.items.forEach((decision: any) => {
                const numericId = typeof decision.id === 'string' ? parseInt(decision.id) : decision.id;
                const base = batch.find(b => b.itemId === numericId);
                if (!base) return;

                aiAnalyzedCount++;
                
                // Store rejected items with AI reasoning
                if (decision.include === false) {
                  // Determine rejection type from reasoning
                  const reasoning = decision.reasoning || 'No reasoning provided';
                  const isStage1 = reasoning.includes('STAGE 1') || reasoning.includes('MANDATORY REJECTION');
                  
                  aiRejectedItems.push({
                    itemId: base.itemId,
                    itemName: base.itemName,
                    systemScore: Math.round(base.botDumpScore || 0),
                    systemConfidence: Math.round(base.confidenceScore || 0),
                    aiDecision: isStage1 ? 'rejected_stage1_mandatory' : 'rejected_stage2_quality',
                    aiReasoning: reasoning,
                    aiConfidence: decision.confidenceScore ?? 0
                  });
                  return; // Don't add to approved list
                }

                const exitBase = Math.round(decision.exitBase ?? base.exitPriceBase ?? base.currentPrice);
                const pot = ((exitBase - base.currentPrice) / base.currentPrice) * 100;

                // BUG FIX: AI sometimes returns scores on 0-10 scale instead of 0-100
                // If AI provided a confidenceScore between 0-10, scale it up to 0-100
                let aiConfidence = decision.confidenceScore ?? base.confidenceScore;
                if (aiConfidence > 0 && aiConfidence <= 10 && decision.confidenceScore !== undefined) {
                  // Likely on wrong scale - multiply by 10
                  aiConfidence = aiConfidence * 10;
                  console.log(`[AI SCALE FIX] ${base.itemName}: AI returned ${decision.confidenceScore}, scaled to ${aiConfidence}`);
                }

                aiApprovedCount++;
                uniqueOpportunities.set(base.itemId, {
                  ...base,
                  confidenceScore: clamp(aiConfidence, 0, 100),
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
      aiMissingCount: signalsForAI.length - aiAnalyzedCount,
      stage0FilteredCount: stage0Filtered.length, // NEW: Items filtered by Stage 0 (unprofitable/unfeasible)
      preFilteredCount: signalsForAI.length, // Items passed to AI after Stage 0
      preThresholdCount: beforeThresholdCount,
      filteredAtStep1: filteredOutItems.length, // Total filtered (Step 1 + Stage 0)
      filteredByThreshold: beforeThresholdCount - afterThresholdCount,
      openaiCost: {
        totalTokens: totalTokens,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        costUSD: finalCostUSD,
        breakdown: {
          model: 'openai/gpt-4o-mini',
          inputCostUSD: parseFloat((totalInputTokens / 1000 * 0.00015).toFixed(4)),
          outputCostUSD: parseFloat((totalOutputTokens / 1000 * 0.0006).toFixed(4))
        }
      }
    };

    console.log(`[API] Done. Evaluated: ${aiAnalyzedCount}, Approved: ${aiApprovedCount}, Rejected: ${aiRejectedItems.length}, Result: ${topOpportunities.length}`);

    return NextResponse.json({
      success: true,
      opportunities: topOpportunities,
      aiRejectedItems: aiRejectedItems, // NEW: All items AI rejected with full reasoning
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
