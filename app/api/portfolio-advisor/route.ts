import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getItemHistoryWithVolumes } from '@/lib/api/osrs';
import { analyzeMeanReversionOpportunity } from '@/lib/meanReversionAnalysis';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
- Signals: confidence=${s.confidenceScore}%, potential=${s.reversionPotential.toFixed(1)}%, grade=${(s as any).investmentGrade}
- Risk: volatility=${s.volatilityRisk}, liquidity=${s.liquidityScore}, bot=${s.botLikelihood}
- Target: ${s.targetSellPrice}gp (would be ${h.targetPL.toFixed(1)}% profit from cost)`;
      })
      .join('\n\n');

    const prompt = `You are an elite OSRS portfolio advisor with access to REAL market data and mean-reversion analysis for each holding.

HOLDINGS WITH MARKET DATA:
${holdingsSummary}

For each item, determine the BEST action based on:

1. **SELL_ASAP** if:
   - Strong downtrend detected (negative deviation across timeframes)
   - Low confidence score (<40%) or declining signals
   - Already profitable and showing reversal signs
   - Cut losses if underwater with weak recovery signals

2. **SELL_SOON** if:
   - Near target price or showing resistance
   - Good profit secured (>15% from cost)
   - Moderate confidence but approaching peak

3. **HOLD** if:
   - Strong mean-reversion signal (high confidence, good potential)
   - Currently undervalued vs historical averages
   - High investment grade (A/A+/B+)
   - Target price not yet reached

4. **HOLD_FOR_REBOUND** if:
   - Currently underwater but strong recovery potential
   - High confidence score (>60%) despite being below cost
   - Mean-reversion signals indicate bounce coming

CRITICAL: Use the mean-reversion target prices as your basis. These are calculated from 365 days of real price history.

For each holding return JSON:
{
  "itemId": 123,
  "itemName": "Item Name",
  "action": "sell_asap|sell_soon|hold|hold_for_rebound",
  "confidence": 85,
  "expectedPrice": <use the targetSellPrice from signals, adjust only if you have strong reason>,
  "timeframe": "3-7 days|1-2 weeks|2-4 weeks|1-3 months",
  "reasoning": "Detailed explanation using the market data: current position vs averages, deviation signals, why this action, expected outcome"
}

Return JSON array. Base decisions on REAL DATA provided, not assumptions.`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 2000,
      messages: [
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

    // Calculate summary stats
    const totalValue = data.holdings.reduce((sum, h) => sum + h.currentPrice * h.quantity, 0);
    const totalCost = data.holdings.reduce((sum, h) => sum + h.costBasisPerUnit * h.quantity, 0);
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
      console.log(`💰 Portfolio advisor: ${usage.prompt_tokens} in + ${usage.completion_tokens} out = ${usage.total_tokens} tokens | Cost: $${totalCost.toFixed(4)}`);
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
