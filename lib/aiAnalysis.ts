import OpenAI from 'openai';
import { FlipOpportunity, PricePoint } from './analysis';
import type { MeanReversionSignal } from '@/lib/meanReversionAnalysis';


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

  const prompt = `OSRS mean-reversion analyzer. Find items 10-30% below 90d/365d avg with recovery potential.

INCLUDE if ANY apply:
- 10%+ below 90d avg (bounce likely)
- 15%+ below 365d avg (not in downtrend)
- Bottom 30% of range + consistency >70%

SKIP only if:
- Declining across all timeframes (structural decline)
- Bottom 5% + no recovery history
- Erratic data (anomaly)

Format: ID|Name|Cur|Avg[30/90/365]|Dev[30/365]%|Vol|Pctl[30/365]|Sup|Res|RecPot%|Trend|Risk

${itemsData.map(item => `${item.id}|${item.name}|${item.currentPrice}|${item.timeframes['30d'].avg}/${item.timeframes['90d'].avg}/${item.timeframes['365d'].avg}|${item.timeframes['30d'].deviation}/${item.timeframes['365d'].deviation}|${item.timeframes['365d'].volatility}%|${item.trendAnalysis.pricePercentile30}/${item.trendAnalysis.pricePercentile365}|${item.technicalIndicators.supportLevel}|${item.technicalIndicators.resistanceLevel}|${item.technicalIndicators.recoveryPotential}|${item.trendAnalysis.direction}|${item.technicalIndicators.extremeVolatility ? 'high' : item.technicalIndicators.priceCollapse ? 'crash' : item.technicalIndicators.priceSurge ? 'surge' : 'normal'}`).join('\n')}

Return JSON (include borderline cases, min conf 25%):
[{"itemId":123,"recommendation":"buy","confidence":72,"timeframe":"medium-term","reasoning":"brief reason"}]`;

  try {
    const message = await aiClient.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0,
      max_tokens: 1200, // Reduced from 2000 - compressed format
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
      console.warn('AI response text:', responseText.substring(0, 500));
      return [];
    }

    const aiAnalysis = JSON.parse(jsonMatch[0]);
    console.log(`AI Analysis: Parsed ${aiAnalysis.length} opportunities from response`);

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

        let aiReasoning = analysis.strategicNarrative;
        if (analysis.recommendation === 'buy') {
          // Buy low, estimate selling at average or higher
          buyPrice = Math.round(item.currentPrice * 0.99);
          const targetAvg = analysis.timeframe === 'long-term' ? avg365 : avg30;
          let calcTarget = Math.round(targetAvg * 1.02);
          // If current price is at or above the target, recommend selling now
          if (item.currentPrice >= calcTarget) {
            sellPrice = item.currentPrice;
            aiReasoning = `Current price (${item.currentPrice}) is at or above the calculated target (${calcTarget}). Recommend selling now.`;
          } else {
            sellPrice = calcTarget;
          }
        } else if (analysis.recommendation === 'sell') {
          // Sell high, estimate bought lower
          buyPrice = Math.round(item.currentPrice * 0.98);
          let calcTarget = Math.round(item.currentPrice * 0.99);
          // If current price is at or above the target, recommend selling now
          if (item.currentPrice >= calcTarget) {
            sellPrice = item.currentPrice;
            aiReasoning = `Current price (${item.currentPrice}) is at or above the calculated target (${calcTarget}). Recommend selling now.`;
          } else {
            sellPrice = calcTarget;
          }
        }

        const profitPerUnit = Math.max(0, Math.round(sellPrice - buyPrice - Math.floor(sellPrice * GE_TAX)));
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
          buyWhen: `AI: ${aiReasoning}`,
          sellWhen: `Target reached or trend reversal`,
          momentum: 0,
          acceleration: 0,
          tradingRange: volatility,
          consistency: Math.min(100, volatility / 2),
          spreadQuality: 60,
        };
      })
      .filter((op: any): op is FlipOpportunity => op !== null);

    // FALLBACK: Add items that meet basic discount criteria but weren't included by AI
    // This ensures we don't miss obvious opportunities if AI is being too conservative
    const aiItemIds = new Set(opportunities.map(o => o.itemId));
    const fallbackOpps: FlipOpportunity[] = items
      .filter(item => !aiItemIds.has(item.id))
      .map(item => {
        const prices30 = item.history30.map(p => p.price);
        const prices90 = item.history90.map(p => p.price);
        const prices365 = item.history365.map(p => p.price);
        
        const avg30 = prices30.reduce((a, b) => a + b, 0) / prices30.length;
        const avg90 = prices90.reduce((a, b) => a + b, 0) / prices90.length;
        const avg365 = prices365.reduce((a, b) => a + b, 0) / prices365.length;
        const min365 = Math.min(...prices365);
        const max365 = Math.max(...prices365);
        
        const deviation90 = ((item.currentPrice - avg90) / avg90) * 100;
        const deviation365 = ((item.currentPrice - avg365) / avg365) * 100;
        
        // Include if:
        // - 8%+ below 90d average, OR
        // - 12%+ below 365d average
        const qualifies = deviation90 < -8 || deviation365 < -12;
        
        if (!qualifies) return null;
        
        const volatility = ((max365 - min365) / avg365) * 100;
        const GE_TAX = 0.02;
        const buyPrice = Math.round(item.currentPrice * 0.99);
        const targetAvg = deviation365 < -25 ? avg365 : avg90;
        const sellPrice = Math.round(targetAvg * 1.02);
        const profitPerUnit = Math.max(0, Math.round(sellPrice - buyPrice - Math.floor(sellPrice * GE_TAX)));
        const roi = buyPrice > 0 ? ((profitPerUnit / buyPrice) * 100) : 0;
        
        // Confidence based on discount depth
        const confidence = Math.min(85, Math.max(30, Math.abs(deviation365) * 1.5));
        
        return {
          itemId: item.id,
          itemName: item.name,
          currentPrice: item.currentPrice,
          averagePrice: avg365,
          averagePrice30: avg30,
          averagePrice90: avg90,
          averagePrice180: avg365,
          averagePrice365: avg365,
          deviation: deviation365,
          deviationScore: (((item.currentPrice - avg365) / Math.sqrt(volatility)) * 10) || 0,
          trend: item.currentPrice < avg365 ? 'bearish' : 'bullish',
          recommendation: 'buy',
          opportunityScore: Math.min(85, Math.max(40, Math.abs(deviation365) * 1.2)),
          historicalLow: min365,
          historicalHigh: max365,
          buyPrice,
          sellPrice,
          profitPerUnit,
          profitMargin: buyPrice > 0 ? ((profitPerUnit / buyPrice) * 100) : 0,
          roi,
          riskLevel: confidence > 70 ? 'medium' : 'high',
          confidence: Math.round(confidence),
          estimatedHoldTime: Math.abs(deviation365) > 25 ? '2-8 weeks' : '1-4 weeks',
          volatility,
          volumeScore: 100,
          buyWhen: `Fallback: ${Math.abs(deviation365).toFixed(0)}% below 365d avg (${Math.round(avg365)}gp). Has bounced before, likely recovery.`,
          sellWhen: `Target reached or trend reversal`,
          momentum: 0,
          acceleration: 0,
          tradingRange: volatility,
          consistency: Math.min(100, volatility / 2),
          spreadQuality: 60,
        };
      })
      .filter((op): op is FlipOpportunity => op !== null);
    
    console.log(`Fallback added ${fallbackOpps.length} items not found by AI`);
    const allOpps = [...opportunities, ...fallbackOpps]
      .sort((a, b) => b.opportunityScore - a.opportunityScore);

    // Cache results
    analysisCache.set(cacheKey, { data: allOpps, timestamp: Date.now() });

    return allOpps;
  } catch (error) {
    console.error('AI analysis failed:', error);
    throw error;
  }
}

export function clearAnalysisCache() {
  analysisCache.clear();
}

export interface PoolAIReview {
  add: string[];
  remove: string[];
  notes: string[];
}

export async function analyzePoolWithAI(items: string[]): Promise<PoolAIReview> {
  const aiClient = getClient();

  if (items.length === 0) {
    return { add: [], remove: [], notes: ['Pool is empty. Add core trading items first.'] };
  }

  const trimmed = items.map(item => item.trim()).filter(Boolean);
  const prompt = `You are an expert OSRS GE trader. Review this item pool for flip analysis and suggest improvements.

POOL (${trimmed.length} items):
${trimmed.map((item, i) => `${i + 1}. ${item}`).join('\n')}

Goals:
- Recommend up to 12 items to ADD that are liquid, commonly flipped, and stable enough for meaningful spreads.
- Recommend up to 12 items to REMOVE if they are low-liquidity, too niche, or too unstable.
- Provide brief notes (max 5) about pool balance and categories to improve.

Return valid JSON only:
{
  "add": ["item name", "item name"],
  "remove": ["item name", "item name"],
  "notes": ["note", "note"]
}`;

  try {
    const completion = await aiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    return {
      add: Array.isArray(result.add) ? result.add : [],
      remove: Array.isArray(result.remove) ? result.remove : [],
      notes: Array.isArray(result.notes) ? result.notes : [],
    };
  } catch (error) {
    console.error('AI pool review failed:', error);
    throw error;
  }
}

// Portfolio AI Review - analyzes all holdings in one batch
export interface PortfolioAIReview {
  itemId: number;
  itemName: string;
  quantity: number;
  buyPrice: number;
  currentPrice: number;
  unrealizedPL: number;
  recommendation: 'HOLD' | 'SELL_NOW' | 'SELL_SOON' | 'WATCH_CLOSELY' | 'GOOD_POSITION';
  reasoning: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  suggestedAction: string;
  exitPrice?: number;
}

export interface PortfolioSummaryAI {
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  diversificationScore: number; // 0-100
  recommendations: string[];
  warnings: string[];
  items: PortfolioAIReview[];
}

interface EnrichedPortfolioItem {
  itemId: number;
  itemName: string;
  quantity: number;
  buyPrice: number;
  currentPrice: number;
  datePurchased: string;
  unrealizedPL: number;
  percentChange: number;
  hasData: boolean;
  signal?: MeanReversionSignal;
}

export async function analyzePortfolioWithAI(
  portfolioItems: Array<{
    itemId: number;
    itemName: string;
    quantity: number;
    buyPrice: number;
    currentPrice: number;
    datePurchased: string;
  }>
): Promise<PortfolioSummaryAI> {

  const aiClient = getClient();

  if (portfolioItems.length === 0) {
    return {
      overallRisk: 'LOW',
      diversificationScore: 100,
      recommendations: ['Your portfolio is empty. Start adding investments to track.'],
      warnings: [],
      items: [],
    };
  }

  // Fetch 365 days of real market data for each item
  console.log(`📊 Fetching market data for ${portfolioItems.length} portfolio items...`);
  const { getItemHistoryWithVolumes } = await import('@/lib/api/osrs');
  const { analyzeMeanReversionOpportunity } = await import('@/lib/meanReversionAnalysis');

    const enrichedItems: EnrichedPortfolioItem[] = await Promise.all(
    portfolioItems.map(async (item) => {

      const unrealizedPL = (item.currentPrice * 0.98 - item.buyPrice) * item.quantity;
      const percentChange = ((item.currentPrice - item.buyPrice) / item.buyPrice) * 100;
      
      try {
        // Fetch 365 days of price history
        const priceData = await getItemHistoryWithVolumes(item.itemId, 365 * 24 * 60 * 60);
        
        if (!priceData || priceData.length < 30) {
          return {
            ...item,
            unrealizedPL,
            percentChange,
            hasData: false,
          };
        }


        // Analyze mean-reversion signals (always use latest price from priceData)
        const signal = await analyzeMeanReversionOpportunity(
          item.itemId,
          item.itemName,
          priceData
        );

                return {
          ...item,
          unrealizedPL,
          percentChange,
          hasData: true,
          ...(signal ? { signal } : {}),
        };

      } catch (error) {
        console.error(`Failed to fetch data for ${item.itemName}:`, error);
        return {
          ...item,
          unrealizedPL,
          percentChange,
          hasData: false,
        };
      }
    })
  );

  const itemsWithData = enrichedItems.filter(item => item.hasData);
  console.log(`✅ Enriched ${itemsWithData.length}/${portfolioItems.length} items with market data`);

  const prompt = `You are an elite OSRS portfolio analyst with access to 365 days of REAL market data, mean-reversion analysis, and advanced trading signals for each holding.

PORTFOLIO (${portfolioItems.length} items):
${enrichedItems.map((item, i) => {
  const baseInfo = `${i + 1}. ${item.itemName}
   - Position: Qty=${item.quantity.toLocaleString()}, Buy=${item.buyPrice.toLocaleString()}gp, Current=${item.currentPrice.toLocaleString()}gp
   - Unrealized P/L: ${item.unrealizedPL >= 0 ? '+' : ''}${Math.round(item.unrealizedPL).toLocaleString()}gp (${item.percentChange.toFixed(1)}%)
   - Held Since: ${new Date(item.datePurchased).toLocaleDateString()}`;
  if (item.hasData && item.signal) {
    const s = item.signal;
    return `${baseInfo}
   - Market Data:
      7d_avg=${Math.round(s.shortTerm.avgPrice)}gp, 30d_avg=${Math.round(s.shortTerm.avgPrice)}gp, 90d_avg=${Math.round(s.mediumTerm.avgPrice)}gp, 180d_avg=?, 365d_avg=${Math.round(s.longTerm.avgPrice)}gp
      7d_vol=${s.shortTerm.volatility.toFixed(1)}, 30d_vol=?, 90d_vol=${s.mediumTerm.volatility.toFixed(1)}, 365d_vol=${s.longTerm.volatility.toFixed(1)}
      7d_volAvg=${s.shortTerm.volumeAvg.toFixed(1)}, 90d_volAvg=${s.mediumTerm.volumeAvg.toFixed(1)}, 365d_volAvg=${s.longTerm.volumeAvg.toFixed(1)}
   - Deviation: 7d=${s.shortTerm.currentDeviation.toFixed(1)}%, 90d=${s.mediumTerm.currentDeviation.toFixed(1)}%, 365d=${s.longTerm.currentDeviation.toFixed(1)}%, max=${s.maxDeviation.toFixed(1)}%
   - Reversion Potential: ${s.reversionPotential.toFixed(1)}%
   - Confidence: ${s.confidenceScore}%
   - Risk: volatility=${s.volatilityRisk}, liquidity=${s.liquidityScore}, bot=${s.botLikelihood}, supplyStability=${s.supplyStability}
   - Suggested Investment: ${s.suggestedInvestment}gp
   - Target Sell Price: ${s.targetSellPrice}gp
   - Stop Loss: ${s.stopLoss}gp
   - Reasoning: ${s.strategicNarrative}`;
  }
  return `${baseInfo}
   - Market Data: LIMITED (no historical data available)`;
}).join('\n\n')}

Analyze each item using ALL the data above (price/volume/volatility stats, deviations, risk, liquidity, bot, trend signals, historical min/max, recent trend, holding period, realized P/L, etc). Predict future price action and give the most actionable, data-driven advice possible.

For EACH item, provide:
1. Recommendation: HOLD, SELL_NOW, SELL_SOON, WATCH_CLOSELY, or GOOD_POSITION
2. Risk Level: LOW, MEDIUM, HIGH, or CRITICAL
3. Reasoning: Use the market data - current vs averages, deviation signals, confidence, trends, and any other relevant signals
4. Suggested Action: Exit price based on mean-reversion target or specific conditions

For items with LIMITED data, make conservative recommendations.

For the overall portfolio:
- Overall Risk Level (based on aggregate signals)
- Diversification Score (0-100)
- Top 3 Recommendations (data-driven)
- Critical Warnings (based on negative trends, high risk signals)

Return valid JSON only:
{
  "overallRisk": "LOW|MEDIUM|HIGH|CRITICAL",
  "diversificationScore": 85,
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "warnings": ["warning 1", "warning 2"],
  "items": [
    {
      "itemId": ${portfolioItems[0].itemId},
      "itemName": "${portfolioItems[0].itemName}",
      "quantity": ${portfolioItems[0].quantity},
      "buyPrice": ${portfolioItems[0].buyPrice},
      "currentPrice": ${portfolioItems[0].currentPrice},
      "unrealizedPL": ${enrichedItems[0].unrealizedPL},
      "recommendation": "HOLD|SELL_NOW|SELL_SOON|WATCH_CLOSELY|GOOD_POSITION",
      "reasoning": "Brief explanation",
      "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
      "suggestedAction": "Specific action",
      "exitPrice": 12345
    }
  ]
}`;

  try {
    const completion = await aiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    return result as PortfolioSummaryAI;
  } catch (error) {
    console.error('Portfolio AI analysis failed:', error);
    throw error;
  }
}

