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

  // ⭐ NEW: Temporal Analysis (Structural Repricing Detection)
  priceStability30d: number; // 0-100, how stable price has been (100 = no volatility)
  trendDirection: 'rising' | 'falling' | 'stable'; // 90d trend
  daysSinceLastMajorShift: number; // Days since >15% price change
  priceRange30d: { high: number; low: number; spread: number }; // Recent trading range
  momentum: 'accelerating_down' | 'decelerating_down' | 'flat' | 'accelerating_up' | 'decelerating_up';
  structuralRepricingRisk: 'very_high' | 'high' | 'moderate' | 'low'; // Risk this is NEW equilibrium, not temporary

  // Recommendation
  suggestedInvestment: number; // GP amount
  targetSellPrice: number;
  stopLoss: number;
  reasoning: string;
  botDumpScore: number;
  capitulationSignal: string;
  recoverySignal: string;
  entryPriceNow: number;
  entryRangeLow: number;
  entryRangeHigh: number;
  exitPriceBase: number;
  exitPriceStretch: number;
  holdNarrative: string;
  expectedRecoveryWeeks: number;

  // AI-provided price guidance
  buyIfDropsTo?: number; // Aggressive entry point
  sellAtMin?: number; // Conservative exit (covers GE tax)
  sellAtMax?: number; // Optimistic exit target
  abortIfRisesAbove?: number; // Stop-loss trigger

  // Phase 3: AI Intelligence enhancements
  logic?: {
    thesis: string; // The "Why"
    vulnerability: string; // The "Bear Case"
    trigger: string; // The invalidation point
  };
  volumeVelocity?: number; // Current volume / Average volume multiplier
  strategicNarrative?: string; // AI-generated detailed analysis
  auditorDecision?: 'approve' | 'caution' | 'reject'; // AI auditor decision
  auditorNotes?: string; // AI auditor's skeptical critique
  
  // Yearly trend context
  yearlyTrend?: number; // % change over 365 days (positive = uptrend, negative = downtrend)
  yearlyContext?: string; // Human-readable yearly trend assessment
}


export interface PriceDataPoint {
  timestamp: number;
  avgHighPrice: number;
  avgLowPrice: number;
  highPriceVolume: number;
  lowPriceVolume: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * PRICE VALIDATION - Ensures AI-generated price guidance is sane
 * Prevents issues like karambwan prices being 15x off
 */
export interface ValidatedPrices {
  entryOptimal: number;
  exitConservative: number;
  exitAggressive: number;
  triggerStop: number;
  violations: string[];
  useDefaults: boolean;
}

export function validateAndConstrainPrices(
  aiPrices: {
    entryOptimal?: number | null;
    exitConservative?: number | null;
    exitAggressive?: number | null;
    triggerStop?: number | null;
  },
  signal: {
    currentPrice: number;
    entryPriceNow: number;
    entryRangeLow: number;
    entryRangeHigh: number;
    exitPriceBase: number;
    exitPriceStretch: number;
    stopLoss: number;
    longTerm: TimeframeData;
    shortTerm: TimeframeData;
  }
): ValidatedPrices {
  const violations: string[] = [];

  // Get historical context from signal
  const currentPrice = signal.currentPrice;

  // Validate entry price
  let entryOptimal = aiPrices.entryOptimal ?? signal.entryPriceNow;
  if (!entryOptimal || entryOptimal <= 0) {
    entryOptimal = signal.entryPriceNow;
  } else if (entryOptimal > currentPrice * 1.15 || entryOptimal < currentPrice * 0.85) {
    // Entry must be within ±15% of current (give AI more flexibility than server gate)
    violations.push(
      `Entry ${entryOptimal}gp is ${Math.abs(entryOptimal / currentPrice - 1) * 100}% off current ${currentPrice}gp`
    );
    entryOptimal = clamp(entryOptimal, Math.max(1, currentPrice * 0.90), currentPrice * 1.10);
  }

  // Validate exit prices
  let exitConservative =
    aiPrices.exitConservative ?? signal.exitPriceBase ?? currentPrice;
  let exitAggressive =
    aiPrices.exitAggressive ?? signal.exitPriceStretch ?? currentPrice;

  if (!exitConservative || exitConservative <= entryOptimal) {
    violations.push(
      `Exit conservative ${exitConservative}gp <= entry ${entryOptimal}gp`
    );
    exitConservative = signal.exitPriceBase;
  } else if (exitConservative > currentPrice * 3) {
    // Exit shouldn't be >3x current price (unless item is extremely depressed)
    const upside = exitConservative / currentPrice;
    if (upside > 5) {
      violations.push(
        `Exit conservative ${exitConservative}gp is ${(upside * 100).toFixed(0)}% above current - unrealistic recovery`
      );
      exitConservative = Math.min(
        signal.exitPriceBase,
        Math.max(entryOptimal * 1.2, currentPrice * 1.5)
      );
    }
  }

  if (!exitAggressive || exitAggressive < exitConservative) {
    violations.push(
      `Exit aggressive ${exitAggressive}gp < conservative ${exitConservative}gp`
    );
    exitAggressive = signal.exitPriceStretch;
  }

  // Validate stop loss
  let triggerStop = aiPrices.triggerStop ?? signal.stopLoss;
  if (!triggerStop || triggerStop >= entryOptimal) {
    violations.push(`Stop loss ${triggerStop}gp >= entry ${entryOptimal}gp`);
    triggerStop = Math.max(1, Math.round(entryOptimal * 0.90));
  }

  // Detect major violations that warrant using defaults
  if (violations.length >= 2) {
    console.warn(
      `⚠️ PRICE GUIDANCE: Multiple violations detected for item. Using default ranges.`,
      violations
    );
    return {
      entryOptimal: signal.entryPriceNow,
      exitConservative: signal.exitPriceBase,
      exitAggressive: signal.exitPriceStretch,
      triggerStop: signal.stopLoss,
      violations,
      useDefaults: true,
    };
  }

  return {
    entryOptimal,
    exitConservative,
    exitAggressive,
    triggerStop,
    violations,
    useDefaults: false,
  };
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
 * Calculate confidence score for mean reversion with bot-dump emphasis
 */
function calculateConfidence({
  mediumDeviation,
  longDeviation,
  liquidityScore,
  supplyStability,
  volatilityRisk,
  downtrendPenalty = 0,
  botDumpScore,
  recoveryStrength,
}: {
  mediumDeviation: number;
  longDeviation: number;
  liquidityScore: number;
  supplyStability: number;
  volatilityRisk: 'low' | 'medium' | 'high';
  downtrendPenalty?: number;
  botDumpScore: number;
  recoveryStrength: number;
}): number {
  const weightedDeviation = Math.max(0, mediumDeviation) * 0.65 + Math.max(0, longDeviation) * 0.35;
  let confidence = weightedDeviation * 2.2;

  // Boost confidence more significantly for bot-suppressed items (this is the strategy!)
  if (botDumpScore > 0) {
    confidence += Math.min(35, botDumpScore * 0.35);
  }

  if (recoveryStrength > 0) {
    confidence += Math.min(15, recoveryStrength * 0.2);
  }

  if (volatilityRisk === 'low') {
    confidence += 8;
  } else if (volatilityRisk === 'medium') {
    confidence -= 8;
  } else {
    confidence -= 18;
  }

  if (supplyStability >= 80) {
    confidence += 6;
  } else if (supplyStability < 30) {
    confidence -= 8;
  }

  if (liquidityScore >= 70) {
    confidence += 5;
  } else if (liquidityScore < 20) {
    confidence -= 5;
  }

  // Only apply downtrend penalty if NOT bot-suppressed
  // (Bot suppression causes downtrends - that's the opportunity, not a penalty!)
  confidence -= downtrendPenalty;

  return clamp(confidence, 0, 100);
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
 * Convert expected recovery in weeks into a readable holding period string
 */
function estimateHoldingPeriod(expectedRecoveryWeeks: number): string {
  if (expectedRecoveryWeeks <= 2) return '1-2 weeks';
  if (expectedRecoveryWeeks <= 4) return '2-4 weeks';
  if (expectedRecoveryWeeks <= 8) return '1-2 months';
  if (expectedRecoveryWeeks <= 12) return '2-3 months';
  return '3-6 months';
}


/**
 * Generate investment recommendation narrative
 */
function generateRecommendation(
  itemName: string,
  _currentPrice: number,
  reversionPotential: number,
  confidenceScore: number,
  botLikelihood: string,
  maxDeviation: number,
  downtrendReasoning: string | undefined,
  capitulationSignal: string,
  recoverySignal: string,
  estimatedHoldingPeriod: string
): string {
  const notes: string[] = [];

  if (maxDeviation > 0) {
    notes.push(`Trading ${maxDeviation.toFixed(1)}% under blended 90/365d averages`);
  }

  if (capitulationSignal) {
    notes.push(capitulationSignal);
  }

  if (recoverySignal) {
    notes.push(recoverySignal);
  }

  if (botLikelihood === 'very high' || botLikelihood === 'high') {
    notes.push('Bot supply pattern detected – bans historically trigger fast rebounds');
  }

  if (downtrendReasoning && !/No (strong|significant) downtrend/i.test(downtrendReasoning)) {
    notes.push(downtrendReasoning);
  }

  if (reversionPotential > 0) {
    notes.push(`Upside ≈ ${reversionPotential.toFixed(1)}% with ${estimatedHoldingPeriod} hold`);
  }

  notes.push(`Confidence ${confidenceScore.toFixed(0)}% on ${itemName}`);

  const sanitize = (text: string) => text.replace(/\s+/g, ' ').trim();

  return notes
    .map(sanitize)
    .filter(Boolean)
    .map(note => (note.endsWith('.') ? note.slice(0, -1) : note))
    .join('. ') + '.';
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
 * For bot-suppressed items, downtrends are EXPECTED (that's the opportunity!)
 * Only heavily penalize organic downtrends (non-bot items declining)
 */
function assessDowntrendPenalty(
  priceData: PriceDataPoint[],
  botLikelihood: 'very high' | 'high' | 'medium' | 'low'
): {
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
    
    // CHECK BOT LIKELIHOOD: If high bot activity, downtrend is likely bot-driven suppression (opportunity!)
    if (botLikelihood === 'very high' || botLikelihood === 'high') {
      // Bot-driven downtrend = sustained suppression = mean-reversion opportunity
      // Minimal penalty since this is actually the signal we want
      console.log(`[DOWNTREND-CHECK] High bot activity detected - downtrend likely bot suppression, minimal penalty`);
      return {
        penalty: 10,  // Minimal penalty for bot-driven downtrends
        reasoning: `Downtrend (${declinePercent.toFixed(0)}% from peak) likely bot-driven suppression - mean-reversion opportunity`,
      };
    }
    
    // Non-bot item with strong downtrend = organic decline (risky)
    // Check if it's stabilizing (mitigates penalty)
    const { isReversing, reversingStrength, foundSupport } = detectTrendReversal(priceData);
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

// ============================================
// ⭐ NEW: TEMPORAL ANALYSIS FUNCTIONS
// Detect structural repricing vs temporary bot suppression
// ============================================

/**
 * Calculate price stability over last 30 days
 * Returns 0-100 where 100 = perfectly stable (no volatility)
 */
function calculatePriceStability(priceData: PriceDataPoint[], days: number = 30): number {
  const cutoffTime = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);
  const relevantData = priceData.filter(d => d.timestamp >= cutoffTime);
  
  if (relevantData.length < 3) return 50; // Not enough data
  
  const prices = relevantData.map(d => (d.avgHighPrice + d.avgLowPrice) / 2);
  const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  
  if (avg === 0) return 50;
  
  // Calculate coefficient of variation (CV) = (stddev / mean) * 100
  const squaredDiffs = prices.map(p => Math.pow(p - avg, 2));
  const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / prices.length;
  const stdDev = Math.sqrt(variance);
  const cv = (stdDev / avg) * 100; // Percentage volatility
  
  // Convert to stability score (inverse of volatility)
  // CV of 0% = 100 stability, CV of 20%+ = 0 stability
  const stability = Math.max(0, 100 - (cv * 5));
  return Math.round(stability);
}

/**
 * Determine trend direction over 90 days
 */
function calculateTrendDirection(priceData: PriceDataPoint[]): 'rising' | 'falling' | 'stable' {
  const cutoffTime = Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60);
  const relevantData = priceData.filter(d => d.timestamp >= cutoffTime);
  
  if (relevantData.length < 10) return 'stable';
  
  // Compare first third vs last third
  const thirdSize = Math.floor(relevantData.length / 3);
  const firstThird = relevantData.slice(0, thirdSize);
  const lastThird = relevantData.slice(-thirdSize);
  
  const avgFirst = firstThird.reduce((sum, d) => sum + (d.avgHighPrice + d.avgLowPrice) / 2, 0) / firstThird.length;
  const avgLast = lastThird.reduce((sum, d) => sum + (d.avgHighPrice + d.avgLowPrice) / 2, 0) / lastThird.length;
  
  const changePercent = ((avgLast - avgFirst) / avgFirst) * 100;
  
  if (changePercent > 5) return 'rising';
  if (changePercent < -5) return 'falling';
  return 'stable';
}

/**
 * Calculate days since last major price shift (>15% change sustained for 3+ days)
 */
function calculateDaysSinceLastMajorShift(priceData: PriceDataPoint[]): number {
  if (priceData.length < 5) return 0;
  
  const prices = priceData.map(d => ({
    timestamp: d.timestamp,
    price: (d.avgHighPrice + d.avgLowPrice) / 2
  }));
  
  // Walk backwards from most recent
  for (let i = prices.length - 1; i >= 4; i--) {
    const currentPrice = prices[i].price;
    const olderPrice = prices[i - 3].price; // 3 days earlier
    
    const changePercent = Math.abs(((currentPrice - olderPrice) / olderPrice) * 100);
    
    if (changePercent > 15) {
      // Found a major shift!
      const daysSince = Math.floor((Date.now() / 1000 - prices[i].timestamp) / (24 * 60 * 60));
      return daysSince;
    }
  }
  
  // No major shift found in available data
  return Math.min(365, priceData.length); // Return data age or 365, whichever is less
}

/**
 * Calculate 30-day high/low range
 */
function calculatePriceRange(priceData: PriceDataPoint[], days: number = 30): { high: number; low: number; spread: number } {
  const cutoffTime = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);
  const relevantData = priceData.filter(d => d.timestamp >= cutoffTime);
  
  if (relevantData.length === 0) {
    return { high: 0, low: 0, spread: 0 };
  }
  
  const prices = relevantData.map(d => (d.avgHighPrice + d.avgLowPrice) / 2);
  const high = Math.max(...prices);
  const low = Math.min(...prices);
  const spread = high > 0 ? ((high - low) / low) * 100 : 0;
  
  return { high: Math.round(high), low: Math.round(low), spread: Math.round(spread * 10) / 10 };
}

/**
 * Calculate price momentum (velocity and acceleration)
 */
function calculateMomentum(priceData: PriceDataPoint[]): 'accelerating_down' | 'decelerating_down' | 'flat' | 'accelerating_up' | 'decelerating_up' {
  if (priceData.length < 14) return 'flat';
  
  const recent7d = priceData.slice(-7);
  const prior7d = priceData.slice(-14, -7);
  
  if (recent7d.length < 3 || prior7d.length < 3) return 'flat';
  
  const avgRecent = recent7d.reduce((sum, d) => sum + (d.avgHighPrice + d.avgLowPrice) / 2, 0) / recent7d.length;
  const avgPrior = prior7d.reduce((sum, d) => sum + (d.avgHighPrice + d.avgLowPrice) / 2, 0) / prior7d.length;
  const avgOlder = priceData.slice(-21, -14).reduce((sum, d) => sum + (d.avgHighPrice + d.avgLowPrice) / 2, 0) / Math.max(1, priceData.slice(-21, -14).length);
  
  const recentChange = ((avgRecent - avgPrior) / avgPrior) * 100;
  const priorChange = ((avgPrior - avgOlder) / avgOlder) * 100;
  
  // Determine direction
  if (Math.abs(recentChange) < 2) return 'flat';
  
  if (recentChange < 0) {
    // Price falling
    if (priorChange < 0 && Math.abs(recentChange) > Math.abs(priorChange)) {
      return 'accelerating_down'; // Getting worse
    }
    return 'decelerating_down'; // Slowing fall
  } else {
    // Price rising
    if (priorChange > 0 && recentChange > priorChange) {
      return 'accelerating_up'; // Getting faster
    }
    return 'decelerating_up'; // Slowing rise
  }
}

/**
 * Assess structural repricing risk
 * CRITICAL: High risk = this is new equilibrium, NOT a mean-reversion opportunity
 */
function assessStructuralRepricingRisk(
  stability: number,
  daysSinceMajorShift: number,
  trend: 'rising' | 'falling' | 'stable',
  momentum: string
): 'very_high' | 'high' | 'moderate' | 'low' {
  
  // VERY HIGH RISK: Stable for 90+ days = new equilibrium
  if (daysSinceMajorShift > 90 && stability > 70) {
    return 'very_high'; // Dragon dart scenario - stable 7 months
  }
  
  // HIGH RISK: Stable for 60+ days with clear trend
  if (daysSinceMajorShift > 60 && stability > 60 && trend !== 'stable') {
    return 'high';
  }
  
  // Additional HIGH RISK: Falling with accelerating momentum = organic decline
  if (trend === 'falling' && momentum === 'accelerating_down') {
    return 'high';
  }
  
  // MODERATE RISK: Stable for 30+ days
  if (daysSinceMajorShift > 30 && stability > 50) {
    return 'moderate';
  }
  
  // LOW RISK: Recent volatility = likely temporary suppression
  return 'low';
}

/**
 * MAIN ANALYSIS FUNCTION
 * Analyzes an item for mean-reversion investment opportunities
 */
export function calculateMaxDeviation(priceData: PriceDataPoint[]): number {
  if (!priceData || priceData.length < 5) return 0;

  const metrics7d = calculateTimeframeMetrics(priceData, 7);
  const metrics30d = calculateTimeframeMetrics(priceData, 30);
  const metrics90d = calculateTimeframeMetrics(priceData, 90);
  const metrics180d = calculateTimeframeMetrics(priceData, 180);
  const metrics365d = calculateTimeframeMetrics(priceData, 365);

  const latest = priceData[priceData.length - 1];
  const currentPrice = (latest.avgHighPrice + latest.avgLowPrice) / 2;

  const dev7d = metrics7d.avg > 0 ? ((metrics7d.avg - currentPrice) / metrics7d.avg) * 100 : 0;
  const dev30d = metrics30d.avg > 0 ? ((metrics30d.avg - currentPrice) / metrics30d.avg) * 100 : 0;
  const dev90d = metrics90d.avg > 0 ? ((metrics90d.avg - currentPrice) / metrics90d.avg) * 100 : 0;
  const dev180d = metrics180d.avg > 0 ? ((metrics180d.avg - currentPrice) / metrics180d.avg) * 100 : 0;
  const dev365d = metrics365d.avg > 0 ? ((metrics365d.avg - currentPrice) / metrics365d.avg) * 100 : 0;
  return Math.max(dev7d, dev30d, dev90d, dev180d, dev365d);
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
  const maxDeviation = calculateMaxDeviation(priceData);

  const metrics7d = calculateTimeframeMetrics(priceData, 7);
  const metrics30d = calculateTimeframeMetrics(priceData, 30);
  const metrics90d = calculateTimeframeMetrics(priceData, 90);
  const metrics180d = calculateTimeframeMetrics(priceData, 180);
  const metrics365d = calculateTimeframeMetrics(priceData, 365);

  const latest = priceData[priceData.length - 1];
  const currentPrice = (latest.avgHighPrice + latest.avgLowPrice) / 2;

  const dev7d = metrics7d.avg > 0 ? ((metrics7d.avg - currentPrice) / metrics7d.avg) * 100 : 0;
  const dev30d = metrics30d.avg > 0 ? ((metrics30d.avg - currentPrice) / metrics30d.avg) * 100 : 0;
  const dev90d = metrics90d.avg > 0 ? ((metrics90d.avg - currentPrice) / metrics90d.avg) * 100 : 0;
  const dev180d = metrics180d.avg > 0 ? ((metrics180d.avg - currentPrice) / metrics180d.avg) * 100 : 0;
  const dev365d = metrics365d.avg > 0 ? ((metrics365d.avg - currentPrice) / metrics365d.avg) * 100 : 0;

  const { likelihood: botLikelihood, supplyStability } = assessBotLikelihood(priceData);

  const mediumDeviation = Math.max(0, dev90d, dev30d);
  const longDeviation = Math.max(0, dev365d, dev180d);

  const shortTermShock = Math.max(0, dev7d - dev30d);
  const mediumGap = Math.max(0, dev30d - dev90d);
  const longGap = Math.max(0, dev90d - dev365d);

  const volumeSpikeRatio =
    metrics30d.volumeAvg > 0 ? metrics7d.volumeAvg / Math.max(1, metrics30d.volumeAvg) : 1;

  // BALANCED SCORING: Bot farms can suppress prices over 2-4 weeks (medium) AND long-term
  // Prioritize medium + long gaps while still valuing short-term movements
  let botDumpScore =
    shortTermShock * 2.0 +    // Recent activity (7d vs 30d) - still important
    mediumGap * 2.5 +         // 2-4 week bot activity (30d vs 90d) - HIGH priority
    longGap * 2.5 +           // Long-term suppression (90d vs 365d) - HIGH priority
    (volumeSpikeRatio > 1 ? (volumeSpikeRatio - 1) * 35 : 0);  // Increased volume weight

  botDumpScore +=
    botLikelihood === 'very high'
      ? 20
      : botLikelihood === 'high'
        ? 15
        : botLikelihood === 'medium'
          ? 8
          : 0;

  botDumpScore += Math.max(0, supplyStability - 60) * 0.2;
  botDumpScore = clamp(botDumpScore, 0, 100);

  const capitulationReasons: string[] = [];
  if (shortTermShock > 4) {
    capitulationReasons.push(`${shortTermShock.toFixed(1)}% drop vs 30d avg this week`);
  }
  if (volumeSpikeRatio > 1.25) {
    capitulationReasons.push(`${((volumeSpikeRatio - 1) * 100).toFixed(0)}% volume spike (bot dump)`);
  }
  if (mediumGap > 3) {
    capitulationReasons.push(`${mediumGap.toFixed(1)}% deeper than 90d average`);
  }

  const capitulationSignal = capitulationReasons.length
    ? `Capitulation: ${capitulationReasons.join('; ')}`
    : 'Capitulation: mild drift (no major dump detected)';

  const { isReversing, reversingStrength, foundSupport } = detectTrendReversal(priceData);
  let recoveryStrength = (isReversing ? reversingStrength : 0) + (foundSupport ? 12 : 0);
  recoveryStrength += Math.max(0, longDeviation - shortTermShock) * 0.4;
  recoveryStrength = clamp(recoveryStrength, 0, 100);

  const recoveryReasons: string[] = [];
  if (isReversing) {
    recoveryReasons.push(`Reversal slope strength ${reversingStrength}%`);
  }
  if (foundSupport) {
    recoveryReasons.push('Support forming near recent lows');
  }
  if (recoveryStrength > 50) {
    recoveryReasons.push('Momentum turning upward');
  }

  const recoverySignal = recoveryReasons.length
    ? `Recovery: ${recoveryReasons.join('; ')}`
    : 'Recovery: accumulation phase (monitor for bounce confirmation)';

  const targetAnchor = Math.max(metrics90d.avg, metrics180d.avg, metrics365d.avg);
  const exitPriceBase = Math.round(Math.max(currentPrice * 1.06, targetAnchor * 0.99));
  const exitPriceStretch = Math.round(Math.max(exitPriceBase * 1.05, targetAnchor * 1.03));

  const entryPriceNow = Math.round(currentPrice);
  const entryRangeLow = Math.max(1, Math.round(currentPrice * 0.985));
  const entryRangeHigh = Math.round(currentPrice * 1.015);

  const stopLoss = Math.max(1, Math.round(Math.min(currentPrice * 0.93, targetAnchor * 0.88)));

  const reversionPotential = ((exitPriceBase - currentPrice) / currentPrice) * 100;

  const liquidityScore = calculateLiquidityScore(metrics30d.volumeAvg);
  const volatilityRisk = assessVolatilityRisk(metrics7d.volatility, metrics90d.volatility, currentPrice);

  const { penalty: downtrendPenalty, reasoning: downtrendReasoning } = assessDowntrendPenalty(
    priceData,
    botLikelihood
  );

  // Calculate yearly trend (% change from 365d ago to now)
  const yearlyPrices = priceData.filter(d => d.timestamp >= Math.floor(Date.now() / 1000) - (365 * 24 * 60 * 60));
  let yearlyTrend = 0;
  let yearlyContext = 'Neutral long-term trend';
  if (yearlyPrices.length > 30) {
    const firstPrice = (yearlyPrices[0].avgHighPrice + yearlyPrices[0].avgLowPrice) / 2;
    yearlyTrend = firstPrice > 0 ? ((currentPrice - firstPrice) / firstPrice) * 100 : 0;
    
    if (yearlyTrend < -20) {
      yearlyContext = `⚠️ WARNING: Yearly downtrend (${yearlyTrend.toFixed(0)}%)`;
    } else if (yearlyTrend < -10) {
      yearlyContext = `⚠️ Caution: Declining yearly (${yearlyTrend.toFixed(0)}%)`;
    } else if (yearlyTrend > 20) {
      yearlyContext = `✅ STRONG: Yearly uptrend (+${yearlyTrend.toFixed(0)}%)`;
    } else if (yearlyTrend > 10) {
      yearlyContext = `✅ Positive yearly trend (+${yearlyTrend.toFixed(0)}%)`;
    } else {
      yearlyContext = `Neutral yearly trend (${yearlyTrend >= 0 ? '+' : ''}${yearlyTrend.toFixed(0)}%)`;
    }
  }

  const confidenceScore = calculateConfidence({
    mediumDeviation,
    longDeviation,
    liquidityScore,
    supplyStability,
    volatilityRisk,
    downtrendPenalty,
    botDumpScore,
    recoveryStrength,
  });

  const investmentGrade = assignInvestmentGrade(confidenceScore);

  const baseDeviationForTiming = Math.max(8, mediumDeviation * 0.6 + longDeviation * 0.4);
  const botSpeed =
    botLikelihood === 'very high'
      ? 0.6
      : botLikelihood === 'high'
        ? 0.75
        : botLikelihood === 'medium'
          ? 1
          : 1.25;
  const recoveryModifier = recoveryStrength > 60 ? 0.8 : recoveryStrength > 35 ? 0.95 : 1.15;
  const expectedRecoveryWeeks = Math.max(
    2,
    Math.round((baseDeviationForTiming / 5) * botSpeed * recoveryModifier)
  );
  const estimatedHoldingPeriod = estimateHoldingPeriod(expectedRecoveryWeeks);

  const baseSuggestion = 12_000_000;
  const liquidityFactor = clamp(liquidityScore / 90, 0.4, 1.1);
  const dumpFactor = 0.7 + botDumpScore / 200;
  const suggestedInvestment = Math.round(
    clamp(baseSuggestion * (confidenceScore / 100) * liquidityFactor * dumpFactor, 500_000, 25_000_000)
  );

  const targetSellPrice = exitPriceBase;

  const reasoning = generateRecommendation(
    itemName,
    currentPrice,
    reversionPotential,
    confidenceScore,
    botLikelihood,
    maxDeviation,
    downtrendReasoning,
    capitulationSignal,
    recoverySignal,
    estimatedHoldingPeriod
  );

  // ⭐ Calculate new temporal analysis metrics
  const priceStability30d = calculatePriceStability(priceData, 30);
  const trendDirection = calculateTrendDirection(priceData);
  const daysSinceLastMajorShift = calculateDaysSinceLastMajorShift(priceData);
  const priceRange30d = calculatePriceRange(priceData, 30);
  const momentum = calculateMomentum(priceData);
  const structuralRepricingRisk = assessStructuralRepricingRisk(
    priceStability30d,
    daysSinceLastMajorShift,
    trendDirection,
    momentum
  );

  const holdNarrative = `Buy between ${entryRangeLow}-${entryRangeHigh}gp (current ${entryPriceNow}gp). Target ${exitPriceBase}-${exitPriceStretch}gp over ${estimatedHoldingPeriod}. Reassess if closes below ${stopLoss}gp or if volume spikes beyond ${Math.round(metrics30d.volumeAvg * 1.4)} units.`;

  return {
    itemId,
    itemName,
    currentPrice: entryPriceNow,

    shortTerm: {
      period: '7d',
      avgPrice: Math.round(metrics7d.avg),
      currentDeviation: dev7d,
      volatility: metrics7d.volatility,
      volumeAvg: metrics7d.volumeAvg,
    },
    mediumTerm: {
      period: '90d',
      avgPrice: Math.round(metrics90d.avg),
      currentDeviation: dev90d,
      volatility: metrics90d.volatility,
      volumeAvg: metrics90d.volumeAvg,
    },
    longTerm: {
      period: '365d',
      avgPrice: Math.round(metrics365d.avg),
      currentDeviation: dev365d,
      volatility: metrics365d.volatility,
      volumeAvg: metrics365d.volumeAvg,
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

    // Temporal analysis (structural repricing detection)
    priceStability30d,
    trendDirection,
    daysSinceLastMajorShift,
    priceRange30d,
    momentum,
    structuralRepricingRisk,

    suggestedInvestment,
    targetSellPrice,
    stopLoss,
    reasoning,
    botDumpScore,
    capitulationSignal,
    recoverySignal,
    entryPriceNow,
    entryRangeLow,
    entryRangeHigh,
    exitPriceBase,
    exitPriceStretch,
    holdNarrative,
    expectedRecoveryWeeks,
    
    // Yearly trend context
    yearlyTrend,
    yearlyContext,
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
