import { NextResponse } from 'next/server';
import { getItemHistory } from '@/lib/api/osrs';
import {
  analyzeMeanReversionOpportunity,
  filterViableOpportunities,
  rankInvestmentOpportunities,
  PriceDataPoint
} from '@/lib/meanReversionAnalysis';
import { getWeeklyAIAnalysis, enrichSignalsWithAI } from '@/lib/weeklyAIAnalysis';
import { getDatabaseItemPool } from '@/lib/expandedItemPool';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

/**
 * Transform simple price history into full PriceDataPoint format
 */
function transformPriceHistory(history: { timestamp: number; price: number }[]): PriceDataPoint[] {
  return history.map(point => ({
    timestamp: point.timestamp,
    avgHighPrice: point.price,
    avgLowPrice: point.price,
    highPriceVolume: 0,
    lowPriceVolume: 0
  }));
}

/**
 * GET /api/investment-signals
 * 
 * Returns investment signals enhanced with weekly AI analysis
 * This combines algorithmic mean-reversion detection with AI-powered market insights
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceAIRefresh = searchParams.get('refreshAI') === 'true';
    const limit = parseInt(searchParams.get('limit') || '25');

    console.log('🤖 Generating investment signals with AI enhancement...');

    // Step 1: Algorithmic Analysis
    console.log('📊 Step 1: Running algorithmic mean-reversion analysis...');

    const EXPANDED_ITEM_POOL = await getDatabaseItemPool();
    cachedPool = EXPANDED_ITEM_POOL; // Set cache for helper function

    const priorityItems = EXPANDED_ITEM_POOL
      .filter(i =>
        (i.botLikelihood === 'very_high' || i.botLikelihood === 'high') &&
        (i.volumeTier === 'massive' || i.volumeTier === 'high')
      )
      .slice(0, 60);

    const analysisPromises = priorityItems.map(async (item) => {
      try {
        const priceHistory = await getItemHistory(item.id, 365 * 24 * 60 * 60);
        if (!priceHistory || priceHistory.length < 30) return null;

        const priceData = transformPriceHistory(priceHistory);
        return await analyzeMeanReversionOpportunity(item.id, item.name, priceData);
      } catch (error) {
        return null;
      }
    });

    const allSignals = await Promise.all(analysisPromises);
    const viableSignals = filterViableOpportunities(allSignals, 60, 10);
    const rankedSignals = rankInvestmentOpportunities(viableSignals);

    console.log(`✅ Algorithmic analysis found ${rankedSignals.length} opportunities`);

    // Step 2: AI Enhancement (cached weekly)
    console.log('🧠 Step 2: Fetching AI market insights (weekly cache)...');

    let aiAnalysis;
    try {
      if (forceAIRefresh) {
        console.log('🔄 Force refreshing AI analysis...');
      }
      aiAnalysis = forceAIRefresh
        ? null // Will trigger fresh analysis
        : await getWeeklyAIAnalysis(rankedSignals.slice(0, 20));
    } catch (error) {
      console.error('AI analysis failed, continuing with algorithmic only:', error);
      aiAnalysis = null;
    }

    // Step 3: Enrich signals with AI insights
    const enrichedSignals = enrichSignalsWithAI(rankedSignals, aiAnalysis);
    const topSignals = enrichedSignals.slice(0, limit);

    // Calculate portfolio recommendation
    const portfolioRecommendation = generatePortfolioRecommendation(topSignals);

    console.log(`✨ Generated ${topSignals.length} AI-enhanced investment signals`);

    return NextResponse.json({
      success: true,
      signals: topSignals,
      portfolioRecommendation,
      aiAnalysis: aiAnalysis ? {
        marketOverview: aiAnalysis.marketOverview,
        generatedAt: aiAnalysis.generatedAt,
        expiresAt: aiAnalysis.expiresAt,
        topOpportunities: aiAnalysis.topOpportunities
      } : null,
      metadata: {
        totalOpportunities: rankedSignals.length,
        aiEnhanced: !!aiAnalysis,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Investment signals generation failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate investment signals',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Generate diversified portfolio recommendation
 */
function generatePortfolioRecommendation(signals: any[]) {
  if (signals.length === 0) {
    return {
      totalInvestment: 0,
      expectedReturn: 0,
      holdings: [],
      strategy: 'No opportunities found'
    };
  }

  // Diversify across categories
  const byCategory: { [key: string]: any[] } = {};

  signals.forEach(signal => {
    const category = getItemCategory(signal.itemId);
    if (!byCategory[category]) byCategory[category] = [];
    byCategory[category].push(signal);
  });

  // Select best from each category
  const holdings = Object.entries(byCategory).flatMap(([category, items]) => {
    const best = items.slice(0, 2); // Top 2 per category
    return best.map(signal => ({
      itemId: signal.itemId,
      itemName: signal.itemName,
      quantity: Math.floor(signal.suggestedInvestment / signal.currentPrice),
      investment: signal.suggestedInvestment,
      currentPrice: signal.currentPrice,
      targetPrice: signal.targetSellPrice,
      expectedReturn: signal.reversionPotential,
      holdingPeriod: signal.estimatedHoldingPeriod,
      grade: signal.investmentGrade,
      category
    }));
  });

  const totalInvestment = holdings.reduce((sum, h) => sum + h.investment, 0);
  const weightedReturn = holdings.reduce((sum, h) => sum + (h.expectedReturn * h.investment), 0) / totalInvestment;

  return {
    totalInvestment,
    expectedReturn: weightedReturn,
    holdings: holdings.slice(0, 15), // Max 15 holdings
    strategy: 'Diversified mean-reversion portfolio across multiple categories',
    riskLevel: 'Low-Medium',
    timeHorizon: '2-12 weeks'
  };
}

// Store pool reference for helper function
let cachedPool: Awaited<ReturnType<typeof getDatabaseItemPool>> = [];

function getItemCategory(itemId: number): string {
  const item = cachedPool.find((i: any) => i.id === itemId);
  return item?.category || 'other';
}
