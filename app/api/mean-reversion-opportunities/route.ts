import { NextResponse } from 'next/server';
import { getItemHistoryWithVolumes } from '@/lib/api/osrs';
import { 
  analyzeMeanReversionOpportunity,
  filterViableOpportunities,
  rankInvestmentOpportunities,
  MeanReversionSignal
} from '@/lib/meanReversionAnalysis';
import { EXPANDED_ITEM_POOL } from '@/lib/expandedItemPool';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';


/**
 * GET /api/mean-reversion-opportunities
 * 
 * Analyzes the entire item pool for mean-reversion investment opportunities
 * Returns ranked list of items with deviation from historical averages
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Configuration
    const minConfidence = parseInt(searchParams.get('minConfidence') || '40');
    const minPotential = parseInt(searchParams.get('minPotential') || '10');
    const categoryFilter = searchParams.get('category');
    const botFilter = searchParams.get('botLikelihood');
    
    console.log(`🔍 Analyzing mean-reversion opportunities (confidence>=${minConfidence}%, potential>=${minPotential}%)`);
    
    // Filter item pool based on criteria
    let itemsToAnalyze = EXPANDED_ITEM_POOL;
    
    if (categoryFilter) {
      itemsToAnalyze = itemsToAnalyze.filter(i => i.category === categoryFilter);
    }
    
    if (botFilter) {
      itemsToAnalyze = itemsToAnalyze.filter(i => i.botLikelihood === botFilter);
    }
    
    // Analyze all items in the pool (including lower-tier items)
    // Focus on botted items but don't exclude any
    const priorityItems = itemsToAnalyze;
    
    console.log(`📊 Analyzing ${priorityItems.length} items from pool`);
    
    // Fetch price data and analyze each item
    const analysisPromises = priorityItems.map(async (item) => {
      try {
        // Fetch 1 year of price history with volume data
        const priceData = await getItemHistoryWithVolumes(item.id, 365 * 24 * 60 * 60);
        
        if (!priceData) {
          console.log(`⚠️ Item ${item.id} (${item.name}): No price history available`);
          return null;
        }

        console.log(`📈 Item ${item.id} (${item.name}): Retrieved ${priceData.length} data points`);
        
        if (priceData.length < 5) {
          console.log(`   ⚠️ Only ${priceData.length} data points (need >= 5)`);
          return null;
        }
        
        // Analyze for mean reversion
        const signal = await analyzeMeanReversionOpportunity(
          item.id,
          item.name,
          priceData
        );
        
        if (signal) {
          console.log(`✓ ${item.name}: confidence=${signal.confidenceScore}%, potential=${signal.reversionPotential.toFixed(1)}%, grade=${signal.investmentGrade}`);
        }
        
        return signal;
      } catch (error) {
        console.error(`❌ Failed to analyze item ${item.id} (${item.name}):`, error);
        return null;
      }
    });
    
    // Wait for all analyses to complete
    const allSignals = await Promise.all(analysisPromises);
    const completedSignals = allSignals.filter((s): s is typeof allSignals[0] => s !== null);
    
    console.log(`📈 Completed analysis: ${completedSignals.length}/${priorityItems.length} items had sufficient data`);
    
    // Filter and rank
    const viableSignals = filterViableOpportunities(
      completedSignals,
      minConfidence,
      minPotential
    );
    
    console.log(`📊 Filtering: ${completedSignals.length} analyzed → ${viableSignals.length} viable (confidence>=${minConfidence}%, potential>=${minPotential}%)`);
    
    const rankedSignals = rankInvestmentOpportunities(viableSignals);
    const topOpportunities = rankedSignals; // Return all viable opportunities
    
    console.log(`✅ Found ${topOpportunities.length} viable opportunities`);
    
    // Calculate summary statistics
    const summary = {
      totalAnalyzed: priorityItems.length,
      viableOpportunities: viableSignals.length,
      avgConfidence: viableSignals.length > 0
        ? viableSignals.reduce((sum, s) => sum + s.confidenceScore, 0) / viableSignals.length
        : 0,
      avgPotential: viableSignals.length > 0
        ? viableSignals.reduce((sum, s) => sum + s.reversionPotential, 0) / viableSignals.length
        : 0,
      totalSuggestedInvestment: viableSignals.reduce((sum, s) => sum + s.suggestedInvestment, 0),
      gradeDistribution: {
        'A+': viableSignals.filter(s => s.investmentGrade === 'A+').length,
        'A': viableSignals.filter(s => s.investmentGrade === 'A').length,
        'B+': viableSignals.filter(s => s.investmentGrade === 'B+').length,
        'B': viableSignals.filter(s => s.investmentGrade === 'B').length,
        'C': viableSignals.filter(s => s.investmentGrade === 'C').length,
      }
    };
    
    return NextResponse.json({
      success: true,
      opportunities: topOpportunities,
      summary,
      filters: {
        minConfidence,
        minPotential,
        category: categoryFilter,
        botLikelihood: botFilter
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Mean reversion analysis failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze opportunities',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mean-reversion-opportunities
 * 
 * Analyze specific items for mean-reversion opportunities
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { itemIds } = body;
    
    if (!itemIds || !Array.isArray(itemIds)) {
      return NextResponse.json(
        { success: false, error: 'itemIds array required' },
        { status: 400 }
      );
    }
    
    console.log(`🔍 Analyzing ${itemIds.length} specific items`);
    
    // Find items in pool
    const items = EXPANDED_ITEM_POOL.filter(i => itemIds.includes(i.id));
    
    // Analyze each
    const analysisPromises = items.map(async (item) => {
      try {
        const priceData = await getItemHistoryWithVolumes(item.id, 365 * 24 * 60 * 60);
        if (!priceData || priceData.length < 30) return null;
        
        return await analyzeMeanReversionOpportunity(
          item.id,
          item.name,
          priceData
        );
      } catch (error) {
        console.error(`Failed to analyze item ${item.id}:`, error);
        return null;
      }
    });
    
    const signals = (await Promise.all(analysisPromises)).filter((s): s is MeanReversionSignal => s !== null);
    const ranked = rankInvestmentOpportunities(signals);
    
    return NextResponse.json({
      success: true,
      opportunities: ranked,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Specific item analysis failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze items',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
