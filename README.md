# OSRS Flipping Ultra 🎯

The ultimate **AI-powered Grand Exchange analysis tool** for OSRS flipping. Find the most profitable trades with detailed metrics, risk analysis, and smart recommendations.

## 🚀 Features

### Core Analysis
- ✅ **Real-time Price Tracking**: Live prices from OSRS Wiki API
- ✅ **Historical Data Analysis**: Simulated price data for all items
- ✅ **Trend Detection**: Bullish/Bearish/Neutral trends
- ✅ **Volatility Scoring**: Understand market stability
- ✅ **Smart Recommendations**: Buy/Sell/Hold signals

### Advanced Metrics
- 💰 **Profit Calculation**: Per-unit profit accounting for 1% GE tax
- 📊 **ROI %**: Return on Investment percentage
- 📈 **Margin %**: Profit margin analysis
- 🎯 **Risk Assessment**: Low/Medium/High risk classification
- 📉 **Confidence Scoring**: 0-100 probability of success
- ⏱️ **Hold Time Estimates**: How long to wait for profit

### User Experience
- 🔍 **Advanced Sorting**: Sort by Score, ROI, Profit, or Confidence
- 📚 **Built-in Tutorial**: Learn how to flip in 3 steps
- 🎓 **Strategy Guide**: Each item explains when to buy and sell
- 📌 **Watchlist**: Track your favorite items
- 🎨 **Beautiful Cards**: Color-coded risk levels and metrics

## 📊 Understanding the Metrics

### Score (0-100)
Overall quality of the flip opportunity. Combines:
- How far below/above average the price is
- Current market trend
- Price volatility
- Confidence factors

### ROI % (Return on Investment)
Percentage profit relative to your investment:
```
ROI = (Profit / Buy Price) × 100
```

### Profit/Unit
Actual gold profit after GE tax (1%):
```
Profit = Sell Price - Buy Price - (Sell Price × 0.01)
```

### Risk Level
- 🟢 **Low**: Stable, predictable items (high confidence)
- 🟡 **Medium**: Moderate volatility (balanced opportunities)
- 🔴 **High**: Volatile items (requires attention)

### Confidence
Probability that the flip will happen as predicted (0-100%):
- Higher confidence = More likely to succeed
- Based on volatility, trading volume, and trend strength

## 🎮 How to Use

### Step 1: Explore Opportunities
1. The dashboard auto-loads popular items
2. Use the search bar to find specific items
3. Click the "How to Flip" button to learn the basics

### Step 2: Read the Strategy
1. Each card shows recommended prices:
   - **Buy At**: The price to purchase at
   - **Sell At**: The price to wait for
2. Click "Strategy & Tips" for detailed guidance
3. Check the risk level (color-coded badge)

### Step 3: Execute the Flip
1. Go to the Grand Exchange in-game
2. Buy the item at the recommended "Buy At" price
3. Wait for the estimated hold time
4. Sell when the price rises to the "Sell At" price
5. Profit = (Sell Price - Buy Price) × Quantity - 1% GE Tax

## 🔧 Filtering & Sorting

### Min Score Slider
- Filter out low-quality opportunities
- Start with 50+ for safer flips
- Go lower for more options (higher risk)

### Sort Options
- **Opportunity Score**: Best overall opportunities
- **ROI %**: Highest return on investment
- **Profit/Unit**: Highest absolute profit
- **Confidence**: Most likely to succeed

### Signal Filters
- **Buy Signals**: Items currently underpriced
- **Sell Signals**: Items currently overpriced

## 💡 Flipping Tips

### For Beginners
1. Start with **low-risk** items (🟢 Green labels)
2. Focus on items with **50+ confidence**
3. Use items with **300+ profit potential**
4. Start with smaller quantities

### Intermediate
1. Look for **ROI > 10%** for good returns
2. Monitor **volatility** - higher volatility = bigger price swings
3. Use **multiple items** to spread risk
4. Check **hold time** - some flips are overnight

### Advanced
1. Combine analysis with in-game price checking
2. Watch for **GE limits** (purchase limits per 4 hours)
3. Time your buys around **market cycles**
4. Diversify across **different item categories**

## 📈 Market Indicators Explained

### Volatility %
Measures price swings:
- **<5%**: Stable, predictable (good for beginners)
- **5-15%**: Moderate (balanced risk/reward)
- **>15%**: Volatile (high profit potential but risky)

### Volume Score (0-100)
Estimated trading activity:
- Higher = More people trading (quicker sell times)
- Lower = Slower trades (might take longer to sell)

### Trend
- 📈 **Bullish**: Price going up (good time to sell)
- 📉 **Bearish**: Price going down (good time to buy)
- → **Neutral**: No clear direction

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **State**: Zustand
- **Data**: OSRS Wiki API, Simulated Historical Data
- **Analytics**: Talib-inspired statistical functions

## 🚀 Getting Started

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
# Open http://localhost:3000
```

### Production Build
```bash
npm run build
npm start
```

## 📋 Common Questions

**Q: Is this tool accurate?**
A: The tool provides solid analysis based on price trends. However, always verify prices in-game before trading!

**Q: What's the best time to flip?**
A: Look for items with recent price dips (negative deviation) for buy opportunities, and peaks (positive deviation) for sell opportunities.

**Q: How much money do I need?**
A: Start with as little as 10k gold. Even small flips build up over time!

**Q: Why aren't some items showing data?**
A: Rare or recently released items may not have enough trading history. The tool simulates data for display purposes.

**Q: What's the GE tax?**
A: You pay 1% tax on the selling price when you sell items on the GE.

## 📞 Support

- Check price data accuracy in-game
- Verify item limits at the GE
- Watch tutorial videos on YouTube if confused
- Start small and scale up!

Happy flipping! 📈🎯



## Project Structure

```
app/
├── page.tsx          # Main page with provider setup
├── layout.tsx        # Root layout
└── globals.css       # Global styles

components/
├── Dashboard.tsx     # Main dashboard component
├── SearchBar.tsx     # Item search interface
├── PriceChart.tsx    # Price trend visualization
└── FlipCard.tsx      # Individual flip opportunity card

lib/
├── api/
│   └── osrs.ts       # OSRS Wiki API integration
├── store.ts          # Zustand store for state management
└── analysis.ts       # Flip detection algorithms
```

## How to Use

1. **Search for Items**: Use the search bar to find OSRS items
2. **View Price History**: Charts display price trends over time
3. **Identify Opportunities**: Green highlighted items indicate good flips
4. **Set Thresholds**: Adjust sensitivity for opportunity detection
5. **Track Watchlist**: Save items you're monitoring

## Flip Detection Logic

The dashboard analyzes:
- **Historical Average**: Compares current price to 30/90/365 day averages
- **Standard Deviation**: Identifies prices deviating significantly from norm
- **Momentum**: Detects trend reversals and bounces
- **Volume Analysis**: Considers trading activity

## Future Enhancements

- [ ] Portfolio tracking and profit calculation
- [ ] Price alerts and notifications
- [ ] Export data to CSV
- [ ] Advanced technical indicators (RSI, MACD, Bollinger Bands)
- [ ] Multi-account support
- [ ] Mobile responsive design improvements
