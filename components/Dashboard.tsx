'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import SearchBar from './SearchBar';
import FlipCard from './FlipCard';
import Portfolio from './Portfolio';
import FavoritesList from './FavoritesList';
import PerformanceDashboard from './PerformanceDashboard';
import PriceAlerts from './PriceAlerts';
import DetailedAnalysisModal from './DetailedAnalysisModal';
import FilteredItemsModal from './FilteredItemsModal';
import SettingsModal from './SettingsModal';
import AlphaFeedInfoModal from './AlphaFeedInfoModal';
import KeyboardShortcuts from './KeyboardShortcuts';
import { FlipOpportunity, FlipType } from '@/lib/analysis';
import { useDashboardStore } from '@/lib/store';
import { useAuth } from '@/lib/authContext';
import { usePriceAlertsStore } from '@/lib/priceAlertsStore';
import { initDinkWebhookListener } from '@/lib/dinkWebhook';
import { getAllAnalysisItems } from '@/lib/expandedItemPool';

type TabType = 'portfolio' | 'opportunities' | 'favorites' | 'performance' | 'alerts';


/**
 * Convert MeanReversionSignal to FlipOpportunity for UI display
 */
function convertMeanReversionToFlipOpportunity(signal: any): FlipOpportunity {
  const geTax = 0.02;
  const currentPrice = signal.currentPrice;
  const entryPrice = Math.round(signal.entryPriceNow ?? currentPrice);

  // PRICE VALIDATION: Prevent unrealistic AI-generated prices
  // Entry prices must be within ±15% of current price
  const minEntry = Math.round(currentPrice * 0.85);
  const maxEntry = Math.round(currentPrice * 1.15);

  let entryRangeLow = Math.round(signal.entryRangeLow ?? entryPrice);
  let entryRangeHigh = Math.round(signal.entryRangeHigh ?? entryPrice);

  // Validate and constrain entry range
  const entryLowOffBy = Math.abs(entryRangeLow - currentPrice) / currentPrice;
  const entryHighOffBy = Math.abs(entryRangeHigh - currentPrice) / currentPrice;

  if (entryLowOffBy > 0.20 || entryHighOffBy > 0.20) {
    // AI values are way off (>20%), use safe defaults
    console.warn(
      `[PRICE VALIDATION] ${signal.itemName}: AI suggested entry ${entryRangeLow}-${entryRangeHigh}gp ` +
      `but current is ${currentPrice}gp (${(entryLowOffBy * 100).toFixed(0)}% off). Using defaults.`
    );
    entryRangeLow = Math.round(currentPrice * 0.985);
    entryRangeHigh = Math.round(currentPrice * 1.015);
  } else {
    // Constrain to ±15% bounds
    entryRangeLow = Math.max(minEntry, Math.min(maxEntry, entryRangeLow));
    entryRangeHigh = Math.max(minEntry, Math.min(maxEntry, entryRangeHigh));
  }

  // Ensure low <= high
  if (entryRangeLow > entryRangeHigh) {
    [entryRangeLow, entryRangeHigh] = [entryRangeHigh, entryRangeLow];
  }

  // Validate exit prices
  let exitBase = Math.round(signal.exitPriceBase ?? signal.targetSellPrice ?? currentPrice);
  let exitStretch = Math.round(signal.exitPriceStretch ?? exitBase);

  // Exit must be above entry
  if (exitBase <= entryRangeHigh) {
    console.warn(
      `[PRICE VALIDATION] ${signal.itemName}: Exit base ${exitBase}gp <= entry high ${entryRangeHigh}gp. Correcting.`
    );
    exitBase = Math.round(entryRangeHigh * 1.08); // Minimum 8% profit target
  }

  // Exit shouldn't be >3x current price (unless item is extremely depressed)
  if (exitBase > currentPrice * 3) {
    const upside = exitBase / currentPrice;
    console.warn(
      `[PRICE VALIDATION] ${signal.itemName}: Exit base ${exitBase}gp is ${(upside * 100).toFixed(0)}% ` +
      `above current ${currentPrice}gp. Capping at 2x.`
    );
    exitBase = Math.round(currentPrice * 2);
  }

  // Stretch exit must be >= base exit
  if (exitStretch < exitBase) {
    exitStretch = Math.round(exitBase * 1.05);
  }

  // Cap stretch at 3.5x current
  if (exitStretch > currentPrice * 3.5) {
    exitStretch = Math.round(currentPrice * 3.5);
  }

  const stopLossPrice = Math.round(signal.stopLoss ?? entryPrice * 0.93);
  const netSellPrice = Math.round(exitBase * (1 - geTax));
  const profitPerUnit = Math.max(0, netSellPrice - entryPrice);
  const roi = entryPrice > 0 ? (profitPerUnit / entryPrice) * 100 : 0;
  const profitMargin = roi;

  const suggestedInvestment = signal.suggestedInvestment ?? entryPrice * 10;
  const recommendedQuantity = entryPrice > 0 ? Math.max(1, Math.floor(suggestedInvestment / entryPrice)) : 0;
  const totalInvestment = recommendedQuantity * entryPrice;
  const totalProfit = recommendedQuantity * profitPerUnit;

  const buyWindowText = `${entryRangeLow.toLocaleString()}-${entryRangeHigh.toLocaleString()}gp`;
  const sellWindowText =
    exitStretch > exitBase
      ? `${exitBase.toLocaleString()}-${exitStretch.toLocaleString()}gp`
      : `${exitBase.toLocaleString()}gp`;

  const buyNarrative = `Buy now in the ${buyWindowText} window. ${signal.capitulationSignal ?? 'Bot dump detected, expecting rebound.'}`.trim();
  const sellNarrative = `Scale out at ${sellWindowText}. Cut if closes below ${stopLossPrice.toLocaleString()}gp. ${signal.recoverySignal ?? ''}`.trim();

  return {

    itemId: signal.itemId,
    itemName: signal.itemName,
    currentPrice: signal.currentPrice,
    averagePrice: signal.longTerm.avgPrice,
    averagePrice30: signal.mediumTerm.avgPrice,
    averagePrice90: signal.mediumTerm.avgPrice,
    averagePrice180: signal.longTerm.avgPrice,
    averagePrice365: signal.longTerm.avgPrice,
    deviation: Math.abs(signal.maxDeviation),
    deviationScore: -Math.abs(signal.maxDeviation),
    trend: signal.maxDeviation > 10 ? 'bearish' : 'bullish',
    recommendation: 'buy',
    opportunityScore: signal.confidenceScore,
    historicalLow: signal.entryRangeLow ?? signal.currentPrice,
    historicalHigh: exitStretch,
    flipType: signal.confidenceScore >= 85 ? 'high-confidence' :
      signal.confidenceScore >= 65 ? 'deep-value' :
        signal.confidenceScore >= 40 ? 'mean-reversion' :
          'risky-upside',
    flipTypeConfidence: signal.confidenceScore,
    buyPrice: entryPrice,
    sellPrice: exitBase,
    profitPerUnit,
    profitMargin,
    roi,
    riskLevel: signal.volatilityRisk,
    confidence: signal.confidenceScore,
    estimatedHoldTime: signal.estimatedHoldingPeriod,
    volatility: signal.maxDeviation,
    volumeScore: signal.liquidityScore,
    dailyVolume: signal.mediumTerm.volumeAvg,
    buyWhen: buyNarrative,
    sellWhen: sellNarrative,
    momentum: signal.reversionPotential * 0.5,
    acceleration: 0,
    tradingRange: signal.maxDeviation,
    consistency: signal.supplyStability,
    spreadQuality: Math.min(100, signal.liquidityScore + signal.confidenceScore / 2),
    recommendedQuantity,
    totalInvestment,
    totalProfit,
    aiReasoning: signal.strategicNarrative || signal.reasoning,
    aiEntryLow: entryRangeLow,
    aiEntryHigh: entryRangeHigh,
    aiExitBase: exitBase,
    aiExitStretch: exitStretch,
    aiStopLoss: stopLossPrice,
    aiHoldWeeks: signal.expectedRecoveryWeeks,
    sellAtMin: signal.sellAtMin ?? exitBase,
    sellAtMax: signal.sellAtMax ?? exitStretch,
    abortIfRisesAbove: signal.abortIfRisesAbove ?? stopLossPrice,
  };
}



export default function Dashboard() {
  const router = useRouter();
  const { logout } = useAuth();
  type PoolItem = { id: number; name: string; addedAt?: number };
  const [opportunities, setOpportunities] = useState<FlipOpportunity[]>([]);
  const [sortBy, setSortBy] = useState<'score' | 'roi' | 'profit' | 'confidence'>('score');
  const [flipTypeFilter] = useState<FlipType | 'all'>('all');
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('osrs-active-tab');
      const validTabs: TabType[] = ['portfolio', 'opportunities', 'favorites', 'performance', 'alerts'];
      if (saved && validTabs.includes(saved as TabType)) {
        return saved as TabType;
      }
    }
    return 'portfolio';
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanProgress, setScanProgress] = useState(0);
  const [scanMessage, setScanMessage] = useState('Awaiting command');
  const [scanTip, setScanTip] = useState('');
  const [analysisCost, setAnalysisCost] = useState<{
    costUSD: number;
    totalTokens: number;
    inputTokens?: number;
    outputTokens?: number;
    breakdown?: { inputCostUSD: number; outputCostUSD: number };
  } | null>(null);
  const [analysisStats, setAnalysisStats] = useState<{
    totalAnalyzed: number;
    stage0FilteredCount: number;
    aiAnalyzedCount: number;
    aiApprovedCount: number;
    preFilteredCount: number;
    aiMissingCount?: number;
  } | null>(null);


  const [totalAnalyzed, setTotalAnalyzed] = useState<number | null>(null);
  const [showRefreshWarning, setShowRefreshWarning] = useState(false);
  const [detailedAnalyses, setDetailedAnalyses] = useState<{ itemId: number; itemName: string; detailedAnalysis: string }[]>([]);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const [filteredItems, setFilteredItems] = useState<{ itemId: number; itemName: string; reason: string }[]>([]);
  const [showFilteredItems, setShowFilteredItems] = useState(false);
  const [aiRejectedItems, setAiRejectedItems] = useState<Array<{
    itemId: number;
    itemName: string;
    systemScore: number;
    systemConfidence: number;
    aiDecision: string;
    aiReasoning: string;
    aiConfidence: number;
  }>>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showAlphaFeedInfo, setShowAlphaFeedInfo] = useState(false);

  const [lastRefresh, setLastRefresh] = useState<Date | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('osrs-last-refresh');
      return saved ? new Date(saved) : null;
    }
    return null;
  });
  const {
    minOpportunityScore,
    setMinOpportunityScore
  } = useDashboardStore();
  const analyzeRef = useRef<null | (() => void)>(null);
  const loadingRef = useRef(loading);


  // Analyze items with AI
  const analyzeWithAI = async () => {
    if (loading) return;

    // Check if refreshed recently (within 30 seconds)
    if (lastRefresh) {
      const secondsSinceRefresh = (Date.now() - lastRefresh.getTime()) / 1000;
      if (secondsSinceRefresh < 30) {
        setShowRefreshWarning(true);
        setTimeout(() => setShowRefreshWarning(false), 3000);
        return;
      }
    }

    // ALWAYS use the curated pool - no custom pools, no DB pools
    // This ensures only the curated item pool is analyzed
    const itemsToAnalyze: PoolItem[] = getAllAnalysisItems().map(item => ({
      id: item.id,
      name: item.name,
      addedAt: Date.now(),
    }));

    if (itemsToAnalyze.length === 0) {
      setOpportunities([]);
      return;
    }

    setLoading(true);
    setError('');
    setScanMessage('Collecting market data (Step 1/3)');
    setScanProgress(8);

    let progressInterval: NodeJS.Timeout | null = null;
    let tipInterval: NodeJS.Timeout | null = null;

    try {
      // Call mean-reversion opportunities endpoint (analyze all items in pool)
      setScanMessage('Fetching market data...');
      setScanProgress(1);

      // Rotating tips to keep users engaged
      const tips = [
        'Analyzing price volatility patterns...',
        'Calculating mean reversion signals...',
        'Evaluating volume trends...',
        'Checking historical price movements...',
        'Identifying undervalued opportunities...',
        'Scanning 110+ popular trading items...',
        'Measuring market momentum...',
        'Detecting price anomalies...',
        'Filtering low-confidence signals...',
        'Ranking by opportunity score...',
      ];
      let tipIndex = 0;
      setScanTip(tips[0]);

      // Rotate tips every 5 seconds
      tipInterval = setInterval(() => {
        tipIndex = (tipIndex + 1) % tips.length;
        setScanTip(tips[tipIndex]);
      }, 5000);

      // Smart phase-based progress tracking
      // Phase 1 (0-20%): Data collection - ~15-20 seconds
      // Phase 2 (20-90%): AI analysis - ~30-60 seconds (main work)
      // Phase 3 (90-100%): Finalization - ~5 seconds
      let elapsedSeconds = 0;
      
      progressInterval = setInterval(() => {
        elapsedSeconds++;
        let progress = 1;
        
        if (elapsedSeconds <= 20) {
          // Phase 1: Fast initial progress (0-20% in 20 seconds)
          progress = (elapsedSeconds / 20) * 20;
        } else if (elapsedSeconds <= 45) {
          // Phase 2: Slower AI analysis (20-90% in 25 seconds)
          progress = 20 + ((elapsedSeconds - 20) / 25) * 70;
        } else {
          // Phase 3: Slow down as we approach completion (90-95%)
          const overtime = elapsedSeconds - 45;
          progress = 90 + Math.min(overtime * 0.5, 5); // Asymptotically approach 95%
        }
        
        setScanProgress(Math.min(progress, 95)); // Cap at 95%, let completion jump to 100%
      }, 1000);

      // Update messages on fixed timers
      const step2Timer = setTimeout(() => {
        setScanMessage('Processing AI analysis...');
      }, 60000); // After 1 min

      const step3Timer = setTimeout(() => {
        setScanMessage('Finalizing results...');
      }, 120000); // After 2 min

      const responsePromise = fetch('/api/mean-reversion-opportunities');
      const response = await responsePromise;

      if (!response.ok) {
        if (progressInterval) clearInterval(progressInterval);
        if (tipInterval) clearInterval(tipInterval);
        clearTimeout(step2Timer);
        clearTimeout(step3Timer);

        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze mean-reversion opportunities');
      }

      const data = await response.json();

      // Clear all timers
      if (progressInterval) clearInterval(progressInterval);
      if (tipInterval) clearInterval(tipInterval);
      clearTimeout(step2Timer);
      clearTimeout(step3Timer);

      // Don't set progress here - let it jump from current to 100% when done
      setScanMessage('Finalising alpha feed (Step 3/3)');
      setScanTip('Sorting by opportunity score...');

      if (!data.success || !data.opportunities) {

        console.error('API Response:', data);
        throw new Error('Invalid response from analysis API');
      }

      if (data.summary) {
        setAnalysisStats({
          totalAnalyzed: data.summary.totalAnalyzed || 0,
          stage0FilteredCount: data.summary.stage0FilteredCount || 0,
          aiAnalyzedCount: data.summary.aiAnalyzedCount || 0,
          aiApprovedCount: data.summary.aiApprovedCount || 0,
          preFilteredCount: data.summary.preFilteredCount || 0,
          aiMissingCount: data.summary.aiMissingCount || 0,
        });
        setTotalAnalyzed(data.summary.totalAnalyzed || 0);

        // Track API cost
        if (data.summary.openaiCost) {
          setAnalysisCost({
            costUSD: data.summary.openaiCost.costUSD,
            totalTokens: data.summary.openaiCost.totalTokens,
            inputTokens: data.summary.openaiCost.inputTokens,
            outputTokens: data.summary.openaiCost.outputTokens,
            breakdown: data.summary.openaiCost.breakdown
          });
        }
      }


      // Store detailed analyses
      if (data.detailedReasonings && Array.isArray(data.detailedReasonings)) {
        setDetailedAnalyses(data.detailedReasonings);
      }

      // Store filtered items
      if (data.filteredItems && Array.isArray(data.filteredItems)) {
        setFilteredItems(data.filteredItems);
      }

      // Store AI rejected items with reasoning
      if (data.aiRejectedItems && Array.isArray(data.aiRejectedItems)) {
        setAiRejectedItems(data.aiRejectedItems);
      }

      // Track filtered stats for analysis
      if (data.filterStats && Array.isArray(data.filterStats)) {
        const statsMap = JSON.parse(localStorage.getItem('osrs-filtered-stats') || '{}');

        data.filterStats.forEach((filter: any) => {
          const key = `${filter.itemId}`;
          if (!statsMap[key]) {
            statsMap[key] = {
              itemId: filter.itemId,
              itemName: filter.itemName,
              filterCount: 0,
              lastReason: '',
              lastFilteredAt: ''
            };
          }
          statsMap[key].filterCount += 1;
          statsMap[key].lastReason = filter.reason;
          statsMap[key].lastFilteredAt = filter.timestamp;
        });

        localStorage.setItem('osrs-filtered-stats', JSON.stringify(statsMap));
      }

      // Convert MeanReversionSignals to FlipOpportunities for UI
      const opportunities = data.opportunities.map(convertMeanReversionToFlipOpportunity);

      setScanProgress(95);
      setScanTip('Finalizing results...');
      await new Promise(resolve => setTimeout(resolve, 200));

      // Sort by opportunity score (confidence)
      const sorted = opportunities.sort(
        (a: FlipOpportunity, b: FlipOpportunity) => b.opportunityScore - a.opportunityScore
      );

      setOpportunities(sorted);
      setLastRefresh(new Date());
      setScanProgress(100);
      setScanMessage('Analysis complete');
      setScanTip('');

      console.log(`✅ Found ${sorted.length} mean-reversion opportunities`);
      console.log(`📊 Mean-reversion analysis complete`);

      if (typeof window !== 'undefined') {
        localStorage.setItem('osrs-last-refresh', new Date().toISOString());
        localStorage.setItem('osrs-cached-opps', JSON.stringify(sorted));
      }
    } catch (err: any) {
      // Clean up any running intervals and timers
      if (progressInterval) clearInterval(progressInterval);
      if (tipInterval) clearInterval(tipInterval);

      setError(err.message || 'Failed to analyze opportunities');
      console.error('Mean-reversion analysis error:', err);
      setScanProgress(0);
      setScanTip('');
    } finally {
      setLoading(false);
    }
  };



  // Export scan results for comparison
  const exportScanResults = () => {
    if (opportunities.length === 0) {
      alert('No scan results to export. Run an Alpha Feed scan first.');
      return;
    }

    // NOTE: Manually change model to match backend for testing
    const modelName = 'gpt-4o-mini';

    const exportData = {
      exportTimestamp: new Date().toISOString(),
      model: modelName,
      summary: {
        totalAnalyzed: totalAnalyzed || 0,
        aiAnalyzedCount: analysisStats?.aiAnalyzedCount || 0,
        aiApprovedCount: analysisStats?.aiApprovedCount || 0,
        preFilteredCount: analysisStats?.preFilteredCount || 0,
        cost: analysisCost
      },
      items: opportunities.map(opp => ({
        itemId: opp.itemId,
        itemName: opp.itemName,
        currentPrice: opp.buyPrice,
        score: opp.opportunityScore,
        confidence: opp.confidence,
        roi: opp.profitMargin,
        estimatedHoldTime: opp.estimatedHoldTime,
        aiReasoning: opp.aiReasoning || null,
        // Find detailed analysis if available
        detailedAnalysis: detailedAnalyses.find(d => d.itemId === opp.itemId)?.detailedAnalysis || null
      })),
      filteredOut: filteredItems.map(f => ({
        itemId: f.itemId,
        itemName: f.itemName,
        reason: f.reason
      })),
      rejectedByAI: {
        totalRejected: aiRejectedItems.length,
        stage1Mandatory: aiRejectedItems
          .filter(r => r.aiDecision === 'rejected_stage1_mandatory')
          .map(r => ({
            itemId: r.itemId,
            itemName: r.itemName,
            systemScore: r.systemScore,
            systemConfidence: r.systemConfidence,
            aiReasoning: r.aiReasoning,
            aiConfidence: r.aiConfidence
          })),
        stage2Quality: aiRejectedItems
          .filter(r => r.aiDecision === 'rejected_stage2_quality')
          .map(r => ({
            itemId: r.itemId,
            itemName: r.itemName,
            systemScore: r.systemScore,
            systemConfidence: r.systemConfidence,
            aiReasoning: r.aiReasoning,
            aiConfidence: r.aiConfidence
          }))
      }
    };

    // Download as JSON
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alpha-feed-scan-${new Date().toISOString().split('T')[0]}-${modelName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert(`Exported ${opportunities.length} items to JSON file`);
  };

  useEffect(() => {
    analyzeRef.current = analyzeWithAI;
  }, [analyzeWithAI]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    if (loading) {
      return;
    }

    const resetTimer = setTimeout(() => {
      setScanProgress(0);
      setScanMessage('Awaiting command');
    }, 1800);

    return () => clearTimeout(resetTimer);
  }, [loading]);


  // Check price alerts periodically
  const checkAlerts = usePriceAlertsStore(state => state.checkAlerts);

  // Initialize DINK webhook listener on mount
  useEffect(() => {
    const cleanup = initDinkWebhookListener();
    return cleanup;
  }, []);

  useEffect(() => {
    if (activeTab === 'opportunities' && opportunities.length > 0) {
      opportunities.forEach(opp => {
        checkAlerts(opp.itemId, opp.currentPrice);
      });
    }
  }, [opportunities, activeTab, checkAlerts]);

  // Load and analyze watchlist items and popular items

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('osrs-cached-opps');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const valid = Array.isArray(parsed)
            ? parsed.filter((opp: any) => typeof opp?.itemId === 'number' && typeof opp?.currentPrice === 'number')
            : [];

          if (valid.length > 0) {
            setOpportunities(valid);
          } else {
            localStorage.removeItem('osrs-cached-opps');
          }
        } catch {
          localStorage.removeItem('osrs-cached-opps');
        }
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('osrs-active-tab', activeTab);
    }
  }, [activeTab]);



  // Filter opportunities based on settings
  let filteredOpportunities = opportunities.filter(opp => {
    if (opp.opportunityScore < minOpportunityScore) return false;
    // Only filter by recommendation if it's been set (AI pass sets this)
    if (opp.recommendation && opp.recommendation !== 'buy') return false;

    // Flip type filter

    if (flipTypeFilter !== 'all' && opp.flipType !== flipTypeFilter) return false;

    return true;
  });

  // Sort opportunities based on selected sort option
  filteredOpportunities = [...filteredOpportunities].sort((a, b) => {
    switch (sortBy) {
      case 'roi':
        return b.roi - a.roi;
      case 'profit':
        return b.totalProfit - a.totalProfit; // Sort by total profit for big budgets
      case 'confidence':
        return b.confidence - a.confidence;
      case 'score':
      default:
        return b.opportunityScore - a.opportunityScore;
    }
  });




  const displayOpportunities = filteredOpportunities;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 bg-osrs-accent rounded-full opacity-20" />
                <div className="absolute inset-1 bg-osrs-accent rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-slate-900" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <h1 className="text-2xl font-semibold text-slate-100">Vault</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(true)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-300 hover:bg-slate-800 rounded transition-colors"
              >
                Settings
              </button>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-300 hover:bg-slate-800 rounded transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>

          <div className="max-w-2xl">
            <SearchBar onItemSelect={(item) => router.push(`/item/${item.id}`)} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Tab Navigation - 5 main tabs + Settings Menu */}
        <div className="flex items-center gap-2 mb-6 border-b border-slate-700">
          <button
            onClick={() => {
              setActiveTab('portfolio');
            }}
            className={`px-4 py-3 font-semibold transition-all whitespace-nowrap ${
              activeTab === 'portfolio'
                ? 'text-osrs-accent border-b-2 border-osrs-accent'
                : 'text-slate-400 hover:text-slate-300'
              }`}
          >
            💼 Portfolio
          </button>
          <button
            onClick={() => {
              setActiveTab('opportunities');
            }}
            className={`px-4 py-3 font-semibold transition-all whitespace-nowrap ${
              activeTab === 'opportunities'
                ? 'text-osrs-accent border-b-2 border-osrs-accent'
                : 'text-slate-400 hover:text-slate-300'
              }`}
          >
            ⚡ Alpha Feed
          </button>

          <button
            onClick={() => {
              setActiveTab('performance');
            }}
            className={`px-4 py-3 font-semibold transition-all whitespace-nowrap ${
              activeTab === 'performance'
                ? 'text-osrs-accent border-b-2 border-osrs-accent'
                : 'text-slate-400 hover:text-slate-300'
              }`}
          >
            📈 Performance
          </button>
          <button
            onClick={() => {
              setActiveTab('alerts');
            }}
            className={`px-4 py-3 font-semibold transition-all whitespace-nowrap ${
              activeTab === 'alerts'
                ? 'text-osrs-accent border-b-2 border-osrs-accent'
                : 'text-slate-400 hover:text-slate-300'
              }`}
          >
            🔔 Price Alerts
          </button>
          <button
            onClick={() => {
              setActiveTab('favorites');
            }}
            className={`px-4 py-3 font-semibold transition-all whitespace-nowrap ${
              activeTab === 'favorites'
                ? 'text-osrs-accent border-b-2 border-osrs-accent'
                : 'text-slate-400 hover:text-slate-300'
              }`}
          >
            ⭐ Favorites
          </button>
        </div>

        {/* Portfolio Tab Content */}
        {activeTab === 'portfolio' && <Portfolio />}

        {/* Opportunities Tab Content */}
        {activeTab === 'opportunities' && (
          <>
            {/* AI Analysis Status & Refresh Button */}
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 border border-blue-700 rounded-lg p-4 mb-6">
              {/* Cooldown Warning */}
              {showRefreshWarning && (
                <div className="mb-3 bg-yellow-900/50 border border-yellow-700 rounded-lg p-3 text-yellow-200 text-sm">
                  ⚠️ Refreshed {Math.floor((Date.now() - (lastRefresh?.getTime() || 0)) / 1000)}s ago. Wait 30s between refreshes to avoid unnecessary costs.
                </div>
              )}

              <div className="flex items-center justify-between gap-6">
                <div className="flex-1">
                  <div className="text-sm text-blue-200 mb-2">
                    {loading && (
                      <div>
                        <div className="inline-flex items-center gap-2 mb-1">
                          <span className="inline-block animate-bounce">🤖</span>
                          <span>{scanMessage}</span>
                        </div>
                        {scanTip && (
                          <div className="text-xs text-blue-300/70 italic ml-7">
                            {scanTip}
                          </div>
                        )}
                      </div>
                    )}
                    {!loading && lastRefresh && (
                      <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
                    )}
                    {!loading && !lastRefresh && <span>Ready to analyze</span>}
                  </div>
                  {!loading && analysisStats && (
                    <div className="text-xs text-blue-200/80">
                      Analysis: {analysisStats.totalAnalyzed} items → {analysisStats.stage0FilteredCount} filtered (Stage 0) → {analysisStats.aiAnalyzedCount} AI evaluated → {analysisStats.aiApprovedCount} approved
                    </div>
                  )}

                  {!loading && analysisCost && (
                    <div className="text-xs text-blue-300/80 mt-1 space-y-0.5">
                      <div>💰 Cost: ${analysisCost.costUSD.toFixed(4)} ({analysisCost.totalTokens.toLocaleString()} tokens)</div>
                      <div className="text-blue-400/70">
                        Input: {analysisCost.inputTokens?.toLocaleString()} tokens (${analysisCost.breakdown?.inputCostUSD.toFixed(4)}) |
                        Output: {analysisCost.outputTokens?.toLocaleString()} tokens (${analysisCost.breakdown?.outputCostUSD.toFixed(4)})
                      </div>
                    </div>
                  )}


                  {loading && (
                    <div className="w-full bg-blue-900 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 h-full transition-all duration-300 ease-out animate-pulse"
                        style={{
                          width: `${scanProgress}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => analyzeWithAI()}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white rounded font-medium text-sm transition-colors"
                  >
                    {loading ? 'Analyzing...' : '🔄 Refresh Analysis'}
                  </button>
                  {!loading && filteredItems.length > 0 && (
                    <button
                      onClick={() => setShowFilteredItems(true)}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded font-medium text-sm transition-colors"
                    >
                      🔍 {filteredItems.length} Filtered
                    </button>
                  )}
                  {/* Export button hidden but code preserved for future use */}
                  {false && !loading && opportunities.length > 0 && (
                    <button
                      onClick={exportScanResults}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium text-sm transition-colors"
                      title="Export scan results as JSON for comparison"
                    >
                      📥 Export Results
                    </button>
                  )}
                </div>
              </div>
              {error && (
                <div className="mt-2 text-red-200 text-sm">
                  ⚠️ {error}
                </div>
              )}
            </div>

            {/* Settings & Filters */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-slate-100 mb-4">📊 Filter</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-300 block mb-2">
                    Minimum Score: {minOpportunityScore}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={minOpportunityScore}
                    onChange={(e) => setMinOpportunityScore(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-osrs-accent"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    {minOpportunityScore >= 80 ? '🟢 Only top-tier opportunities' : minOpportunityScore >= 50 ? '🟡 Balanced selection' : '🔴 Include riskier items'}
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-300 block mb-2">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm focus:outline-none focus:border-osrs-accent"
                  >
                    <option value="confidence">Score (High to Low)</option>
                    <option value="roi">Potential Gain %</option>
                    <option value="profit">Profit Per Unit</option>
                    <option value="score">Opportunity Score</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <div className="w-full bg-slate-800 border border-slate-700 rounded p-3 text-center">
                    <p className="text-xs text-slate-400 mb-1">Signals Found</p>
                    <p className="text-2xl font-bold text-osrs-accent">{filteredOpportunities.length}</p>
                    <p className="text-xs text-slate-400">
                      of {totalAnalyzed ?? opportunities.length} analyzed
                    </p>
                  </div>

                </div>
              </div>
            </div>

            {/* Opportunities Grid */}
            <div className="space-y-8">
              {displayOpportunities.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                      <span className="w-8 h-8 bg-orange-900 text-orange-400 rounded flex items-center justify-center text-lg">
                        📊
                      </span>
                      {`Alpha Feed (${displayOpportunities.length})`}
                    </h2>
                    <button
                      onClick={() => setShowAlphaFeedInfo(true)}
                      className="w-6 h-6 rounded-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm flex items-center justify-center transition-colors"
                      title="Learn how Alpha Feed analysis works"
                    >
                      ?
                    </button>
                  </div>
                  <p className="text-slate-400 text-sm mb-4">Live mean-reversion flips cleared by the AI gate</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayOpportunities.map((opp: FlipOpportunity) => (
                      <FlipCard
                        key={opp.itemId}
                        opportunity={opp}
                        onViewDetails={() => router.push(`/item/${opp.itemId}`)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {displayOpportunities.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-slate-400 text-lg mb-2">
                    🎯 Auto-loaded popular items
                  </p>
                  <p className="text-slate-500 text-sm mb-4">
                    Popular OSRS trading items are being analyzed. Use the search bar to add more items to analyze.
                  </p>
                  <p className="text-slate-600 text-xs">
                    Tip: Click the star ★ on any card to add it to your favorites for quick access.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Favorites Tab Content */}
        {activeTab === 'favorites' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-100">Favorite Items</h2>
            </div>
            <FavoritesList />
          </div>
        )}

        {/* Performance Tab Content */}
        {activeTab === 'performance' && <PerformanceDashboard />}

        {/* Price Alerts Tab Content */}
        {activeTab === 'alerts' && <PriceAlerts />}
      </main>

      {/* Detailed Analysis Modal */}
      <DetailedAnalysisModal
        isOpen={showDetailedAnalysis}
        onClose={() => setShowDetailedAnalysis(false)}
        analyses={detailedAnalyses}
      />

      {/* Filtered Items Modal */}
      <FilteredItemsModal
        isOpen={showFilteredItems}
        onClose={() => setShowFilteredItems(false)}
        filteredItems={filteredItems}
      />

      {/* Settings Modal */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Alpha Feed Info Modal */}
      <AlphaFeedInfoModal
        isOpen={showAlphaFeedInfo}
        onClose={() => setShowAlphaFeedInfo(false)}
      />

      {/* Keyboard Shortcuts Handler */}
      <KeyboardShortcuts />

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-slate-500 text-sm">
          <div>Data updated every 30 seconds - vibecoded by ray</div>
        </div>
      </footer>
    </div>
  );
}
