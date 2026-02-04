# Algorithm Improvements - From Simple to Sophisticated

## The Problem with the Original Algorithm

The original algorithm was criticized for being too simplistic:
- **Just comparing current price vs 30-day average**
- Assuming that if price was below average, it would recover (naive mean reversion)
- Not accounting for realistic trading dynamics
- Not considering transaction costs, liquidity, or market psychology

## The New Multi-Factor Analysis

The improved algorithm now considers **7 major factors** instead of just price deviation:

### Factor 1: Support/Resistance Detection
**What it does:** Identifies price levels where the market repeatedly bounces.
- Scans historical prices to find levels where buying/selling pressure repeatedly emerges
- If price is at a support level AND below 30d average → **Strong buy signal** (+35 points)
- If price is at resistance AND above average → **Strong sell signal** (+20 points)
- Why it matters: Items that bounce off the same prices are predictable; you know where to buy and where to sell

**Example:** 
- If an item has repeatedly bounced at 100gp, and it's currently 97gp (within 3% of support)
- That's a signal that 100gp is psychological support - price will likely recover to that level

### Factor 2: Momentum + Trend Reversal
**What it does:** Detects when a trend is about to reverse (the most profitable signal).
- Calculates momentum (how fast price is moving) and acceleration (is it speeding up or slowing down?)
- Detects divergences: price is low BUT momentum is turning positive (reversal signal)
- If price is low + momentum negative + acceleration positive → **Reversal buy** (+30 points)
- If price is high + momentum positive + acceleration negative → **Reversal sell** (+25 points)
- Why it matters: Reversals are where the biggest money is made. A dying downtrend about to reverse is a buy signal

**Example:**
- Item was dumped hard (momentum -50) but is now stabilizing (acceleration +15)
- This means the dump is ending, and prices will likely start recovering
- Perfect time to buy before the recovery happens

### Factor 3: Volume-Weighted Price Levels
**What it does:** Finds where most trading actually happens (accumulation/distribution zones).
- Divides prices into quartiles: bottom 25% and top 25%
- Calculates the average price in each zone (volume-weighted level)
- If current price is near the volume-weighted low + below average → **Accumulation zone** (+25 points)
- If current price is near volume-weighted high + above average → **Distribution zone** (+20 points)
- Why it matters: When large traders accumulate at low prices, that creates demand that pushes prices up. When they distribute at high prices, that signals top.

**Example:**
- Volume-weighted low for item = 500gp (where most buyers hang out)
- Current price = 502gp (right at the accumulation zone)
- This means buyers are waiting here - price will likely rebound to at least 550gp

### Factor 4: Mean Reversion Strength
**What it does:** Determines if the current deviation is realistic or extreme.
- Calculates expected deviation based on historical volatility
- If deviation is at an "extreme but realistic" level → High reversion probability (+25 points)
- If deviation is EXTREMELY far from average → Lower confidence but higher potential (+15 points)
- Why it matters: Not all deviations are equal. Items normally trading within ±10% shouldn't be trusted at ±50% deviation (could be broken/glitched data)

**Example:**
- Item normally swings ±15% from average
- Currently at -12% → realistic deviation (expected to recover to average = +13% profit)
- Currently at -50% → unrealistic (either glitched data or item is doomed, not a trade)

### Factor 5: Price Action Patterns
**What it does:** Identifies pump/dump cycles ready to reverse.
- Looks for items that swung >8% in the last 7 days
- Combined with being below average, this signals a dump recovery setup
- Why it matters: Items that just got dumped hard revert fastest. They're the most profitable flips.

**Example:**
- Item was 650gp, dumped to 580gp (-10% in 3 days), but now below 30d average
- Buyers will see this as a bargain → likely to recover to 620gp+ quickly

### Factor 6: Liquidity Quality
**What it does:** Ensures you can actually sell the item (no point in a flip you can't execute).
- High liquidity (volume 60+) → **+12 points** (can flip quickly)
- Decent liquidity (40-60) → **+6 points** (slower to flip but possible)
- Low liquidity (<20) → **-10 point penalty** (might get stuck holding item)
- Why it matters: An amazing 50% upside opportunity is worthless if you can't sell it. Illiquid items sit forever.

**Example:**
- Unique quest item with high upside but trades only 1-2 times per day
- vs. Popular potion that trades 1000+ times per day
- Even if potion upside is lower (30% vs 50%), it's a better flip because you can actually execute it

### Factor 7: Risk/Reward Ratio
**What it does:** Ensures profit potential justifies the risk taken.
- Calculates potential profit vs. downside risk
- Good ratio (1.5x or higher) → **+15 points** (profitable trade)
- Poor ratio (<0.5x) → **-15 point penalty** (not worth the risk)
- Why it matters: Professional traders don't take 100% risk for 20% reward. The ratio matters more than the absolute numbers.

**Example:**
- Item at 500gp, could go up to 700gp (+40% upside), but could drop to 400gp (-20% downside)
- Risk/reward = 40/20 = 2.0x → Great trade (+15 points)

- Item at 500gp, could go up to 550gp (+10% upside), but could drop to 400gp (-20% downside)
- Risk/reward = 10/20 = 0.5x → Poor trade (-15 points)

---

## How These Factors Work Together

Instead of a binary "yes/no" based on price deviation, the algorithm now:

1. **Checks all 7 factors** and assigns points for realistic, market-driven signals
2. **Combines the scores** to get a realistic opportunity score (0-100)
3. **Filters out low-quality opportunities** (poor liquidity, unrealistic deviations, etc.)
4. **Prioritizes high-quality flips** (support bounces, reversal signals, good risk/reward)

### Real Example Walkthrough

**Item: Grimy Avantoe**
- Current price: 3,050gp
- 30d average: 3,250gp (current is -6.1% below average)
- Recently dumped from 3,400gp to 3,050gp in 2 days (-10% swing)
- Liquidity score: 75/100 (very active trading)
- Support level at 3,000gp (3% below current price)
- Risk/reward ratio: Can recover to 3,400gp (+11.5%), downside to 2,800gp (-8.2%) = 1.4x ratio

**Scoring:**
- Factor 1 (Support): Near 3,000gp support + below average = +35 points
- Factor 2 (Momentum): Dump ending + reversal starting = +25 points
- Factor 3 (Volume): At accumulation zone = +20 points
- Factor 4 (Mean Reversion): -6% is realistic given 20% normal volatility = +18 points
- Factor 5 (Pump/Dump): -10% dump in 2 days, now stable = +15 points
- Factor 6 (Liquidity): 75/100 = +12 points
- Factor 7 (Risk/Reward): 1.4x ratio = +12 points

**Total: 137 points → clamped to 100/100**
**Recommendation: STRONG BUY** - Expected recovery to 3,350-3,400gp, low risk

---

## What This Means for Users

✅ **More realistic flip suggestions** - based on actual market behavior, not just math
✅ **Better profit potential** - algorithm catches reversals and pump/dumps, not just mean reversion
✅ **Fewer false signals** - illiquid items, glitched data, and unrealistic opportunities are filtered
✅ **Professional-grade analysis** - considers factors that real traders use (support/resistance, momentum, liquidity)

---

## Remaining Limitations

The algorithm still works with aggregated price data (1h volume, 30d history). For maximum accuracy, it would need:
- Tick-by-tick trading data (to see actual buyer/seller behavior)
- Real order book depth (to understand how much volume exists at each price)
- NPC buy/sell limits (some items have hard caps)

But with the current data, this is about as sophisticated as we can get!
