import { getItemPrice } from './api/osrs';

export interface ItemMetrics {
    itemName: string;
    currentPrice: number;
    averagePrice: number;
    trend: 'bullish' | 'bearish' | 'neutral';
    volatility: number;
    score: number;
    roi: number;
    profit: number;
}

export async function analyzeItem(itemName: string): Promise<ItemMetrics> {
    // Dummy data and logic for demonstration.
    const currentPrice = await getItemPrice(itemName);
    const averagePrice = currentPrice * 0.95; // Assuming average price is 5% lower
    const trend: 'bullish' | 'bearish' | 'neutral' = 'bullish';
    const volatility = 8; // Example volatility

    const score = calculateScore(currentPrice, averagePrice, trend, volatility);
    const profit = currentPrice - averagePrice * 0.99; // Accounting for 1% GE tax
    const roi = (profit / currentPrice) * 100;

    return {
        itemName,
        currentPrice,
        averagePrice,
        trend,
        volatility,
        score,
        roi,
        profit,
    };
}

function calculateScore(currentPrice: number, averagePrice: number, trend: 'bullish' | 'bearish' | 'neutral', volatility: number): number {
    // Dummy scoring logic for demonstration.
    let score = 50;

    if (currentPrice < averagePrice) {
        score += 20;
    }
    if (trend === 'bullish') {
        score += 10;
    }
    if (volatility > 10) {
        score += 10;
    }
    return Math.min(100, Math.max(0, score));
}
