import OpenAI from 'openai';
import { FlipOpportunity, PricePoint } from './analysis';

// Lazy-loaded OpenAI client - only initialized when needed
let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return client;
}

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
  // Get lazy-loaded client
  const aiClient = getClient();

  // Check cache
  const cacheKey = items.map(i => i.id).sort().join(',');
  const cached = analysisCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('Using cached AI analysis results');
    return cached.data;
  }

  // Calculate multi-timeframe statistics with advanced metrics
  const itemsData = items.map(item => {
    const calcStats = (history: PricePoint[]) => {
      const prices = history.map(p => p.price);
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const volatility = ((max - min) / avg) * 100;
      
      // Calculate standard deviation for volatility quality
      const variance = prices.reduce((sum, price) => sum + Math.pow(price - avg, 2), 0) / prices.length;
      const stdDev = Math.sqrt(variance);
      
      // Calculate momentum (recent vs older prices)
      const recentPrices = prices.slice(-7); // Last 7 data points
      const olderPrices = prices.slice(0, 7); // First 7 data points
      const recentAvg = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
      const olderAvg = olderPrices.reduce((a, b) => a + b, 0) / olderPrices.length;
      const momentum = ((recentAvg - olderAvg) / olderAvg) * 100;
      
      return { avg, min, max, volatility, stdDev, momentum };
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

    // Calculate price position within range (percentile)
    const pricePercentile30 = ((item.currentPrice - stats30.min) / (stats30.max - stats30.min)) * 100;
    const pricePercentile365 = ((item.currentPrice - stats365.min) / (stats365.max - stats365.min)) * 100;

    // Calculate support/resistance levels
    const supportLevel365 = stats365.avg - stats365.stdDev;
    const resistanceLevel365 = stats365.avg + stats365.stdDev;
    const nearSupport = item.currentPrice <= supportLevel365;
    const nearResistance = item.currentPrice >= resistanceLevel365;

    // Calculate recovery potential
    const recoveryPotential = ((stats365.avg - item.currentPrice) / item.currentPrice) * 100;
    
    // Calculate consistency (lower std dev relative to avg = more stable)
    const consistency30 = (1 - (stats30.stdDev / stats30.avg)) * 100;
    const consistency365 = (1 - (stats365.stdDev / stats365.avg)) * 100;

    // Detect potential manipulation or crashes
    const extremeVolatility = stats30.volatility > 50;
    const priceCollapse = item.currentPrice < stats365.avg * 0.7; // 30%+ below yearly avg
    const priceSurge = item.currentPrice > stats365.avg * 1.3; // 30%+ above yearly avg

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
          stdDev: stats30.stdDev.toFixed(0),
          momentum: stats30.momentum.toFixed(2),
          deviation: (((item.currentPrice - stats30.avg) / stats30.avg) * 100).toFixed(2),
          consistency: consistency30.toFixed(1),
        },
        '90d': {
          avg: stats90.avg.toFixed(0),
          min: stats90.min,
          max: stats90.max,
          volatility: stats90.volatility.toFixed(1),
          stdDev: stats90.stdDev.toFixed(0),
          momentum: stats90.momentum.toFixed(2),
          deviation: (((item.currentPrice - stats90.avg) / stats90.avg) * 100).toFixed(2),
        },
        '180d': {
          avg: stats180.avg.toFixed(0),
          min: stats180.min,
          max: stats180.max,
          volatility: stats180.volatility.toFixed(1),
          stdDev: stats180.stdDev.toFixed(0),
          momentum: stats180.momentum.toFixed(2),
          deviation: (((item.currentPrice - stats180.avg) / stats180.avg) * 100).toFixed(2),
        },
        '365d': {
          avg: stats365.avg.toFixed(0),
          min: stats365.min,
          max: stats365.max,
          volatility: stats365.volatility.toFixed(1),
          stdDev: stats365.stdDev.toFixed(0),
          momentum: stats365.momentum.toFixed(2),
          deviation: (((item.currentPrice - stats365.avg) / stats365.avg) * 100).toFixed(2),
          consistency: consistency365.toFixed(1),
        },
      },
      trendAnalysis: {
        direction: trendDirection,
        strength: trendStrength.toFixed(1),
        pricePercentile30: pricePercentile30.toFixed(0),
        pricePercentile365: pricePercentile365.toFixed(0),
      },
      technicalIndicators: {
        supportLevel: supportLevel365.toFixed(0),
        resistanceLevel: resistanceLevel365.toFixed(0),
        nearSupport: nearSupport,
        nearResistance: nearResistance,
        recoveryPotential: recoveryPotential.toFixed(2),
        extremeVolatility: extremeVolatility,
        priceCollapse: priceCollapse,
        priceSurge: priceSurge,
      },
    };
  });

  const prompt = `You are an ELITE OSRS Grand Exchange trading analyst with DEEP market knowledge. Your expertise: identifying hidden value, market manipulation, seasonal patterns, and asymmetric risk/reward opportunities.

MISSION: Find SOLID flip opportunities (short & long-term) that will ACTUALLY make profit. Be ruthless - only recommend trades with strong fundamental backing.

=== ANALYSIS FRAMEWORK ===

ITEMS DATA:
${itemsData.map(item => `
━━━ [${item.name}] (ID: ${item.id}) ━━━
💰 CURRENT: ${item.currentPrice}gp

📊 MULTI-TIMEFRAME ANALYSIS:
30d:  Avg=${item.timeframes['30d'].avg}gp | Range=${item.timeframes['30d'].min}-${item.timeframes['30d'].max} | Vol=${item.timeframes['30d'].volatility}% | Momentum=${item.timeframes['30d'].momentum}% | StdDev=${item.timeframes['30d'].stdDev} | Consistency=${item.timeframes['30d'].consistency}%
90d:  Avg=${item.timeframes['90d'].avg}gp | Range=${item.timeframes['90d'].min}-${item.timeframes['90d'].max} | Vol=${item.timeframes['90d'].volatility}% | Momentum=${item.timeframes['90d'].momentum}% | StdDev=${item.timeframes['90d'].stdDev}
180d: Avg=${item.timeframes['180d'].avg}gp | Range=${item.timeframes['180d'].min}-${item.timeframes['180d'].max} | Vol=${item.timeframes['180d'].volatility}% | Momentum=${item.timeframes['180d'].momentum}% | StdDev=${item.timeframes['180d'].stdDev}
365d: Avg=${item.timeframes['365d'].avg}gp | Range=${item.timeframes['365d'].min}-${item.timeframes['365d'].max} | Vol=${item.timeframes['365d'].volatility}% | Momentum=${item.timeframes['365d'].momentum}% | StdDev=${item.timeframes['365d'].stdDev} | Consistency=${item.timeframes['365d'].consistency}%

📈 TREND ANALYSIS:
Direction: ${item.trendAnalysis.direction} | Strength: ${item.trendAnalysis.strength}%
Price Position: ${item.trendAnalysis.pricePercentile30}th percentile (30d) | ${item.trendAnalysis.pricePercentile365}th percentile (365d)

🎯 TECHNICAL INDICATORS:
Support Level: ${item.technicalIndicators.supportLevel}gp | Resistance: ${item.technicalIndicators.resistanceLevel}gp
Near Support: ${item.technicalIndicators.nearSupport ? 'YES ✓' : 'NO'} | Near Resistance: ${item.technicalIndicators.nearResistance ? 'YES ✓' : 'NO'}
Recovery Potential: ${item.technicalIndicators.recoveryPotential}%
Extreme Volatility: ${item.technicalIndicators.extremeVolatility ? 'WARNING ⚠' : 'Normal'}
Price Collapse: ${item.technicalIndicators.priceCollapse ? 'CRASHED 📉' : 'Normal'} | Price Surge: ${item.technicalIndicators.priceSurge ? 'SURGING 📈' : 'Normal'}
`).join('\n')}

=== YOUR EXPERT ANALYSIS CRITERIA ===

✅ STRONG BUY SIGNALS (look for these):
1. Price near/below support level + positive momentum building
2. Currently in bottom 20th percentile of 365d range but top 50% historically
3. Price crashed 20%+ below yearly average BUT consistency score is high (stable item recovering)
4. Momentum turning positive across multiple timeframes (30d/90d/180d all positive)
5. Low volatility items with sudden dips (likely manipulation/panic sell - will recover)
6. High consistency + currently undervalued = mean reversion play
7. Seasonal recovery patterns (e.g., dipped for 3+ months, now showing reversal)

✅ STRONG SELL SIGNALS (look for these):
1. Price near/above resistance + negative momentum
2. Currently in top 20th percentile of 365d range (overbought)
3. Price 20%+ above yearly average with declining momentum
4. Extreme volatility + price surge = bubble/manipulation peak
5. Negative momentum across all timeframes = trend reversal

❌ AVOID (skip these):
- Flat momentum across all timeframes (stagnant/dead items)
- Extreme volatility with no clear pattern (too risky)
- Items with consistently declining averages across all timeframes (dying items)
- Price exactly at all timeframe averages (no edge)

=== ADVANCED STRATEGIES ===

SHORT-TERM FLIPS (2-7 days):
- Focus on: Support bounces, oversold conditions (bottom 15th percentile), positive 30d momentum
- Target: 5-15% profit, high volume items

MEDIUM-TERM TRADES (1-4 weeks):  
- Focus on: Mean reversion, recovery from crashes, building momentum
- Target: 15-40% profit, items with high consistency scores

LONG-TERM INVESTMENTS (1-3 months):
- Focus on: Massively undervalued (30%+ below 365d avg), seasonal patterns, fundamental recovery
- Target: 40%+ profit, quality items with proven recovery history

=== OUTPUT FORMAT ===

For EACH solid opportunity (minimum 45% confidence for short-term, 40% for long-term), return JSON:
{
  "itemId": number,
  "recommendation": "buy" | "sell",
  "confidence": number (55-100, be realistic),
  "timeframe": "short-term" | "medium-term" | "long-term",
  "reasoning": "Detailed multi-factor explanation citing specific data (max 60 words)"
}

RESPOND ONLY WITH VALID JSON ARRAY:
[
  {
    "itemId": 123,
    "recommendation": "buy",
    "confidence": 78,
    "timeframe": "medium-term",
    "reasoning": "Price at support (4200gp) 25% below 365d avg. Positive momentum building (30d +8%, 90d +3%). High consistency (82%) indicates stable recovery. Near bottom 12th percentile - strong mean reversion setup."
  }
]

If NO quality opportunities found, return: []

BE SELECTIVE. Quality > Quantity. Only recommend trades YOU would take with YOUR money.`;

  try {
    const message = await aiClient.chat.completions.create({
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
        const prices90 = item.history90.map(p => p.price);
        const prices180 = item.history180.map(p => p.price);
        const prices365 = item.history365.map(p => p.price);
        
        const avg30 = prices30.reduce((a, b) => a + b, 0) / prices30.length;
        const avg90 = prices90.reduce((a, b) => a + b, 0) / prices90.length;
        const avg180 = prices180.reduce((a, b) => a + b, 0) / prices180.length;
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
          averagePrice30: avg30,
          averagePrice90: avg90,
          averagePrice180: avg180,
          averagePrice365: avg365,
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
