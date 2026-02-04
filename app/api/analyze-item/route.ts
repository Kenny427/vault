import { NextResponse } from 'next/server';
import { getItemPrice, getItemHistory, getPopularItems } from '@/lib/api/osrs';
import { calculateMean, calculateStdDev } from '@/lib/analysis';

async function getGPTAnalysis(itemName: string, itemData: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const prompt = `You are an expert OSRS Grand Exchange flipper specializing in MEAN-REVERSION strategy. A user is asking about: "${itemName}"

Here is the current price and historical data:
${itemData}

**Trading Strategy Context:**
- User focuses on mean-reversion: buying items significantly below historical averages and waiting for price recovery
- Comfortable holding items for weeks or even months if fundamentals are strong
- Looks for items affected by bot activity (price spikes when bots buy, crashes when they sell)
- Key metric: discount from 30d/90d/365d averages
- Profit target: 20-50%+ ROI, willing to wait for recovery

**IMPORTANT:** If the user mentions they are already "holding" or "bought at" a specific price, FOCUS YOUR ENTIRE RESPONSE ON EXIT STRATEGY:
- Skip "buy recommendation" - they already own it
- Focus on: When to sell? What's the optimal exit price? How long to hold?
- Calculate their current profit/loss based on their entry price
- Provide specific sell targets with timeline estimates

Provide a detailed, actionable analysis:

**If user already owns the item (mentioned "holding" or "bought at"):**
1. **Current Position Analysis**
   - Their entry price vs current price (profit/loss)
   - Their entry price vs historical averages (did they buy well?)

2. **Exit Strategy Recommendation**
   - **WHEN TO SELL NOW:** Should they sell immediately at current price? Why/why not?
   - **OPTIMAL EXIT TARGETS:** Specific price targets (conservative, moderate, aggressive)
   - **TIMELINE:** How long to hold for each target? (days/weeks/months)

3. **Risk of Continuing to Hold**
   - What if price drops further?
   - Opportunity cost of capital being tied up
   - Is the current profit good enough to take now?

4. **Profit Calculations**
   - Current unrealized profit/loss (GP and %ROI)
   - Projected profit at each exit target
   - After GE tax (2%)

**If user is asking about buying:**
1. **Is this a good flip right now?** (Yes/No with strong reasoning)
2. **Current valuation** - Discount/premium vs averages
3. **Price trend & catalyst** - Bot activity, updates, mean-reversion potential
4. **Buy recommendation** - Entry price, target sell price, expected ROI
5. **Hold time estimate** - Timeline for recovery
6. **Risk assessment** - Volatility, liquidity, worst-case
7. **Expected profit** - Per unit profit, ROI%, volume strategy
8. **Alternative timing** - Wait for deeper discount?

Be specific with numbers, percentages, and GP values. Focus on actionable advice based on whether they're buying or selling.`;


  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function POST(request: Request) {
  try {
    const { itemName, userQuestion } = await request.json();

    if (!itemName || typeof itemName !== 'string') {
      return NextResponse.json(
        { error: 'itemName is required' },
        { status: 400 }
      );
    }

    // Get popular items first to match against
    const popularItems = await getPopularItems();
    
    // Smart item name extraction: find matching item in pool from user's question
    // Examples: "avantoe a good flip" -> "Avantoe", "tell me about runite bolts" -> "Runite bolts"
    let matchedItem = null;
    const lowerQuery = itemName.toLowerCase();
    
    // Try exact match first
    matchedItem = popularItems.find(i => i.name.toLowerCase() === lowerQuery);
    
    // If no exact match, find item name within the query
    if (!matchedItem) {
      matchedItem = popularItems.find(i => {
        const itemLower = i.name.toLowerCase();
        return lowerQuery.includes(itemLower) || itemLower.includes(lowerQuery);
      });
    }
    
    // If still no match, try partial word matching
    if (!matchedItem) {
      const queryWords = lowerQuery.split(/\s+/);
      matchedItem = popularItems.find(i => {
        const itemWords = i.name.toLowerCase().split(/\s+/);
        return itemWords.every(word => queryWords.some(qw => qw.includes(word) || word.includes(qw)));
      });
    }

    if (!matchedItem) {
      return NextResponse.json(
        { error: `Could not find an item matching "${itemName}". Try using exact item names like "Avantoe" or "Runite bolts".` },
        { status: 404 }
      );
    }
    
    const item = matchedItem;

    // Get current price and history
    const price = await getItemPrice(item.id);
    if (!price) {
      return NextResponse.json(
        { error: `Could not fetch price data for ${itemName}` },
        { status: 500 }
      );
    }

    const currentPrice = (price.high + price.low) / 2;

    const history30 = await getItemHistory(item.id, 30 * 24 * 60 * 60, currentPrice);
    const history90 = await getItemHistory(item.id, 90 * 24 * 60 * 60, currentPrice);
    const history365 = await getItemHistory(item.id, 365 * 24 * 60 * 60, currentPrice);

    if (!history30 || !history90 || !history365) {
      return NextResponse.json(
        { error: `Insufficient price data for ${itemName}` },
        { status: 500 }
      );
    }

    // Calculate statistics
    const prices30 = history30.map(p => p.price);
    const prices90 = history90.map(p => p.price);
    const prices365 = history365.map(p => p.price);

    const avg30 = calculateMean(prices30);
    const avg90 = calculateMean(prices90);
    const avg365 = calculateMean(prices365);

    const high30 = Math.max(...prices30);
    const low30 = Math.min(...prices30);
    const high365 = Math.max(...prices365);
    const low365 = Math.min(...prices365);

    const volatility = (calculateStdDev(prices365) / avg365) * 100;
    const spread = ((high365 - low365) / currentPrice) * 100;

    // Add user context if they're asking about a position they hold
    let userContext = '';
    if (userQuestion && /holding|bought at|I bought|I own/i.test(userQuestion)) {
      userContext = `\n**USER CONTEXT - EXIT STRATEGY QUESTION:**\nThe user's original question was: "${userQuestion}"\nThis indicates they already own this item and want to know WHEN TO SELL for optimal profit. Focus your entire response on exit strategy, not buying advice.\n`;
    }

    // Build detailed data for AI analysis
    const itemData = `${userContext}
**Current Price:** ${currentPrice.toLocaleString()} gp (High: ${price.high}, Low: ${price.low})

**30-Day History:**
- Average: ${Math.round(avg30).toLocaleString()} gp
- High: ${high30.toLocaleString()} gp
- Low: ${low30.toLocaleString()} gp
- Discount from avg: ${(((avg30 - currentPrice) / avg30) * 100).toFixed(1)}%

**90-Day History:**
- Average: ${Math.round(avg90).toLocaleString()} gp
- Discount from avg: ${(((avg90 - currentPrice) / avg90) * 100).toFixed(1)}%

**365-Day (1 Year) History:**
- Average: ${Math.round(avg365).toLocaleString()} gp
- High: ${high365.toLocaleString()} gp
- Low: ${low365.toLocaleString()} gp
- Discount from avg: ${(((avg365 - currentPrice) / avg365) * 100).toFixed(1)}%
- All-time range: ${low365.toLocaleString()} - ${high365.toLocaleString()} gp

**Volatility Metrics:**
- Price volatility: ${volatility.toFixed(1)}%
- Price spread (high-low): ${spread.toFixed(1)}%
- Data points available: 30d=${prices30.length}, 90d=${prices90.length}, 365d=${prices365.length}

Current position: ${currentPrice < avg30 ? 'BELOW' : 'ABOVE'} 30d average by ${Math.abs((((avg30 - currentPrice) / avg30) * 100)).toFixed(1)}%
    `;

    console.log(`📊 AI analyzing item: ${itemName}`);

    // Get AI analysis
    const analysis = await getGPTAnalysis(itemName, itemData);

    return NextResponse.json({
      itemName,
      currentPrice,
      analysis,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Item analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze item' },
      { status: 500 }
    );
  }
}
