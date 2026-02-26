import { NextRequest, NextResponse } from 'next/server';
import { getItemHistoryWithVolumes } from '@/lib/api/osrs';
import { analyzeMeanReversionOpportunity } from '@/lib/meanReversionAnalysis';
import { getOpenRouterClient } from '@/lib/ai/openrouter';

const client = getOpenRouterClient();

export const runtime = 'nodejs';

interface PortfolioHolding {
  itemId: number;
  itemName: string;
  quantity: number;
  costBasisPerUnit: number;
  currentPrice: number;
  datePurchased: string;
}

interface PortfolioAdvisorRequest {
  holdings: PortfolioHolding[];
}

interface PortfolioAction {
  itemId: number;
  itemName: string;
  action: 'hold' | 'sell_soon' | 'sell_asap' | 'hold_for_rebound';
  confidence: number; // 0-100
  expectedPrice: number;
  timeframe: string;
  reasoning: string;
}

export async function POST(req: NextRequest) {
  try {
    const data = (await req.json()) as PortfolioAdvisorRequest;

    if (!data.holdings || data.holdings.length === 0) {
      return NextResponse.json({
        actions: [],
        summary: 'No holdings to analyze.',
      });
    }

    console.log(`🎯 [PORTFOLIO ADVISOR] Analyzing ${data.holdings.length} holdings with REAL market data...`);

    // Fetch real price history and calculate mean-reversion signals for each holding
    const enrichedHoldings = await Promise.all(
      data.holdings.map(async (holding) => {
        try {
          // Fetch 1 year of price history with volume data
          const priceData = await getItemHistoryWithVolumes(holding.itemId, 365 * 24 * 60 * 60);
          
          if (!priceData || priceData.length < 5) {
            console.log(`⚠️ ${holding.itemName}: Insufficient price data`);
            return {
              ...holding,
              hasData: false,
            };
          }

          // Calculate mean-reversion signal using the same logic as opportunities scanner
          const signal = await analyzeMeanReversionOpportunity(
            holding.itemId,
            holding.itemName,
            priceData
          );

          if (!signal) {
            return {
              ...holding,
              hasData: false,
            };
          }

          // Calculate profit/loss metrics
          const currentPL = ((holding.currentPrice - holding.costBasisPerUnit) / holding.costBasisPerUnit) * 100;
          const targetPL = ((signal.targetSellPrice - holding.costBasisPerUnit) / holding.costBasisPerUnit) * 100;

          return {
            ...holding,
            hasData: true,
            signal,
            currentPL,
            targetPL,
          };
        } catch (error) {
          console.error(`❌ Failed to analyze ${holding.itemName}:`, error);
          return {
            ...holding,
            hasData: false,
          };
        }
      })
    );

    // Filter to holdings with data
    const validHoldings = enrichedHoldings.filter((h) => h.hasData);
    console.log(`✅ Retrieved market data for ${validHoldings.length}/${data.holdings.length} holdings`);

    if (validHoldings.length === 0) {
      return NextResponse.json({
        actions: data.holdings.map((h) => ({
          itemId: h.itemId,
          itemName: h.itemName,
          action: 'hold',
          confidence: 0,
          expectedPrice: h.currentPrice,
          timeframe: 'Unknown',
          reasoning: 'Insufficient market data for analysis',
        })),
        summary: {
          totalHoldings: data.holdings.length,
          analyzedHoldings: 0,
        },
      });
    }

    // Build comprehensive prompt with REAL market data
    const holdingsSummary = validHoldings
      .map((h: any) => {
        const s = h.signal;
        return `${h.itemName} (ID:${h.itemId}):
- Position: Qty=${h.quantity}, Cost=${h.costBasisPerUnit}gp, Current=${h.currentPrice}gp, P/L=${h.currentPL.toFixed(1)}%
- Market Data: 30d_avg=${Math.round(s.shortTerm.avgPrice)}gp, 90d_avg=${Math.round(s.mediumTerm.avgPrice)}gp, 365d_avg=${Math.round(s.longTerm.avgPrice)}gp
- Deviation: 7d=${s.shortTerm.currentDeviation.toFixed(1)}%, 90d=${s.mediumTerm.currentDeviation.toFixed(1)}%, 365d=${s.longTerm.currentDeviation.toFixed(1)}%
- Signals: confidence=${s.confidenceScore}%, potential=${s.reversionPotential.toFixed(1)}%, grade=${s.investmentGrade}
- Risk: volatility=${s.volatilityRisk}, liquidity=${s.liquidityScore}, bot=${s.botLikelihood}
- Target: ${s.targetSellPrice}gp (would be ${h.targetPL.toFixed(1)}% profit from cost)`;
      })
      .join('\n\n');

    // Calculate portfolio-level metrics for context
    const totalValue = validHoldings.reduce((sum, h: any) => sum + h.currentPrice * h.quantity, 0);
    const totalCost = validHoldings.reduce((sum, h: any) => sum + h.costBasisPerUnit * h.quantity, 0);
    const portfolioPL = ((totalValue - totalCost) / totalCost) * 100;

    // Assess market phase based on average deviations
    const avgDeviation90d = validHoldings.reduce((sum, h: any) => sum + h.signal.mediumTerm.currentDeviation, 0) / validHoldings.length;
    const marketPhase = avgDeviation90d < -10 ? 'bear' : avgDeviation90d > 10 ? 'bull' : 'neutral';

    const prompt = `You are an elite OSRS portfolio advisor analyzing EXISTING POSITIONS with 365 days of REAL market data.

IMPORTANT: These are items the user ALREADY OWNS. Use POSITION-AWARE ANALYSIS:
- Consider their entry price (costBasisPerUnit) vs current price
- Assess reversion progress FOR THEIR POSITION (not hypothetical new entry)
- Calculate profit/risk from THEIR cost basis
- Provide position management advice (take profit, hold for target, cut loss)

PORTFOLIO CONTEXT:
- Total Value: ${Math.round(totalValue).toLocaleString()}gp
- Total Cost: ${Math.round(totalCost).toLocaleString()}gp
- Portfolio P/L: ${portfolioPL.toFixed(1)}%
- Market Phase: ${marketPhase.toUpperCase()}
- Holdings Analyzed: ${validHoldings.length}

POSITIONS WITH MARKET DATA:
${holdingsSummary}

DECISION FRAMEWORK (Position Management):

1. **SELL_ASAP** if:
   - Original thesis has failed (price declining vs their entry, negative deviation worsening)
   - Stop-loss triggered or near stop-loss levels
   - Strong downtrend detected (negative deviation across ALL timeframes)
   - Take profit now if 20%+ gain and showing reversal/resistance

2. **SELL_SOON** if:
   - Position is profitable (>10% from their cost) AND near mean-reversion target
   - Reversion 80%+ complete for their position
   - Good profit secured and momentum slowing
   - Risk/reward unfavorable (small upside vs downside risk)

3. **HOLD** if:
   - Position profitable but target not yet reached (reversion <80% complete)
   - Strong mean-reversion signal still active (high confidence >60%)
   - Currently undervalued vs historical averages with room to run
   - Good investment grade (A/A+/B+) and patience warranted

4. **HOLD_FOR_REBOUND** if:
   - Position underwater BUT thesis still valid (high confidence >60%)
   - Mean-reversion signals show strong recovery potential
   - Recent downmove is temporary dip in overall uptrend
   - Stop-loss NOT triggered, acceptable risk/reward

CRITICAL ANALYSIS REQUIREMENTS:
1. Calculate reversion completion % for THEIR position: (currentPrice - costBasis) / (targetSellPrice - costBasis) * 100
2. Assess if their entry was good (did they buy below average?)
3. Consider holding period (longer hold = more impatience risk)
4. Use targetSellPrice as baseline, but adjust for THEIR specific entry
5. Factor in market phase (${marketPhase} market affects timing)

CONFIDENCE CALIBRATION:
- 85-100%: All signals align, clear action, strong data
- 70-84%: Strong signals with minor concerns
- 50-69%: Mixed signals, moderate confidence  
- 30-49%: Weak signals or conflicting data
- Below 30%: High uncertainty, insufficient data

For each holding return JSON:
{
  "itemId": 123,
  "itemName": "Item Name",
  "action": "sell_asap|sell_soon|hold|hold_for_rebound",
  "confidence": 75,
  "expectedPrice": <targetSellPrice from signals, adjusted for position context>,
  "timeframe": "3-7 days|1-2 weeks|2-4 weeks|1-3 months",
  "reasoning": "Position-aware analysis: Entry quality, profit so far, reversion progress %, remaining upside vs risk, why this action now, market phase context",
  "reversionProgress": 65,
  "entryQuality": "excellent|good|fair|poor",
  "riskReward": "favorable|neutral|unfavorable"
}

Return JSON array. Base ALL decisions on THEIR specific position + REAL market data.`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.4,
      max_tokens: 2500,
      messages: [
        {
          role: 'system',
          content: 'You are an expert OSRS trading analyst specializing in mean-reversion position management. Provide data-driven, actionable advice for existing portfolio holdings. Focus on position-specific profit/loss analysis relative to entry prices.'
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = response.choices[0]?.message.content || '';
    
    console.log(`📝 AI Response preview: ${responseText.substring(0, 500)}...`);

    // Parse JSON from response
    let parsed: any[] = [];
    try {
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }

      const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
        console.log(`✅ Parsed ${parsed.length} items from AI response`);
        console.log(`📊 Sample: ${JSON.stringify(parsed[0])}`);
      }
    } catch (parseError) {
      console.error('Failed to parse portfolio advisor response:', parseError);
      console.error('Response text:', responseText);
    }

    // Merge with original holding data
    const actions: PortfolioAction[] = data.holdings.map((holding) => {
      const aiAdvice = parsed.find((p: any) => p.itemId === holding.itemId || p.itemName === holding.itemName) || {};

      return {
        itemId: holding.itemId,
        itemName: holding.itemName,
        action: aiAdvice.action || 'hold',
        confidence: aiAdvice.confidence || 50,
        expectedPrice: aiAdvice.expectedPrice || holding.currentPrice,
        timeframe: aiAdvice.timeframe || 'Unknown',
        reasoning: aiAdvice.reasoning || 'Awaiting analysis.',
      };
    });

    // Calculate summary stats (reuse totalValue and totalCost from above)
    const totalProfit = totalValue - totalCost;
    const profitPercent = ((totalProfit / totalCost) * 100).toFixed(1);

    // Count action distribution
    const actionCounts = {
      hold: actions.filter((a) => a.action === 'hold').length,
      sell_soon: actions.filter((a) => a.action === 'sell_soon').length,
      sell_asap: actions.filter((a) => a.action === 'sell_asap').length,
      hold_for_rebound: actions.filter((a) => a.action === 'hold_for_rebound').length,
    };

    // Log token usage
    const usage = response.usage;
    if (usage) {
      const inputCost = (usage.prompt_tokens / 1000) * 0.00015;
      const outputCost = (usage.completion_tokens / 1000) * 0.0006;
      const totalCost = inputCost + outputCost;
      const totalTokens = (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);
      console.log(`💰 Portfolio advisor: ${usage.prompt_tokens} in + ${usage.completion_tokens} out = ${totalTokens} tokens | Cost: $${totalCost.toFixed(4)}`);
    }

    console.log(`✅ Portfolio analysis complete: ${actionCounts.hold} hold, ${actionCounts.sell_soon} sell soon, ${actionCounts.sell_asap} sell ASAP, ${actionCounts.hold_for_rebound} rebound play`);

    return NextResponse.json({
      actions,
      summary: {
        totalHoldings: data.holdings.length,
        totalValue: Math.round(totalValue),
        totalCost: Math.round(totalCost),
        totalProfit: Math.round(totalProfit),
        profitPercent: parseFloat(profitPercent),
        actionDistribution: actionCounts,
      },
    });
  } catch (error) {
    console.error('❌ Portfolio advisor error:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze portfolio',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Portfolio Advisor API',
    description: 'POST with {holdings: [{itemId, itemName, quantity, costBasisPerUnit, currentPrice, datePurchased}]}',
  });
}
