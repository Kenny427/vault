# Opportunities Feature - Optimization Ideas

## Current State Analysis

### What's Working
- Rule-based mean reversion scoring (no AI costs)
- Filtering items with <15% price spread (removes simulated data)
- Multiple timeframe analysis (30d, 90d, 365d)
- Currently analyzing ~110 popular items

### Current Issues
- Only showing a few good trades
- Most suggestions are average/mediocre
- Limited item pool (110 popular items)
- Score threshold at 60+ filters out too many opportunities
- No distinction between long-term holds vs short-term flips

## Key Optimization Strategies

### 1. **Expand Item Pool Strategically**

Instead of all ~5000 items, focus on high-quality subsets:

**Option A: Liquid Items Only (300-500 items)**
- Items with actual trade volume
- Exclude untradeable, discontinued, very niche items
- Focus on commonly traded items that actually flip
- **Pros**: Better suggestions, more opportunities
- **Cons**: Need to identify which items are liquid

**Option B: Category-Based Pools**
- Combat gear (armor, weapons)
- Skilling supplies (logs, ores, herbs, etc.)
- Food & potions
- Raw materials
- Processed goods
- **Pros**: User can pick their preferred categories
- **Cons**: Need category system

**Option C: Tiered System**
- Tier 1: High volume, low risk (100 items) - Always analyzed
- Tier 2: Medium volume (200 items) - Analyzed regularly
- Tier 3: Lower volume but good potential (300 items) - Analyzed on demand
- **Pros**: Best of both worlds - quality + quantity
- **Cons**: Need to identify tiers

### 2. **Separate Long-Term vs Short-Term Opportunities**

Add a **"Flip Type"** filter with two distinct strategies:

**Long-Term Holds (Your Preference)**
- Items 20%+ below 90d average
- Lower volatility preferred (< 20%)
- Higher confidence required (70%+)
- Estimated hold time: 1-8 weeks
- Example: Item crashed from 10k to 6k, historically recovers to 9-11k

**Short-Term Flips**
- Items 10-15% below 30d average
- Higher volatility acceptable (20-40%)
- Faster turnaround: 1-7 days
- Lower confidence acceptable (50%+)
- Example: Daily/weekly price swings you can ride

### 3. **Improve Scoring Algorithm**

Current scoring is too conservative. Ideas:

**A. Multi-Factor Scoring**
```
Base Score = 0
+ Discount from 30d avg (max 15 points)
+ Discount from 90d avg (max 25 points)  
+ Upside potential to recent high (max 20 points)
+ Volatility bonus (max 15 points)
+ Volume/liquidity bonus (max 15 points) ← NEW
+ Recent momentum shift (max 10 points) ← NEW
= Total 100 points
```

**B. Risk-Adjusted Returns**
- Calculate Sharpe ratio (return / risk)
- Items with high ROI but low risk score higher
- Penalize high volatility unless ROI is exceptional

**C. Historical Success Rate**
- Track: "How often does this item recover to average?"
- Items that consistently mean-revert score higher
- Learn from past flip outcomes

### 4. **Add Quality Filters**

**Pre-Analysis Filters** (before scoring):
- Minimum price: 1000gp+ (avoid low-value items)
- Minimum spread: 20%+ for short-term, 30%+ for long-term
- Exclude items with: declining long-term trend (bearish 365d)

**Post-Analysis Filters**:
- Minimum profit per flip: 10k+ gp
- Minimum ROI: 5%+ for long-term, 10%+ for short-term
- Confidence: 70%+ for conservative, 50%+ for aggressive

### 5. **User Preference System**

Let users customize what they see:

**Risk Profile**:
- 🟢 Conservative: High confidence (70%+), low volatility, proven items
- 🟡 Balanced: Medium confidence (50%+), moderate risk
- 🔴 Aggressive: Lower confidence (40%+), high volatility, high upside

**Investment Size**:
- Small (< 1M gp budget)
- Medium (1-10M gp budget)  
- Large (10M+ gp budget)
- Shows profit per unit vs total investment value

**Preferred Hold Time**:
- Quick Flips (1-3 days)
- Short-term (1-2 weeks)
- Long-term (2-8 weeks)

### 6. **Enhanced Data Analysis**

**Add More Metrics**:
- **Market Depth**: How many offers at buy/sell price
- **Time of Day Patterns**: Best time to buy/sell
- **Recent News/Updates**: Game updates affecting prices
- **Correlation**: Items that move together
- **Seasonality**: Recurring patterns (e.g., holiday events)

**Better Trend Detection**:
- Use MACD (Moving Average Convergence Divergence)
- RSI (Relative Strength Index) for overbought/oversold
- Bollinger Bands for volatility
- Support/Resistance levels

### 7. **Smart Recommendations**

**Portfolio Diversification**:
- Don't show 10 similar items (e.g., all logs)
- Mix of categories, risk levels, timeframes
- Balance between proven vs new opportunities

**Opportunity Ranking**:
- Sort by: Best ROI, Safest, Fastest, Highest Profit
- Highlight "Hidden Gems" - high score but overlooked
- Flag "Hot Right Now" - momentum building

## Proposed Implementation Plan

### Phase 1: Quick Wins (1-2 hours)
1. **Lower score threshold from 60 to 50** - Show more opportunities
2. **Add flip type filter** - Long-term vs Short-term tabs
3. **Adjust confidence thresholds** - 60% for conservative, 40% for aggressive
4. **Add minimum profit filter** - Only show 10k+ profit opportunities

### Phase 2: Item Pool Expansion (2-3 hours)
1. **Create tiered item list** - 300-500 high-quality items
2. **Add category tags** - Combat, Skilling, Food, etc.
3. **Implement smart filtering** - Liquid items only
4. **Test with expanded pool**

### Phase 3: Advanced Scoring (3-4 hours)
1. **Implement multi-factor scoring**
2. **Add volume/liquidity detection**
3. **Improve trend detection** (MACD, RSI)
4. **Calculate risk-adjusted returns**

### Phase 4: User Preferences (2-3 hours)
1. **Add risk profile selector**
2. **Investment size preferences**
3. **Hold time preferences**
4. **Save user settings**

## Specific Suggestions for Your Use Case

Since you prefer **long-term holds with low risk**:

### Ideal Opportunities For You:
- Items 20-30% below 180d average
- Volatility < 25% (relatively stable)
- Confidence 70%+
- ROI 15-40% over 2-8 weeks
- Historical pattern of recovery
- Not currently in a declining trend

### Categories to Focus On:
- **Skilling supplies** - Consistent demand, mean reversion
- **Combat consumables** - Food, potions
- **Raw materials** - Logs, ores (tied to skilling demand)
- **Mid-tier gear** - Not BIS, but commonly used

### Avoid:
- Very high volatility items (> 50%)
- Discontinued items (unpredictable)
- Very low volume items (can't sell)
- Items in long-term decline

## Questions for You

1. **Item Pool Size**: How many opportunities do you want to see?
   - 10-20 high quality?
   - 50-100 with variety?
   - More is better?

2. **Risk Tolerance**: Should we:
   - Show only 70%+ confidence?
   - Include 50%+ if ROI is great?
   - Let you toggle between conservative/aggressive?

3. **Investment Capital**: What's your typical flip budget?
   - This affects whether we prioritize high-value items or quantity

4. **Categories**: Any specific item types you prefer/avoid?
   - Combat gear, skilling supplies, raw materials, etc.

5. **Metrics Priority**: What matters most to you?
   - Total profit per flip?
   - ROI percentage?
   - Safety/confidence?
   - Speed of flip?

## My Recommendations

Based on your description, here's what I'd implement:

### Immediate Changes:
1. **Add "Long-Term" filter** - Show only 2-8 week holds
2. **Raise confidence minimum to 65%** - Quality over quantity
3. **Expand pool to 300 liquid items** - More opportunities
4. **Show top 20 opportunities** - Not overwhelmed with choices
5. **Add "Min Profit" filter** - Set to 25k+ for your budget level

### Scoring Adjustments:
- Heavily weight: Below 90d/180d average (not just 30d)
- Bonus for: Consistent recovery pattern
- Penalty for: High volatility, declining trend
- Bonus for: Moderate volume (liquid but not overly competitive)

### Display Changes:
- Sort by "Best Risk-Adjusted Return" by default
- Show estimated total profit (not just per unit)
- Highlight "Confidence Level" more prominently
- Add "Days Since Bottom" - catching falling knives is risky

Would you like me to implement any of these changes? Let me know which direction appeals to you most!
