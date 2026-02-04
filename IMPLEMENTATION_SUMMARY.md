# Opportunities Feature - Implementation Summary

## 🎯 What Was Implemented

### 1. **Expanded Item Pool (350+ Items)**
Created [lib/expandedItemPool.ts](lib/expandedItemPool.ts) with:
- **350+ liquid, tradeable items** across all categories
- Combat gear (Melee, Ranged, Magic, Armor)
- Resources (Logs, Ores, Bars, Herbs, Hides)
- Skilling supplies (Seeds, Planks, Bones, Fletching)
- Consumables (Food, Potions, Runes)
- High-value items (GWD drops, Raid rewards, etc.)
- **Tier system**: High/Medium/Low liquidity classification
- **Category tags**: Combat, Skilling, Resources, Food, Potions, Runes, Seeds

### 2. **Flip Type Classification System**
Added 6 distinct flip types with automatic detection:

#### ⚡ **Quick Flip** (1-3 days)
- 8-15% below 30d average
- Moderate volatility (15-35%)
- Fast turnaround
- **Best for**: Daily/weekly traders

#### 🤖 **Bot Dump Recovery** (3-7 days)
- Sharp recent drop (15%+ below 30d, but 1.5x worse than 90d)
- High volatility (>20%)
- Strong recovery potential (20%+ upside)
- **Best for**: Catching bot-driven crashes and rebounds
- **Your preference**: This is what you described as "safe flips"

#### 📈 **Long-Term Hold** (2-8 weeks)
- Deep discount (20%+ from 90d or 25%+ from 365d)
- Solid recovery potential
- **Best for**: Patient investors with capital

#### 🛡️ **Safe Hold** (1-3 weeks)
- Low volatility (<20%)
- High confidence (70%+)
- Consistent recovery pattern
- 10%+ below 90d average
- **Best for**: Risk-averse investors

#### 💥 **Volatile Play** (1-4 weeks)
- Very high volatility (>40%)
- Major price swings (>50% spread)
- High risk/high reward
- **Best for**: Aggressive traders

#### 📊 **Short-Term** (1-2 weeks)
- Normal mean reversion
- General catch-all category

### 3. **Enhanced Scoring Algorithm**
Updated [lib/analysis.ts](lib/analysis.ts):

**Lowered Entry Threshold**:
- Score threshold: 60 → **45** (more opportunities)
- Minimum profit: **100gp per unit**
- More lenient filters while maintaining quality

**Better Filtering**:
- Items must be below 90d average OR have >20% volatility
- Filters out garbage while showing more genuine opportunities

**Flip Type Detection**:
- Automatic classification based on price patterns
- Confidence score for flip type (0-100)

### 4. **Investment Metrics (Big Budget Support)**
Added to FlipOpportunity interface:
- `recommendedQuantity`: Suggested buy quantity
- `totalInvestment`: Total GP needed
- `totalProfit`: Total expected profit

**Smart Quantity Calculation**:
- High-value items (>100k): Invest 10M
- Mid-value items (10-100k): Invest 5M
- Lower-value (1-10k): Invest 2M
- Cheap items (<1k): Invest 500k
- Capped at 10,000 units max

**Example**:
- Item: Dragon bones @ 2,500gp
- Recommended: Buy 2,000x = 5M investment
- Expected profit: 500k (10% ROI)

### 5. **Advanced Filtering UI**
Updated [Dashboard.tsx](Dashboard.tsx):

**Flip Type Filter Buttons**:
- Shows count for each type
- Color-coded badges
- One-click filtering

**Existing Filters Enhanced**:
- Min Score slider
- Confidence slider
- Sort by: Score, ROI, Total Profit, Confidence

**Visual Improvements**:
- Flip type badges on cards
- Investment summary section
- Total profit (not just per unit)

## 📊 How It Works Now

### Analysis Flow:
1. **Item Pool**: Uses 350+ item expanded pool (or custom pool if set)
2. **Data Fetching**: Gets 30d, 90d, 365d price history
3. **Filtering**: Removes items with <15% price spread (simulated data)
4. **Scoring**: Calculates opportunity score (0-100)
5. **Classification**: Determines flip type automatically
6. **Investment Calc**: Recommends quantity based on item price
7. **Display**: Shows filtered opportunities with all metrics

### What You'll See:
- **More opportunities** (45+ score instead of 60+)
- **Better organization** (flip type categories)
- **Investment planning** (total profit, recommended qty)
- **Clear filtering** (one-click flip type selection)

## 🎮 How to Use (Your Style)

### For Bot Dump Recovery Flips:
1. Click **"🤖 Bot Dumps"** filter
2. Look for items with:
   - 60+ score
   - 70%+ confidence
   - 2-5M total investment
3. These are bot-driven crashes ready to rebound

### For Safe Long-Term Holds:
1. Click **"🛡️ Safe Holds"** filter
2. Look for:
   - Low volatility
   - High confidence
   - 10-20% discount from averages
3. Set it and forget it for 1-3 weeks

### For Quick Profits:
1. Click **"⚡ Quick Flips"** filter
2. Look for:
   - High ROI (15%+)
   - Fast turnaround (1-3 days)
   - Moderate investment (1-3M)

### General Strategy:
- **Conservative**: Set confidence to 70%+, use Safe Holds
- **Balanced**: 50%+ confidence, mix of types
- **Aggressive**: 40%+ confidence, include Volatile plays

## 🔥 Key Improvements

### Before:
- 110 popular items only
- Score threshold 60 (too strict)
- Few opportunities shown
- No flip type classification
- Only showed profit per unit
- No investment guidance

### After:
- **350+ liquid items**
- **Score threshold 45** (more opportunities)
- **6 flip types** with auto-classification
- **Investment metrics** (quantity, total profit)
- **Better filtering** (flip type, confidence, score)
- **Big budget support** (shows millions in profit)

## 📈 Expected Results

You should now see:
- **30-100+ opportunities** (depending on filters)
- **Mix of flip types** (quick/bot dump/long-term)
- **Better quality suggestions** (expanded pool)
- **Clear profit potential** (total investment & profit)
- **Easy filtering** (one-click flip type selection)

## 🚀 Next Steps (If Needed)

Potential future enhancements:
1. **Category filters** (Combat, Skilling, Resources)
2. **Historical tracking** (success rate per item)
3. **Auto-alerts** (notify when bot dump detected)
4. **Portfolio integration** (auto-add to portfolio)
5. **Profit tracking** (track realized gains)

## 💡 Tips

**For Best Results**:
- Run analysis when server isn't busy
- Check Bot Dumps filter first (your preference)
- Use confidence slider to match risk tolerance
- Sort by "Total Profit" to see biggest opportunities
- Bookmark items you track with Favorites

**Understanding Flip Types**:
- **Bot Dump** = Price just crashed, will rebound (safest for you)
- **Long-Term** = Deep value, wait for recovery
- **Quick Flip** = Fast turnaround, active trading
- **Safe Hold** = Low risk, consistent returns
- **Volatile** = High risk, high reward

Let me know if you want any adjustments or additional features!
