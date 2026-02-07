# Alpha Feed Analysis - REVISED (Cost-Conscious, Long-Term Bot Suppression)

## Executive Summary - Critical Corrections

### What I Got Wrong Initially:
1. **Bot Dump Strategy Misunderstanding**: Assumed flash dumps (minutes/hours) requiring constant monitoring
   - **Reality**: You want items suppressed by LONG-TERM bot activity, trading below historical averages
   - **Impact**: Current system is actually BETTER suited for this than I thought

2. **ROI Fallacy**: Calculated "327,000% ROI" on GPT-4o upgrade treating game profits as real revenue
   - **Reality**: All profits are pixels (OSRS gold), all costs are real money out of pocket
   - **Impact**: Cost efficiency is CRITICAL, not a nice-to-have

### Revised Bottom Line:
✅ **Good News**: Your system architecture is well-suited for long-term suppression detection (365d historical data, multi-timeframe analysis)  
⚠️ **Real Issue**: Scoring and prompts emphasize SHORT-TERM gaps when you want LONG-TERM mean-reversion  
💰 **Cost Reality**: Focus on FREE improvements first, only upgrade model if absolutely necessary

---

## Your Actual Strategy (Clarified)

**What You Want:**
- Items where long-term bot activity has suppressed prices below historical norms (90d/180d/365d averages)
- NOT flash dumps requiring constant monitoring
- Patient holds (weeks to months) waiting for mean-reversion to historical averages
- Recovery happens when: Bots get banned, supply normalizes, price rebounds to historical mean
- Time horizon: Weeks to months (not days, not years)

**Key Insight**: This is **mean-reversion trading** - buy when significantly below historical average, sell when price reverts to norm.

---

## Critical Analysis - What's Actually Wrong

### ❌ Issue 1: Scoring Weights Are BACKWARDS For Your Strategy

**Current Bot Dump Scoring** (lib/meanReversionAnalysis.ts lines 658-684):
```typescript
const botDumpScore = 
  (shortTermShock * 2.4) +     // 7d vs 30d - HIGHEST weight
  (mediumGap * 1.6) +          // 30d vs 90d - MEDIUM weight  
  (longGap * 1.1) +            // 90d vs 365d - LOWEST weight
  volumeSpikeBonus + 
  botLikelihoodPoints;
```

**Problem**: This prioritizes SHORT-TERM shocks (7d vs 30d) which catches flash dumps, NOT long-term suppression.

**Your Strategy Needs**: Items trading below 90d/180d/365d averages due to sustained bot pressure.

**Fix**: REVERSE the weighting:
```typescript
const longTermSuppressionScore = 
  (longGap * 3.0) +             // 90d vs 365d - HIGHEST (sustained suppression)
  (mediumGap * 2.0) +           // 30d vs 90d - MEDIUM (confirmation)
  (shortTermShock * 1.0) +      // 7d vs 30d - LOWEST (recent movement)
  sustainedPressureBonus +      // How long below average
  botLikelihoodMultiplier;      // High bot activity = more confidence
```

---

### ❌ Issue 2: AI Prompt Doesn't Explain Your Strategy

**Current Prompt** (route.ts lines 148-172):
- Generic "viable investment opportunity"
- Vague criteria: "realistic upside 10-15%"
- No mention of historical averages or mean-reversion
- Doesn't explain bot ban cycles

**Your Strategy Needs**: AI understanding that you're buying items BELOW historical norms expecting reversion when bot supply decreases.

**Impact**: AI doesn't understand WHY an item at -30% from 365d average is a good opportunity.

---

### ❌ Issue 3: Confidence Calculation Emphasizes Wrong Signals

**Current Confidence** (lines 325-357):
- Base: `weightedDeviation * 2.2` (good - this IS mean-reversion strength)
- Bot dump bonus: Only +20 max (too low for your strategy)
- Downtrend penalty: -70 points (probably too harsh for long-term suppression)

**Problem for Your Strategy**:
- An item at -40% from 365d average with high bot activity SHOULD score very high
- But if it has 90-day downtrend, it gets -70 penalty
- You WANT items in downtrends due to bot pressure (that's the opportunity!)

**Fix**: 
- Distinguish between "organic downtrend" (bad) vs "bot-suppressed" (opportunity)
- If high bot likelihood + trading below historical average = remove downtrend penalty
- Boost confidence for items significantly below 180d/365d means

---

### ❌ Issue 4: Cost Efficiency Not Prioritized

**Current Costs** (with gpt-4o-mini):
- $0.03 per scan
- 10 users × 10 scans/day × 30 days = 3,000 scans/month = **~$90/month**
- Already a significant out-of-pocket cost with no revenue

**My Previous Recommendation** (GPT-4o upgrade):
- Would be $0.10 per scan
- Same usage = **~$300/month** out of pocket
- +$210/month with NO real-world income to justify it

**Reality Check**: You can't justify expensive AI when profits are game pixels, not dollars.

---

## Revised Recommendations (Cost-Conscious)

### 🌟 Priority 1: Rewrite Bot Dump Scoring for Long-Term Suppression (FREE)

**Change**: Invert the timeframe weights to prioritize long-term gaps

**Code Changes** (lib/meanReversionAnalysis.ts lines 658-684):

```typescript
// OLD (flash dump focused):
const botDumpScore = 
  (shortTermShock * 2.4) + (mediumGap * 1.6) + (longGap * 1.1) + ...;

// NEW (long-term suppression focused):
const longTermSuppressionScore = 
  (longGap * 3.0) +              // 90d vs 365d = sustained suppression
  (mediumGap * 2.0) +            // 30d vs 90d = confirmation  
  (shortTermShock * 1.0) +       // 7d vs 30d = recent context (de-emphasized)
  volumeSpikeBonus +
  (botLikelihoodPoints * 1.5);   // Make bot likelihood more impactful
```

**Add New Metric**: "Days Below Historical Average"
```typescript
// Track how long price has been suppressed
const daysBelow365dAvg = calculateDaysBelowAverage(prices, avg365d);
const sustainedSuppressionBonus = Math.min(20, daysBelow365dAvg / 3); // +20 if below for 60+ days
```

**Expected Impact**:
- Items with long-term suppression rank higher
- Flash dumps (7d spikes) rank lower
- Better alignment with your patient hold strategy
- **Cost: $0** | **Effort: 2-3 hours**

---

### 🌟 Priority 2: Improve gpt-4o-mini Prompt for Mean-Reversion Strategy (FREE)

**Change**: Rewrite prompt to explain your actual strategy

**New Prompt Structure** (route.ts lines 148-172):

```typescript
const prompt = `You are an expert OSRS economist analyzing mean-reversion opportunities in items suppressed by long-term bot activity.

STRATEGY CONTEXT:
- Target: Items trading significantly below historical averages (90d/180d/365d) due to sustained bot farming
- Goal: Buy undervalued items, hold weeks/months, profit when price reverts to historical mean
- Recovery Drivers: Bot bans, supply normalization, market mean-reversion
- Time Horizon: Patient holds (2-12 weeks), NOT quick flips

YOUR TASK:
Analyze each item to determine if it's a viable long-term mean-reversion opportunity.

APPROVAL CRITERIA (must meet ALL):
1. Trading at least 15% below 180d or 365d average (sustained suppression)
2. High bot likelihood (indicates bot supply is suppressing price)
3. Strong historical average to revert to (item has stable long-term demand)
4. Confidence score >70% (strong mean-reversion setup)
5. Expected return >20% to historical average within 2-12 weeks

RED FLAGS (reject if present):
- No clear historical average (low trading volume, new item)
- Organic decline (demand destroyed, not just bot supply)
- Already near or above historical average (no suppression)
- Extremely long recovery timeframe (>6 months = too slow)

For each item, respond with:
{
  "decision": "include" or "exclude",
  "reasoning": "2-3 sentences explaining WHY this is/isn't a good long-term mean-reversion play",
  "confidence": 0-100 (your confidence in this analysis)
}
`;
```

**Key Changes**:
- Explains mean-reversion strategy explicitly
- Emphasizes LONG-TERM suppression (not flash dumps)
- Gives AI context about bot ban cycles
- Sets clear approval criteria (>15% below historical average)
- Tells AI to check if item has stable historical mean to revert to

**Expected Impact**:
- AI understands your strategy instead of guessing
- Better filtering aligned with patient holds strategy
- More consistent recommendations
- **Cost: $0** | **Effort: 1-2 hours**

---

### 🌟 Priority 3: Narrow Item Pool to Save Costs (SAVES ~$45/MONTH)

**Change**: Reduce from 110 items to 50-60 highest bot-activity items

**Create**: `lib/coreBotSuppressionPool.ts`

```typescript
// Focus on items with:
// 1. botLikelihood = "very_high" or "high"
// 2. volumeTier = "massive" or "high"  
// 3. Stable historical demand (not seasonal/dead items)

export const CORE_BOT_SUPPRESSION_POOL: ItemPoolEntry[] = [
  // Runes (heavily botted, stable demand)
  { id: 563, name: "Law rune", botLikelihood: "very_high", volumeTier: "massive" },
  { id: 560, name: "Death rune", botLikelihood: "very_high", volumeTier: "massive" },
  { id: 565, name: "Blood rune", botLikelihood: "very_high", volumeTier: "massive" },
  
  // Resources (bot farmed, always in demand)
  { id: 1513, name: "Magic logs", botLikelihood: "very_high", volumeTier: "massive" },
  { id: 1515, name: "Yew logs", botLikelihood: "very_high", volumeTier: "massive" },
  { id: 440, name: "Iron ore", botLikelihood: "very_high", volumeTier: "massive" },
  
  // PvM essentials (stable demand)
  { id: 385, name: "Shark", botLikelihood: "high", volumeTier: "massive" },
  { id: 3144, name: "Karambwan", botLikelihood: "high", volumeTier: "massive" },
  
  // ... 42-52 more items with very_high/high bot activity
];
```

**Update route.ts**:
```typescript
// Use narrowed pool
const itemsToAnalyze = CORE_BOT_SUPPRESSION_POOL;
```

**Expected Impact**:
- 50% fewer items = 50% cost reduction
- **Saves: ~$45/month** (3,000 scans → 1,500 scans)
- Faster scans (80-90 seconds instead of 160 seconds)
- More focused feed (higher signal-to-noise ratio)
- **Cost: SAVES $45/month** | **Effort: 1-2 hours**

---

### 🌟 Priority 4: Adjust Confidence for Long-Term Suppression (FREE)

**Change**: Make confidence calculation reward long-term suppression

**Code Changes** (lib/meanReversionAnalysis.ts lines 325-357):

```typescript
// OLD confidence calculation:
let confidence = weightedDeviation * 2.2;
confidence += Math.min(20, botDumpScore * 0.25); // Only +20 max

// NEW for long-term suppression:
let confidence = weightedDeviation * 2.2; // Keep base (mean-reversion strength)

// Boost for long-term suppression (not just dumps)
const longTermGap = Math.abs(currentPrice - avg365d) / avg365d * 100;
if (longTermGap > 20 && botLikelihood === "very_high") {
  confidence += Math.min(40, longTermSuppressionScore * 0.4); // Up to +40 for strong suppression
}

// DON'T penalize bot-suppressed items for downtrends
if (downtrend.isDowntrending && botLikelihood !== "very_high") {
  confidence -= downtrend.severity; // Only penalize if NOT bot-suppressed
}
// If high bot suppression, downtrend is actually the SIGNAL (not a penalty)
```

**Key Logic**:
- Long-term suppression (>20% below 365d avg + high bots) adds up to +40 confidence
- Remove downtrend penalty for high bot likelihood items (downtrend = opportunity)
- Emphasize mean-reversion strength (deviation from historical average)

**Expected Impact**:
- Items with sustained suppression score higher
- Bot-driven downtrends seen as opportunities, not penalties
- Better ranking aligned with your strategy
- **Cost: $0** | **Effort: 2-3 hours**

---

### ⚠️ Priority 5: GPT-4o Upgrade (ONLY IF FREE IMPROVEMENTS INSUFFICIENT)

**Reality Check**:
- Current: $90/month with gpt-4o-mini
- Upgraded: $300/month with GPT-4o
- **+$210/month with ZERO real-world revenue**

**Recommendation**: 
1. Implement Priorities 1-4 first (all free or save money)
2. Test for 2-3 weeks
3. If recommendations still aren't good enough, THEN consider GPT-4o
4. Better yet: Use saved money from narrowed pool ($45/month) to partially offset GPT-4o cost

**Adjusted Math**:
- Narrow pool: Saves $45/month
- Upgrade model: Costs $105/month extra (on narrowed pool)
- Net cost increase: $60/month
- Still expensive, but more justifiable if free improvements don't work

**Decision Criteria for GPT-4o**:
- Only upgrade if gpt-4o-mini recommendations have >30% false positive rate
- Only if better prompt doesn't improve quality
- Only if you're willing to pay $60-100/month extra out of pocket

---

## Cost Analysis - Reality Check

### Current System (110 items, gpt-4o-mini):
- $0.03 per scan
- 10 users × 10 scans/day × 30 days = 3,000 scans/month
- **Total: ~$90/month out of pocket**

### Optimized System (50 items, gpt-4o-mini, better prompt/scoring):
- $0.03 per scan
- 10 users × 10 scans/day × 30 days = 1,500 scans/month (narrowed pool)
- **Total: ~$45/month out of pocket**
- **Savings: $45/month (50% reduction)**

### Premium System (50 items, GPT-4o, better prompt/scoring):
- $0.10 per scan (on narrowed pool)
- 1,500 scans/month
- **Total: ~$150/month out of pocket**
- **Increase: +$60/month vs current, +$105/month vs optimized**

### Reality:
- You're paying out of pocket for a hobby
- Profits are game pixels, not real money
- **Free improvements should be exhausted FIRST**
- Model upgrade is last resort, not first choice

---

## 3-Phase Implementation Plan (Cost-Conscious)

### Phase 1: Free Improvements (Week 1) - HIGHEST VALUE

**Tasks**:
1. ✅ Rewrite bot dump scoring for long-term suppression (2-3 hrs)
2. ✅ Improve gpt-4o-mini prompt for mean-reversion strategy (1-2 hrs)
3. ✅ Adjust confidence calculation to reward long-term suppression (2-3 hrs)
4. ✅ Test with 5-10 scans, compare to current system

**Cost**: $0  
**Expected Impact**: 40-60% improvement in recommendation quality  
**Files Modified**: 
- lib/meanReversionAnalysis.ts (scoring + confidence)
- app/api/mean-reversion-opportunities/route.ts (prompt)

---

### Phase 2: Cost Optimization (Week 2) - SAVES MONEY

**Tasks**:
1. ✅ Create CORE_BOT_SUPPRESSION_POOL (50-60 items) (1-2 hrs)
2. ✅ Update route.ts to use narrowed pool (15 mins)
3. ✅ Test performance and quality with smaller pool (1 week)

**Cost**: SAVES $45/month (50% reduction)  
**Expected Impact**: 
- Same or better quality (more focused)
- 2x faster scans
- 50% cost savings

**Files Modified**:
- lib/coreBotSuppressionPool.ts (new file)
- app/api/mean-reversion-opportunities/route.ts (pool import)

---

### Phase 3: Evaluate Model Upgrade (Week 3-4) - ONLY IF NEEDED

**Decision Point**:
- If Phase 1+2 recommendations are good quality → STOP HERE (save money)
- If still >30% false positives → Consider GPT-4o upgrade
- If willing to pay +$60/month for better quality → Test GPT-4o

**A/B Test** (if considering upgrade):
- Run 20 scans: 10 with gpt-4o-mini, 10 with GPT-4o
- Manually review recommendation quality
- Track false positives, missed opportunities
- Calculate if quality improvement is worth +$60/month cost

**Only Upgrade If**:
- GPT-4o recommendations are markedly better (>40% improvement)
- You're willing to pay $105-150/month out of pocket
- Free improvements (Phase 1) aren't sufficient

---

## Testing Plan

### Metrics to Track:

1. **Suppression Detection Accuracy**:
   - % of items recommended that are >15% below 180d/365d average
   - % with "very_high" or "high" bot likelihood
   - Average deviation from historical mean

2. **False Positive Rate**:
   - % of recommendations that DON'T have sustained suppression
   - % that are flash dumps (not long-term)
   - % that have no clear historical average to revert to

3. **Cost Efficiency**:
   - $/scan before and after optimizations
   - Total monthly cost
   - Cost per quality recommendation

4. **User Experience**:
   - Scan time (should be faster with narrowed pool)
   - Recommendation relevance (manual review)
   - Confidence score correlation with actual quality

### Success Criteria:

✅ **Phase 1 Success**: 
- >80% of recommendations are >15% below historical averages
- <20% false positive rate
- Confidence scores align with quality (manual review)

✅ **Phase 2 Success**:
- 50% cost reduction achieved
- Scan time reduced to 80-90 seconds
- Quality maintained or improved with narrowed pool

✅ **Phase 3 Decision**:
- GPT-4o only justified if >40% better than optimized gpt-4o-mini
- Cost increase acceptable given budget constraints

---

## Conclusion - Revised Recommendations

### Key Insights:

1. **Your strategy is BETTER aligned with the system than I initially thought**
   - Multi-timeframe analysis (365d data) is perfect for long-term suppression
   - Mean-reversion logic is exactly what you need
   - Just need to adjust scoring weights and prompt

2. **Cost efficiency is CRITICAL** (not optional)
   - No real-world revenue = every dollar matters
   - Free improvements should be exhausted first
   - Model upgrade is last resort, not first choice

3. **Biggest wins are FREE**:
   - Rewrite scoring to prioritize long-term gaps (not short-term)
   - Improve prompt to explain mean-reversion strategy
   - Adjust confidence to reward sustained suppression
   - Expected: 40-60% quality improvement at $0 cost

4. **Second biggest win SAVES MONEY**:
   - Narrow pool to 50-60 core items
   - 50% cost reduction ($90 → $45/month)
   - Faster scans, better focus

5. **Model upgrade should be last**:
   - Test free improvements first
   - Only upgrade if critical quality issues remain
   - $60-105/month extra is significant for a hobby

### Next Actions:

**Immediate (This Week)**:
1. Implement Phase 1 free improvements (scoring + prompt)
2. Test with 5-10 scans
3. Compare quality to current system

**Week 2**:
1. If Phase 1 works well → Implement Phase 2 (narrow pool)
2. If Phase 1 insufficient → Debug and refine further

**Week 3-4**:
1. Evaluate if GPT-4o upgrade is necessary
2. Only upgrade if free improvements don't achieve >80% accuracy

---

## Technical Implementation Details

### File: lib/meanReversionAnalysis.ts

**Lines 658-684 - Bot Dump Score → Long-Term Suppression Score**:

```typescript
// BEFORE (flash dump focused):
const botDumpScore = 
  (shortTermShock * 2.4) +
  (mediumGap * 1.6) +
  (longGap * 1.1) +
  volumeSpikeBonus +
  botLikelihoodPoints;

// AFTER (long-term suppression focused):
const longTermSuppressionScore = 
  (longGap * 3.0) +              // Prioritize 90d vs 365d gap
  (mediumGap * 2.0) +            // Confirm with 30d vs 90d
  (shortTermShock * 1.0) +       // De-emphasize recent volatility
  volumeSpikeBonus +
  (botLikelihoodPoints * 1.5);   // Make bot likelihood more impactful

// Add sustained suppression bonus
const daysBelow365dAvg = timeframe365d.prices.filter(
  (p, i) => i >= timeframe365d.prices.length - 90 && p < timeframe365d.average
).length;
const sustainedSuppressionBonus = Math.min(20, daysBelow365dAvg / 3);

const finalScore = longTermSuppressionScore + sustainedSuppressionBonus;
```

**Lines 325-357 - Confidence Calculation**:

```typescript
// BEFORE:
let confidence = weightedDeviation * 2.2;
confidence += Math.min(20, botDumpScore * 0.25);
if (downtrend.isDowntrending) {
  confidence -= downtrend.severity; // Penalizes ALL downtrends
}

// AFTER:
let confidence = weightedDeviation * 2.2;

// Boost for long-term suppression
const currentVsHistorical = Math.abs(currentPrice - timeframe365d.average) / timeframe365d.average * 100;
if (currentVsHistorical > 15 && botLikelihood === "very_high") {
  confidence += Math.min(40, longTermSuppressionScore * 0.4);
}

// Only penalize downtrends if NOT bot-suppressed
// (Bot suppression creates downtrend = that's the opportunity!)
if (downtrend.isDowntrending && botLikelihood !== "very_high" && botLikelihood !== "high") {
  confidence -= downtrend.severity;
}
```

---

### File: app/api/mean-reversion-opportunities/route.ts

**Lines 148-172 - AI Prompt Rewrite**:

```typescript
// BEFORE:
const prompt = `Analyze each item to determine if it's a viable investment opportunity...`;

// AFTER:
const prompt = `You are an expert OSRS economist analyzing mean-reversion opportunities in items suppressed by long-term bot activity.

STRATEGY CONTEXT:
You're helping players identify items trading significantly below historical averages due to sustained bot farming. The strategy is to buy undervalued items, hold for weeks/months, and profit when prices revert to historical means (driven by bot bans, supply normalization, and natural mean-reversion).

APPROVAL CRITERIA (item must meet ALL):
1. Currently trading at least 15% below 180-day or 365-day average
2. High bot likelihood (indicates bot oversupply is suppressing price)
3. Clear historical average with stable demand (item isn't dying, just suppressed)
4. Confidence score >70% (strong statistical mean-reversion setup)
5. Expected return of at least 20% to historical average within 2-12 weeks

REJECT IF (any red flag):
- Already near or above historical averages (no suppression present)
- Organic demand decline (item becoming obsolete, not just bot supply)
- No clear historical trading range (new/seasonal item)
- Recovery would take 6+ months (too patient, capital tied up too long)

For each item, respond with JSON:
{
  "decision": "include" or "exclude",
  "reasoning": "Brief explanation of why this is/isn't a good long-term mean-reversion opportunity based on historical suppression",
  "confidence": 0-100
}

Items to analyze:
${JSON.stringify(itemsWithContext, null, 2)}`;
```

---

### File: lib/coreBotSuppressionPool.ts (NEW)

```typescript
import { ItemPoolEntry } from './types';

/**
 * Core pool of items with highest bot activity and stable demand.
 * Focused on long-term mean-reversion opportunities.
 * 
 * Selection Criteria:
 * - botLikelihood: "very_high" or "high"
 * - volumeTier: "massive" or "high"
 * - Stable historical demand (not seasonal/dead content)
 * - Clear historical price averages for mean-reversion
 */
export const CORE_BOT_SUPPRESSION_POOL: ItemPoolEntry[] = [
  // Runes (highest bot activity, constant demand)
  { id: 563, name: "Law rune", category: "runes", botLikelihood: "very_high", volumeTier: "massive", demandType: "steady" },
  { id: 560, name: "Death rune", category: "runes", botLikelihood: "very_high", volumeTier: "massive", demandType: "steady" },
  { id: 565, name: "Blood rune", category: "runes", botLikelihood: "very_high", volumeTier: "massive", demandType: "steady" },
  { id: 566, name: "Soul rune", category: "runes", botLikelihood: "very_high", volumeTier: "massive", demandType: "steady" },
  
  // High-volume resources (heavily botted)
  { id: 1513, name: "Magic logs", category: "resources", botLikelihood: "very_high", volumeTier: "massive", demandType: "steady" },
  { id: 1515, name: "Yew logs", category: "resources", botLikelihood: "very_high", volumeTier: "massive", demandType: "steady" },
  { id: 440, name: "Iron ore", category: "resources", botLikelihood: "very_high", volumeTier: "massive", demandType: "steady" },
  
  // ... (45-53 more high bot activity items)
  
  // Prioritize items where:
  // 1. Bot farms actively suppress prices
  // 2. Demand is constant (not seasonal spikes)
  // 3. Historical averages are stable
  // 4. Recovery patterns are predictable
];
```

---

## Summary

**Primary Strategy Clarification**: You want items with LONG-TERM price suppression (weeks/months below historical averages) due to sustained bot activity, NOT flash dumps requiring constant monitoring.

**Cost Reality**: $90-300/month out of pocket with zero real-world income makes cost optimization critical, not optional.

**Revised Priorities**:
1. ⭐⭐⭐ FREE: Adjust scoring for long-term suppression (invert timeframe weights)
2. ⭐⭐⭐ FREE: Rewrite prompt for mean-reversion strategy
3. ⭐⭐⭐ SAVES $45/mo: Narrow to 50-60 core items
4. ⭐⭐ FREE: Adjust confidence to reward suppression
5. ⚠️ COSTS +$60-105/mo: GPT-4o upgrade (ONLY if free improvements insufficient)

**Expected Outcome**: 40-60% quality improvement with 50% cost reduction by implementing free improvements + pool narrowing. Model upgrade only if absolutely necessary after testing free optimizations.
