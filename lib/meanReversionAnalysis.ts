/**
 * ADVANCED MEAN-REVERSION INVESTMENT ANALYSIS
 * 
 * Strategy: Low-effort, high-capital value investing for OSRS items
 * - Multi-timeframe analysis (7d, 30d, 90d, 180d, 365d)
 * - Identifies items trading below historical averages
 * - Focuses on botted items with predictable supply/demand
 * - Suitable for holding positions weeks to months
 */

export interface TimeframeData {
  period: '7d' | '30d' | '90d' | '180d' | '365d';
  avgPrice: number;
  currentDeviation: number; // Percentage below average
  volatility: number;
  volumeAvg: number;
}

export interface MeanReversionSignal {
  itemId: number;
  itemName: string;
  currentPrice: number;
  
  // Multi-timeframe analysis
  shortTerm: TimeframeData; // 7 days
  mediumTerm: TimeframeData; // 90 days
  longTerm: TimeframeData; // 365 days
  
  // Investment metrics
  maxDeviation: number; // Biggest % drop vs historical
  reversionPotential: number; // Expected % gain on reversion
  confidenceScore: number; // 0-100, based on volume & consistency
  investmentGrade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D';
  
  // Risk assessment
  volatilityRisk: 'low' | 'medium' | 'high';
  liquidityScore: number; // 0-100
  estimatedHoldingPeriod: string; // e.g., "2-4 weeks", "1-3 months"
  
  // Bot activity indicators
  botLikelihood: 'very high' | 'high' | 'medium' | 'low';
  supplyStability: number; // 0-100, higher = more stable
  
  // Recommendation
  suggestedInvestment: number; // GP amount
  targetSellPrice: number;
  stopLoss: number;
  reasoning: string;
}

export interface PriceDataPoint {
  timestamp: number;
  avgHighPrice: number;
  avgLowPrice: number;
  highPriceVolume: number;
  lowPriceVolume: number;
}

/**
 * Calculate average price over a specific timeframe
 */
function calculateTimeframeMetrics(
  priceData: PriceDataPoint[],
  daysBack: number
): { avg: number; volatility: number; volumeAvg: number } {
  // Convert to seconds since API returns timestamps in seconds, not milliseconds
  const cutoffTime = Math.floor(Date.now() / 1000) - (daysBack * 24 * 60 * 60);
  const relevantData = priceData.filter(d => d.timestamp >= cutoffTime);
  
  if (relevantData.length === 0) {
    return { avg: 0, volatility: 0, volumeAvg: 0 };
  }
  
  // Calculate average price (midpoint of high/low)
  const prices = relevantData.map(d => (d.avgHighPrice + d.avgLowPrice) / 2);
  const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  
  // Calculate volatility (standard deviation)
  const squaredDiffs = prices.map(p => Math.pow(p - avg, 2));
  const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / prices.length;
  const volatility = Math.sqrt(variance);
  
  // Calculate average volume
  const volumes = relevantData.map(d => d.highPriceVolume + d.lowPriceVolume);
  const volumeAvg = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
  
  return { avg, volatility, volumeAvg };
}

/**
 * Determine if an item shows bot-like trading patterns
 */
function assessBotLikelihood(priceData: PriceDataPoint[]): {
  likelihood: 'very high' | 'high' | 'medium' | 'low';
  supplyStability: number;
} {
  if (priceData.length < 30) {
    return { likelihood: 'low', supplyStability: 50 };
  }
  
  // Recent 30 days
  const recentData = priceData.slice(-30);
  
  // Many OSRS items have no volume data (0/0), so we check price consistency instead
  // Bots create consistent pricing patterns
  const prices = recentData.map(d => (d.avgHighPrice + d.avgLowPrice) / 2);
  const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const priceVariance = prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length;
  const priceStdDev = Math.sqrt(priceVariance);
  const priceCV = avgPrice > 0 ? (priceStdDev / avgPrice) * 100 : 50;
  
  // Lower price variation = more stable/bot-like
  // Most OSRS items have 10-30% variation, bots are under 10%
  const supplyStability = Math.max(0, Math.min(100, 100 - (priceCV * 2)));
  
  let likelihood: 'very high' | 'high' | 'medium' | 'low';
  if (priceCV < 5) {
    likelihood = 'very high'; // Extremely stable price
  } else if (priceCV < 10) {
    likelihood = 'high'; // Very stable
  } else if (priceCV < 20) {
    likelihood = 'medium'; // Moderate stability
  } else {
    likelihood = 'low'; // Volatile
  }
  
  return { likelihood, supplyStability };
}

/**
 * Calculate liquidity score based on volume
 */
function calculateLiquidityScore(volumeAvg: number): number {
  // Higher volume = better liquidity
  if (volumeAvg > 10000) return 100;
  if (volumeAvg > 5000) return 90;
  if (volumeAvg > 2000) return 75;
  if (volumeAvg > 1000) return 60;
  if (volumeAvg > 500) return 45;
  if (volumeAvg > 100) return 30;
  return 15;
}

/**
 * Determine volatility risk category
 */
function assessVolatilityRisk(
  shortTermVol: number,
  longTermVol: number,
  avgPrice: number
): 'low' | 'medium' | 'high' {
  const shortTermPercent = (shortTermVol / avgPrice) * 100;
  const longTermPercent = (longTermVol / avgPrice) * 100;
  
  const avgVolPercent = (shortTermPercent + longTermPercent) / 2;
  
  if (avgVolPercent < 5) return 'low';
  if (avgVolPercent < 15) return 'medium';
  return 'high';
}

/**
 * Calculate confidence score for mean reversion
 * This is SELECTIVE but lenient - want good opportunities, not impossible ones
 */
function calculateConfidence(
  deviation: number,
  liquidityScore: number,
  supplyStability: number,
  volatilityRisk: 'low' | 'medium' | 'high',
  downtrendPenalty: number = 0
): number {
  // Start at 0 - must EARN the score
  let confidence = 0;
  
  // DEVIATION: The most important factor - this is the primary signal
  if (deviation < 8) return 0; // Hard minimum
  if (deviation >= 8 && deviation < 12) confidence = 30;
  if (deviation >= 12 && deviation < 15) confidence = 40;
  if (deviation >= 15 && deviation < 20) confidence = 55;
  if (deviation >= 20 && deviation < 30) confidence = 75;
  if (deviation >= 30) confidence = 90;
  
  // VOLATILITY RISK: Apply to base confidence but don't eliminate
  // OSRS items naturally have some volatility, so be lenient
  if (volatilityRisk === 'high') {
    confidence = Math.max(20, confidence - 20); // Large penalty but floor at 20
  } else if (volatilityRisk === 'medium') {
    confidence = Math.max(25, confidence - 10); // Moderate penalty
  } else if (volatilityRisk === 'low') {
    confidence = Math.min(100, confidence + 10); // Small bonus
  }

  // DOWNTREND PENALTY: Critical - prevents value traps
  // Applied HARD - don't just reduce, can eliminate opportunities
  if (downtrendPenalty > 0) {
    confidence = Math.max(0, confidence - downtrendPenalty);
  }
  
  // SUPPLY STABILITY: Bonus for good stability, penalty for poor
  if (supplyStability >= 80) {
    confidence = Math.min(100, confidence + 8);
  } else if (supplyStability < 30) {
    confidence = Math.max(20, confidence - 8); // Only small penalty, not elimination
  }
  
  // LIQUIDITY: Small bonus only if good
  if (liquidityScore >= 70) {
    confidence = Math.min(100, confidence + 5);
  }
  
  return Math.max(0, Math.min(100, confidence));
}

/**
 * Assign investment grade (STRICT)
 * A+ = Only exceptional opportunities (>85 confidence AND 20%+ deviation)
 * A  = Strong opportunities (>75 confidence AND 15%+ deviation)
 * B+ = Good opportunities (>65 confidence AND 10%+ deviation)
 * B  = Moderate opportunities (>50 confidence AND 8%+ deviation)
 * C  = Weak opportunities (anything else)
 */
function assignInvestmentGrade(confidenceScore: number): 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' {
  if (confidenceScore >= 85) return 'A+';
  if (confidenceScore >= 75) return 'A';
  if (confidenceScore >= 65) return 'B+';
  if (confidenceScore >= 50) return 'B';
  if (confidenceScore >= 30) return 'C';
  return 'D';
}

/**
 * Estimate holding period based on deviation and bot likelihood
 */
function estimateHoldingPeriod(
  deviation: number,
  _volatility: number,
  botLikelihood: string
): string {
  // Botted items revert faster
  const botMultiplier = botLikelihood === 'very high' ? 0.5 : 
                        botLikelihood === 'high' ? 0.7 : 
                        botLikelihood === 'medium' ? 1.0 : 1.3;
  
  const baseWeeks = (deviation / 5) * botMultiplier;
  
  if (baseWeeks < 2) return '1-2 weeks';
  if (baseWeeks < 4) return '2-4 weeks';
  if (baseWeeks < 8) return '1-2 months';
  if (baseWeeks < 12) return '2-3 months';
  return '3-6 months';
}

/**
 * Generate investment recommendation
 */
function generateRecommendation(
  _itemName: string,
  _currentPrice: number,
  reversionPotential: number,
  confidenceScore: number,
  botLikelihood: string,
  maxDeviation: number,
  downtrendReasoning?: string
): string {
  const reasons: string[] = [];
  
  if (maxDeviation > 20) {
    reasons.push(`Currently ${maxDeviation.toFixed(1)}% below historical average`);
  }
  
  if (botLikelihood === 'very high' || botLikelihood === 'high') {
    reasons.push('Heavily botted item with stable supply - predictable reversion');
  }
  
  if (downtrendReasoning && !downtrendReasoning.includes('No strong downtrend') && !downtrendReasoning.includes('No significant')) {
    reasons.push(downtrendReasoning);
  }
  
  if (reversionPotential > 30) {
    reasons.push(`High upside potential: ${reversionPotential.toFixed(1)}% expected gain`);
  } else if (reversionPotential > 15) {
    reasons.push(`Solid potential: ${reversionPotential.toFixed(1)}% expected gain`);
  }
  
  if (confidenceScore > 85) {
    reasons.push('Very high confidence in mean reversion');
  } else if (confidenceScore > 70) {
    reasons.push('High confidence in price recovery');
  }
  
  return reasons.join('. ') + '.';
}

/**
 * Calculate trend slope using linear regression
 * Returns: { slope, direction, strength (0-100) }
 */
function calculateTrendSlope(prices: number[]): {
  slope: number;
  direction: 'up' | 'down' | 'flat';
  strength: number;
} {
  if (prices.length < 2) {
    return { slope: 0, direction: 'flat', strength: 0 };
  }

  // Linear regression to find trend
  const n = prices.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = prices;

  const xMean = x.reduce((a, b) => a + b) / n;
  const yMean = y.reduce((a, b) => a + b) / n;

  const numerator = x.reduce((sum, xi, i) => sum + (xi - xMean) * (y[i] - yMean), 0);
  const denominator = x.reduce((sum, xi) => sum + (xi - xMean) ** 2, 0);

  const slope = denominator === 0 ? 0 : numerator / denominator;

  // Strength: how well the trend fits (R-squared proxy)
  const avgPrice = yMean;
  const ssTotal = y.reduce((sum, yi) => sum + (yi - avgPrice) ** 2, 0);
  const predicted = x.map(xi => yMean + slope * (xi - xMean));
  const ssResidual = y.reduce((sum, yi, i) => sum + (yi - predicted[i]) ** 2, 0);
  const rSquared = ssTotal === 0 ? 0 : 1 - ssResidual / ssTotal;
  const strength = Math.max(0, Math.min(100, rSquared * 100));

  const direction = slope > 0.1 ? 'up' : slope < -0.1 ? 'down' : 'flat';

  return { slope, direction, strength: Math.round(strength) };
}

/**
 * Detect if price is stabilizing or reversing from a downtrend
 */
function detectTrendReversal(priceData: PriceDataPoint[]): {
  isReversing: boolean;
  reversingStrength: number; // 0-100
  foundSupport: boolean;
} {
  if (priceData.length < 60) {
    return { isReversing: false, reversingStrength: 0, foundSupport: false };
  }

  // Get recent 30 prices (30 days) vs older 30 prices (days 30-60)
  const recent30 = priceData.slice(-30).map(p => (p.avgHighPrice + p.avgLowPrice) / 2);
  // Check if recent trend is less negative or positive vs previous
  const recentTrend = calculateTrendSlope(recent30);
  // For a true reversal, need recent trend to be POSITIVE (uptrend), not just less negative
  // A slowdown in decline is not a reversal - it's still a downtrend
  const isActuallyReversing = recentTrend.slope > 0.1; // Must be actually going up
  const reversingStrength = isActuallyReversing ? Math.min(100, Math.max(recentTrend.slope * 50, 20)) : 0;

  // Check for support: low volatility near bottom, prices stabilizing
  // But only count as support if recent trend is flat or up (not still downtrending)
  const recentLows = recent30.slice(-10);
  const lowestRecent = Math.min(...recentLows);
  const highestRecent = Math.max(...recentLows);
  const rangePercent = ((highestRecent - lowestRecent) / lowestRecent) * 100;
  const foundSupport = rangePercent < 5 && recentTrend.slope >= -0.05; // Support only if flat/up trend

  const isReversing = isActuallyReversing || foundSupport;

  return { isReversing, reversingStrength: Math.round(reversingStrength), foundSupport };
}

/**
 * Calculate downtrend severity and penalty
 */
function assessDowntrendPenalty(priceData: PriceDataPoint[]): {
  penalty: number; // 0-100, penalty to confidence
  reasoning: string;
} {
  if (priceData.length < 90) {
    return { penalty: 0, reasoning: 'Insufficient historical data' };
  }

  // Get 365-day trend
  const allPrices = priceData.map(p => (p.avgHighPrice + p.avgLowPrice) / 2);
  const trend = calculateTrendSlope(allPrices);

  // Check for downtrend
  if (trend.direction !== 'down') {
    return { penalty: 0, reasoning: 'No strong downtrend detected' };
  }

  // Calculate percentage decline from peak
  const peak = Math.max(...allPrices);
  const current = allPrices[allPrices.length - 1];
  const declinePercent = ((peak - current) / peak) * 100;

  console.log(`[DOWNTREND] Decline: ${declinePercent.toFixed(1)}% from peak, Trend strength: ${trend.strength}%, Data points: ${priceData.length}`);

  // Strong downtrend penalty: more than 20% decline with high confidence
  if (declinePercent > 20 && trend.strength > 50) {
    console.log(`[DOWNTREND-CHECK] Passed condition check: decline=${declinePercent.toFixed(1)} > 20 AND strength=${trend.strength} > 50`);
    // Check if it's stabilizing (mitigates penalty)
    const { isReversing, reversingStrength } = detectTrendReversal(priceData);
    console.log(`[DOWNTREND-CHECK] Reversal check: isReversing=${isReversing}, reversingStrength=${reversingStrength}`);

    if (isReversing && reversingStrength > 40) {
      // Reversing, reduce penalty only if it's STRONGLY reversing AND found support
      // Weak reversals don't override structural declines
      if (reversingStrength > 70 && foundSupport) {
        // Strong reversal with support - item is genuinely recovering
        const penalty = Math.max(0, 60 - reversingStrength);
        console.log(`[DOWNTREND-CHECK] Strong reversal (${reversingStrength}%) with support found, reduced penalty to ${penalty}`);
        return {
          penalty,
          reasoning: `Strong downtrend (${declinePercent.toFixed(0)}% from peak) but showing strong reversal signs (${reversingStrength}% strength) with support`,
        };
      } else {
        // Weak reversal or no support - still a risky structural decline
        console.log(`[DOWNTREND-CHECK] Weak reversal (${reversingStrength}%) without strong support, applying full 70-point penalty`);
        return {
          penalty: 70,
          reasoning: `Strong downtrend (${declinePercent.toFixed(0)}% from peak, ${trend.strength}% consistency) - likely structural decline, not mean-reversion`,
        };
      }
    } else {
      // Strong downtrend with no reversal
      console.log(`[DOWNTREND-CHECK] Strong downtrend with no reversal, applying 70-point penalty`);
      return {
        penalty: 70,
        reasoning: `Strong downtrend (${declinePercent.toFixed(0)}% from peak, ${trend.strength}% consistency) - likely structural decline, not mean-reversion`,
      };
    }
  }

  // Moderate downtrend
  if (declinePercent > 10) {
    console.log(`[DOWNTREND-CHECK] Moderate downtrend detected: ${declinePercent.toFixed(1)}% decline`);
    return {
      penalty: 20,
      reasoning: `Moderate downtrend (${declinePercent.toFixed(0)}% from peak) - verify reversal signals`,
    };
  }

  console.log(`[DOWNTREND-CHECK] No significant downtrend (decline: ${declinePercent.toFixed(1)}%)`);
  return { penalty: 0, reasoning: 'No significant downtrend' };
}

/**
 * MAIN ANALYSIS FUNCTION
 * Analyzes an item for mean-reversion investment opportunities
 */
export async function analyzeMeanReversionOpportunity(
  itemId: number,
  itemName: string,
  priceData: PriceDataPoint[]
): Promise<MeanReversionSignal | null> {
  if (!priceData || priceData.length < 5) {
    return null; // Need at least 5 data points
  }
  
  // Calculate metrics for each timeframe
  const metrics7d = calculateTimeframeMetrics(priceData, 7);
  const metrics30d = calculateTimeframeMetrics(priceData, 30);
  const metrics90d = calculateTimeframeMetrics(priceData, 90);
  const metrics180d = calculateTimeframeMetrics(priceData, 180);
  const metrics365d = calculateTimeframeMetrics(priceData, 365);
  
  // Current price (most recent)
  const latest = priceData[priceData.length - 1];
  const currentPrice = (latest.avgHighPrice + latest.avgLowPrice) / 2;
  
  // Calculate deviations
  const dev7d = metrics7d.avg > 0 ? ((metrics7d.avg - currentPrice) / metrics7d.avg) * 100 : 0;
  const dev30d = metrics30d.avg > 0 ? ((metrics30d.avg - currentPrice) / metrics30d.avg) * 100 : 0;
  const dev90d = metrics90d.avg > 0 ? ((metrics90d.avg - currentPrice) / metrics90d.avg) * 100 : 0;
  const dev180d = metrics180d.avg > 0 ? ((metrics180d.avg - currentPrice) / metrics180d.avg) * 100 : 0;
  const dev365d = metrics365d.avg > 0 ? ((metrics365d.avg - currentPrice) / metrics365d.avg) * 100 : 0;
  
  // Find maximum deviation (best opportunity)
  const maxDeviation = Math.max(dev7d, dev30d, dev90d, dev180d, dev365d);
  
  // Skip if not undervalued (need at least 1% deviation to analyze everything)
  if (maxDeviation < 1) {
    return null; // Item is consistently at or above historical average
  }
  
  // Assess bot activity
  const { likelihood: botLikelihood, supplyStability } = assessBotLikelihood(priceData);
  
  // Calculate reversion potential
  // Use the timeframe with the best (highest) average as target
  const targetPrice = Math.max(metrics90d.avg, metrics180d.avg, metrics365d.avg);
  const reversionPotential = ((targetPrice - currentPrice) / currentPrice) * 100;
  
  // Risk assessment
  const liquidityScore = calculateLiquidityScore(metrics30d.volumeAvg);
  const volatilityRisk = assessVolatilityRisk(metrics7d.volatility, metrics90d.volatility, currentPrice);
  
  // TREND ANALYSIS: Detect value traps
  const { penalty: downtrendPenalty, reasoning: downtrendReasoning } = assessDowntrendPenalty(priceData);
  
  if (downtrendPenalty > 0) {
    console.log(`✓ ${itemName}: Applied downtrend penalty of ${downtrendPenalty} - ${downtrendReasoning}`);
  }
  
  // Confidence calculation with trend penalties
  const confidenceScore = calculateConfidence(
    maxDeviation,
    liquidityScore,
    supplyStability,
    volatilityRisk,
    downtrendPenalty
  );
  
  // DEBUG: Log detailed analysis for items with low confidence
  if (confidenceScore < 30 && maxDeviation > 8) {
    console.log(`   ⚠️ ${itemName}: dev=${maxDeviation.toFixed(1)}%, conf=${confidenceScore.toFixed(0)}%, stability=${supplyStability.toFixed(0)}%, volatility=${volatilityRisk}`);
  }
  
  const investmentGrade = assignInvestmentGrade(confidenceScore);
  const estimatedHoldingPeriod = estimateHoldingPeriod(maxDeviation, metrics30d.volatility, botLikelihood);
  
  // Investment sizing (based on confidence and liquidity)
  const baseSuggestion = 10000000; // 10M base
  const confidenceMultiplier = confidenceScore / 100;
  const liquidityMultiplier = Math.min(1, liquidityScore / 80);
  const suggestedInvestment = Math.floor(baseSuggestion * confidenceMultiplier * liquidityMultiplier);
  
  // Target and stop-loss
  const targetSellPrice = Math.floor(targetPrice * 0.95); // Conservative target (95% of historical avg)
  const stopLoss = Math.floor(currentPrice * 0.90); // 10% stop loss
  
  const reasoning = generateRecommendation(
    itemName,
    currentPrice,
    reversionPotential,
    confidenceScore,
    botLikelihood,
    maxDeviation,
    downtrendReasoning
  );
  
  return {
    itemId,
    itemName,
    currentPrice: Math.floor(currentPrice),
    
    shortTerm: {
      period: '7d',
      avgPrice: Math.floor(metrics7d.avg),
      currentDeviation: dev7d,
      volatility: metrics7d.volatility,
      volumeAvg: metrics7d.volumeAvg
    },
    mediumTerm: {
      period: '90d',
      avgPrice: Math.floor(metrics90d.avg),
      currentDeviation: dev90d,
      volatility: metrics90d.volatility,
      volumeAvg: metrics90d.volumeAvg
    },
    longTerm: {
      period: '365d',
      avgPrice: Math.floor(metrics365d.avg),
      currentDeviation: dev365d,
      volatility: metrics365d.volatility,
      volumeAvg: metrics365d.volumeAvg
    },
    
    maxDeviation,
    reversionPotential,
    confidenceScore,
    investmentGrade,
    
    volatilityRisk,
    liquidityScore,
    estimatedHoldingPeriod,
    
    botLikelihood,
    supplyStability,
    
    suggestedInvestment,
    targetSellPrice,
    stopLoss,
    reasoning
  };
}

/**
 * Rank opportunities by investment attractiveness
 */
export function rankInvestmentOpportunities(
  signals: MeanReversionSignal[]
): MeanReversionSignal[] {
  return signals.sort((a, b) => {
    // Primary: Investment grade
    const gradeValue = { 'A+': 6, 'A': 5, 'B+': 4, 'B': 3, 'C': 2, 'D': 1 };
    const gradeA = gradeValue[a.investmentGrade];
    const gradeB = gradeValue[b.investmentGrade];
    
    if (gradeA !== gradeB) return gradeB - gradeA;
    
    // Secondary: Reversion potential
    if (Math.abs(a.reversionPotential - b.reversionPotential) > 5) {
      return b.reversionPotential - a.reversionPotential;
    }
    
    // Tertiary: Confidence score
    return b.confidenceScore - a.confidenceScore;
  });
}

/**
 * Filter opportunities by minimum criteria
 */
export function filterViableOpportunities(
  signals: (MeanReversionSignal | null)[],
  minConfidence: number = 40,
  minReversionPotential: number = 10
): MeanReversionSignal[] {
  return signals
    .filter((s): s is MeanReversionSignal => s !== null)
    .filter(s => {
      // Must have some confidence (allowing lower scores to show more opportunities)
      if (s.confidenceScore < minConfidence) return false;
      
      // Must be actually undervalued (1%+ minimum to show in results)
      if (s.maxDeviation < 1) return false;
      
      // Must have at least some potential for gains
      if (s.reversionPotential < minReversionPotential) return false;
      
      // Include all grades - let UI sorting handle quality filtering
      return true;
    });
}
