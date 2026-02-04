import OpenAI from 'openai';
import { FlipOpportunity, PricePoint } from './analysis';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Cache AI analysis results - longer duration to prevent API spam
const analysisCache = new Map<string, { data: FlipOpportunity[]; timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes - prevents expensive API spam

export interface TimeframeAnalysis {
  period: string;
  days: number;
  average: number;
  min: number;
  max: number;
  volatility: number;
  trend: string;
}

export async function analyzeFlipsWithAI(
  items: Array<{
    id: number;
    name: string;
    currentPrice: number;
    history30: PricePoint[];
    history90: PricePoint[];
    history180: PricePoint[];
    history365: PricePoint[];
  }>
): Promise<FlipOpportunity[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  // Check cache
  const cacheKey = items.map(i => i.id).sort().join(',');
  const cached = analysisCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('Using cached AI analysis results');
    return cached.data;
  }

  // Calculate multi-timeframe statistics
  const itemsData = items.map(item => {
    const calcStats = (history: PricePoint[]) => {
      const prices = history.map(p => p.price);
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const volatility = ((max - min) / avg) * 100;
      return { avg, min, max, volatility };
    };

    const stats30 = calcStats(item.history30);
    const stats90 = calcStats(item.history90);
    const stats180 = calcStats(item.history180);
    const stats365 = calcStats(item.history365);

    // Calculate long-term trend
    const longTermAvg = stats365.avg;
    const recentAvg = stats30.avg;
    const trendDirection = recentAvg < longTermAvg ? 'downward' : 'upward';
    const trendStrength = Math.abs((recentAvg - longTermAvg) / longTermAvg) * 100;

    // Calculate if price is at extremes
    const pricePercentile30 = ((item.currentPrice - stats30.min) / (stats30.max - stats30.min)) * 100;
    const pricePercentile365 = ((item.currentPrice - stats365.min) / (stats365.max - stats365.min)) * 100;

    return {
      id: item.id,
      name: item.name,
      currentPrice: item.currentPrice,
      timeframes: {
        '30d': {
          avg: stats30.avg.toFixed(0),
          min: stats30.min,
          max: stats30.max,
          volatility: stats30.volatility.toFixed(1),
          deviation: (((item.currentPrice - stats30.avg) / stats30.avg) * 100).toFixed(2),
        },
        '90d': {
          avg: stats90.avg.toFixed(0),
          min: stats90.min,
          max: stats90.max,
          volatility: stats90.volatility.toFixed(1),
          deviation: (((item.currentPrice - stats90.avg) / stats90.avg) * 100).toFixed(2),
        },
        '180d': {
          avg: stats180.avg.toFixed(0),
          min: stats180.min,
          max: stats180.max,
          volatility: stats180.volatility.toFixed(1),
          deviation: (((item.currentPrice - stats180.avg) / stats180.avg) * 100).toFixed(2),
        },
        '365d': {
          avg: stats365.avg.toFixed(0),
          min: stats365.min,
          max: stats365.max,
          volatility: stats365.volatility.toFixed(1),
          deviation: (((item.currentPrice - stats365.avg) / stats365.avg) * 100).toFixed(2),
        },
      },
      trendAnalysis: {
        direction: trendDirection,
        strength: trendStrength.toFixed(1),
        pricePercentile30: pricePercentile30.toFixed(0),
        pricePercentile365: pricePercentile365.toFixed(0),
      },
    };
  });

  const prompt = `You are an OSRS (Old School RuneScape) Grand Exchange trading EXPERT. Your job is to find AGGRESSIVE flip opportunities across multiple timeframes. Be overpowered - suggest even medium-confidence trades.

Analyze these items using 30, 90, 180, and 365-day price data. Account for seasonal trends, botting farm impacts, and long-term price cycles.

ITEMS TO ANALYZE:
${itemsData.map(item => `
[${item.name}] (ID: ${item.id})
Current Price: ${item.currentPrice}gp

30-DAY:  Avg=${item.timeframes['30d'].avg}gp, Range=${item.timeframes['30d'].min}-${item.timeframes['30d'].max}, Vol=${item.timeframes['30d'].volatility}%, Dev=${item.timeframes['30d'].deviation}%
90-DAY:  Avg=${item.timeframes['90d'].avg}gp, Range=${item.timeframes['90d'].min}-${item.timeframes['90d'].max}, Vol=${item.timeframes['90d'].volatility}%, Dev=${item.timeframes['90d'].deviation}%
180-DAY: Avg=${item.timeframes['180d'].avg}gp, Range=${item.timeframes['180d'].min}-${item.timeframes['180d'].max}, Vol=${item.timeframes['180d'].volatility}%, Dev=${item.timeframes['180d'].deviation}%
365-DAY: Avg=${item.timeframes['365d'].avg}gp, Range=${item.timeframes['365d'].min}-${item.timeframes['365d'].max}, Vol=${item.timeframes['365d'].volatility}%, Dev=${item.timeframes['365d'].deviation}%

Trend: ${item.trendAnalysis.direction} (${item.trendAnalysis.strength}%)
Position: ${item.trendAnalysis.pricePercentile30}th percentile (30d), ${item.trendAnalysis.pricePercentile365}th percentile (365d)
`).join('\n')}

ANALYSIS REQUIREMENTS:
- Identify items at historical EXTREMES across long timeframes
- Look for items BOTTOMED OUT (currently near yearly lows but historically higher)
- Find seasonal patterns (e.g., prices dip for 6+ months then recover)
- Detect items suppressed by botting that will recover
- Consider volatility: high volatility = more profit potential
- Aggressive = confidence 50+, even if short-term risky

For EACH item with a trade opportunity, respond with JSON:
{
  "itemId": number,
  "recommendation": "buy" | "sell" | "hold",
  "confidence": number (50-100, be aggressive),
  "timeframe": "short-term" | "medium-term" | "long-term",
  "reasoning": "detailed explanation of why (max 50 words)"
}

RESPOND ONLY WITH A VALID JSON ARRAY. Example:
[
  {
    "itemId": 123,
    "recommendation": "buy",
    "confidence": 75,
    "timeframe": "long-term",
    "reasoning": "Down 30% from 365d avg. Historical pattern shows recovery. Currently at 15th percentile."
  }
]

If no opportunities, return empty array: []`;

  try {
    const message = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = message.choices[0].message.content || '';

    // Parse AI response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('No JSON found in AI response');
      return [];
    }

    const aiAnalysis = JSON.parse(jsonMatch[0]);

    // Convert AI analysis to FlipOpportunity format
    const opportunities: FlipOpportunity[] = aiAnalysis
      .map((analysis: any) => {
        const item = items.find(i => i.id === analysis.itemId);
        if (!item) return null;

        // Get stats from appropriate timeframe
        const prices30 = item.history30.map(p => p.price);
        const prices365 = item.history365.map(p => p.price);
        
        const avg30 = prices30.reduce((a, b) => a + b, 0) / prices30.length;
        const avg365 = prices365.reduce((a, b) => a + b, 0) / prices365.length;
        const min365 = Math.min(...prices365);
        const max365 = Math.max(...prices365);
        const volatility = ((max365 - min365) / avg365) * 100;

        // Calculate trade prices based on recommendation
        const GE_TAX = 0.02;
        let buyPrice = item.currentPrice;
        let sellPrice = item.currentPrice;

        if (analysis.recommendation === 'buy') {
          // Buy low, estimate selling at average or higher
          buyPrice = Math.round(item.currentPrice * 0.99);
          const targetAvg = analysis.timeframe === 'long-term' ? avg365 : avg30;
          sellPrice = Math.round(targetAvg * 1.02);
        } else if (analysis.recommendation === 'sell') {
          // Sell high, estimate bought lower
          buyPrice = Math.round(item.currentPrice * 0.98);
          sellPrice = Math.round(item.currentPrice * 0.99);
        }

        const profitPerUnit = Math.max(0, Math.round(sellPrice - buyPrice - sellPrice * GE_TAX));
        const roi = buyPrice > 0 ? ((profitPerUnit / buyPrice) * 100) : 0;

        return {
          itemId: item.id,
          itemName: item.name,
          currentPrice: item.currentPrice,
          averagePrice: avg365,
          deviation: (((item.currentPrice - avg365) / avg365) * 100),
          deviationScore: (((item.currentPrice - avg365) / Math.sqrt(volatility)) * 10) || 0,
          trend: item.currentPrice < avg365 ? 'bearish' : 'bullish',
          recommendation: analysis.recommendation,
          opportunityScore: analysis.confidence,
          historicalLow: min365,
          historicalHigh: max365,
          buyPrice,
          sellPrice,
          profitPerUnit,
          profitMargin: buyPrice > 0 ? ((profitPerUnit / buyPrice) * 100) : 0,
          roi,
          riskLevel: analysis.confidence > 80 ? 'low' : analysis.confidence > 60 ? 'medium' : 'high',
          confidence: analysis.confidence,
          estimatedHoldTime: analysis.timeframe === 'long-term' ? '2-8 weeks' : analysis.timeframe === 'medium-term' ? '5-15 days' : '2-5 days',
          volatility,
          volumeScore: Math.min(100, volatility * 1.5),
          buyWhen: `AI: ${analysis.reasoning}`,
          sellWhen: `Target reached or trend reversal`,
          momentum: 0,
          acceleration: 0,
          tradingRange: volatility,
          consistency: Math.min(100, volatility / 2),
          spreadQuality: 60,
        };
      })
      .filter((op: any): op is FlipOpportunity => op !== null);

    // Cache results
    analysisCache.set(cacheKey, { data: opportunities, timestamp: Date.now() });

    return opportunities;
  } catch (error) {
    console.error('AI analysis failed:', error);
    throw error;
  }
}

export function clearAnalysisCache() {
  analysisCache.clear();
}
