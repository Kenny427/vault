import { NextResponse } from 'next/server';
import { getItemPrice, getItemHistory, getPopularItems } from '@/lib/api/osrs';
import { calculateMean, calculateStdDev } from '@/lib/analysis';

async function getGPTAnalysis(itemName: string, itemData: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const prompt = `You are an expert OSRS Grand Exchange flipper. A user is asking about: "${itemName}"

Here is the current price and historical data:
${itemData}

Provide a detailed, actionable analysis answering:
1. **Is this a good flip right now?** (Yes/No with reasoning)
2. **Current valuation** - Is it overpriced, underpriced, or fairly valued?
3. **Price trend** - What's the direction over the last 30/90 days?
4. **Buy recommendation** - If you were flipping, would you buy now? At what price?
5. **Hold time estimate** - How long until it recovers to good selling price?
6. **Risk level** - How volatile/risky is this item?
7. **Expected profit** - Rough estimate of profit potential if bought at current price
8. **Alternative timing** - When would be a better time to buy this item?

Be specific with numbers and percentages. Use the historical data provided to back up your analysis.`;

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
    const { itemName } = await request.json();

    if (!itemName || typeof itemName !== 'string') {
      return NextResponse.json(
        { error: 'itemName is required' },
        { status: 400 }
      );
    }

    // Find the item in popular items
    const popularItems = await getPopularItems();
    const item = popularItems.find(
      i => i.name.toLowerCase() === itemName.toLowerCase()
    );

    if (!item) {
      return NextResponse.json(
        { error: `Item "${itemName}" not found in pool. Try searching popular items.` },
        { status: 404 }
      );
    }

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

    // Build detailed data for AI analysis
    const itemData = `
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
