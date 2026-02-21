import { NextResponse } from 'next/server';
import { getOpenRouterClient } from '@/lib/ai/openrouter';
import { MeanReversionSignal } from '@/lib/meanReversionAnalysis';

interface ExecutionPlan {
  itemName: string;
  confidence: number;
  entryZone: {
    lowPrice: number;
    midPrice: number;
    highPrice: number;
    reasoning: string;
  };
  exitZone: {
    conservative: { price: number; profitPercent: number; daysToTarget: string };
    moderate: { price: number; profitPercent: number; daysToTarget: string };
    aggressive: { price: number; profitPercent: number; daysToTarget: string };
  };
  riskRewardRatio: string; // e.g., "1:2.5" (risk 1gp to make 2.5gp)
  positionSizing: {
    recommended: string; // e.g., "Small (1-5%)", "Medium (5-10%)", "Large (10%+)"
    reasoning: string;
  };
  timeframe: string; // e.g., "3-7 days", "2-4 weeks", "1-3 months"
  keyRisks: string[];
  catalysts: string[];
}

const client = getOpenRouterClient();

/**
 * Execution Plan Generator
 * Generates detailed entry/exit strategies for flip opportunities
 * 
 * Usage:
 * POST /api/execution-plans
 * Body: { opportunities: [MeanReversionSignal, ...] }
 */
export async function POST(request: Request) {
  try {
    const { opportunities } = await request.json();

    if (!opportunities || opportunities.length === 0) {
      return NextResponse.json({ error: 'No opportunities provided' }, { status: 400 });
    }

    console.log(`🎯 [EXECUTION] Generating plans for ${opportunities.length} opportunities...`);

    // Top 10 opportunities
    const topOpps = opportunities.slice(0, 10);

    // Build detailed prompt
    const prompt = `You are a professional OSRS flipping strategist. Generate detailed execution plans for these flip opportunities.

OPPORTUNITIES:
${topOpps
  .map(
    (opp: MeanReversionSignal) => `
━━━ ${opp.itemName} (${opp.investmentGrade} Grade) ━━━
Current: ${opp.currentPrice}gp
Confidence: ${opp.confidenceScore}%
7d Avg: ${opp.shortTerm.avgPrice}gp | 30d Avg: ${opp.mediumTerm.avgPrice}gp | 365d Avg: ${opp.longTerm.avgPrice}gp
Max Deviation: ${opp.maxDeviation.toFixed(1)}%
Reversion Potential: ${opp.reversionPotential.toFixed(1)}%
Est. Hold Time: ${opp.estimatedHoldingPeriod}
Liquidity: ${opp.liquidityScore}%
`
  )
  .join('\n')}

EXECUTION PLAN REQUIREMENTS:
For each opportunity, provide:

1. **ENTRY ZONE** (Where to buy):
   - Low Price: Where you'd buy if you're aggressive
   - Mid Price: Fair entry price (recommended)
   - High Price: Maximum acceptable entry
   - Brief reasoning for the zone

2. **EXIT ZONES** (Where to sell):
   - Conservative: Quick profit, lower risk (e.g., 5-10% gain, 3-7 days)
   - Moderate: Balanced risk/reward (e.g., 15-25% gain, 2-4 weeks)
   - Aggressive: Squeeze maximum profit (e.g., 30-50% gain, 1-3 months)
   - Include: target price, profit %, estimated time to reach

3. **RISK/REWARD** (e.g., "Risk 500gp to make 1500gp = 1:3 ratio")

4. **POSITION SIZING**:
   - Small (1-5% of portfolio): High uncertainty, unproven item
   - Medium (5-10%): Good setup, strong confidence
   - Large (10%+): Elite setup, high conviction
   - Explain reasoning based on confidence and volatility

5. **TIMEFRAME**: How long to wait for profit target (days/weeks/months)

6. **KEY RISKS**: 2-3 specific risks for this item (bot crash, manipulation, etc.)

7. **CATALYSTS**: 1-2 things that could trigger the flip (demand spike, bot shortage, etc.)

FORMAT AS JSON ARRAY:
[
  {
    "itemName": "Item",
    "confidence": 85,
    "entryZone": {
      "lowPrice": 1000,
      "midPrice": 1100,
      "highPrice": 1200,
      "reasoning": "Support at 30d avg, resistance above..."
    },
    "exitZone": {
      "conservative": {"price": 1200, "profitPercent": 9, "daysToTarget": "3-5"},
      "moderate": {"price": 1350, "profitPercent": 23, "daysToTarget": "10-20"},
      "aggressive": {"price": 1550, "profitPercent": 41, "daysToTarget": "30-60"}
    },
    "riskRewardRatio": "1:2",
    "positionSizing": {
      "recommended": "Medium (5-10%)",
      "reasoning": "Strong trend and liquidity..."
    },
    "timeframe": "2-4 weeks",
    "keyRisks": ["Bot crash could flood supply", "Low volume spikes could trap buyers"],
    "catalysts": ["PvM content update increases demand", "Price consolidation suggests reversal"]
  }
]`;

    const aiResponse = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = aiResponse.choices[0]?.message.content || '';

    // Parse JSON
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    const plans: ExecutionPlan[] = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    // Enhance with opportunity metadata
    const enhancedPlans = plans.map((plan, idx) => ({
      ...plan,
      itemId: topOpps[idx]?.itemId,
      grade: topOpps[idx]?.investmentGrade,
      suggestedInvestment: topOpps[idx]?.suggestedInvestment,
    }));

    return NextResponse.json({
      executionPlans: enhancedPlans,
      generatedAt: new Date().toISOString(),
      summary: {
        totalOpportunities: enhancedPlans.length,
        highConfidence: enhancedPlans.filter((p) => p.confidence >= 80).length,
        averageRiskReward: calculateAvgRiskReward(enhancedPlans),
      },
    });
  } catch (error) {
    console.error('Execution plan error:', error);
    return NextResponse.json({ error: 'Plan generation failed' }, { status: 500 });
  }
}

function calculateAvgRiskReward(plans: ExecutionPlan[]): string {
  const ratios = plans.map((p) => {
    const parts = p.riskRewardRatio.split(':');
    if (parts.length === 2) {
      return parseFloat(parts[1]) / parseFloat(parts[0]);
    }
    return 0;
  });
  const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  return `1:${avg.toFixed(1)}`;
}

export async function GET() {
  return NextResponse.json({
    message: 'Execution Plan Generator',
    usage: 'POST with { opportunities: MeanReversionSignal[] }',
  });
}
