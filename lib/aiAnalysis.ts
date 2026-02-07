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

  // Calculate portfolio-level metrics
  const totalValue = enrichedItems.reduce((sum, item) => sum + item.currentPrice * item.quantity, 0);
  const totalCost = enrichedItems.reduce((sum, item) => sum + item.buyPrice * item.quantity, 0);
  const portfolioPL = ((totalValue - totalCost) / totalCost) * 100;
  
  // Calculate concentration risk
  const largestPosition = Math.max(...enrichedItems.map(item => (item.currentPrice * item.quantity) / totalValue * 100));
  const concentrationRisk = largestPosition > 40 ? 'HIGH' : largestPosition > 25 ? 'MEDIUM' : 'LOW';

  // Assess market phase
  const avgDeviation = itemsWithData.reduce((sum, item) => 
    sum + (item.signal?.mediumTerm?.currentDeviation || 0), 0) / Math.max(itemsWithData.length, 1);
  const marketPhase = avgDeviation < -10 ? 'BEAR (prices below averages)' : 
                      avgDeviation > 10 ? 'BULL (prices above averages)' : 
                      'NEUTRAL';

  // Find oldest holding
  const holdings = enrichedItems.map(item => ({
    itemName: item.itemName,
    daysHeld: Math.floor((Date.now() - new Date(item.datePurchased).getTime()) / (1000 * 60 * 60 * 24))
  }));
  const oldestHolding = holdings.reduce((max, h) => h.daysHeld > max.daysHeld ? h : max, holdings[0]);

  const prompt = `You are an elite OSRS portfolio analyst with 365 days of REAL market data for each holding.

CRITICAL: These are EXISTING POSITIONS. Analyze based on THEIR entry prices and profit progress, not hypothetical new entries.

PORTFOLIO OVERVIEW:
- Total Holdings: ${portfolioItems.length} items
- Total Value: ${Math.round(totalValue).toLocaleString()}gp
- Total Cost: ${Math.round(totalCost).toLocaleString()}gp  
- Portfolio P/L: ${portfolioPL >= 0 ? '+' : ''}${portfolioPL.toFixed(1)}%
- Concentration Risk: ${concentrationRisk} (largest position: ${largestPosition.toFixed(1)}%)
- Market Phase: ${marketPhase}
- Oldest Position: ${oldestHolding.itemName} (${oldestHolding.daysHeld} days held)

INDIVIDUAL POSITIONS:
${enrichedItems.map((item, i) => {
  const daysHeld = Math.floor((Date.now() - new Date(item.datePurchased).getTime()) / (1000 * 60 * 60 * 24));
  const positionSize = item.currentPrice * item.quantity;
  const positionPercent = (positionSize / totalValue * 100).toFixed(1);
  const baseInfo = `${i + 1}. ${item.itemName} [ID:${item.itemId}]
   ═══ POSITION ═══
   - Size: ${item.quantity.toLocaleString()} units @ ${item.buyPrice.toLocaleString()}gp = ${Math.round(positionSize).toLocaleString()}gp (${positionPercent}% of portfolio)
   - Current Price: ${item.currentPrice.toLocaleString()}gp
   - Unrealized P/L: ${item.unrealizedPL >= 0 ? '+' : ''}${Math.round(item.unrealizedPL).toLocaleString()}gp (${item.percentChange >= 0 ? '+' : ''}${item.percentChange.toFixed(1)}%)
   - Held: ${daysHeld} days (since ${new Date(item.datePurchased).toLocaleDateString()})`;
  if (item.hasData && item.signal) {
    const s = item.signal;
    // Calculate position-specific metrics
    const reversionFromEntry = ((s.targetSellPrice - item.buyPrice) / item.buyPrice * 100).toFixed(1);
    const reversionProgress = item.buyPrice < s.targetSellPrice ? 
      ((item.currentPrice - item.buyPrice) / (s.targetSellPrice - item.buyPrice) * 100).toFixed(0) : '100';
    const entryQuality = item.buyPrice < s.longTerm.avgPrice * 0.90 ? 'EXCELLENT' :
                         item.buyPrice < s.longTerm.avgPrice * 0.95 ? 'GOOD' :
                         item.buyPrice < s.longTerm.avgPrice * 1.0 ? 'FAIR' : 'POOR';
    const upsideToTarget = ((s.targetSellPrice - item.currentPrice) / item.currentPrice * 100).toFixed(1);
    const downToStopLoss = ((item.currentPrice - s.stopLoss) / item.currentPrice * 100).toFixed(1);
    
    return `${baseInfo}
   
   ═══ POSITION ANALYSIS ═══
   - Entry Quality: ${entryQuality} (bought ${item.buyPrice < s.longTerm.avgPrice ? 'BELOW' : 'ABOVE'} 365d avg of ${Math.round(s.longTerm.avgPrice)}gp)
   - Reversion Progress: ${reversionProgress}% complete (target is ${reversionFromEntry}% gain from entry)
   - Risk/Reward: ${upsideToTarget}% upside to target vs ${downToStopLoss}% down to stop-loss
   
   ═══ MARKET INTELLIGENCE (365 days) ═══
   - Price Levels: 7d avg=${Math.round(s.shortTerm.avgPrice)}gp | 90d avg=${Math.round(s.mediumTerm.avgPrice)}gp | 365d avg=${Math.round(s.longTerm.avgPrice)}gp
   - Deviations: 7d=${s.shortTerm.currentDeviation.toFixed(1)}% | 90d=${s.mediumTerm.currentDeviation.toFixed(1)}% | 365d=${s.longTerm.currentDeviation.toFixed(1)}%
   - Volatility: 7d=${s.shortTerm.volatility.toFixed(0)} | 90d=${s.mediumTerm.volatility.toFixed(0)} | 365d=${s.longTerm.volatility.toFixed(0)}
   - Volume: 7d=${Math.round(s.shortTerm.volumeAvg)} | 90d=${Math.round(s.mediumTerm.volumeAvg)} | 365d=${Math.round(s.longTerm.volumeAvg)}
   
   ═══ SIGNALS & TARGETS ═══
   - Confidence: ${s.confidenceScore}% | Grade: ${s.investmentGrade} | Reversion Potential: ${s.reversionPotential.toFixed(1)}%
   - Target: ${s.targetSellPrice}gp (+${upsideToTarget}% from current)
   - Stop-Loss: ${s.stopLoss}gp (-${downToStopLoss}% from current)
   - Bot Activity: ${s.botLikelihood} | Liquidity: ${s.liquidityScore}/100 | Vol Risk: ${s.volatilityRisk}
   - Strategic View: ${s.strategicNarrative}`.substring(0, 1200);
  }
  return `${baseInfo}
   
   ═══ MARKET DATA ═══
   - Status: LIMITED (insufficient historical data for analysis)
   - Recommendation: Use caution, monitor closely`;
}).join('\n\n')}

ANALYSIS FRAMEWORK:

For EACH position, provide POSITION-AWARE analysis:
1. **Entry Assessment**: Was their entry price good? (vs historical averages)
2. **Progress Check**: How much of the expected reversion has occurred? (reversion progress %)
3. **Risk/Reward**: Remaining upside to target vs downside to stop-loss
4. **Timing**: How long have they been holding? Impatience risk? Market phase impact?
5. **Recommendation**: HOLD | SELL_NOW | SELL_SOON | WATCH_CLOSELY | GOOD_POSITION
   - Base on THEIR position, not on whether to buy now
   - Consider their profit/loss vs thesis validity
6. **Risk Level**: LOW | MEDIUM | HIGH | CRITICAL
7. **Action Plan**: Specific exit price and conditions

For items with LIMITED data: Conservative recommendations, acknowledge uncertainty.

PORTFOLIO-LEVEL ANALYSIS:
1. **Overall Risk**: Aggregate risk across positions (consider concentration, correlation, market phase)
2. **Diversification Score** (0-100): Consider if items are correlated, concentration in ${concentrationRisk} positions
3. **Top 3 Actionable Recommendations**: Portfolio-wide advice (rebalance? Take profits? Add positions?)
4. **Critical Warnings**: Any failing theses, stop-losses near, bad entries, timing issues

CONFIDENCE CALIBRATION:
- 85-100%: All signals align perfectly, clear data, strong conviction
- 70-84%: Strong signals with minor concerns
- 50-69%: Mixed signals, moderate confidence
- 30-49%: Weak signals, conflicting data, use caution
- <30%: High uncertainty, insufficient data, very speculative

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
      model: 'gpt-4o',
      temperature: 0.5,
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert OSRS portfolio analyst specializing in mean-reversion position management. Analyze EXISTING positions based on entry prices, profit progress, and position-specific risk/reward. Provide actionable, data-driven advice.' 
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');

    // Log token usage for cost tracking
    const usage = completion.usage;
    if (usage) {
      const inputCost = (usage.prompt_tokens / 1000) * 0.0025;
      const outputCost = (usage.completion_tokens / 1000) * 0.01;
      const totalCost = inputCost + outputCost;
      console.log(`💰 Portfolio Review: ${usage.prompt_tokens} in + ${usage.completion_tokens} out = ${usage.total_tokens} tokens | Cost: $${totalCost.toFixed(4)}`);
    }

    return result as PortfolioSummaryAI;
  } catch (error) {
    console.error('Portfolio AI analysis failed:', error);
    throw error;
  }
}

