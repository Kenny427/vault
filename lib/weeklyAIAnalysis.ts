/**
 * WEEKLY AI BATCH ANALYSIS
 * 
 * Cost-Effective AI Integration:
 * - Runs once per week (not per query)
 * - Analyzes entire item pool in one batch
 * - Caches results for 7 days (per user, synced via Supabase)
 * - Identifies structural vs temporary price changes
 * - Flags emerging opportunities
 * 
 * Cost: ~1-2 AI API calls per week vs 100s per day
 */

import { MeanReversionSignal } from './meanReversionAnalysis';
import { supabase } from './supabase';

export interface AIMarketInsight {
  itemId: number;
  itemName: string;
  analysisDate: string;
  
  // AI-powered insights
  priceChangeType: 'structural' | 'temporary' | 'uncertain';
  confidence: number; // 0-100
  
  // Context
  gameUpdateImpact?: string; // e.g., "New boss added", "Meta shift"
  marketSentiment: 'bullish' | 'bearish' | 'neutral';
  botBanWave?: boolean; // Recent bot ban detected
  
  // Predictions
  expectedRecoveryTime?: string; // e.g., "2-4 weeks"
  priceTarget?: number;
  risks: string[];
  opportunities: string[];
  
  // Summary
  recommendation: 'strong_buy' | 'buy' | 'hold' | 'avoid';
  reasoning: string;
}

export interface WeeklyAnalysisCache {
  generatedAt: string;
  expiresAt: string;
  insights: AIMarketInsight[];
  marketOverview: string;
  topOpportunities: number[]; // item IDs
}

const CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Check if cached analysis is still valid
 */
function isCacheValid(cache: WeeklyAnalysisCache | null): boolean {
  if (!cache) return false;
  const expiresAt = new Date(cache.expiresAt).getTime();
  return Date.now() < expiresAt;
}

/**
 * Get cached analysis from Supabase
 */
async function getCachedAnalysis(): Promise<WeeklyAnalysisCache | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data, error } = await supabase
      .from('ai_analysis_cache')
      .select('generated_at, expires_at, insights, market_overview, top_opportunities')
      .eq('user_id', session.user.id)
      .single();

    if (error || !data) return null;

    const cache: WeeklyAnalysisCache = {
      generatedAt: data.generated_at,
      expiresAt: data.expires_at,
      insights: data.insights,
      marketOverview: data.market_overview,
      topOpportunities: data.top_opportunities,
    };

    return isCacheValid(cache) ? cache : null;
  } catch (error) {
    console.error('Failed to load cached AI analysis:', error);
    return null;
  }
}

/**
 * Save analysis to Supabase cache
 */
async function cacheAnalysis(insights: AIMarketInsight[], marketOverview: string, topOpportunities: number[]): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const now = new Date();
    const expiresAt = new Date(Date.now() + CACHE_DURATION_MS);

    await supabase
      .from('ai_analysis_cache')
      .upsert({
        user_id: session.user.id,
        generated_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        insights,
        market_overview: marketOverview,
        top_opportunities: topOpportunities,
      }, { onConflict: 'user_id' });

  } catch (error) {
    console.error('Failed to cache AI analysis:', error);
  }
}

/**
 * Generate AI prompt for batch analysis
 */
function generateBatchAnalysisPrompt(signals: MeanReversionSignal[]): string {
  const topSignals = signals.slice(0, 20); // Analyze top 20 opportunities
  
  const itemSummaries = topSignals.map(s => 
    `${s.itemName}: Current ${s.currentPrice}gp, ` +
    `${s.maxDeviation.toFixed(1)}% below avg, ` +
    `${s.reversionPotential.toFixed(1)}% potential, ` +
    `${s.botLikelihood} bot activity`
  ).join('\n');
  
  return `Analyze these OSRS items for mean-reversion investment opportunities. For each item, determine:
1. Is the price drop STRUCTURAL (permanent change) or TEMPORARY (will recover)?
2. Any recent game updates or meta shifts affecting this item?
3. Evidence of bot ban waves (sudden supply drop)?
4. Expected recovery timeframe if temporary
5. Investment recommendation

Items to analyze:
${itemSummaries}

Respond in JSON format:
{
  "marketOverview": "Brief summary of current OSRS market conditions",
  "insights": [
    {
      "itemId": 561,
      "priceChangeType": "temporary",
      "confidence": 85,
      "gameUpdateImpact": "...",
      "marketSentiment": "bullish",
      "botBanWave": false,
      "expectedRecoveryTime": "2-4 weeks",
      "risks": ["..."],
      "opportunities": ["..."],
      "recommendation": "buy",
      "reasoning": "..."
    }
  ],
  "topOpportunities": [561, 563, 565]
}`;
}

/**
 * Call AI API for batch analysis
 */
async function callAIForBatchAnalysis(signals: MeanReversionSignal[]): Promise<{
  insights: AIMarketInsight[];
  marketOverview: string;
  topOpportunities: number[];
}> {
  const prompt = generateBatchAnalysisPrompt(signals);
  
  try {
    const response = await fetch('/api/ai-shortlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: prompt,
        context: 'weekly_investment_analysis'
      })
    });
    
    if (!response.ok) {
      throw new Error('AI API request failed');
    }
    
    const data = await response.json();
    
    // Parse AI response
    const parsed = typeof data.response === 'string' 
      ? JSON.parse(data.response)
      : data.response;
    
    return {
      insights: parsed.insights || [],
      marketOverview: parsed.marketOverview || 'Analysis pending',
      topOpportunities: parsed.topOpportunities || []
    };
  } catch (error) {
    console.error('AI batch analysis failed:', error);
    
    // Return fallback insights
    return {
      insights: signals.slice(0, 10).map(s => createFallbackInsight(s)),
      marketOverview: 'AI analysis unavailable, using algorithmic analysis',
      topOpportunities: signals.slice(0, 5).map(s => s.itemId)
    };
  }
}

/**
 * Create fallback insight when AI is unavailable
 */
function createFallbackInsight(signal: MeanReversionSignal): AIMarketInsight {
  return {
    itemId: signal.itemId,
    itemName: signal.itemName,
    analysisDate: new Date().toISOString(),
    priceChangeType: 'uncertain',
    confidence: signal.confidenceScore,
    marketSentiment: signal.reversionPotential > 20 ? 'bullish' : 'neutral',
    risks: ['AI analysis unavailable'],
    opportunities: [signal.reasoning],
    recommendation: signal.investmentGrade === 'A+' || signal.investmentGrade === 'A' ? 'buy' : 'hold',
    reasoning: 'Algorithmic analysis suggests mean reversion opportunity'
  };
}

/**
 * Get or generate weekly AI analysis
 * 
 * This is the main function to call - it handles caching automatically
 */
export async function getWeeklyAIAnalysis(
  signals: MeanReversionSignal[]
): Promise<WeeklyAnalysisCache> {
  // Check cache first
  const cached = await getCachedAnalysis();
  if (cached) {
    console.log('Using cached AI analysis from', cached.generatedAt);
    return cached;
  }
  
  console.log('Generating fresh AI analysis (will be cached for 7 days)...');
  
  // Generate new analysis
  const { insights, marketOverview, topOpportunities } = await callAIForBatchAnalysis(signals);
  
  // Cache for future use
  await cacheAnalysis(insights, marketOverview, topOpportunities);
  
  return {
    generatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + CACHE_DURATION_MS).toISOString(),
    insights,
    marketOverview,
    topOpportunities
  };
}

/**
 * Get AI insight for a specific item
 */
export function getItemAIInsight(
  itemId: number,
  cache: WeeklyAnalysisCache | null
): AIMarketInsight | null {
  if (!cache) return null;
  return cache.insights.find(i => i.itemId === itemId) || null;
}

/**
 * Force refresh analysis (for manual trigger)
 */
export async function forceRefreshAnalysis(
  signals: MeanReversionSignal[]
): Promise<WeeklyAnalysisCache> {
  // Clear cache from Supabase
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase
        .from('ai_analysis_cache')
        .delete()
        .eq('user_id', session.user.id);
    }
  } catch (error) {
    console.error('Failed to clear AI cache:', error);
  }
  
  // Generate new
  return getWeeklyAIAnalysis(signals);
}

/**
 * Get time until cache expires
 */
export function getCacheTimeRemaining(cache: WeeklyAnalysisCache | null): string {
  if (!cache) return 'No cache';
  
  const expiresAt = new Date(cache.expiresAt).getTime();
  const remaining = expiresAt - Date.now();
  
  if (remaining < 0) return 'Expired';
  
  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

/**
 * Enhance signals with AI insights
 */
export function enrichSignalsWithAI(
  signals: MeanReversionSignal[],
  aiCache: WeeklyAnalysisCache | null
): (MeanReversionSignal & { aiInsight?: AIMarketInsight })[] {
  return signals.map(signal => {
    const aiInsight = getItemAIInsight(signal.itemId, aiCache);
    return {
      ...signal,
      aiInsight: aiInsight || undefined
    };
  });
}
