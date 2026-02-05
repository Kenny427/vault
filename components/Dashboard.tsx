'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import SearchBar from './SearchBar';
import FlipCard from './FlipCard';
import Portfolio from './Portfolio';
import FavoritesList from './FavoritesList';
import FloatingChat from './FloatingChat';
import PoolManager from './PoolManager';
import PerformanceDashboard from './PerformanceDashboard';
import PriceAlerts from './PriceAlerts';
import KeyboardShortcuts from './KeyboardShortcuts';
import { FlipOpportunity, FlipType } from '@/lib/analysis';
import { useDashboardStore } from '@/lib/store';
import { useAuth } from '@/lib/authContext';
import { usePriceAlertsStore } from '@/lib/priceAlertsStore';
import { initDinkWebhookListener } from '@/lib/dinkWebhook';
import { getAllAnalysisItems } from '@/lib/expandedItemPool';

type TabType = 'portfolio' | 'opportunities' | 'favorites' | 'performance' | 'alerts';
type MenuTab = 'admin';

/**
 * Convert MeanReversionSignal to FlipOpportunity for UI display
 */
function convertMeanReversionToFlipOpportunity(signal: any): FlipOpportunity {
  return {
    itemId: signal.itemId,
    itemName: signal.itemName,
    currentPrice: signal.currentPrice,
    averagePrice: signal.mediumTerm.avgPrice,
    averagePrice30: signal.mediumTerm.avgPrice,
    averagePrice90: signal.mediumTerm.avgPrice,
    averagePrice180: signal.longTerm.avgPrice,
    averagePrice365: signal.longTerm.avgPrice,
    deviation: Math.abs(signal.maxDeviation),
    deviationScore: -Math.abs(signal.maxDeviation),
    trend: signal.maxDeviation > 10 ? 'bearish' : 'bullish',
    recommendation: 'buy',
    opportunityScore: signal.confidenceScore,
    historicalLow: signal.currentPrice,
    historicalHigh: signal.targetSellPrice,
    flipType: signal.confidenceScore >= 85 ? 'high-confidence' : 
             signal.confidenceScore >= 65 ? 'deep-value' : 
             signal.confidenceScore >= 40 ? 'mean-reversion' : 
             'risky-upside',
    flipTypeConfidence: signal.confidenceScore,
    buyPrice: signal.currentPrice,
    sellPrice: signal.targetSellPrice,
    profitPerUnit: signal.targetSellPrice - signal.currentPrice,
    profitMargin: ((signal.targetSellPrice - signal.currentPrice) / signal.currentPrice) * 100,
    roi: signal.reversionPotential,
    riskLevel: signal.volatilityRisk,
    confidence: signal.confidenceScore,
    estimatedHoldTime: signal.estimatedHoldingPeriod,
    volatility: signal.maxDeviation,
    volumeScore: signal.liquidityScore,
    dailyVolume: signal.mediumTerm.volumeAvg,
    buyWhen: `Below ${signal.mediumTerm.avgPrice}gp (currently ${signal.currentPrice}gp)`,
    sellWhen: `At or above ${signal.targetSellPrice}gp target`,
    momentum: signal.reversionPotential * 0.5,
    acceleration: 0,
    tradingRange: signal.maxDeviation,
    consistency: signal.supplyStability,
    spreadQuality: Math.min(100, signal.liquidityScore + signal.confidenceScore / 2),
    recommendedQuantity: Math.floor(signal.suggestedInvestment / signal.currentPrice),
    totalInvestment: signal.suggestedInvestment,
    totalProfit: (signal.targetSellPrice - signal.currentPrice) * Math.floor(signal.suggestedInvestment / signal.currentPrice)
  };
}

export default function Dashboard() {
  const router = useRouter();
  const { logout } = useAuth();
  type PoolItem = { id: number; name: string; addedAt?: number };
  const [opportunities, setOpportunities] = useState<FlipOpportunity[]>([]);
  const [sortBy, setSortBy] = useState<'score' | 'roi' | 'profit' | 'confidence'>('score');
  const [flipTypeFilter] = useState<FlipType | 'all'>('all');
  const [showMenu, setShowMenu] = useState(false);
  const [activeMenuTab, setActiveMenuTab] = useState<MenuTab | null>(null);
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
  const [batchProgress, setBatchProgress] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [minConfidenceThreshold] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('osrs-min-confidence');
      return saved ? Number(saved) : 45;
    }
    return 45;
  });
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

    // ALWAYS use the curated pool - no custom pools, no DB pools
    // This ensures only the 355 carefully selected items are analyzed
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

    try {
      // Call mean-reversion opportunities endpoint (analyze all items in pool)
      const response = await fetch('/api/mean-reversion-opportunities');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze mean-reversion opportunities');
      }

      const data = await response.json();
      
      if (!data.success || !data.opportunities) {
        console.error('API Response:', data);
        throw new Error('Invalid response from analysis API');
      }

      // Convert MeanReversionSignals to FlipOpportunities for UI
      const opportunities = data.opportunities.map(convertMeanReversionToFlipOpportunity);
      
      // Sort by opportunity score (confidence)
      const sorted = opportunities.sort(
        (a: FlipOpportunity, b: FlipOpportunity) => b.opportunityScore - a.opportunityScore
      );
      
      setOpportunities(sorted);
      setLastRefresh(new Date());
      
      console.log(`✅ Found ${sorted.length} mean-reversion opportunities`);
      console.log(`📊 Mean-reversion analysis complete`);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('osrs-last-refresh', new Date().toISOString());
        localStorage.setItem('osrs-cached-opps', JSON.stringify(sorted));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze opportunities');
      console.error('Mean-reversion analysis error:', err);
    } finally {
      setLoading(false);
      setTotalBatches(0);
      setBatchProgress(0);
    }
  };

  useEffect(() => {
    analyzeRef.current = analyzeWithAI;
  }, [analyzeWithAI]);

  useEffect(() => {
    loadingRef.current = loading;
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
    // Manual refresh only
  }, [activeTab]);

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

  useEffect(() => {
    const runRefresh = () => {
      if (!loadingRef.current && analyzeRef.current) {
        analyzeRef.current();
      }
    };

    // Auto-refresh every 15 minutes in background, regardless of active tab
    const intervalId = setInterval(runRefresh, 15 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Filter opportunities based on settings
  let filteredOpportunities = opportunities.filter(opp => {
    if (opp.opportunityScore < minOpportunityScore) return false;
    if (opp.confidence < minConfidenceThreshold) return false;
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
              setActiveMenuTab(null);
              setShowMenu(false);
            }}
            className={`px-4 py-3 font-semibold transition-all whitespace-nowrap ${
              activeTab === 'portfolio' && !activeMenuTab
                ? 'text-osrs-accent border-b-2 border-osrs-accent'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            💼 Portfolio
          </button>
          <button
            onClick={() => {
              setActiveTab('opportunities');
              setActiveMenuTab(null);
              setShowMenu(false);
            }}
            className={`px-4 py-3 font-semibold transition-all whitespace-nowrap ${
              activeTab === 'opportunities' && !activeMenuTab
                ? 'text-osrs-accent border-b-2 border-osrs-accent'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            🎯 Opportunities
          </button>
          <button
            onClick={() => {
              setActiveTab('performance');
              setActiveMenuTab(null);
              setShowMenu(false);
            }}
            className={`px-4 py-3 font-semibold transition-all whitespace-nowrap ${
              activeTab === 'performance' && !activeMenuTab
                ? 'text-osrs-accent border-b-2 border-osrs-accent'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            📈 Performance
          </button>
          <button
            onClick={() => {
              setActiveTab('alerts');
              setActiveMenuTab(null);
              setShowMenu(false);
            }}
            className={`px-4 py-3 font-semibold transition-all whitespace-nowrap ${
              activeTab === 'alerts' && !activeMenuTab
                ? 'text-osrs-accent border-b-2 border-osrs-accent'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            🔔 Price Alerts
          </button>
          <button
            onClick={() => {
              setActiveTab('favorites');
              setActiveMenuTab(null);
              setShowMenu(false);
            }}
            className={`px-4 py-3 font-semibold transition-all whitespace-nowrap ${
              activeTab === 'favorites' && !activeMenuTab
                ? 'text-osrs-accent border-b-2 border-osrs-accent'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            ⭐ Favorites
          </button>

          {/* Settings Menu */}
          <div className="relative ml-auto">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className={`px-4 py-3 font-semibold transition-all rounded-lg ${
                showMenu
                  ? 'text-osrs-accent bg-slate-700/50'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
              title="More options"
            >
              ⚙️
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50">
                <button
                  onClick={() => {
                    setActiveMenuTab('admin');
                    setShowMenu(false);
                  }}
                  className={`block w-full text-left px-4 py-3 hover:bg-slate-700/50 transition-colors ${
                    activeMenuTab === 'admin' ? 'text-osrs-accent' : 'text-slate-300'
                  }`}
                >
                  ⚙️ Pool Manager
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Portfolio Tab Content */}
        {activeTab === 'portfolio' && !activeMenuTab && <Portfolio />}

        {/* Opportunities Tab Content */}
        {activeTab === 'opportunities' && !activeMenuTab && (
          <>
            {/* AI Analysis Status & Refresh Button */}
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 border border-blue-700 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm text-blue-200 mb-2">
                    {loading && totalBatches > 0 && (
                      <span>🔄 Analyzing... Batch {batchProgress}/{totalBatches}</span>
                    )}
                    {loading && totalBatches === 0 && <span>🔄 Loading pool data...</span>}
                    {!loading && lastRefresh && (
                      <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
                    )}
                    {!loading && !lastRefresh && <span>Ready to analyze</span>}
                  </div>
                  {loading && totalBatches > 0 && (
                    <div className="w-full bg-blue-900 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-green-400 to-blue-400 h-full transition-all duration-300 ease-out"
                        style={{
                          width: `${totalBatches > 0 ? (batchProgress / totalBatches) * 100 : 0}%`,
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
                    {loading ? 'Analyzing...' : 'Refresh Analysis'}
                  </button>
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
                <p className="text-xs text-slate-400 mb-1">Opportunities Found</p>
                <p className="text-2xl font-bold text-osrs-accent">{filteredOpportunities.length}</p>
                <p className="text-xs text-slate-400">of {opportunities.length} analyzed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Opportunities Grid */}
        <div className="space-y-8">
          {displayOpportunities.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-slate-100 mb-1 flex items-center gap-2">
                <span className="w-8 h-8 bg-orange-900 text-orange-400 rounded flex items-center justify-center text-lg">
                  📊
                </span>
                {`Flip Opportunities (${displayOpportunities.length})`}
              </h2>
              <p className="text-slate-400 text-sm mb-4">Items trading below historical averages</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayOpportunities.map((opp: FlipOpportunity) => (
                  <FlipCard
                    key={opp.itemId}
                    opportunity={opp}
                    onViewDetails={() => {
                      router.push(`/item/${opp.itemId}`);
                    }}
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
        {activeTab === 'favorites' && !activeMenuTab && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-100">Favorite Items</h2>
            </div>
            <FavoritesList />
          </div>
        )}

        {/* Performance Tab Content */}
        {activeTab === 'performance' && !activeMenuTab && <PerformanceDashboard />}

        {/* Price Alerts Tab Content */}
        {activeTab === 'alerts' && !activeMenuTab && <PriceAlerts />}

        {/* Menu Tab: Pool Manager */}
        {activeMenuTab === 'admin' && <PoolManager />}
      </main>

      {/* Floating AI Chat Widget */}
      <FloatingChat />

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
