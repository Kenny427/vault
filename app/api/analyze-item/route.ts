import { NextResponse } from 'next/server';
import { getItemPrice, getItemHistory, getPopularItems } from '@/lib/api/osrs';
import { calculateMean, calculateStdDev } from '@/lib/analysis';
import { analyzeItemLimiter } from '@/lib/rateLimiter';

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

**CRITICAL: Determine if this is a BUYING or SELLING question:**

**EXIT STRATEGY Questions (user already owns the item):**
- Contains phrases: "I'm holding", "I bought at", "I own", "my position", "exit strategy"
- These mean they ALREADY own the item and want to know WHEN TO SELL

**BUYING Questions (user wants to know if they should buy):**
- Contains phrases: "Should I flip", "Should I buy", "Is this a good flip", "good opportunity"
- These mean they DON'T own it yet and want to know IF/WHEN TO BUY

---

**If this is an EXIT STRATEGY question (user already owns it):**
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

**If this is a BUYING question (user wants to know if they should buy):**
1. **Is this a good flip right now?** (Yes/No with strong reasoning)
   - Compare current price to 30d, 90d, 365d averages
   - Is it at a significant discount (>15-20%)?

2. **Current valuation** - Where does current price sit relative to historical ranges?
   - Quantify the discount/premium vs averages
   - Is this a temporary dip or fundamental shift?

3. **Price trend & catalyst** - What caused the current price level?
   - Bot activity patterns (supply flooding, demand spike)?
   - Game updates or seasonal factors?
   - Mean-reversion potential

4. **Buy recommendation** - Exact buy/sell targets
   - Should they buy at current price or wait?
   - Entry price target
   - Target sell price (realistic recovery level)
   - Expected ROI percentage

5. **Hold time estimate** - Timeline for mean-reversion recovery
   - How long historically does this item take to recover?
   - Is user okay holding for weeks/months?

6. **Risk assessment**
   - Volatility (good for flipping or too risky?)
   - Liquidity (can user exit position easily?)
   - Worst-case scenario

7. **Expected profit calculation**
   - If bought at current price, sell at [X] target
   - Profit per unit and ROI%
   - Volume strategy (how many units to flip?)

8. **Alternative timing**
   - Should user wait for deeper discount?
   - Are there better opportunities in similar items?
   - Historical price floors to watch for

Be specific with numbers, percentages, and GP values. DO NOT confuse buying and selling questions - read the user's original question carefully.`;


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
    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
    const rateCheck = analyzeItemLimiter.check(clientIP);
    
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Please try again in ${rateCheck.retryAfter} seconds.` },
        { status: 429, headers: { 'Retry-After': rateCheck.retryAfter!.toString() } }
      );
    }

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
    const idMatch = itemName.match(/id\s*:\s*(\d+)/i);
    const normalizedName = itemName.replace(/\s*\(id\s*:\s*\d+\)\s*/i, ' ').trim();
    const lowerQuery = normalizedName.toLowerCase();

    if (idMatch) {
      const id = Number(idMatch[1]);
      matchedItem = popularItems.find(i => i.id === id) || null;
    }
    
    // Try exact match first (most precise)
    matchedItem = matchedItem || popularItems.find(i => i.name.toLowerCase() === lowerQuery);
    
    // If no exact match, try to match with dose numbers (e.g., "Super attack(1)" should match exactly, not Super attack(4))
    if (!matchedItem) {
      // If query contains a dose number like (1), (2), (3), (4), match only items with the same dose
      const doseMatch = lowerQuery.match(/\((\d)\)/);
      if (doseMatch) {
        const targetDose = doseMatch[1];
        // First try items with the same dose
        matchedItem = popularItems.find(i => {
          const iLower = i.name.toLowerCase();
          const baseName = lowerQuery.replace(/\s*\(\d\)\s*$/, '').trim();
          const iBaseName = iLower.replace(/\s*\(\d\)\s*$/, '').trim();
          return iLower.includes(`(${targetDose})`) && (iBaseName === baseName || iBaseName.includes(baseName) || baseName.includes(iBaseName));
        });
      }
    }
    
    // If no dose-specific match, find item name within the query
    if (!matchedItem) {
      matchedItem = popularItems.find(i => {
        const itemLower = i.name.toLowerCase();
        return lowerQuery.includes(itemLower) || itemLower.includes(lowerQuery);
      });
    }
    
    // If still no match, try partial word matching
    if (!matchedItem) {
      const queryWords = lowerQuery.split(/\s+/).filter(w => !w.match(/^\(\d\)$/)); // Exclude dose numbers
      matchedItem = popularItems.find(i => {
        const itemWords = i.name.toLowerCase().split(/\s+/).filter(w => !w.match(/^\(\d\)$/));
        return itemWords.every(word => queryWords.some(qw => qw.includes(word) || word.includes(qw)));
      });
    }

    if (!matchedItem) {
      return NextResponse.json(
        { error: `Could not find an item matching "${itemName}". Try using exact item names like "Avantoe" or "Runite bolts" or include the dose number like "Super attack(1)".` },
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

    // Determine if this is a buying or exit strategy question
    const isExitStrategyQuestion = userQuestion && /\b(holding|bought at|I bought|I own|my position|exit strategy)\b/i.test(userQuestion);
    const isBuyingQuestion = userQuestion && /\b(should I flip|should I buy|is .+ a good flip|good opportunity|worth buying|flip .+\?)\b/i.test(userQuestion);
    
    // Add user context based on question type
    let userContext = '';
    if (isExitStrategyQuestion && !isBuyingQuestion) {
      userContext = `\n**⚠️ USER CONTEXT - EXIT STRATEGY QUESTION:**\nThe user's question: "${userQuestion}"\n**This is an EXIT STRATEGY question.** The user already owns this item and wants to know WHEN TO SELL for optimal profit. DO NOT give buying advice - focus entirely on exit targets and timing.\n`;
    } else if (isBuyingQuestion || userQuestion) {
      userContext = `\n**📊 USER CONTEXT - BUYING QUESTION:**\nThe user's question: "${userQuestion}"\n**This is a BUYING question.** The user does NOT own this item yet and wants to know if they should BUY it. Focus on entry points, valuation, and whether this is a good flip opportunity right now.\n`;
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
