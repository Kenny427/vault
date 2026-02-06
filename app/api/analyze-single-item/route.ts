import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getItemHistoryWithVolumes } from '@/lib/api/osrs';
import { analyzeMeanReversionOpportunity, MeanReversionSignal, validateAndConstrainPrices } from '@/lib/meanReversionAnalysis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * General market analysis for items that don't fit mean-reversion criteria
 * Works for mega-rares, high-volume flips, and other trading strategies
 */
async function performGeneralMarketAnalysis(
  itemId: number, 
  priceData: any[], 
  openaiClient: OpenAI
) {
  console.log('🌐 Starting general market analysis...');
  
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'AI analysis unavailable',
        details: 'OpenAI API key not configured'
      },
      { status: 503 }
    );
  }
  
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

TASK: Analyze this item and provide actionable trading advice. Consider:
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
    
    console.log(`✓ Mean-reversion analysis complete: confidence=${baseSignal.confidenceScore}%, potential=${baseSignal.reversionPotential.toFixed(1)}%`);
    
    // Check if OpenAI is available for deep analysis
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ OpenAI API key not found - returning base analysis only');
      return NextResponse.json({
        success: true,
        signal: baseSignal,
        aiEnhanced: false,
        timestamp: new Date().toISOString()
      });
    }
    
    // Step 2: STRATEGIST PASS - Deep dive behavioral analysis
    console.log('🧠 Running AI Strategist Pass...');
    
    const strategistPrompt = `You are an expert OSRS market analyst. Perform DEEP DIVE analysis on this item's investment potential.

ITEM: ${baseSignal.itemName} (ID: ${itemId})
CURRENT PRICE: ${baseSignal.currentPrice}gp

HISTORICAL CONTEXT (12-month range):
- 7d avg: ${baseSignal.shortTerm.avgPrice}gp (current is ${baseSignal.shortTerm.currentDeviation.toFixed(1)}% from this)
- 90d avg: ${baseSignal.mediumTerm.avgPrice}gp (current is ${baseSignal.mediumTerm.currentDeviation.toFixed(1)}% from this)
- 365d avg: ${baseSignal.longTerm.avgPrice}gp (current is ${baseSignal.longTerm.currentDeviation.toFixed(1)}% from this)
- Max Deviation: ${baseSignal.maxDeviation.toFixed(1)}%

METRICS:
- Reversion Potential: ${baseSignal.reversionPotential.toFixed(1)}%
- Confidence: ${baseSignal.confidenceScore}%
- Bot Likelihood: ${baseSignal.botLikelihood}
- Supply Stability: ${baseSignal.supplyStability}
- Liquidity Score: ${baseSignal.liquidityScore}
- Volatility Risk: ${baseSignal.volatilityRisk}

BASE RECOMMENDATIONS (for reference):
- Entry Now: ${baseSignal.entryPriceNow}gp
- Entry Range: ${baseSignal.entryRangeLow}-${baseSignal.entryRangeHigh}gp
- Exit Base Target: ${baseSignal.exitPriceBase}gp
- Exit Stretch Target: ${baseSignal.exitPriceStretch}gp
- Stop Loss: ${baseSignal.stopLoss}gp

⚠️ PRICE GUIDANCE CONSTRAINTS (Must follow):
- Entry price MUST be within ±15% of current (${Math.round(baseSignal.currentPrice * 0.85)}-${Math.round(baseSignal.currentPrice * 1.15)}gp)
- Exit conservative MUST be higher than entry and avoid >3x current price
- Exit aggressive can be higher but should not exceed 2x the 365d average
- Stop loss must be lower than entry price
- All prices must be realistic based on historical 12-month range

TASK: Provide a comprehensive investment thesis with structured reasoning:

1. **THESIS** (The "Why"): Explain the core investment case in 2-3 sentences. What makes this a compelling opportunity?

2. **VULNERABILITY** (The Bear Case): What could go wrong? What factors could prevent reversion? Be specific.

3. **TRIGGER** (Invalidation Point): At what price or condition should we abandon this thesis?

4. **STRATEGIC NARRATIVE**: Detailed behavioral analysis (3-4 sentences) covering:
   - Why the price dropped and whether it's capitulation or structural decline
   - Volume and bot activity patterns
   - Expected recovery timeline and catalysts
   - Risk/reward assessment

5. **PRICE GUIDANCE** (MUST follow constraints):
   - entryOptimal: Best entry price for this trade (within ±15% of current)
   - exitConservative: Safe exit that covers taxes and fees
   - exitAggressive: Optimistic target (realistic based on history)
   - triggerStop: Hard stop loss price

Return ONLY valid JSON with no markdown, no additional text:
{
  "logic": {
    "thesis": "2-3 sentence investment thesis",
    "vulnerability": "Bear case / counterargument",
    "trigger": "Invalidation point for thesis"
  },
  "strategicNarrative": "3-4 sentence detailed analysis",
  "confidenceAdjustment": 0,
  "priceTargets": {
    "entryOptimal": ${baseSignal.currentPrice},
    "exitConservative": ${baseSignal.exitPriceBase},
    "exitAggressive": ${baseSignal.exitPriceStretch},
    "triggerStop": ${baseSignal.stopLoss}
  },
  "volumeVelocity": ${baseSignal.mediumTerm.volumeAvg > 0 ? (baseSignal.shortTerm.volumeAvg / baseSignal.mediumTerm.volumeAvg).toFixed(2) : '1.0'},
  "holdingPeriod": "${baseSignal.estimatedHoldingPeriod}"
}`;

    const strategistResponse = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 800,
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content: 'You are an expert OSRS investment analyst. Provide deep, skeptical analysis with specific price targets. Return only JSON.'
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
    
    // Step 3: AUDITOR PASS - Skeptical cross-examination
    console.log('🔍 Running AI Auditor Pass...');
    
    const auditorPrompt = `You are a skeptical investment auditor. Review this OSRS item analysis and identify hidden traps.

ITEM: ${baseSignal.itemName} (${itemId})
CURRENT PRICE: ${baseSignal.currentPrice}gp
STRATEGIST THESIS: ${strategistData.logic?.thesis || 'Buy opportunity based on mean reversion'}
STRATEGIST NARRATIVE: ${strategistData.strategicNarrative || baseSignal.reasoning}
PROPOSED ENTRY: ${strategistData.priceTargets?.entryOptimal || baseSignal.entryPriceNow}gp
PROPOSED EXIT: ${strategistData.priceTargets?.exitConservative || baseSignal.exitPriceBase}gp

PRICE SANITY CHECKS (red flags):
1. Is entry price within ±15% of current price? (within ${Math.round(baseSignal.currentPrice * 0.85)}-${Math.round(baseSignal.currentPrice * 1.15)}gp)
2. Is exit target realistic vs historical 365d average (${baseSignal.longTerm.avgPrice}gp)?
3. Does the proposed upside exceed the confidence level? (High upside + low confidence = trap)
4. Are there any structural change indicators being ignored?

CRITIQUE THE FOLLOWING:
1. Is this a real mean-reversion or structural decline?
2. Are the volume patterns genuine or fake/manipulated?
3. Is the bot likelihood assessment correct?
4. **Are the price targets realistic and constrained?** Flag if entry/exit violate expected ranges.

Provide:
- **decision**: "approve" | "caution" | "reject"
- **auditorNote**: 1-2 sentence critique (include price concerns if found)
- **confidencePenalty**: 0-25 (penalty points if skeptical)

Return ONLY valid JSON:
{
  "decision": "approve",
  "auditorNote": "Detailed critique with any price concerns",
  "confidencePenalty": 0
}`;

    const auditorResponse = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 300,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content: 'You are a skeptical auditor. Find flaws and risks that others miss. Return only JSON.'
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
    
    // VALIDATE and constrain AI-generated price guidance
    const validatedPrices = validateAndConstrainPrices(
      {
        entryOptimal: strategistData.priceTargets?.entryOptimal,
        exitConservative: strategistData.priceTargets?.exitConservative,
        exitAggressive: strategistData.priceTargets?.exitAggressive,
        triggerStop: strategistData.priceTargets?.triggerStop,
      },
      baseSignal
    );

    if (validatedPrices.violations.length > 0) {
      console.warn(
        `⚠️ Price Guidance Validation - Item ${baseSignal.itemName} (${itemId}):`,
        validatedPrices.violations
      );
      if (validatedPrices.useDefaults) {
        console.warn(
          `   Using default price ranges instead of AI guidance`
        );
      }
    }
    
    // Merge AI insights into signal
    const enhancedSignal: MeanReversionSignal = {
      ...baseSignal,
      logic: strategistData.logic || {
        thesis: baseSignal.reasoning,
        vulnerability: 'Standard mean-reversion risks apply',
        trigger: `Exit if price closes above ${baseSignal.stopLoss}gp`
      },
      strategicNarrative: strategistData.strategicNarrative || baseSignal.reasoning,
      volumeVelocity: strategistData.volumeVelocity || 
        (baseSignal.mediumTerm.volumeAvg > 0 
          ? baseSignal.shortTerm.volumeAvg / baseSignal.mediumTerm.volumeAvg 
          : 1.0),
      confidenceScore: Math.max(0, Math.min(100, 
        baseSignal.confidenceScore + 
        (strategistData.confidenceAdjustment || 0) - 
        (auditorData.confidencePenalty || 0)
      )),
      auditorDecision: auditorData.decision || 'approve',
      auditorNotes: auditorData.auditorNote,
      buyIfDropsTo: validatedPrices.entryOptimal,
      sellAtMin: validatedPrices.exitConservative,
      sellAtMax: validatedPrices.exitAggressive,
      abortIfRisesAbove: validatedPrices.triggerStop,
    };
    
    console.log(`✅ Deep analysis complete: decision=${enhancedSignal.auditorDecision}, final confidence=${enhancedSignal.confidenceScore}%`);
    
    // Calculate token usage for cost tracking
    const tokenUsage = {
      strategist: strategistResponse.usage,
      auditor: auditorResponse.usage,
      total: {
        inputTokens: (strategistResponse.usage?.prompt_tokens || 0) + (auditorResponse.usage?.prompt_tokens || 0),
        outputTokens: (strategistResponse.usage?.completion_tokens || 0) + (auditorResponse.usage?.completion_tokens || 0),
        totalTokens: (strategistResponse.usage?.total_tokens || 0) + (auditorResponse.usage?.total_tokens || 0),
      }
    };
    
    return NextResponse.json({
      success: true,
      signal: enhancedSignal,
      aiEnhanced: true,
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
