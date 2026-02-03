'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SearchBar from './SearchBar';
import FlipCard from './FlipCard';
import Portfolio from './Portfolio';
import FavoritesList from './FavoritesList';
import { getItemPrice, getItemHistory, getPopularItems } from '@/lib/api/osrs';
import {
  analyzeFlipOpportunity,
  FlipOpportunity,
  findLongTermInvestments,
  findShortTermFlips,
} from '@/lib/analysis';
import { useDashboardStore } from '@/lib/store';
import { useAuth } from '@/lib/authContext';

export default function Dashboard() {
  const router = useRouter();
  const { logout } = useAuth();
  const [opportunities, setOpportunities] = useState<FlipOpportunity[]>([]);
  const [sortBy, setSortBy] = useState<'score' | 'roi' | 'profit' | 'confidence'>('score');
  const [activeTab, setActiveTab] = useState<'portfolio' | 'favorites' | 'opportunities'>('portfolio');
  const {
    watchlist,
    minOpportunityScore,
    setMinOpportunityScore,
    showBuyOpportunities,
    setShowBuyOpportunities,
    showSellOpportunities,
    setShowSellOpportunities,
    selectedTimeframe,
    setSelectedTimeframe,
  } = useDashboardStore();

  // Load and analyze watchlist items and popular items
  useEffect(() => {
    const loadItems = async () => {
      // Use watchlist if available, otherwise load popular items
      let itemsToAnalyze;
      
      if (watchlist.length > 0) {
        itemsToAnalyze = watchlist;
      } else {
        const popularItems = await getPopularItems();
        itemsToAnalyze = popularItems.map(item => ({
          id: item.id,
          name: item.name,
          addedAt: Date.now(),
        }));
      }

      if (itemsToAnalyze.length === 0) {
        setOpportunities([]);
        return;
      }

      const newOpportunities: FlipOpportunity[] = [];

      for (const item of itemsToAnalyze) {
        try {
          const price = await getItemPrice(item.id);
          const currentPrice = price ? (price.high + price.low) / 2 : undefined;
          
          if (!currentPrice) {
            continue;
          }

          const history = await getItemHistory(item.id, 30 * 24 * 60 * 60, currentPrice);

          if (price && history && history.length > 0) {
            const opportunity = analyzeFlipOpportunity(
              item.id,
              item.name,
              currentPrice,
              history
            );

            if (opportunity) {
              newOpportunities.push(opportunity);
            }
          }
        } catch (error) {
          console.error(`Error analyzing ${item.name}:`, error);
        }
      }

      setOpportunities(
        newOpportunities.sort((a, b) => b.opportunityScore - a.opportunityScore)
      );
    };

    loadItems();
    const interval = setInterval(loadItems, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [watchlist]);


  // Filter opportunities based on settings
  let filteredOpportunities = opportunities.filter(opp => {
    if (opp.opportunityScore < minOpportunityScore) return false;
    if (opp.recommendation === 'buy' && !showBuyOpportunities) return false;
    if (opp.recommendation === 'sell' && !showSellOpportunities) return false;
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

  const longTermFlips = findLongTermInvestments(opportunities, 15);
  const shortTermFlips = findShortTermFlips(opportunities, 5);

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
            <button
              onClick={logout}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-300 hover:bg-slate-800 rounded transition-colors"
            >
              Sign Out
            </button>
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
        {/* Settings & Filters */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-slate-100 mb-4">🎛️ Analysis Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
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

            <div>
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

            <div>
              <label className="text-sm font-medium text-slate-300 block mb-2">
                Timeframe
              </label>
              <select
                value={selectedTimeframe}
                onChange={(e) =>
                  setSelectedTimeframe(e.target.value as '7d' | '30d' | '90d' | '1y')
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm focus:outline-none focus:border-osrs-accent"
              >
                <option value="7d">7 Days</option>
                <option value="30d">30 Days</option>
                <option value="90d">90 Days</option>
                <option value="1y">1 Year</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBuyOpportunities}
                  onChange={(e) => setShowBuyOpportunities(e.target.checked)}
                  className="w-4 h-4 rounded accent-green-500"
                />
                <span>📥 Buy Signals</span>
              </label>
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSellOpportunities}
                  onChange={(e) => setShowSellOpportunities(e.target.checked)}
                  className="w-4 h-4 rounded accent-red-500"
                />
                <span>📤 Sell Signals</span>
              </label>
            </div>

            <div className="flex items-end">
              <div className="w-full bg-slate-800 border border-slate-700 rounded p-3 text-center">
                <p className="text-xs text-slate-400 mb-1">Found</p>
                <p className="text-2xl font-bold text-osrs-accent">{filteredOpportunities.length}</p>
                <p className="text-xs text-slate-400">opportunities</p>
              </div>
            </div>
          </div>
        </div>

        {/* Opportunities Grid */}
        <div className="space-y-8">
          {shortTermFlips.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-slate-100 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-orange-900 text-orange-400 rounded flex items-center justify-center text-lg">
                  ⚡
                </span>
                Short-Term Flip Opportunities ({shortTermFlips.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {shortTermFlips.map((opp) => (
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

          {longTermFlips.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-slate-100 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-green-900 text-green-400 rounded flex items-center justify-center text-lg">
                  📈
                </span>
                Long-Term Investment Opportunities ({longTermFlips.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {longTermFlips.map((opp) => (
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

        {/* All Opportunities */}
        {filteredOpportunities.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-slate-100 mb-4">All Opportunities</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOpportunities.map((opp) => (
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
