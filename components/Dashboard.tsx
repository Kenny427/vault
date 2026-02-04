'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SearchBar from './SearchBar';
import FlipCard from './FlipCard';
import Portfolio from './Portfolio';
import FavoritesList from './FavoritesList';
import { getPopularItems } from '@/lib/api/osrs';
import { FlipOpportunity } from '@/lib/analysis';
import { useDashboardStore } from '@/lib/store';
import { useAuth } from '@/lib/authContext';

export default function Dashboard() {
  const router = useRouter();
  const { logout } = useAuth();
  type PoolItem = { id: number; name: string; addedAt?: number };
  const [opportunities, setOpportunities] = useState<FlipOpportunity[]>([]);
  const [sortBy, setSortBy] = useState<'score' | 'roi' | 'profit' | 'confidence'>('score');
  const [activeTab, setActiveTab] = useState<'portfolio' | 'favorites' | 'opportunities'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('osrs-active-tab');
      if (saved === 'portfolio' || saved === 'favorites' || saved === 'opportunities') {
        return saved;
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
    watchlist,
    minOpportunityScore,
    setMinOpportunityScore
  } = useDashboardStore();

  // Analyze items with AI
  const analyzeWithAI = async () => {
    if (loading) return;

    const customPool: PoolItem[] = typeof window !== 'undefined'
      ? (JSON.parse(localStorage.getItem('osrs-custom-pool') || '[]') as PoolItem[])
      : [];

    const itemsToAnalyze: PoolItem[] = customPool.length > 0
      ? customPool
      : watchlist.length > 0
        ? watchlist
        : (await getPopularItems()).map(item => ({
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

          const aiOpportunities = await response.json();
          allOpportunities.push(...aiOpportunities);
        }

        setOpportunities(
          allOpportunities.sort((a: FlipOpportunity, b: FlipOpportunity) => b.opportunityScore - a.opportunityScore)
        );
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

  // Filter opportunities based on settings
  let filteredOpportunities = opportunities.filter(opp => {
    if (opp.opportunityScore < minOpportunityScore) return false;
    if (opp.confidence < minConfidenceThreshold) return false;
    if (opp.recommendation !== 'buy') return false;
    return true;
  });

  // Sort opportunities based on selected sort option
  filteredOpportunities = [...filteredOpportunities].sort((a, b) => {
    switch (sortBy) {
      case 'roi':
        return b.roi - a.roi;
      case 'profit':
        return b.profitPerUnit - a.profitPerUnit;
      case 'confidence':
        return b.confidence - a.confidence;
      case 'score':
      default:
        return b.opportunityScore - a.opportunityScore;
    }
  });

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
                onClick={() => router.push('/admin')}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-300 hover:bg-slate-800 rounded transition-colors"
              >
                Admin Pool
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
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'portfolio'
                ? 'text-osrs-accent border-b-2 border-osrs-accent'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            💼 My Portfolio
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'favorites'
                ? 'text-osrs-accent border-b-2 border-osrs-accent'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            ⭐ Favorites
          </button>
          <button
            onClick={() => setActiveTab('opportunities')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'opportunities'
                ? 'text-osrs-accent border-b-2 border-osrs-accent'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            🎯 Flip Opportunities
          </button>
        </div>

        {/* Portfolio Tab Content */}
        {activeTab === 'portfolio' && <Portfolio />}

        {/* Favorites Tab Content */}
        {activeTab === 'favorites' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-100">Favorite Items</h2>
            </div>
            <FavoritesList />
          </div>
        )}

        {/* Opportunities Tab Content */}
        {activeTab === 'opportunities' && (
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
                <button
                  onClick={() => analyzeWithAI()}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white rounded font-medium text-sm transition-colors"
                >
                  {loading ? 'Analyzing...' : 'Refresh Analysis'}
                </button>
              </div>
              {error && (
                <div className="mt-2 text-red-200 text-sm">
                  ⚠️ {error}
                </div>
              )}
            </div>

        {/* Settings & Filters */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-slate-100 mb-4">🎛️ Analysis Settings</h2>
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
                Risk Level: {minConfidenceThreshold}%
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
          {filteredOpportunities.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-slate-100 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-orange-900 text-orange-400 rounded flex items-center justify-center text-lg">
                  💰
                </span>
                AI-Detected Flip Opportunities ({filteredOpportunities.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOpportunities.map((opp: FlipOpportunity) => (
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

          {filteredOpportunities.length === 0 && watchlist.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-400 text-lg mb-2">
                🎯 Auto-loaded popular items
              </p>
              <p className="text-slate-500 text-sm mb-4">
                Popular OSRS trading items are being analyzed. Use the search bar to add more items to your watchlist.
              </p>
              <p className="text-slate-600 text-xs">
                Tip: Click the search bar to see popular items, or search for specific items you want to track.
              </p>
            </div>
          )}
        </div>

          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-slate-500 text-sm">
          Data updated every 30 seconds - vibecoded by ray
        </div>
      </footer>
    </div>
  );
}
