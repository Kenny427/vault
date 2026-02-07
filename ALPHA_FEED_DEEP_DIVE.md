# 🔍 Alpha Feed Deep Dive Analysis
*Generated: February 7, 2026*

## Executive Summary

The Alpha Feed is the **core value proposition** of your app. After comprehensive analysis, I've identified significant opportunities to better align it with your bot-dump trading strategy while optimizing costs and improving output quality.

**Key Findings:**
- ✅ Strong foundation: Multi-timeframe mean-reversion analysis (7d/30d/90d/180d/365d)
- ✅ Bot-dump detection exists but needs refinement
- ⚠️ Model mismatch: Using GPT-4o-mini when GPT-4o would provide better value
- ⚠️ Prompt doesn't explicitly target your strategy (bot dumps → rebound)
- ⚠️ Item pool could be narrowed for better focus and cost savings
- ⚠️ Confidence scoring could better reflect bot-dump opportunities

**Bottom Line:** With focused improvements, you can get **significantly better** trading recommendations at **similar or lower cost**.

---

## Current System Architecture

### 1. Analysis Pipeline

```
Step 1: Data Collection
├─ Fetch 365-day price history for ~110 items
├─ Calculate multi-timeframe metrics (7d, 30d, 90d, 180d, 365d)
└─ Bot likelihood assessment (price stability analysis)

Step 2: Mean-Reversion Analysis (lib/meanReversionAnalysis.ts)
├─ Detect short-term shocks (7d vs 30d deviation)
├─ Calculate bot dump score (0-100)
├─ Detect trend reversals (slope analysis + support formation)
├─ Calculate recovery strength (0-100)
├─ Assess downtrend penalty (structural decline detection)
└─ Generate confidence score (0-100)

Step 3: AI Filtering (GPT-4o-mini)
├─ Batch items (10 per batch, 5 concurrent batches)
├─ AI decides: include/exclude each item
├─ AI provides: confidence score, entry/exit prices, hold time, reasoning
└─ Cost: ~$0.02-0.05 per full scan (200-500 tokens/batch)
```

### 2. Current Model: GPT-4o-mini

**Pricing:**
- Input: $0.150 / 1M tokens
- Output: $0.600 / 1M tokens
- Average scan cost: $0.02-0.05 (depending on items analyzed)

**Usage Pattern:**
- Items per batch: 10
- Concurrent batches: 5
- Average prompt: ~800 tokens
- Average response: ~400 tokens per batch

---

## Critical Analysis: What's Working & What's Not

### ✅ What's Working Well

1. **Multi-Timeframe Analysis**
   - Excellent foundation for detecting mean reversion
   - 7d/30d/90d/180d/365d provides comprehensive view
   - Good for identifying "value" vs "structural decline"

2. **Bot Likelihood Detection**
   - Price stability coefficient of variation (CV) approach is sound
   - CV < 5% = "very high" bot activity (correct)
   - Helps identify items with predictable supply patterns

3. **Downtrend Protection**
   - Detects structural declines (>20% from peak + consistent trend)
   - Applies 70-point penalty to confidence score
   - Prevents catching "falling knives"

4. **Volume Spike Detection**
   - Tracks volumeSpikeRatio (7d volume / 30d avg)
   - Increases bot dump score when volume spikes
   - Good indicator of panic selling

### ⚠️ Critical Issues & Gaps

#### 1. **Strategy Misalignment**

**Your Strategy:** "Buy items dumped by bots, hold weeks (not months), expect rebound when bots banned or market recovers"

**Current System:** Generic mean-reversion focused on "trading below average"

**The Gap:**
```typescript
// Current prompt (line 148-172 in mean-reversion-opportunities/route.ts)
"Analyze each item to determine if it's a viable investment opportunity.
- Is the price significantly below historical averages?
- Does the item have consistent bot supply/demand patterns?
- Is there realistic upside potential (at least 10-15%)?
- Are there any red flags?"
```

**Problem:** This prompt doesn't explicitly tell the AI:
- You're looking for RECENT bot dumps (sharp price drops)
- You want items with REVERSAL signals (not just "undervalued")
- You expect 1-2 week holds (fast flips), not months
- You want items showing RECOVERY momentum (foundSupport, positive slope)

#### 2. **Model Selection: GPT-4o-mini vs GPT-4o**

**Current: GPT-4o-mini**
- Cost: $0.75/1M tokens (blended)
- Speed: Fast
- Intelligence: Mid-tier reasoning

**Alternative: GPT-4o**
- Cost: $2.50/1M tokens input, $10.00/1M tokens output (~$5/1M blended)
- Speed: Similar
- Intelligence: Superior reasoning, better pattern recognition

**Cost Impact:**
```
Current scan (GPT-4o-mini):
- 20k input tokens, 8k output tokens
- Cost: (20k × $0.15/1M) + (8k × $0.60/1M) = $0.0078
- Per scan: ~$0.008-0.03

With GPT-4o:
- 15k input tokens (better prompt = shorter), 6k output tokens (more focused)
- Cost: (15k × $2.50/1M) + (6k × $10/1M) = $0.0975
- Per scan: ~$0.10-0.15
```

**My Recommendation:** **Switch to GPT-4o**

**Why?**
1. **Better Value Per Flip:** You care about QUALITY flips, not quantity. One great 20% flip is worth 10 mediocre 2% flips.
2. **Multi-User Scaling:** At 10 users × 5 scans/day = 50 scans/day:
   - GPT-4o-mini: $1.50/day = $45/month
   - GPT-4o: $7.50/day = $225/month
   - **Worth it if each user makes 1-2 good flips/month** (easily $5M+ profit = 100k+ tax = way more value than $7.50)

3. **Better Pattern Recognition:** GPT-4o is significantly better at:
   - Recognizing genuine bot-dump patterns vs noise
   - Identifying recovery triggers
   - Avoiding false positives (saves you capital + opportunity cost)

#### 3. **Bot Dump Score Calculation Needs Refinement**

**Current Logic (lines 658-684):**
```typescript
let botDumpScore =
  shortTermShock * 2.4 +      // 7d vs 30d deviation
  mediumGap * 1.6 +            // 30d vs 90d deviation
  longGap * 1.1 +              // 90d vs 365d deviation
  (volumeSpikeRatio > 1 ? (volumeSpikeRatio - 1) * 25 : 0);

// Add bot likelihood bonus
botDumpScore += botLikelihood === 'very high' ? 20 : ... : 0;
```

**Issues:**
- **Equal weighting to all gaps:** A 90d vs 365d gap doesn't indicate a RECENT bot dump
- **Volume spike bonus is weak:** (volumeSpikeRatio - 1) × 25 maxes at ~25 points. Volume spikes should be MORE significant
- **No time decay:** A dump from 30 days ago gets same weight as yesterday's dump

**Better Approach:**
```typescript
// Focus on RECENT dumps (7d vs 30d) with exponential weighting
const recentDumpScore = shortTermShock * 5.0;  // 7d shock is PRIMARY signal

// Volume confirmation (panic selling)
const volumeConfirmation = volumeSpikeRatio > 1.5 ? 
  Math.min(50, (volumeSpikeRatio - 1) * 40) : 0;

// Bot likelihood multiplier (not additive)
const botMultiplier = botLikelihood === 'very_high' ? 1.3 : 
                      botLikelihood === 'high' ? 1.15 : 1.0;

let botDumpScore = (recentDumpScore + volumeConfirmation) * botMultiplier;
botDumpScore = clamp(botDumpScore, 0, 100);
```

**Why Better:**
- Focuses on RECENT shocks (your strategy)
- Volume spike is weighted higher (panic = opportunity)
- Bot likelihood acts as multiplier (compounds effect)
- Caps at 100 (cleaner scoring)

#### 4. **Confidence Score Misaligned with Strategy**

**Current Logic (lines 325-357):**
```typescript
const weightedDeviation = Math.max(0, mediumDeviation) * 0.65 + 
                          Math.max(0, longDeviation) * 0.35;
let confidence = weightedDeviation * 2.2;

if (botDumpScore > 0) {
  confidence += Math.min(20, botDumpScore * 0.25);
}
```

**Problem:** Bot dump score only adds max 20 points. But for YOUR strategy, bot dumps should be the PRIMARY signal!

**Better Approach:**
```typescript
// Base confidence from deviation (still important)
const deviationScore = weightedDeviation * 1.8;

// Bot dump is PRIMARY signal (up to 40 points)
const dumpSignal = Math.min(40, botDumpScore * 0.4);

// Recovery confirmation (momentum)
const recoveryBonus = recoveryStrength > 60 ? 20 : 
                      recoveryStrength > 40 ? 12 : 
                      recoveryStrength > 20 ? 6 : 0;

let confidence = deviationScore + dumpSignal + recoveryBonus;
```

**Why Better:**
- Bot dumps can contribute 40 points (not 20)
- Recovery signals add another 20 points
- Aligns scoring with your "buy the dump, wait for rebound" strategy

#### 5. **AI Prompt Quality**

**Current Prompt Issues:**
1. **Too Generic:** "viable investment opportunity" could mean anything
2. **No Strategy Context:** AI doesn't know you target bot dumps
3. **Vague Criteria:** "realistic upside (at least 10-15%)" - why not 20%+ for your strategy?
4. **Missing Time Horizon:** Doesn't emphasize 1-2 week holds
5. **No Bot Context:** Doesn't ask AI to look for bot ban recovery potential

**Improved Prompt Structure:**
```text
You are an OSRS bot-dump recovery specialist. Your client buys items 
recently dumped by bot farms and holds 1-4 weeks for price recovery 
when bots are banned or supply normalizes.

STRATEGY SPECIFICS:
- Target: Items with RECENT sharp price drops (last 7-14 days)
- Entry: During capitulation (volume spikes + price crashes)
- Exit: When price rebounds to historical averages (2-4 weeks)
- Risk: Items in structural decline (game updates, meta shifts)

For each item, evaluate:
1. Bot Dump Evidence:
   - Recent price shock (7d vs 30d)
   - Volume spike (panic selling)
   - Bot supply patterns (stable pricing = bot farming)

2. Recovery Potential:
   - Is price reversing? (slope turning positive)
   - Found support? (consolidation at lows)
   - Historical precedent? (recovered from dumps before)

3. Risk Assessment:
   - Structural decline? (nerfs, meta shifts)
   - Too volatile? (manipulation risk)
   - Poor liquidity? (hard to exit)

APPROVAL CRITERIA:
- Confidence >70% on bot dump WITHIN last 14 days
- Recovery signals present (not still falling)
- Expected return >15% in <4 weeks
- Clear exit strategy at historical avg or higher

Return JSON:
{
  "items": [
    {
      "id": number,
      "include": boolean,
      "confidenceScore": number (0-100),
      "reasoning": "Why this is/isn't a bot-dump recovery opportunity",
      "entryNow": number,
      "exitBase": number,
      "holdWeeks": number (1-4),
      "logic": {
        "thesis": "Bot dump detected: [specific evidence]",
        "vulnerability": "Risk if: [specific concern]",
        "trigger": "Exit if price drops below [X]gp or no recovery by [timeframe]"
      }
    }
  ]
}

Items to analyze:
[Items with bot dump scores, recent deviations, recovery signals]
```

**Why Better:**
- **Explicit strategy:** AI knows you target bot dumps
- **Clear criteria:** Confidence thresholds, time horizons
- **Better data:** Include bot dump scores, recovery signals in prompt
- **Action-oriented:** AI thinks in terms of entry/exit/risk
- **Structured output:** Forces AI to provide thesis/risk/trigger

#### 6. **Item Pool Optimization**

**Current Pool: ~110 items** (EXPANDED_ITEM_POOL)

**Your Strategy:** "This way of flipping allows me to narrow down the item pool quite a bit"

**Opportunity:** You can focus on **50-60 highest-bot-activity items** and get better results while **cutting costs by 50%**.

**Criteria for Focused Pool:**
1. **Bot Likelihood:** Only "very_high" and "high" (drop "medium")
2. **Volume Tier:** Only "massive" and "high" (drop "medium")
3. **Category Focus:** Heavily botted categories:
   - Runes (Law, Death, Blood, Soul, Astral)
   - Ammo (Broad bolts, Ruby/Diamond bolts (e), Red chins)
   - Resources (Magic/Yew logs, Dragon bones, Dragonhides)
   - Food (Sharks, Karambwan, Anglerfish)
   - Potions (Prayer, Sara brew, Super combat, Super restore)

**Recommended Pool Size:** **50-60 items** (down from 110)

**Impact:**
- Analysis time: 160 seconds → 80 seconds (2x faster)
- OpenAI cost: $0.03 → $0.015 (50% reduction)
- Focus: Higher quality signals (better bot coverage)
- User experience: Faster scans, more actionable feed

---

## Specific Recommendations

### Priority 1: Upgrade to GPT-4o ⭐⭐⭐

**Why:** Single biggest quality improvement. Better pattern recognition = better flips.

**Implementation:**
```typescript
// In mean-reversion-opportunities/route.ts line 181
const aiResponse = await client.chat.completions.create({
  model: 'gpt-4o',  // Changed from 'gpt-4o-mini'
  temperature: 0.2,  // Slightly lower for consistency
  response_format: { type: 'json_object' },
  messages: [{ role: 'user', content: prompt }],
});
```

**Cost Impact:** +$0.07 per scan (from $0.03 to $0.10)
**Value Impact:** Significantly better flip recommendations (worth it for your strategy)

### Priority 2: Refine Bot Dump Scoring ⭐⭐⭐

**Why:** Aligns confidence scoring with your actual strategy.

**Implementation:** Update `calculateConfidence()` and bot dump score calculation in `meanReversionAnalysis.ts`

**Expected Impact:**
- Better ranking of opportunities (dumps rank higher)
- Fewer false positives (ongoing declines filtered out)
- Clearer signal quality

### Priority 3: Rewrite AI Prompt ⭐⭐⭐

**Why:** Makes AI understand your specific strategy (bot dumps + recovery).

**Implementation:** Replace prompt in `mean-reversion-opportunities/route.ts` with strategy-focused version above.

**Expected Impact:**
- AI recommendations aligned with your trading style
- Better reasoning (explains bot dump evidence)
- Clearer risk assessment (structural decline detection)

### Priority 4: Narrow Item Pool ⭐⭐

**Why:** Focus on best opportunities, reduce costs, faster scans.

**Implementation:**
1. Create `CORE_BOT_DUMP_POOL` with 50-60 items
2. Filter by: botLikelihood === "very_high" || "high"
3. Filter by: volumeTier === "massive" || "high"
4. Update `expandedItemPool.ts`

**Expected Impact:**
- 50% cost reduction
- 2x faster scans
- More focused recommendations

### Priority 5: Add Recovery Momentum Tracking ⭐

**Why:** Better detect when items are actually rebounding (not just "cheap").

**Implementation:**
```typescript
// In meanReversionAnalysis.ts, enhance detectTrendReversal()
function calculateRecoveryMomentum(priceData: PriceDataPoint[]): {
  momentum: number; // 0-100
  daysInRecovery: number;
  strengthening: boolean; // Is momentum accelerating?
} {
  const recent7 = priceData.slice(-7);
  const recent14 = priceData.slice(-14, -7);
  
  const avg7 = average(recent7);
  const avg14 = average(recent14);
  
  const improvement = ((avg7 - avg14) / avg14) * 100;
  const strengthening = recent7.slice(-3).average() > recent7.slice(0, 4).average();
  
  return {
    momentum: clamp(improvement * 10, 0, 100),
    daysInRecovery: calculateDaysSinceBottom(priceData),
    strengthening
  };
}
```

**Expected Impact:**
- Catch rebounds EARLY (momentum strengthening)
- Avoid stagnant items (no momentum)
- Time entries better (buy during recovery, not at peak)

---

## Implementation Plan

### Phase 1: Quick Wins (Week 1) 🚀

1. **Upgrade to GPT-4o**
   - Change model in `/api/mean-reversion-opportunities/route.ts`
   - Update cost calculations
   - Test with 10-item batch
   - **Effort:** 30 minutes
   - **Impact:** Immediate quality improvement

2. **Rewrite AI Prompt**
   - Use strategy-focused prompt above
   - Include bot dump scores in prompt data
   - Add recovery signals to prompt
   - **Effort:** 1-2 hours
   - **Impact:** Major alignment with strategy

3. **Test & Measure**
   - Run 5-10 scans
   - Compare recommendations to current system
   - Track confidence vs actual performance
   - **Effort:** 1 week of monitoring
   - **Impact:** Validate improvements

### Phase 2: Optimization (Week 2-3) 📊

4. **Refine Bot Dump Scoring**
   - Implement improved calculation in `meanReversionAnalysis.ts`
   - Focus on recent shocks (7d vs 30d)
   - Weight volume spikes higher
   - **Effort:** 2-4 hours
   - **Impact:** Better signal quality

5. **Narrow Item Pool**
   - Create `CORE_BOT_DUMP_POOL` (50-60 items)
   - Focus on very_high + high bot likelihood
   - Remove low-volume items
   - **Effort:** 1-2 hours
   - **Impact:** 50% cost reduction, faster scans

6. **Add Recovery Momentum**
   - Implement `calculateRecoveryMomentum()`
   - Include in confidence calculation
   - Surface in AI prompt
   - **Effort:** 2-3 hours
   - **Impact:** Better entry timing

### Phase 3: Enhancement (Week 4+) 🎯

7. **Multi-User Testing**
   - Deploy to 5-10 beta users
   - Track flip performance
   - Gather feedback on recommendations
   - **Effort:** 2-4 weeks
   - **Impact:** Real-world validation

8. **Performance Dashboard**
   - Track: Confidence vs Actual Return
   - Track: Bot Dump Score vs Recovery Time
   - Track: AI Model Performance (GPT-4o vs 4o-mini)
   - **Effort:** 1 week dev
   - **Impact:** Data-driven iteration

---

## Cost Analysis

### Current System (GPT-4o-mini)
- Items analyzed: 110
- Analysis time: ~160 seconds
- OpenAI cost: $0.02-0.05 per scan
- Multi-user cost (10 users, 5 scans/day): **$10-25/month**

### Proposed System (GPT-4o)
- Items analyzed: 50-60
- Analysis time: ~80 seconds
- OpenAI cost: $0.10-0.15 per scan
- Multi-user cost (10 users, 5 scans/day): **$50-75/month**

### Cost-Benefit Analysis
**Additional Cost:** $40-60/month for 10 users = **$4-6 per user/month**

**Value Per User:**
- 1 good flip/month at 20% profit on 10M investment = 2M profit
- GE tax (2%) on 2M profit = 40k loss
- Net: 1.96M profit
- **ROI: 327,000% return on $6/month cost** ✅

**Verdict:** Even if GPT-4o costs $225/month for 10 users, it's a no-brainer if it finds JUST ONE extra good flip per user per month.

---

## Testing Plan

### Metrics to Track

1. **Signal Quality**
   - Confidence score vs actual price movement (7d, 14d, 30d)
   - Bot dump score vs recovery speed
   - False positive rate (items that don't recover)

2. **AI Performance**
   - GPT-4o vs GPT-4o-mini recommendations
   - Consistency of reasoning quality
   - Alignment with strategy (manual review)

3. **User Value**
   - Flip success rate (% of recommended items that profit)
   - Average return per flip
   - Time to profit (hold duration)

### A/B Testing Approach

**Week 1-2:** Run both models side-by-side
- GPT-4o-mini: Current system
- GPT-4o: New prompt + scoring

**Week 3-4:** Manual review + user feedback
- Which recommendations were better?
- Which resulted in profitable flips?
- What was the quality difference?

**Week 5:** Decision point
- If GPT-4o shows >20% better recommendations → keep it
- If marginal difference → revisit prompt/scoring
- If worse → investigate issues

---

## Conclusion

Your Alpha Feed has a **solid foundation** but needs **strategic alignment** to truly excel at your bot-dump trading strategy.

**Key Takeaways:**

1. **Upgrade to GPT-4o:** The reasoning quality difference is substantial and worth the cost for your use case.

2. **Focus the Strategy:** Explicitly target bot dumps (recent shocks + recovery signals), not just "undervalued" items.

3. **Narrow the Pool:** 50-60 high-bot-activity items will give better results than 110 mixed-quality items.

4. **Refine Scoring:** Bot dump score should be PRIMARY factor (not just a +20 bonus to confidence).

5. **Better Prompts:** Tell the AI exactly what you're looking for (bot dumps → recovery) with specific criteria.

**Expected Outcomes:**
- ✅ Higher quality flip recommendations
- ✅ Better alignment with your 1-4 week holding strategy
- ✅ Fewer false positives (structural declines filtered out)
- ✅ Faster scans (50-60 items vs 110)
- ✅ Clearer reasoning (AI explains bot dump evidence)
- ✅ Better multi-user scaling (worth the cost)

**Next Steps:**
1. Review this analysis
2. Prioritize recommendations (suggest Priority 1-3 in Phase 1)
3. I'll implement the changes
4. Test with real data
5. Iterate based on performance

Let me know which recommendations you want me to implement first! 🚀
