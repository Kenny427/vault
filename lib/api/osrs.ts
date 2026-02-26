export async function getItemPrice(itemName: string): Promise<number> {
  // Dummy logic: Return a fake price for demonstration purposes.
  const prices: { [key: string]: number } = {
    'Rune platebody': 100000,
    'Dragon scimitar': 20000,
    'Saradomin brew(4)': 3000,
  };

  return prices[itemName] || 1000;
}

export function calculateScore(currentPrice: number, averagePrice: number, trend: 'bullish' | 'bearish' | 'neutral', volatility: number): number {
  // Dummy scoring logic for demonstration.
  let score = 50;

  if (currentPrice > averagePrice) {
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
