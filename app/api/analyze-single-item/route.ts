import { NextResponse } from 'next/server';
import { getOpenRouterClient } from '@/lib/ai/openrouter';
import { getItemHistoryWithVolumes } from '@/lib/api/osrs';
import { analyzeMeanReversionOpportunity, MeanReversionSignal } from '@/lib/meanReversionAnalysis';
import { trackEvent, calculateAICost } from '@/lib/adminAnalytics';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { getGameUpdateContext, generateUpdateGuidance } from '@/lib/gameUpdateContext';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const client = getOpenRouterClient();

/**
 * General market analysis for items that don't fit mean-reversion criteria
 * Works for mega-rares, high-volume flips, and other trading strategies
 */
async function performGeneralMarketAnalysis(
  itemId: number,
  priceData: any[],
  openaiClient: any
) {
  console.log('🌐 Starting general market analysis...');

  // Get user for tracking
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;

  // Calculate basic metrics
  const currentPrice = priceData[priceData.length - 1]?.avgHighPrice || priceData[priceData.length - 1]?.avgLowPrice || 0;
  const last7Days = priceData.slice(-7);
  const last30Days = priceData.slice(-30);
  const last90Days = priceData.slice(-90);

  const avg7d = last7Days.reduce((sum, d) => sum + (d.avgHighPrice || d.avgLowPrice || 0), 0) / last7Days.length;
  const avg30d = last30Days.reduce((sum, d) => sum + (d.avgHighPrice || d.avgLowPrice || 0), 0) / last30Days.length;
  const avg90d = last90Days.reduce((sum, d) => sum + (d.avgHighPrice || d.avgLowPrice || 0), 0) / last90Days.length;

  const vol7d = last7Days.reduce((sum, d) => sum + (d.highPriceVolume || 0), 0) / last7Days.length;
  const vol30d = last30Days.reduce((sum, d) => sum + (d.highPriceVolume || 0), 0) / last30Days.length;

  const priceChange7d = ((currentPrice - avg7d) / avg7d) * 100;
  const priceChange30d = ((currentPrice - avg30d) / avg30d) * 100;
  const priceChange90d = ((currentPrice - avg90d) / avg90d) * 100;

  const prices = priceData.map(d => d.avgHighPrice || d.avgLowPrice || 0).filter(p => p > 0);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = ((maxPrice - minPrice) / minPrice) * 100;

  // Determine item category based on price and volume
  let itemCategory = 'Unknown';
  if (currentPrice > 500_000_000) {
    itemCategory = 'Mega-rare (500M+)';
  } else if (currentPrice > 100_000_000) {
    itemCategory = 'High-tier rare (100M-500M)';
  } else if (currentPrice > 10_000_000) {
    itemCategory = 'Mid-tier item (10M-100M)';
  } else if (currentPrice > 1_000_000) {
    itemCategory = 'Common valuable (1M-10M)';
  } else {
    itemCategory = 'Low-value item (<1M)';
  }

  const volumeCategory = vol7d > 1000 ? 'High-volume' : vol7d > 100 ? 'Medium-volume' : 'Low-volume';

  // Fetch game update context
  const gameContext = await getGameUpdateContext(itemId, 14); // Last 14 days
  const updateGuidance = generateUpdateGuidance(gameContext.updates);
  
  // Check for bearish drop rate increases
  const dropRateIncreases = gameContext.updates.filter(u => 
    u.impact_type === 'drop_rate_increase' || 
    (u.sentiment === 'bearish' && u.notes?.toLowerCase().includes('drop rate'))
  );
  
  const dropRateWarning = dropRateIncreases.length > 0
    ? `\n⚠️ **CRITICAL WARNING**: This item's drop rate was INCREASED (more common). Expect FALLING PRICES due to increased supply. NOT a buy opportunity unless deeply oversold.\n`
    : '';

  const generalPrompt = `You are an expert OSRS market analyst. Provide comprehensive trading advice for this item.

ITEM ID: ${itemId}
CATEGORY: ${itemCategory} | ${volumeCategory}

CURRENT MARKET STATE:
- Current Price: ${currentPrice.toLocaleString()}gp
- 7d Average: ${Math.round(avg7d).toLocaleString()}gp (${priceChange7d > 0 ? '+' : ''}${priceChange7d.toFixed(1)}%)
- 30d Average: ${Math.round(avg30d).toLocaleString()}gp (${priceChange30d > 0 ? '+' : ''}${priceChange30d.toFixed(1)}%)
- 90d Average: ${Math.round(avg90d).toLocaleString()}gp (${priceChange90d > 0 ? '+' : ''}${priceChange90d.toFixed(1)}%)

VOLUME PATTERNS:
- Recent 7d: ${Math.round(vol7d).toLocaleString()} units/day
- Historical 30d: ${Math.round(vol30d).toLocaleString()} units/day
- Volume Trend: ${vol7d > vol30d ? 'Increasing' : 'Decreasing'} (${((vol7d / vol30d - 1) * 100).toFixed(1)}%)

PRICE VOLATILITY:
- 90d Range: ${minPrice.toLocaleString()}gp - ${maxPrice.toLocaleString()}gp
- Volatility: ${priceRange.toFixed(1)}%
${gameContext.hasUpdates ? gameContext.contextText : ''}${updateGuidance}${dropRateWarning}
TASK: Analyze this item and provide actionable trading advice. Consider:
**CRITICAL**: If drop rate INCREASED = item is MORE COMMON = BEARISH (price falls). DO NOT recommend as buy.
1. What trading strategy fits this item? (Quick flip, merch, long-term hold, avoid?)
2. Is the current price favorable for entry?
3. What are realistic profit expectations?
4. What are the key risks?

**IMPORTANT**: Only provide concrete advice if you have high confidence. If data is insufficient or the item is unpredictable, clearly state limitations.

**CRITICAL**: You MUST return ONLY a valid JSON object. Do not include ANY text before or after the JSON. Do not wrap in markdown code blocks. Use this EXACT structure:

{
  "itemName": "Item ${itemId}",
  "analysisType": "general",
  "tradingStrategy": "quick_flip",
  "confidence": 75,
  "summary": "A 2-3 sentence overview",
  "thesis": "Detailed investment explanation",
  "risks": "Key risk factors",
  "priceTargets": {
    "buyBelow": ${currentPrice},
    "sellAbove": ${Math.round(currentPrice * 1.05)},
    "stopLoss": ${Math.round(currentPrice * 0.95)}
  },
  "expectedProfit": "3-8%",
  "timeHorizon": "1-3 days",
  "recommendation": "HOLD",
  "reasoning": "Explanation of recommendation"
}

Valid values:
- tradingStrategy: "quick_flip", "merch", "long_term", or "avoid"
- recommendation: "BUY", "SELL", "HOLD", or "AVOID"
- confidence: number between 0-100
- All price targets must be positive integers`;

  const response = await openaiClient.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1000,
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      {
        role: 'system',
        content: 'You are an OSRS trading expert. Provide clear, honest advice. Admit when data is insufficient. Always return valid JSON with all required fields.'
      },
      {
        role: 'user',
        content: generalPrompt,
      },
    ],
  });

  const responseText = response.choices[0]?.message.content || '{}';
  console.log('📝 General analysis response received:', responseText.substring(0, 200));

  let analysisData: any = {};
  try {
    // Try to extract JSON from markdown code blocks or plain text
    let jsonText = responseText;

    // Remove markdown code blocks if present
    const codeBlockMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1];
    } else {
      // Try to find JSON object
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
    }

    analysisData = JSON.parse(jsonText);

    // Validate required fields
    if (!analysisData.confidence || !analysisData.recommendation) {
      console.warn('AI response missing required fields, using fallback');
      analysisData = {
        ...analysisData,
        confidence: analysisData.confidence || 30,
        recommendation: analysisData.recommendation || 'AVOID',
        summary: analysisData.summary || 'Insufficient data for reliable analysis',
        tradingStrategy: analysisData.tradingStrategy || 'avoid',
        thesis: analysisData.thesis || 'Unable to determine trading strategy due to limited market data',
        risks: analysisData.risks || 'Unknown risk profile - proceed with caution',
        priceTargets: analysisData.priceTargets || { buyBelow: 0, sellAbove: 0, stopLoss: 0 },
        expectedProfit: analysisData.expectedProfit || 'Unknown',
        timeHorizon: analysisData.timeHorizon || 'Unknown',
        reasoning: analysisData.reasoning || 'Insufficient data for detailed analysis'
      };
    }
  } catch (e) {
    console.error('Failed to parse general analysis response:', e);
    console.error('Raw response:', responseText);

    // Return a fallback analysis rather than failing completely
    return NextResponse.json({
      success: true,
      analysisType: 'general',
      data: {
        itemName: `Item ${itemId}`,
        analysisType: 'general',
        tradingStrategy: 'avoid',
        confidence: 20,
        summary: 'AI analysis encountered parsing issues. Manual review recommended.',
        thesis: 'Unable to generate reliable analysis due to technical limitations. Consider using price history and volume data for manual assessment.',
        risks: 'Unknown risk profile - insufficient analysis data available',
        priceTargets: { buyBelow: 0, sellAbove: 0, stopLoss: 0 },
        expectedProfit: 'Unknown',
        timeHorizon: 'Unknown',
        recommendation: 'AVOID',
        reasoning: 'AI response could not be properly parsed. This may indicate data quality issues or unusual market behavior.'
      },
      metrics: {
        currentPrice,
        avg7d: Math.round(avg7d),
        avg30d: Math.round(avg30d),
        avg90d: Math.round(avg90d),
        priceChange7d: parseFloat(priceChange7d.toFixed(2)),
        priceChange30d: parseFloat(priceChange30d.toFixed(2)),
        volumeRecent: Math.round(vol7d),
        volumeHistorical: Math.round(vol30d),
        volatility: parseFloat(priceRange.toFixed(2)),
        category: itemCategory,
      },
      error: 'Partial analysis - parsing issues detected',
      timestamp: new Date().toISOString()
    });
  }

  console.log(`✅ General analysis complete: strategy=${analysisData.tradingStrategy}, confidence=${analysisData.confidence}%`);

  const costUsd = response.usage ? calculateAICost('gpt-4o', response.usage.prompt_tokens, response.usage.completion_tokens) : 0;

  // Track analytics event
  await trackEvent({
    userId,
    eventType: 'ai_analysis_general',
    metadata: {
      itemId,
      model: 'gpt-4o',
      analysisType: 'general'
    },
    costUsd,
    tokensUsed: (response.usage?.prompt_tokens || 0) + (response.usage?.completion_tokens || 0)
  });

  return NextResponse.json({
    success: true,
    analysisType: 'general',
    data: analysisData,
    metrics: {
      currentPrice,
      avg7d: Math.round(avg7d),
      avg30d: Math.round(avg30d),
      avg90d: Math.round(avg90d),
      priceChange7d: parseFloat(priceChange7d.toFixed(2)),
      priceChange30d: parseFloat(priceChange30d.toFixed(2)),
      volumeRecent: Math.round(vol7d),
      volumeHistorical: Math.round(vol30d),
      volatility: parseFloat(priceRange.toFixed(2)),
      category: itemCategory,
    },
    tokenUsage: response.usage,
    timestamp: new Date().toISOString()
  });
}

/**
 * GET /api/analyze-single-item?itemId=123
 * 
 * Performs a high-fidelity, dual-pass AI evaluation for a specific OSRS item
 * Returns comprehensive mean-reversion analysis with AI strategist + auditor insights
 * OR general market analysis for items that don't fit mean-reversion criteria
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const itemIdParam = searchParams.get('itemId');

    if (!itemIdParam) {
      return NextResponse.json(
        { success: false, error: 'itemId parameter required' },
        { status: 400 }
      );
    }

    const itemId = parseInt(itemIdParam);

    if (!Number.isFinite(itemId) || itemId <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid itemId' },
        { status: 400 }
      );
    }

    console.log(`🔍 Deep Analysis requested for item ${itemId}`);

    // Fetch 365-day history with volume data
    const priceData = await getItemHistoryWithVolumes(itemId, 365 * 24 * 60 * 60);

    if (!priceData || priceData.length < 30) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient price history',
          details: `Need at least 30 days of data. Available: ${priceData?.length || 0} days`
        },
        { status: 400 }
      );
    }

    console.log(`📊 Retrieved ${priceData.length} days of price history`);

    // Step 1: Try mean-reversion analysis first
    const baseSignal = await analyzeMeanReversionOpportunity(
      itemId,
      `Item ${itemId}`, // Will be enriched by API
      priceData
    );

    // If mean-reversion fails, use general market analysis instead
    if (!baseSignal) {
      console.log('⚠️ Item does not meet mean-reversion criteria - switching to general analysis');
      return await performGeneralMarketAnalysis(itemId, priceData, client);
    }

    // Get user for tracking
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    console.log(`✓ Mean-reversion analysis complete: confidence=${baseSignal.confidenceScore}%, potential=${baseSignal.reversionPotential.toFixed(1)}%`);

    // Check if OpenAI is available for deep analysis
    if (!process.env.OPENROUTER_API_KEY) {
      console.warn('⚠️ OpenRouter API key not found - returning base analysis only');
      return NextResponse.json({
        success: true,
        signal: baseSignal,
        aiEnhanced: false,
        timestamp: new Date().toISOString()
      });
    }

    // Step 2: STRATEGIST PASS - Deep dive behavioral analysis
    console.log('🧠 Running AI Strategist Pass...');

    // Fetch game update context for mean-reversion analysis
    const gameContext = await getGameUpdateContext(itemId, 14);
    const updateGuidance = generateUpdateGuidance(gameContext.updates);
    
    // Check for bearish drop rate increases
    const dropRateIncreases = gameContext.updates.filter(u => 
      u.impact_type === 'drop_rate_increase' || 
      (u.sentiment === 'bearish' && u.notes?.toLowerCase().includes('drop rate')) ||
      (u.notes?.toLowerCase().includes('drop rate') && 
       (u.notes?.toLowerCase().includes('increase') || 
        u.notes?.toLowerCase().includes('more common') ||
        u.notes?.toLowerCase().includes('1/400 to 1/256')))
    );
    
    const dropRateWarning = dropRateIncreases.length > 0
      ? `\n⚠️ **CRITICAL WARNING - DROP RATE INCREASED**:\nThis item's drop rate was INCREASED (from 1/400 to 1/256 = 56% more common).\n- MORE SUPPLY = STRUCTURAL PRICE DECLINE (not temporary dip)\n- Mean-reversion thesis is INVALID\n- This is NOT a buy opportunity\n${dropRateIncreases.map(u => `   - ${u.title}: ${u.notes}`).join('\n')}\n**YOUR TASK**: Acknowledge this price is falling due to PERMANENT supply increase. Do NOT recommend buying.\n`
      : '';

    const strategistPrompt = `You are an expert OSRS market analyst providing DEEP DIVE analysis on this item's flip potential.

ITEM: ${baseSignal.itemName} (ID: ${itemId})
CURRENT PRICE: ${baseSignal.currentPrice}gp
USER ENTRY: Buying at current price (~${baseSignal.currentPrice}gp)

HISTORICAL CONTEXT:
- 7d avg: ${baseSignal.shortTerm.avgPrice}gp (current ${baseSignal.shortTerm.currentDeviation > 0 ? '+' : ''}${baseSignal.shortTerm.currentDeviation.toFixed(1)}%)
- 90d avg: ${baseSignal.mediumTerm.avgPrice}gp (current ${baseSignal.mediumTerm.currentDeviation > 0 ? '+' : ''}${baseSignal.mediumTerm.currentDeviation.toFixed(1)}%)
- 365d avg: ${baseSignal.longTerm.avgPrice}gp (current ${baseSignal.longTerm.currentDeviation > 0 ? '+' : ''}${baseSignal.longTerm.currentDeviation.toFixed(1)}%)
- Max historical deviation: ${baseSignal.maxDeviation.toFixed(1)}%

METRICS:
- Bot Likelihood: ${baseSignal.botLikelihood}
- Supply Stability: ${baseSignal.supplyStability}
- Liquidity: ${baseSignal.liquidityScore}/100
- Volatility: ${baseSignal.volatilityRisk}
- Base Confidence: ${baseSignal.confidenceScore}%
- Upside Potential: ${baseSignal.reversionPotential.toFixed(1)}%
${gameContext.hasUpdates ? gameContext.contextText : ''}${updateGuidance}${dropRateWarning}
TASK: Provide engaging, specific analysis that a trader would actually want to read.

**MANDATORY DROP RATE RULE**: 
${dropRateIncreases.length > 0 ? 
`🚨 THIS ITEM HAD DROP RATE INCREASED - IT IS NOW MORE COMMON. 
- This is a STRUCTURAL DECLINE, not a temporary dip
- Mean-reversion does NOT apply (permanent supply increase)
- You MUST write a BEARISH thesis explaining why this is NOT a buy
- Set confidenceAdjustment to -25 or lower
- Your narrative MUST acknowledge this invalidates the opportunity` :
`If drop rate was INCREASED (item more common), mean-reversion thesis is INVALID. Acknowledge this and reduce confidence.`}

1. **THESIS** (The Core Story):Write 2-3 compelling sentences explaining WHY this is an opportunity NOW. Include:
   - Specific catalysts or market events (bot bans, updates, seasonal patterns)
   - What makes this item special vs others
   - Why current price is attractive

2. **VULNERABILITY** (The Reality Check):
   1 paragraph on what could go wrong. Be brutally honest about risks.

3. **STRATEGIC NARRATIVE** (The Full Picture):
   Write 3-4 sentences with personality and market color:
   - WHY did price drop? (specific events, not just "bot dump")
   - What are volume/supply patterns telling us?
   - Timeline for recovery and what triggers it
   - Risk/reward in plain English

4. **PRICE TARGETS** (Realistic Goals):
   - exitConservative: Safer target within historical range (${Math.round(baseSignal.currentPrice * 1.12)}-${Math.round(baseSignal.longTerm.avgPrice)})
   - exitAggressive: Stretch target if everything goes right (${Math.round(baseSignal.longTerm.avgPrice)}-${Math.round(baseSignal.longTerm.avgPrice * 1.15)})
   - triggerStop: Price at which thesis is invalid (typically ${Math.round(baseSignal.currentPrice * 0.93)}gp or lower)

CRITICAL: Make the thesis and narrative UNIQUE and ENGAGING. No generic "trading below averages" statements. Tell the actual story of this specific item.

Return ONLY valid JSON:
{
  "logic": {
    "thesis": "<compelling 2-3 sentence story>",
    "vulnerability": "<honest risk paragraph>",
    "trigger": "<specific invalidation condition>"
  },
  "strategicNarrative": "<engaging 3-4 sentence analysis with personality>",
  "confidenceAdjustment": <-25 to +15>,
  "priceTargets": {
    "exitConservative": <realistic gp target>,
    "exitAggressive": <stretch gp target>,
    "triggerStop": <stop loss gp>
  },
  "holdingPeriod": "<estimate like '1-2 weeks' or '2-4 weeks', max 4 weeks>"
}`;

    const strategistResponse = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 900,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content: 'You are an expert OSRS trader who writes engaging, specific market analysis. Be insightful and entertaining. Return only JSON.'
        },
        {
          role: 'user',
          content: strategistPrompt,
        },
      ],
    });

    const strategistText = strategistResponse.choices[0]?.message.content || '{}';
    console.log('📝 Strategist response received');

    let strategistData: any = {};
    try {
      const jsonMatch = strategistText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        strategistData = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse strategist response:', e);
    }

    // Step 3: AUDITOR PASS - Skeptical review
    console.log('🔍 Running AI Auditor Pass...');

    const auditorPrompt = `You are a skeptical investment auditor reviewing this OSRS flip analysis.

ITEM: ${baseSignal.itemName} (${itemId})
CURRENT PRICE: ${baseSignal.currentPrice}gp
STRATEGIST THESIS: ${strategistData.logic?.thesis || 'Standard mean-reversion opportunity'}
PROPOSED EXITS: Conservative ${strategistData.priceTargets?.exitConservative || baseSignal.exitPriceBase}gp | Aggressive ${strategistData.priceTargets?.exitAggressive || baseSignal.exitPriceStretch}gp
${gameContext.hasUpdates ? '\n' + gameContext.contextText : ''}${dropRateWarning}
CRITIQUE:
1. Is this real mean-reversion or structural decline (game changes, dead content)?
2. **CRITICAL**: If drop rate INCREASED (item more common), this invalidates mean-reversion thesis - REJECT
3. Are exit targets realistic given 365d average is ${baseSignal.longTerm.avgPrice}gp?
4. Are volume patterns and bot signals credible?
5. Does the narrative match the data or is it overly optimistic?

Return ONLY valid JSON:
{
  "decision": "approve"|"caution"|"reject",
  "auditorNote": "1-2 sentence critique highlighting main concerns",
  "confidencePenalty": 0-25
}`;

    const auditorResponse = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 250,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content: 'You are a skeptical auditor who finds hidden risks. Return only JSON.'
        },
        {
          role: 'user',
          content: auditorPrompt,
        },
      ],
    });

    const auditorText = auditorResponse.choices[0]?.message.content || '{}';
    console.log('🔎 Auditor response received');

    let auditorData: any = {};
    try {
      const jsonMatch = auditorText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        auditorData = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse auditor response:', e);
    }

    // Simplify price targets - user buys at current price
    const exitConservative = Math.round(
      strategistData.priceTargets?.exitConservative ||
      baseSignal.exitPriceBase ||
      baseSignal.currentPrice * 1.12
    );
    const exitAggressive = Math.round(
      strategistData.priceTargets?.exitAggressive ||
      baseSignal.exitPriceStretch ||
      exitConservative * 1.1
    );
    const stopLoss = Math.round(
      strategistData.priceTargets?.triggerStop ||
      baseSignal.stopLoss ||
      baseSignal.currentPrice * 0.93
    );

    // Validate exit targets aren't absurdly high
    const maxReasonableExit = baseSignal.longTerm.avgPrice * 1.3;
    const finalExitConservative = Math.min(exitConservative, maxReasonableExit);
    const finalExitAggressive = Math.min(exitAggressive, maxReasonableExit * 1.1);

    if (exitConservative > maxReasonableExit) {
      console.warn(`⚠️ Capped ${baseSignal.itemName} exit targets: ${exitConservative} → ${finalExitConservative} (max: ${Math.round(maxReasonableExit)})`);
    }

    // Merge AI insights into signal
    const enhancedSignal: MeanReversionSignal = {
      ...baseSignal,
      logic: strategistData.logic || {
        thesis: baseSignal.reasoning,
        vulnerability: 'Standard mean-reversion risks apply',
        trigger: `Exit if thesis invalidated`
      },
      strategicNarrative: strategistData.strategicNarrative || baseSignal.reasoning,
      volumeVelocity: baseSignal.mediumTerm.volumeAvg > 0
        ? baseSignal.shortTerm.volumeAvg / baseSignal.mediumTerm.volumeAvg
        : 1.0,
      confidenceScore: Math.max(0, Math.min(100,
        baseSignal.confidenceScore +
        (strategistData.confidenceAdjustment || 0) -
        (auditorData.confidencePenalty || 0)
      )),
      auditorDecision: auditorData.decision || 'approve',
      auditorNotes: auditorData.auditorNote,
      entryPriceNow: baseSignal.currentPrice,
      entryRangeLow: Math.max(1, Math.round(baseSignal.currentPrice * 0.98)),
      entryRangeHigh: Math.round(baseSignal.currentPrice * 1.02),
      buyIfDropsTo: baseSignal.currentPrice,
      sellAtMin: finalExitConservative,
      sellAtMax: finalExitAggressive,
      exitPriceBase: finalExitConservative,
      exitPriceStretch: finalExitAggressive,
      abortIfRisesAbove: stopLoss,
      stopLoss: stopLoss,
      targetSellPrice: finalExitConservative,
      estimatedHoldingPeriod: strategistData.holdingPeriod || baseSignal.estimatedHoldingPeriod,
    };

    console.log(`✅ Deep analysis complete: decision=${enhancedSignal.auditorDecision}, final confidence=${enhancedSignal.confidenceScore}%`);

    // Calculate token usage for cost tracking
    const inputTokens = (strategistResponse.usage?.prompt_tokens || 0) + (auditorResponse.usage?.prompt_tokens || 0);
    const outputTokens = (strategistResponse.usage?.completion_tokens || 0) + (auditorResponse.usage?.completion_tokens || 0);
    
    const tokenUsage = {
      strategist: strategistResponse.usage,
      auditor: auditorResponse.usage,
      total: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      }
    };

    const costUsd = calculateAICost('gpt-4o', tokenUsage.total.inputTokens, tokenUsage.total.outputTokens);

    // Track analytics event
    await trackEvent({
      userId,
      eventType: 'ai_analysis_deep',
      metadata: {
        itemId,
        itemName: enhancedSignal.itemName,
        model: 'gpt-4o',
        analysisType: 'deep'
      },
      costUsd,
      tokensUsed: tokenUsage.total.totalTokens
    });

    // Get game updates for this item
    const itemGameContext = await getGameUpdateContext(itemId, 14);

    return NextResponse.json({
      success: true,
      signal: enhancedSignal,
      aiEnhanced: true,
      gameUpdates: itemGameContext.updates,
      tokenUsage,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Single item analysis failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze item',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
