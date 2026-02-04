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

interface AIRankedOpportunity extends FlipOpportunity {
  aiScore: number;
  aiReasoning: string;
  aiConfidence: number;
}

type TabType = 'portfolio' | 'opportunities' | 'favorites' | 'performance' | 'alerts';
type MenuTab = 'admin';

export default function Dashboard() {
  const router = useRouter();
  const { logout } = useAuth();
  type PoolItem = { id: number; name: string; addedAt?: number };
  const [opportunities, setOpportunities] = useState<FlipOpportunity[]>([]);
  const [aiRankedOpportunities, setAIRankedOpportunities] = useState<AIRankedOpportunity[] | null>(null);
  const [isRanking, setIsRanking] = useState(false);
  const [sortBy, setSortBy] = useState<'score' | 'roi' | 'profit' | 'confidence'>('score');
  const [flipTypeFilter, setFlipTypeFilter] = useState<FlipType | 'all'>('all');
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
  const [minConfidenceThreshold, setMinConfidenceThreshold] = useState<number>(() => {
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

    const customPool: PoolItem[] = typeof window !== 'undefined'
      ? (JSON.parse(localStorage.getItem('osrs-custom-pool') || '[]') as PoolItem[])
      : [];

    // Use expanded pool (350+ items) if no custom pool, otherwise use custom
    const itemsToAnalyze: PoolItem[] = customPool.length > 0
      ? customPool
      : getAllAnalysisItems().map(item => ({
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
      // Analyze with AI via API route (server handles data fetching)
      if (itemsToAnalyze.length > 0) {
        const payloadItems = [...itemsToAnalyze]
          .map(item => ({ id: item.id, name: item.name }));
        const batchSize = 15;
        const allOpportunities: FlipOpportunity[] = [];

        for (let i = 0; i < payloadItems.length; i += batchSize) {
          const batch = payloadItems.slice(i, i + batchSize);
          const response = await fetch('/api/analyze-flips', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(batch),
          });

          const contentType = response.headers.get('content-type') || '';

          if (!response.ok) {
            let errorMessage = 'Failed to analyze opportunities';
            if (contentType.includes('application/json')) {
              const errorData = await response.json();
              errorMessage = errorData.error || errorMessage;
            } else {
              const errorText = await response.text();
              if (errorText) errorMessage = errorText;
            }
            throw new Error(errorMessage);
          }

          if (!contentType.includes('application/json')) {
            const errorText = await response.text();
            throw new Error(errorText || 'Unexpected response from analysis API');
          }

          const data = await response.json();
          
          // Handle both old format (array) and new format (object with opportunities + diagnostic)
          const aiOpportunities = Array.isArray(data) ? data : data.opportunities || [];
          allOpportunities.push(...aiOpportunities);
          
          // Log diagnostic info if available
          if (data.diagnostic) {
            const batchNum = Math.floor(i / batchSize) + 1;
            console.log(`📊 POOL ANALYSIS - Batch ${batchNum}:`);
            console.log(`   Requested: ${data.diagnostic.requested} items`);
            console.log(`   Passed spread filter (>15%): ${data.diagnostic.passedFilter} items`);
            if (data.diagnostic.itemsPassedFilter.length > 0) {
              data.diagnostic.itemsPassedFilter.forEach((item: any) => {
                console.log(`   ✓ ${item.name}: spread=${item.spread}%, range ${item.min}-${item.max}`);
              });
            }
          }
        }

        setOpportunities(
          allOpportunities.sort((a: FlipOpportunity, b: FlipOpportunity) => b.opportunityScore - a.opportunityScore)
        );
        console.log(`📊 AI returned ${allOpportunities.length} opportunities`);
        console.log(`Min Score filter: ${minOpportunityScore}, Confidence filter: ${minConfidenceThreshold}%`);
        const now = new Date();
        setLastRefresh(now);
        if (typeof window !== 'undefined') {
          localStorage.setItem('osrs-last-refresh', now.toISOString());
          localStorage.setItem('osrs-cached-opps', JSON.stringify(allOpportunities));
        }
      } else {
        setOpportunities([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze opportunities');
      console.error('AI analysis error:', err);
    } finally {
      setLoading(false);
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
    if (activeTab !== 'opportunities') return;

    const runRefresh = () => {
      if (!loadingRef.current && analyzeRef.current) {
        analyzeRef.current();
      }
    };

    // Only auto-refresh every 5 minutes, not on tab switch
    const intervalId = setInterval(runRefresh, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [activeTab]);

  // Filter opportunities based on settings
  let filteredOpportunities = opportunities.filter(opp => {
    if (opp.opportunityScore < minOpportunityScore) return false;
    if (opp.confidence < minConfidenceThreshold) return false;
    if (opp.recommendation !== 'buy') return false;
    
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

  // Handle AI ranking
  const handleAIRank = async () => {
    if (filteredOpportunities.length === 0) return;
    
    setIsRanking(true);
    try {
      const response = await fetch('/api/rank-opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filteredOpportunities.slice(0, 15)),
      });

      if (!response.ok) {
        throw new Error('Failed to rank opportunities');
      }

      const ranked = await response.json();
      setAIRankedOpportunities(ranked);
    } catch (error) {
      console.error('AI ranking failed:', error);
      alert('Failed to rank opportunities. Please try again.');
    } finally {
      setIsRanking(false);
    }
  };

  // Use AI-ranked opportunities if available, otherwise use filtered
  const displayOpportunities = aiRankedOpportunities || filteredOpportunities;

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
                <div className="flex items-center gap-2">
                  <div className="text-sm text-blue-200">
                    {loading && <span>🔄 Analyzing with AI...</span>}
                    {!loading && lastRefresh && (
                      <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
                    )}
                    {!loading && !lastRefresh && <span>Ready to analyze</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!loading && filteredOpportunities.length > 0 && (
                    <button
                      onClick={handleAIRank}
                      disabled={isRanking}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white rounded font-medium text-sm transition-colors"
                      title="AI ranks top opportunities in one batch"
                    >
                      {isRanking ? '⏳ Ranking...' : aiRankedOpportunities ? '✨ Re-rank with AI' : '✨ AI Rank Top 15'}
                    </button>
                  )}
                  {aiRankedOpportunities && (
                    <button
                      onClick={() => setAIRankedOpportunities(null)}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-medium text-sm transition-colors"
                      title="Clear AI rankings"
                    >
                      Clear AI
                    </button>
                  )}
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
              {aiRankedOpportunities && (
                <div className="mt-3 text-sm text-purple-300 bg-purple-900/30 p-2 rounded">
                  🤖 Showing AI-ranked top {aiRankedOpportunities.length} opportunities
                </div>
              )}
            </div>

        {/* Settings & Filters */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-slate-100 mb-4">🎛️ Analysis Settings & Filters</h2>
          
          {/* Flip Type Filter */}
          <div className="mb-6">
            <label className="text-sm font-medium text-slate-300 block mb-3">Flip Type:</label>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFlipTypeFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  flipTypeFilter === 'all'
                    ? 'bg-osrs-accent text-slate-900'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
                }`}
              >
                All ({filteredOpportunities.length})
              </button>
              <button
                onClick={() => setFlipTypeFilter('quick-flip')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  flipTypeFilter === 'quick-flip'
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
                }`}
              >
                ⚡ Quick Flips ({opportunities.filter(o => o.flipType === 'quick-flip').length})
              </button>
              <button
                onClick={() => setFlipTypeFilter('bot-dump')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  flipTypeFilter === 'bot-dump'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
                }`}
              >
                🤖 Bot Dumps ({opportunities.filter(o => o.flipType === 'bot-dump').length})
              </button>
              <button
                onClick={() => setFlipTypeFilter('long-term')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  flipTypeFilter === 'long-term'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
                }`}
              >
                📈 Long-Term ({opportunities.filter(o => o.flipType === 'long-term').length})
              </button>
              <button
                onClick={() => setFlipTypeFilter('safe-hold')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  flipTypeFilter === 'safe-hold'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
                }`}
              >
                🛡️ Safe Holds ({opportunities.filter(o => o.flipType === 'safe-hold').length})
              </button>
              <button
                onClick={() => setFlipTypeFilter('volatile-play')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  flipTypeFilter === 'volatile-play'
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
                }`}
              >
                💥 Volatile ({opportunities.filter(o => o.flipType === 'volatile-play').length})
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-300 block mb-2">
                Min Score: {minOpportunityScore}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={minOpportunityScore}
                onChange={(e) => setMinOpportunityScore(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-osrs-accent"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-300 block mb-2">
                Confidence: {minConfidenceThreshold}%
              </label>
              <input
                type="range"
                min="30"
                max="95"
                value={minConfidenceThreshold}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setMinConfidenceThreshold(val);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('osrs-min-confidence', val.toString());
                  }
                }}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-osrs-accent"
              />
              <p className="text-xs text-slate-400 mt-1">
                {minConfidenceThreshold >= 70 ? '🟢 Conservative' : minConfidenceThreshold >= 50 ? '🟡 Balanced' : '🔴 Aggressive'}
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
                <option value="score">Opportunity Score</option>
                <option value="roi">ROI %</option>
                <option value="profit">Profit/Unit</option>
                <option value="confidence">Confidence</option>
              </select>
            </div>

            <div className="flex items-end">
              <div className="w-full bg-slate-800 border border-slate-700 rounded p-3 text-center">
                <p className="text-xs text-slate-400 mb-1">Found</p>
                <p className="text-2xl font-bold text-osrs-accent">{filteredOpportunities.length}</p>
                <p className="text-xs text-slate-400">showing {filteredOpportunities.length} of {opportunities.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Opportunities Grid */}
        <div className="space-y-8">
          {displayOpportunities.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-slate-100 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-orange-900 text-orange-400 rounded flex items-center justify-center text-lg">
                  💰
                </span>
                {aiRankedOpportunities ? `AI-Ranked Opportunities (${displayOpportunities.length})` : `AI-Detected Flip Opportunities (${displayOpportunities.length})`}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayOpportunities.map((opp: FlipOpportunity | AIRankedOpportunity) => (
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
