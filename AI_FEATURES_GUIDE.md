# 🚀 Enhanced AI Features - Usage Guide

## Overview
New AI-powered endpoints have been added to optimize your flipping strategy across portfolio management, opportunity analysis, item pool curation, and real-time trading advice.

---

## 1. 📊 **Pool Optimizer API**
**Endpoint:** `POST /api/pool-optimizer`

### Purpose
Scores all items in your trading pool and identifies which ones are most suitable for mean-reversion flipping. Helps optimize your item selection based on real-time data.

### Request
```json
{
  "sampleSize": 20,
  "fullScan": false
}
```

**Parameters:**
- `sampleSize` (default: 20): How many random items to analyze in sample mode
- `fullScan` (default: false): If true, analyzes all 113 items (slower, more API calls)

### Response
```json
{
  "totalAnalyzed": 20,
  "averageScore": 72,
  "topPerformers": [
    {
      "id": 9144,
      "name": "Runite bolts",
      "category": "ammo",
      "currentScore": 95,
      "botActivity": 95,
      "volatility": 18,
      "liquidity": 100,
      "meanReversionFitness": 98,
      "seasonalTrend": "up",
      "recommendation": "PROMOTE",
      "reasoning": "Excellent mean-reversion candidate - stable supply, ideal volatility"
    }
  ],
  "needsAttention": [...],
  "aiInsights": "Top performers share strong bot activity (90+%) and moderate volatility (15-25%...)...",
  "allScores": [...]
}
```

### How to Use
1. **Weekly:** Run sample scan (20 items) to check pool health
2. **Monthly:** Run full scan (fullScan=true) to discover optimization opportunities
3. **Review AI Insights:** Read the AI-generated analysis for hidden patterns
4. **Act on Recommendations:** 
   - **PROMOTE**: Items scoring 80+ should get more attention in your analysis
   - **DEMOTE**: Items scoring <50 should be removed from active trading
   - **REMOVE**: Items failing multiple metrics should be dropped from pool

### Expected Outcome
- Identify 3-5 items to add to pool per month
- Remove 2-3 underperforming items monthly
- Increase average item score from 72 to 78+

---

## 2. 📈 **Portfolio Forecast API**
**Endpoint:** `POST /api/portfolio-forecast`

### Purpose
Predicts short-term (7d), medium-term (30d), and long-term (90d) price movements for your portfolio items with confidence levels and exit recommendations.

### Request
```json
{
  "items": [
    {
      "itemId": 536,
      "itemName": "Dragon bones",
      "quantity": 500,
      "buyPrice": 3500,
      "currentPrice": 3800
    },
    {
      "itemId": 9243,
      "itemName": "Diamond bolts (e)",
      "quantity": 1000,
      "buyPrice": 520,
      "currentPrice": 585
    }
  ]
}
```

### Response
```json
{
  "summary": {
    "totalInvested": 896000,
    "currentValue": 1046500,
    "currentProfit": 150500,
    "currentProfitPercent": "16.8",
    "projected30dValue": 1125000,
    "projected30dProfit": 229000,
    "projected30dProfitPercent": "25.6"
  },
  "itemForecasts": [
    {
      "itemName": "Diamond bolts (e)",
      "current": 585,
      "forecast7d": 625,
      "forecast30d": 720,
      "forecast90d": 850,
      "confidenceLevel": "high",
      "reasoning": "Strong uptrend on PvM demand surge, approaching 30d resistance",
      "recommendedExitDate": "2026-03-10",
      "projectedProfit": 31,
      "quantity": 1000,
      "currentPrice": 585
    }
  ],
  "generatedAt": "2026-02-05T14:23:00Z"
}
```

### How to Use
1. **Every 2-3 Days:** Fetch forecast for your current portfolio
2. **Exit Strategy:** Use `recommendedExitDate` to plan when to sell each item
3. **Profit Taking:** 
   - If confidence="high" and projectedProfit meets your target, consider selling
   - If confidence="low", hold longer or use more conservative exit target
4. **Rebalancing:** 
   - Compare projected 30d values across items
   - Shift capital toward items with highest projected gains
5. **Decision Making:**
   - High confidence + high profit = SELL at recommended date
   - High confidence + moderate profit = HOLD for higher target
   - Low confidence = SELL sooner to reduce risk

### Expected Outcome
- Better timing on when to exit positions
- 20-30% reduction in "stuck" capital
- Increase win rate from 60% to 70%+

---

## 3. 🎯 **Execution Plans API**
**Endpoint:** `POST /api/execution-plans`

### Purpose
Generates detailed entry/exit strategies for your top opportunities, showing where to buy, where to sell at different risk levels, and how to size positions.

### Request
```json
{
  "opportunities": [/* Top 10 MeanReversionSignal objects from /api/mean-reversion-opportunities */]
}
```

### Response
```json
{
  "executionPlans": [
    {
      "itemName": "Runite bolts",
      "confidence": 85,
      "entryZone": {
        "lowPrice": 8850,
        "midPrice": 9000,
        "highPrice": 9150,
        "reasoning": "Support at 30d average, typical bot floor, consolidation pattern"
      },
      "exitZone": {
        "conservative": {
          "price": 9400,
          "profitPercent": 4.4,
          "daysToTarget": "3-5"
        },
        "moderate": {
          "price": 10200,
          "profitPercent": 13.3,
          "daysToTarget": "10-20"
        },
        "aggressive": {
          "price": 11500,
          "profitPercent": 27.8,
          "daysToTarget": "30-60"
        }
      },
      "riskRewardRatio": "1:2.5",
      "positionSizing": {
        "recommended": "Medium (5-10%)",
        "reasoning": "High liquidity and stable bot supply reduces risk..."
      },
      "timeframe": "2-4 weeks",
      "keyRisks": [
        "Sudden bot crash could flood supply",
        "Lower than expected PvM activity"
      ],
      "catalysts": [
        "New boss content could spike demand",
        "Seasonal PvM events drive consistent buying"
      ],
      "itemId": 9144,
      "grade": "A+",
      "suggestedInvestment": 450000
    }
  ],
  "summary": {
    "totalOpportunities": 10,
    "highConfidence": 6,
    "averageRiskReward": "1:2.1"
  },
  "generatedAt": "2026-02-05T14:25:00Z"
}
```

### How to Use
1. **Before Opening Trades:** Fetch execution plans for current opportunities
2. **Entry Strategy:**
   - Buy at or below `entryZone.midPrice` for optimal entry
   - Use `entryZone.lowPrice` only if you have strong reasons
   - Never buy above `entryZone.highPrice` (miss the setup)
3. **Position Sizing:**
   - Follow `positionSizing.recommended` - it accounts for risk/volatility
   - Don't oversize: Even A+ grades should be max 10% of portfolio
4. **Exit Strategy - Choose Your Style:**
   - **Conservative:** Quick 4-5% gains, sleep well at night, then move capital
   - **Moderate:** 2-4 week holds for 15%+ gains, balanced approach
   - **Aggressive:** Maximum profit 30%+ but requires active monitoring
5. **Risk Management:**
   - Set stop loss at `entryZone.lowPrice - (entryZone.lowPrice * 5%)` 
   - Monitor `keyRisks` daily - exit early if risk materializes
   - Track `catalysts` - when they occur, consider upgrading to next exit target

### Example Trading Decision
```
Runite Bolts Setup:
- Entry: Buy at 9000gp (midPrice in entryZone)
- Risk: 9000 * 5% = 450gp per item
- Conservative Exit: 9400gp (profit 400gp, ratio 1:0.9)
- Moderate Exit: 10200gp (profit 1200gp, ratio 1:2.7) ← RECOMMENDED
- Aggressive Exit: 11500gp (profit 2500gp, ratio 1:5.5)

→ Buy 500 units at 9000gp = 4.5M capital
→ Set exit at 10200gp for 600k profit (13.3%)
→ Monitor demand catalysts - if strong, hold for 11500gp target
```

### Expected Outcome
- Entry price within 0.5-1% of optimal levels (vs random buying)
- 15-25% average win size on successful trades
- Disciplined exit timing (no emotional decisions)

---

## 4. 💬 **Enhanced Chat with Portfolio Context** 
(Coming in next update)

### Purpose
Chat AI will soon understand your portfolio context and give advice tailored to your specific holdings.

### Future Usage
```
User: "Should I hold my Runite bolts or sell?"

Chat Response: "You're holding 500 Runite bolts at 9000gp entry 
(currently worth 4.5M). Based on current technical setup and demand 
catalysts, I recommend holding until 10200gp for moderate profit or 
11500gp for maximum gain. Key risk: if bot supply crashes and price 
drops below 8500gp, exit immediately."
```

---

## 🔧 **Integration Instructions**

### For Portfolio Tab
Add button in Portfolio component:
```typescript
<button onClick={() => fetchForecast(portfolioItems)}>
  📈 AI Forecast Portfolio
</button>
```

### For Opportunities Tab
Add button after opportunities list:
```typescript
<button onClick={() => generateExecutionPlans(topOpportunities)}>
  🎯 Generate Execution Plans
</button>
```

### For Pool Manager (New Feature)
Add dashboard showing:
```typescript
<PoolOptimizationDashboard />
// Shows: Top performers, needs attention, AI insights, recommend actions
```

---

## 📊 **Success Metrics**

| Metric | Target | How to Track |
|--------|--------|-------------|
| Win Rate | 65%+ | Track successful exits vs total exits |
| Avg Profit/Trade | 15%+ | (Exit price - Entry price) / Entry price |
| Time in Trade | 7-25 days | Exit date - Entry date |
| Capital Efficiency | 80%+ | (Avg holding days / Target holding days) |
| Portfolio Growth | 5-10%/month | (Month end portfolio - Month start) / Month start |

---

## 🚨 **Important Notes**

1. **AI predictions are NOT guarantees** - Always validate with your own analysis
2. **Update frequency:** Run Pool Optimizer monthly, Portfolio Forecast every 2-3 days
3. **Risk management first:** Use stop losses even on high-confidence setups
4. **Stay flexible:** If catalysts fail to materialize, exit early
5. **Monitor API costs:** Current usage should stay within $5-10/month

---

## 📞 **Troubleshooting**

**"Not enough data for item"** → Item has <60 days of price history, skip it

**"Forecast doesn't match expectations"** → Wait 1-2 days, AI models update daily

**"Position not in execution plan"** → Item may not be in top 10 opportunities, run full analysis

---

**Happy flipping! 📈**
