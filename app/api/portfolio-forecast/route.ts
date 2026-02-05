import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getItemPrice, getItemHistory } from '@/lib/api/osrs';

interface PortfolioItem {
  itemId: number;
  itemName: string;
  quantity: number;
  buyPrice: number;
  currentPrice: number;
}

interface PriceForecast {
  itemName: string;
  current: number;
  forecast7d: number;
  forecast30d: number;
  forecast90d: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  reasoning: string;
  recommendedExitDate: string; // ISO date
  projectedProfit: number; // percentage
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Portfolio Forecast API
 * Predicts price movements for portfolio items
 * 
 * Usage:
 * POST /api/portfolio-forecast
 * Body: { items: [{ itemId, itemName, quantity, buyPrice, currentPrice }, ...] }
 * 
 * Returns: Forecasts for 7d, 30d, 90d with confidence and exit recommendations
 */
export async function POST(request: Request) {
  try {
    const { items } = (await request.json()) as { items: PortfolioItem[] };

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    console.log(`📈 [FORECAST] Generating forecasts for ${items.length} portfolio items...`);

    // Fetch historical data for each item
    const forecastPromises = items.map(async (item) => {
      try {
        const [currentPrice, history365] = await Promise.all([
          getItemPrice(item.itemId),
          getItemHistory(item.itemId, 365),
        ]);

        if (!currentPrice || !history365 || history365.length < 60) {
          return null; // Skip items without sufficient data
        }

        // Calculate historical metrics
        const prices = history365.map((h) => (h.avgHighPrice + h.avgLowPrice) / 2);
        const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
        const variance = prices.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / prices.length;
        const stdDev = Math.sqrt(variance);

        // Recent vs historical
        const recent30 = prices.slice(-30);
        const recentAvg = recent30.reduce((a, b) => a + b, 0) / recent30.length;
        const recentStdDev = Math.sqrt(recent30.reduce((sum, p) => sum + Math.pow(p - recentAvg, 2), 0) / recent30.length);

        // Momentum
        const last7 = prices.slice(-7);
        const first7 = prices.slice(0, 7);
        const lastAvg = last7.reduce((a, b) => a + b, 0) / last7.length;
        const firstAvg = first7.reduce((a, b) => a + b, 0) / first7.length;
        const momentum = ((lastAvg - firstAvg) / firstAvg) * 100;

        // Trend
        const slope = (prices[prices.length - 1] - prices[0]) / prices.length;

        return {
          itemId: item.itemId,
          itemName: item.itemName,
          quantity: item.quantity,
          buyPrice: item.buyPrice,
          currentPrice: currentPrice,
          historicalAvg: avg,
          historicalStdDev: stdDev,
          recentAvg,
          recentStdDev,
          momentum,
          slope,
          lastPrice: prices[prices.length - 1],
          prices: prices,
        };
      } catch (err) {
        console.error(`Failed to forecast ${item.itemName}:`, err);
        return null;
      }
    });

    const itemsWithData = (await Promise.all(forecastPromises)).filter((x) => x !== null);

    if (itemsWithData.length === 0) {
      return NextResponse.json(
        { error: 'Unable to retrieve data for any items' },
        { status: 400 }
      );
    }

    // Use AI to generate smart forecasts
    const prompt = `You are an elite OSRS Grand Exchange analyst. Forecast prices for these portfolio items based on technical analysis, bot patterns, and market dynamics.

ITEMS TO FORECAST:
${itemsWithData
  .map(
    (item) => `
━━━ ${item.itemName} (ID: ${item.itemId}) ━━━
Entry Price: ${item.buyPrice}gp
Current: ${item.currentPrice}gp (${(((item.currentPrice - item.buyPrice) / item.buyPrice) * 100).toFixed(1)}% from entry)
365d Avg: ${Math.round(item.historicalAvg)}gp | StdDev: ${Math.round(item.historicalStdDev)}
Recent 30d Avg: ${Math.round(item.recentAvg)}gp | StdDev: ${Math.round(item.recentStdDev)}
Momentum (365d): ${item.momentum.toFixed(1)}%
Slope: ${item.slope > 0 ? 'Up' : 'Down'}
`
  )
  .join('\n')}

FORECAST REQUIREMENTS:
For each item, provide:
1. **7-Day Forecast**: Predicted price in 7 days
2. **30-Day Forecast**: Predicted price in 30 days
3. **90-Day Forecast**: Predicted price in 90 days
4. **Confidence**: high/medium/low based on data quality and trend strength
5. **Reasoning**: 1-2 sentences explaining the forecast
6. **Exit Strategy**: When should user sell for optimal profit? (date, expected price range)

ANALYSIS FRAMEWORK:
- Items below historical average tend to revert upward (mean-reversion)
- Strong upward momentum suggests continued strength
- High volatility items harder to predict accurately (lower confidence)
- Consider bot supply patterns and seasonal demand

FORMAT OUTPUT AS JSON:
{
  "forecasts": [
    {
      "itemName": "Item Name",
      "forecast7d": 1000,
      "forecast30d": 1200,
      "forecast90d": 1500,
      "confidence": "high",
      "reasoning": "Clear uptrend with support at current level...",
      "recommendedExitDate": "2026-03-15",
      "projectedProfit": 25
    }
  ]
}`;

    const aiResponse = await client.messages.create({
      model: 'gpt-4-turbo',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = aiResponse.choices[0]?.message.content || '';

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const forecastData = jsonMatch ? JSON.parse(jsonMatch[0]) : { forecasts: [] };

    // Combine with buy/sell recommendations
    const forecasts: (PriceForecast & { quantity: number; currentPrice: number })[] =
      forecastData.forecasts.map((f: any, idx: number) => ({
        itemName: f.itemName,
        current: itemsWithData[idx]?.currentPrice || 0,
        forecast7d: f.forecast7d,
        forecast30d: f.forecast30d,
        forecast90d: f.forecast90d,
        confidenceLevel: f.confidence,
        reasoning: f.reasoning,
        recommendedExitDate: f.recommendedExitDate,
        projectedProfit: f.projectedProfit,
        quantity: itemsWithData[idx]?.quantity || 0,
        currentPrice: itemsWithData[idx]?.currentPrice || 0,
      }));

    // Portfolio summary
    const totalInvested = itemsWithData.reduce((sum, item) => sum + item.buyPrice * item.quantity, 0);
    const totalCurrent = itemsWithData.reduce((sum, item) => sum + item.currentPrice * item.quantity, 0);
    const currentProfit = totalCurrent - totalInvested;

    // Projected portfolio values in 30 days
    const projected30d = forecasts.reduce((sum, f) => {
      const item = itemsWithData.find((i) => i.itemName === f.itemName);
      return sum + (item ? f.forecast30d * item.quantity : 0);
    }, 0);

    const portfolio = {
      summary: {
        totalInvested: Math.round(totalInvested),
        currentValue: Math.round(totalCurrent),
        currentProfit: Math.round(currentProfit),
        currentProfitPercent: ((currentProfit / totalInvested) * 100).toFixed(1),
        projected30dValue: Math.round(projected30d),
        projected30dProfit: Math.round(projected30d - totalInvested),
        projected30dProfitPercent: (((projected30d - totalInvested) / totalInvested) * 100).toFixed(1),
      },
      itemForecasts: forecasts.sort((a, b) => b.projectedProfit - a.projectedProfit),
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(portfolio);
  } catch (error) {
    console.error('Portfolio forecast error:', error);
    return NextResponse.json({ error: 'Forecast generation failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Portfolio Forecast API',
    usage: 'POST with { items: [{ itemId, itemName, quantity, buyPrice, currentPrice }] }',
  });
}
