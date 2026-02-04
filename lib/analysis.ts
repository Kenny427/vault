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
  averagePrice30: number;
  averagePrice90: number;
  averagePrice180: number;
  averagePrice365: number;
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
  
  // New analysis metrics
  momentum: number; // Price momentum score (-100 to 100)
  acceleration: number; // Price acceleration (-100 to 100)
  tradingRange: number; // % difference between high and low
  consistency: number; // How consistent the price movement is (0-100)
  spreadQuality: number; // Quality of buy/sell spread (0-100)
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
 * Calculate momentum score based on recent price changes
 * Returns -100 to 100, where negative = bearish momentum, positive = bullish
 */
export function calculateMomentum(prices: number[]): number {
  if (prices.length < 5) return 0;
  
  const recentPrices = prices.slice(-7); // Last 7 data points
  let positiveChanges = 0;
  let negativeChanges = 0;
  let totalChange = 0;
  
  for (let i = 1; i < recentPrices.length; i++) {
    const change = recentPrices[i] - recentPrices[i - 1];
    totalChange += change;
    if (change > 0) positiveChanges++;
    if (change < 0) negativeChanges++;
  }
  
  // Momentum = percentage of positive changes
  const momentumRatio = (positiveChanges - negativeChanges) / (recentPrices.length - 1);
  const rawMomentum = momentumRatio * 100;
  
  // Weight by magnitude of change
  const currentPrice = recentPrices[recentPrices.length - 1];
  const changePercent = ((currentPrice - recentPrices[0]) / recentPrices[0]) * 100;
  
  // Combine directional momentum with magnitude
  const weightedMomentum = (rawMomentum * 0.6) + (changePercent * 0.4);
  
  return Math.max(-100, Math.min(100, weightedMomentum));
}

/**
 * Calculate price acceleration (how fast momentum is changing)
 * Positive = accelerating upward, negative = accelerating downward
 */
export function calculateAcceleration(prices: number[]): number {
  if (prices.length < 10) return 0;
  
  const recent = prices.slice(-10);
  const older = prices.slice(-20, -10);
  
  if (older.length === 0) return 0;
  
  // Calculate average change rates for recent and older periods
  let recentChanges: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    recentChanges.push(recent[i] - recent[i - 1]);
  }
  
  let olderChanges: number[] = [];
  for (let i = 1; i < older.length; i++) {
    olderChanges.push(older[i] - older[i - 1]);
  }
  
  const recentAvgChange = calculateMean(recentChanges);
  const olderAvgChange = calculateMean(olderChanges);
  
  // Acceleration = how much the change rate has changed
  const acceleration = recentAvgChange - olderAvgChange;
  const avgPrice = calculateMean(prices);
  
  // Normalize to -100 to 100 scale
  const normalizedAccel = (acceleration / avgPrice) * 100;
  return Math.max(-100, Math.min(100, normalizedAccel));
}

/**
 * Calculate how consistent price movements are (low volatility but directional)
 * Higher score = more consistent/predictable
 */
export function calculateConsistency(prices: number[]): number {
  if (prices.length < 7) return 0;
  
  const recent = prices.slice(-7);
  const changes: number[] = [];
  
  for (let i = 1; i < recent.length; i++) {
    changes.push(Math.abs(recent[i] - recent[i - 1]));
  }
  
  const avgChange = calculateMean(changes);
  const changeStdDev = calculateStdDev(changes);
  
  // If changes are consistent (low std dev relative to mean), consistency is high
  if (avgChange === 0) return 0;
  const coefficientOfVariation = changeStdDev / avgChange;
  
  // Convert to 0-100 scale (lower CV = higher consistency)
  const consistency = Math.max(0, 100 - (coefficientOfVariation * 50));
  return consistency;
}

/**
 * Analyze quality of the trading spread (difference between buyable and sellable prices)
 */
export function analyzeSpreadQuality(
  historicalHigh: number,
  historicalLow: number,
  currentPrice: number,
  mean: number
): number {
  const totalRange = historicalHigh - historicalLow;
  if (totalRange === 0) return 0;
  
  // How much room is there to buy low and sell high?
  const priceDistance = Math.abs(currentPrice - mean);
  const maxPossibleDistance = (historicalHigh - historicalLow) / 2;
  
  if (maxPossibleDistance === 0) return 0;
  
  // Spread quality = how far current price is from mean, relative to historical range
  const spreadQuality = (priceDistance / maxPossibleDistance) * 100;
  
  return Math.min(100, spreadQuality);
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
 * Analyze a single item for flip opportunities - IMPROVED VERSION
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

  // NEW: Calculate advanced metrics
  const deviationScore = calculateDeviationScore(currentPrice, mean, stdDev);
  const trend = detectTrend(prices);
  const momentum = calculateMomentum(prices);
  const acceleration = calculateAcceleration(prices);
  const consistency = calculateConsistency(prices);
  const spreadQuality = analyzeSpreadQuality(historicalHigh, historicalLow, currentPrice, mean);

  // Calculate basic metrics
  const deviation = ((currentPrice - mean) / mean) * 100;
  const volatility = ((historicalHigh - historicalLow) / mean) * 100;
  const tradingRange = ((historicalHigh - historicalLow) / mean) * 100;
  
  // GE Tax is 2% on sale
  const GE_TAX = 0.02;

  // IMPROVED: Filter low-quality opportunities
  // Don't show flips for items with no volatility or super flat prices
  if (volatility < 1) {
    return null; // No trading opportunity in flat items
  }

  // Determine recommendation based on MULTIPLE factors
  let recommendation: 'buy' | 'sell' | 'hold' = 'hold';
  let opportunityScore = 0;
  let riskLevel: 'low' | 'medium' | 'high' = 'medium';
  let buyPrice = currentPrice;
  let sellPrice = currentPrice;
  let estimatedHoldTime = '3-5 days';
  let buyWhen = 'When price is below average';
  let sellWhen = 'When price returns to average';

  // IMPROVED: Consider momentum, acceleration, and consistency in decisions
  if (deviationScore < -15 && momentum < 0 && consistency > 40) {
    // Price is low AND momentum is negative (staying low) AND price moves are consistent = STRONG BUY
    recommendation = 'buy';
    buyPrice = Math.round(currentPrice * 0.98);
    sellPrice = Math.round(mean * 1.02);
    estimatedHoldTime = '2-4 days';
    buyWhen = 'Price is below average with negative momentum';
    sellWhen = 'Price recovers to average or momentum reverses';
    
    // Score based on multiple factors
    opportunityScore = Math.abs(deviationScore) * 1.5;
    opportunityScore += (trend === 'bullish' ? 25 : 0);
    opportunityScore += (acceleration > 0 ? 15 : 0); // Accelerating upward = good buy signal
    opportunityScore += (consistency * 0.3); // Consistent = more predictable
    
    riskLevel = trend === 'bullish' && acceleration > 0 ? 'low' : 'medium';
  } else if (deviationScore > 15 && momentum > 0 && consistency > 40) {
    // Price is high AND momentum is positive (staying high) AND consistent = STRONG SELL
    recommendation = 'sell';
    buyPrice = Math.round(mean * 0.97);
    sellPrice = Math.round(currentPrice * 0.99);
    estimatedHoldTime = '1-3 days';
    buyWhen = 'Wait for price dip to buy low';
    sellWhen = 'Price is high with positive momentum';
    
    opportunityScore = deviationScore * 1.3;
    opportunityScore += (trend === 'bearish' ? 15 : 0);
    opportunityScore += (acceleration < 0 ? 10 : 0); // Decelerating = sell signal
    opportunityScore += (spreadQuality * 0.4);
    
    riskLevel = trend === 'bearish' ? 'high' : 'medium';
  } else if (deviationScore < -8 && consistency > 50) {
    // Moderately low price with VERY consistent patterns = MODERATE BUY
    recommendation = 'buy';
    buyPrice = Math.round(mean * 0.96);
    sellPrice = Math.round(mean * 1.01);
    opportunityScore = 35 + Math.abs(deviationScore) * 1.0 + (consistency * 0.2);
    buyWhen = 'Price is below average with consistent pattern';
    sellWhen = 'Price recovers toward average';
    estimatedHoldTime = '3-5 days';
  } else if (deviationScore > 8 && consistency > 50) {
    // Moderately high price with VERY consistent patterns = MODERATE SELL
    recommendation = 'sell';
    buyPrice = Math.round(mean * 0.95);
    sellPrice = Math.round(mean * 1.02);
    opportunityScore = 30 + deviationScore * 0.8 + (spreadQuality * 0.3);
    sellWhen = 'Price is above average with consistent pattern';
    buyWhen = 'Price dips to average or below';
    estimatedHoldTime = '2-5 days';
  } else if (volatility > 15 && spreadQuality > 40) {
    // High volatility and good spread = SWING TRADE opportunity
    const direction = deviationScore < 0 ? 'buy' : 'sell';
    recommendation = direction;
    
    if (direction === 'buy') {
      buyPrice = Math.round(currentPrice);
      sellPrice = Math.round(historicalHigh * 0.99);
      buyWhen = 'Price is low, high volatility means recovery likely';
      sellWhen = 'Swing up to near historical high';
      estimatedHoldTime = '1-3 days';
    } else {
      buyPrice = Math.round(historicalLow * 1.02);
      sellPrice = Math.round(currentPrice);
      buyWhen = 'Wait for swing down';
      sellWhen = 'Current price is high in the volatility range';
      estimatedHoldTime = '1-3 days';
    }
    
    opportunityScore = Math.abs(deviationScore) * 0.9 + (volatility * 0.5) + (spreadQuality * 0.3);
    riskLevel = 'high'; // Volatile items are riskier
  } else if (Math.abs(deviationScore) > 5) {
    recommendation = 'hold';
    opportunityScore = 20 + Math.abs(deviationScore) * 0.5;
  } else {
    opportunityScore = 10 + (volatility * 0.3) + (spreadQuality * 0.2);
  }

  // Ensure prices are valid
  buyPrice = Math.max(1, Math.min(buyPrice, currentPrice));
  sellPrice = Math.max(buyPrice + 1, sellPrice);

  // Calculate profit metrics
  const profitPerUnit = Math.max(0, Math.round(sellPrice - buyPrice - (sellPrice * GE_TAX)));
  const profitMargin = buyPrice > 0 ? ((profitPerUnit / buyPrice) * 100) : 0;
  const roi = buyPrice > 0 ? ((profitPerUnit / buyPrice) * 100) : 0;

  // IMPROVED: Volume score based on consistency and volatility
  let volumeScore = Math.min(100, (consistency * 0.5) + (volatility * 0.3) + 20);

  // IMPROVED: Confidence calculation with new metrics
  let confidence = opportunityScore * 0.5;
  confidence += (consistency * 0.3); // High confidence if pattern is consistent
  confidence += (volatility > 3 && volatility < 50 ? 15 : 0); // Moderate volatility = good
  confidence += (trend !== 'neutral' ? 10 : 0); // Clear trend = higher confidence
  confidence += (spreadQuality > 50 ? 10 : 0); // Good spread = high confidence
  confidence = Math.max(0, Math.min(100, confidence));

  // Clamp opportunity score to 0-100
  opportunityScore = Math.max(0, Math.min(100, opportunityScore));

  return {
    itemId,
    itemName,
    currentPrice,
    averagePrice: mean,
    averagePrice30: mean,
    averagePrice90: mean,
    averagePrice180: mean,
    averagePrice365: mean,
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
    momentum,
    acceleration,
    tradingRange,
    consistency,
    spreadQuality,
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
