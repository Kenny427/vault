import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = 'nodejs';

interface TradeRecord {
  itemId: number;
  itemName: string;
  buyPrice: number;
  sellPrice: number;
  quantity: number;
  dateBought: string;
  dateSold: string;
  profit: number;
}

interface TradeAnalysisRequest {
  trades: TradeRecord[];
}

interface TradeAnalysis {
  itemId: number;
  itemName: string;
  profit: number;
  profitPercent: number;
  timingScore: number; // 0-100, how good was the timing
  executionFeedback: string; // Did you buy/sell at good prices?
  improvements: string; // What could've been done better
  lesson: string; // Key learning from this trade
}

export async function POST(req: NextRequest) {
  try {
    const data = (await req.json()) as TradeAnalysisRequest;

    if (!data.trades || data.trades.length === 0) {
      return NextResponse.json({
        analyses: [],
        summary: 'No trades to analyze.',
      });
    }

    console.log(`📊 [TRADE ANALYSIS] Analyzing ${data.trades.length} trades...`);

    // Build trade summary
    const tradesSummary = data.trades
      .map(
        (t) =>
          `${t.itemName} (ID:${t.itemId}): Buy ${t.buyPrice}gp (${t.dateBought}) -> Sell ${t.sellPrice}gp (${t.dateSold}), Qty=${t.quantity}, Profit=${t.profit.toLocaleString()}gp (${((t.sellPrice - t.buyPrice) / t.buyPrice * 100).toFixed(1)}%)`
      )
      .join('\n');

    const prompt = `You are an elite OSRS trader mentor. Analyze these completed trades and provide constructive feedback.

Trades:
${tradesSummary}

For EACH trade, provide JSON object with:
- timingScore: 0-100 (was entry/exit timing good?)
- executionFeedback: Brief assessment of buy/sell prices (e.g., "Good entry at 95% of average, could have waited for lower")
- improvements: Specific action for next time (e.g., "Wait for 20% dip before buying", "Sell on 5% bounce to lock gains faster")
- lesson: Key learning (e.g., "Patience on buys pays off", "Don't get greedy at resistance")

Return JSON array in this exact format:
[
  {"itemId": 123, "itemName": "Item", "timingScore": 75, "executionFeedback": "...", "improvements": "...", "lesson": "..."},
  ...
]

Be specific, actionable, and constructive. Focus on what they did right AND what to improve.`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 2500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = response.choices[0]?.message.content || '';

    // Parse JSON
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
      }
    } catch (parseError) {
      console.error('Failed to parse trade analysis response:', parseError);
    }

    // Merge with original trade data
    const analyses: TradeAnalysis[] = data.trades.map((trade) => {
      const aiAnalysis = parsed.find((p: any) => p.itemId === trade.itemId || p.itemName === trade.itemName) || {};

      return {
        itemId: trade.itemId,
        itemName: trade.itemName,
        profit: trade.profit,
        profitPercent: ((trade.sellPrice - trade.buyPrice) / trade.buyPrice) * 100,
        timingScore: aiAnalysis.timingScore || 50,
        executionFeedback: aiAnalysis.executionFeedback || 'Analysis pending.',
        improvements: aiAnalysis.improvements || 'No specific feedback.',
        lesson: aiAnalysis.lesson || 'Trade completed.',
      };
    });

    // Calculate summary stats
    const totalProfit = data.trades.reduce((sum, t) => sum + t.profit, 0);
    const totalQuantity = data.trades.reduce((sum, t) => sum + t.quantity, 0);
    const avgTimingScore = Math.round(analyses.reduce((sum, a) => sum + a.timingScore, 0) / analyses.length);
    const winRate = ((analyses.filter((a) => a.profit > 0).length / analyses.length) * 100).toFixed(1);

    // Log token usage
    const usage = response.usage;
    if (usage) {
      const inputCost = (usage.prompt_tokens / 1000) * 0.00015;
      const outputCost = (usage.completion_tokens / 1000) * 0.0006;
      const totalCost = inputCost + outputCost;
      console.log(`💰 Trade analysis: ${usage.prompt_tokens} in + ${usage.completion_tokens} out = ${usage.total_tokens} tokens | Cost: $${totalCost.toFixed(4)}`);
    }

    console.log(`✅ Trade analysis complete: ${data.trades.length} trades analyzed, $${totalProfit.toLocaleString()}gp profit, ${winRate}% win rate`);

    return NextResponse.json({
      analyses,
      summary: {
        totalTrades: data.trades.length,
        totalProfit: Math.round(totalProfit),
        totalQuantity,
        winRate: parseFloat(winRate),
        averageTimingScore: avgTimingScore,
        commonPatterns: generatePatterns(analyses),
      },
    });
  } catch (error) {
    console.error('❌ Trade analysis error:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze trades',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function generatePatterns(analyses: TradeAnalysis[]): string[] {
  const patterns: string[] = [];

  // Identify patterns
  const lowTimingTrades = analyses.filter((a) => a.timingScore < 50);
  if (lowTimingTrades.length > analyses.length * 0.5) {
    patterns.push('⚠️ Timing needs work - consider waiting for more extreme price movements');
  }

  const highTimingTrades = analyses.filter((a) => a.timingScore >= 80);
  if (highTimingTrades.length > analyses.length * 0.5) {
    patterns.push('✅ Excellent timing - you have a good sense of when to enter/exit');
  }

  const breakEven = analyses.filter((a) => a.profitPercent < 2 && a.profitPercent > -2);
  if (breakEven.length > 0) {
    patterns.push(`⚠️ ${breakEven.length} trades near break-even - tighten your stops or wait for bigger moves`);
  }

  return patterns.length > 0 ? patterns : ['Trade history shows mixed results - keep refining your strategy'];
}

export async function GET() {
  return NextResponse.json({
    message: 'Trade History Analysis API',
    description: 'POST with {trades: [{itemId, itemName, buyPrice, sellPrice, quantity, dateBought, dateSold, profit}]}',
  });
}
