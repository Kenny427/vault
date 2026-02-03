/**
 * Statistical analysis for flip opportunity detection
 */

export interface PricePoint {
  timestamp: number;
  price: number;
}

export interface FlipOpportunity {
  itemId: number;
  itemName: string;
  currentPrice: number;
  averagePrice: number;
  deviation: number; // Standard deviation percentage
  deviationScore: number; // -100 (very cheap) to 100 (very expensive)
  trend: 'bullish' | 'bearish' | 'neutral';
  recommendation: 'buy' | 'sell' | 'hold';
  opportunityScore: number; // 0-100, higher = better opportunity
  historicalLow: number;
  historicalHigh: number;
  
  // New enhanced metrics
  buyPrice: number; // Recommended buy price (at margin)
  sellPrice: number; // Estimated sell price
  profitPerUnit: number; // Profit per item after GE tax
  profitMargin: number; // Profit margin percentage
  roi: number; // Return on Investment percentage
  riskLevel: 'low' | 'medium' | 'high'; // Risk assessment
  confidence: number; // 0-100, confidence in the flip
  estimatedHoldTime: string; // e.g., "1-2 days"
  volatility: number; // Price volatility percentage
  volumeScore: number; // Estimated trade volume: 0-100
  buyWhen: string; // Educational: when to buy
  sellWhen: string; // Educational: when to sell
}

/**
 * Calculate mean of an array
 */
export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Calculate standard deviation
 */
export function calculateStdDev(values: number[]): number {
  const mean = calculateMean(values);
  const squareDiffs = values.map(value => Math.pow(value - mean, 2));
  const avgSquareDiff = calculateMean(squareDiffs);
  return Math.sqrt(avgSquareDiff);
}

/**
 * Calculate exponential moving average for trend detection
 */
export function calculateEMA(
  values: number[],
  period: number = 12
): number[] {
  const multiplier = 2 / (period + 1);
  const ema: number[] = [];

  for (let i = 0; i < values.length; i++) {
    if (i === 0) {
      ema.push(values[0]);
    } else {
      ema.push(
        values[i] * multiplier + ema[i - 1] * (1 - multiplier)
      );
    }
  }

  return ema;
}

/**
 * Detect trend based on historical prices
 */
export function detectTrend(
  prices: number[],
  shortWindow: number = 7,
  longWindow: number = 30
): 'bullish' | 'bearish' | 'neutral' {
  if (prices.length < longWindow) return 'neutral';

  const shortTermAvg = calculateMean(prices.slice(-shortWindow));
  const longTermAvg = calculateMean(prices.slice(-longWindow));

  const difference = ((shortTermAvg - longTermAvg) / longTermAvg) * 100;

  if (difference > 3) return 'bullish';
  if (difference < -3) return 'bearish';
  return 'neutral';
}

/**
 * Calculate how far the current price deviates from average
 */
export function calculateDeviationScore(
  currentPrice: number,
  mean: number,
  stdDev: number
): number {
  if (stdDev === 0) return 0;
  
  const zScore = (currentPrice - mean) / stdDev;
  // Normalize to -100 to 100 scale (clamped to -3 to 3 standard deviations)
  return Math.max(-100, Math.min(100, zScore * 33.33));
}

/**
 * Analyze a single item for flip opportunities
 */
export function analyzeFlipOpportunity(
  itemId: number,
  itemName: string,
  currentPrice: number,
  historyPrices: PricePoint[]
): FlipOpportunity | null {
  if (historyPrices.length < 7) {
    return null; // Not enough data
  }

  const prices = historyPrices.map(p => p.price);
  const mean = calculateMean(prices);
  const stdDev = calculateStdDev(prices);
  const historicalLow = Math.min(...prices);
  const historicalHigh = Math.max(...prices);

  const deviationScore = calculateDeviationScore(currentPrice, mean, stdDev);
  const trend = detectTrend(prices);

  // Calculate deviation percentage
  const deviation = ((currentPrice - mean) / mean) * 100;

  // GE Tax is 2% on sale
  const GE_TAX = 0.02;

  // Calculate volatility
  const volatility = ((historicalHigh - historicalLow) / mean) * 100;

  // Determine recommendation based on deviation and trend
  let recommendation: 'buy' | 'sell' | 'hold' = 'hold';
  let opportunityScore = 0;
  let riskLevel: 'low' | 'medium' | 'high' = 'medium';
  let buyPrice = currentPrice;
  let sellPrice = currentPrice;
  let estimatedHoldTime = '3-5 days';
  let buyWhen = 'When price is below average';
  let sellWhen = 'When price returns to average';

  if (deviationScore < -20) { // Lowered from -30
    recommendation = 'buy';
    buyPrice = Math.round(currentPrice * 0.99); // Buy at or below current
    sellPrice = Math.round(mean * 1.01); // Lowered from 1.02 - more realistic
    estimatedHoldTime = '2-4 days';
    buyWhen = 'Price is below average - good buying opportunity';
    sellWhen = 'Price recovers to historical average';
    opportunityScore = Math.abs(deviationScore) * 1.2 + (trend === 'bullish' ? 30 : 0); // Increased scoring
    riskLevel = trend === 'bullish' ? 'low' : 'medium';
  } else if (deviationScore > 20) { // Lowered from 30
    recommendation = 'sell';
    buyPrice = Math.round(mean * 0.98);
    sellPrice = Math.round(currentPrice * 0.99); // Sell at current, high price
    estimatedHoldTime = '1-3 days';
    buyWhen = 'Wait for price dip to buy low';
    sellWhen = 'Price is above average - good selling time';
    opportunityScore = deviationScore * 1.0 + (trend === 'bearish' ? 20 : 0); // Increased scoring
    riskLevel = trend === 'bearish' ? 'high' : 'medium';
  } else if (Math.abs(deviationScore) > 5) { // New: Show even small deviations
    recommendation = Math.abs(deviationScore) > 10 
      ? (deviationScore < 0 ? 'buy' : 'sell')
      : 'hold';
    buyPrice = Math.round(mean * 0.97);
    sellPrice = Math.round(mean * 1.03);
    opportunityScore = 30 + Math.abs(deviationScore) * 0.8;
    buyWhen = 'Price dips below average';
    sellWhen = 'Price rises above average';
    estimatedHoldTime = '3-7 days';
  } else {
    buyPrice = Math.round(mean * 0.95);
    sellPrice = Math.round(mean * 1.05);
    opportunityScore = 15 + (volatility > 10 ? 15 : 0); // Lowered minimum
    buyWhen = 'Price dips below average';
    sellWhen = 'Price rises above average';
    estimatedHoldTime = '5-10 days';
  }

  // Ensure prices are valid
  buyPrice = Math.max(1, Math.min(buyPrice, currentPrice));
  sellPrice = Math.max(buyPrice + 1, sellPrice);

  // Calculate profit metrics
  const profitPerUnit = Math.max(0, Math.round(sellPrice - buyPrice - (sellPrice * GE_TAX)));
  const profitMargin = buyPrice > 0 ? ((profitPerUnit / buyPrice) * 100) : 0;
  const roi = buyPrice > 0 ? ((profitPerUnit / buyPrice) * 100) : 0;

  // Volume score: items with higher volatility and spread have more volume
  let volumeScore = Math.min(100, (volatility * 0.5) + 30);

  // Adjust confidence based on multiple factors
  let confidence = opportunityScore * 0.6;
  confidence += (volatility > 5) ? 15 : 0; // Higher volatility = more trading
  confidence += (trend !== 'neutral') ? 10 : 0; // Trending items are clearer
  confidence = Math.max(0, Math.min(100, confidence));

  // Clamp opportunity score to 0-100
  opportunityScore = Math.max(0, Math.min(100, opportunityScore));

  return {
    itemId,
    itemName,
    currentPrice,
    averagePrice: mean,
    deviation,
    deviationScore,
    trend,
    recommendation,
    opportunityScore,
    historicalLow,
    historicalHigh,
    buyPrice,
    sellPrice,
    profitPerUnit,
    profitMargin,
    roi,
    riskLevel,
    confidence,
    estimatedHoldTime,
    volatility,
    volumeScore,
    buyWhen,
    sellWhen,
  };
}

/**
 * Batch analyze multiple items and sort by opportunity
 */
export function analyzeMultipleItems(
  items: Array<{
    id: number;
    name: string;
    currentPrice: number;
    history: PricePoint[];
  }>
): FlipOpportunity[] {
  const opportunities = items
    .map(item =>
      analyzeFlipOpportunity(
        item.id,
        item.name,
        item.currentPrice,
        item.history
      )
    )
    .filter((op): op is FlipOpportunity => op !== null)
    .sort((a, b) => b.opportunityScore - a.opportunityScore);

  return opportunities;
}

/**
 * Identify potential long-term investments (items significantly below historical average)
 */
export function findLongTermInvestments(
  opportunities: FlipOpportunity[],
  thresholdPercentage: number = 15
): FlipOpportunity[] {
  return opportunities.filter(op => {
    const percentageBelow = ((op.averagePrice - op.currentPrice) / op.averagePrice) * 100;
    return (
      percentageBelow >= thresholdPercentage &&
      op.currentPrice > op.historicalLow * 1.1 && // Not at absolute bottom
      op.opportunityScore > 40
    );
  });
}

/**
 * Identify potential short-term flips (items with quick buy/sell opportunities)
 */
export function findShortTermFlips(
  opportunities: FlipOpportunity[],
  minSpread: number = 5
): FlipOpportunity[] {
  return opportunities.filter(op => {
    const spread = ((op.historicalHigh - op.currentPrice) / op.currentPrice) * 100;
    return (
      spread >= minSpread &&
      op.deviationScore < -20 &&
      op.opportunityScore > 50
    );
  });
}
