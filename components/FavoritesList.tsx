'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useDashboardStore } from '@/lib/store';
import { getItemPrice, resolveIconUrl, getItemDetails, getItemHistory } from '@/lib/api/osrs';

export default function FavoritesList() {
  const router = useRouter();
  const { favorites, removeFromFavorites } = useDashboardStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // Get current prices for all favorites
  const favoriteIds = useMemo(() => favorites.map(f => f.id), [favorites]);
  
  const { data: pricesData } = useQuery({
    queryKey: ['favorites-prices', favoriteIds],
    queryFn: async () => {
      const prices: Record<number, any> = {};
      for (const fav of favorites) {
        try {
          const price = await getItemPrice(fav.id);
          prices[fav.id] = price;
        } catch (error) {
          console.error(`Error fetching price for ${fav.name}:`, error);
        }
      }
      return prices;
    },
    enabled: favorites.length > 0,
    refetchInterval: 30000,
  });

  // Get item details for icons
  const { data: itemDetailsData } = useQuery({
    queryKey: ['favorites-details', favoriteIds],
    queryFn: async () => {
      const details: Record<number, any> = {};
      for (const fav of favorites) {
        try {
          const detail = await getItemDetails(fav.id);
          details[fav.id] = detail;
        } catch (error) {
          console.error(`Error fetching details for ${fav.name}:`, error);
        }
      }
      return details;
    },
    enabled: favorites.length > 0,
  });

  // Get 30-day history for all favorites
  const { data: historyData } = useQuery({
    queryKey: ['favorites-history', favoriteIds],
    queryFn: async () => {
      const history: Record<number, any[]> = {};
      for (const fav of favorites) {
        try {
          const data = await getItemHistory(fav.id, 30 * 24 * 60 * 60, undefined);
          history[fav.id] = data || [];
        } catch (error) {
          console.error(`Error fetching history for ${fav.name}:`, error);
          history[fav.id] = [];
        }
      }
      return history;
    },
    enabled: favorites.length > 0,
  });

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(`https://prices.runescape.wiki/api/v1/osrs/mapping`);
      const allItems = await response.json();
      const filtered = allItems
        .filter((item: any) => 
          item.name.toLowerCase().includes(query.toLowerCase()) &&
          !favorites.some(fav => fav.id === item.id)
        )
        .slice(0, 10);
      setSuggestions(filtered);
    } catch (error) {
      console.error('Error searching items:', error);
    }
  };

  const handleAddFavorite = (item: any) => {
    useDashboardStore.getState().addToFavorites({
      id: item.id,
      name: item.name,
      addedAt: Date.now(),
    });
    setSearchQuery('');
    setSuggestions([]);
  };

  return (
    <div className="space-y-6">
      {/* Add Favorite Button */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowAddModal(!showAddModal)}
          className="px-4 py-2 bg-osrs-accent hover:bg-osrs-accent/90 text-slate-900 font-semibold rounded transition-colors"
        >
          + Add Favorite
        </button>
      </div>

      {/* Add Favorite Modal */}
      {showAddModal && (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
          <input
            type="text"
            placeholder="Search items to add..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:border-osrs-accent"
          />
          
          {suggestions.length > 0 && (
            <div className="mt-2 max-h-64 overflow-y-auto">
              {suggestions.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleAddFavorite(item)}
                  className="px-4 py-2 hover:bg-slate-800 cursor-pointer text-slate-100 border-b border-slate-800 last:border-b-0"
                >
                  {item.name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Favorites Grid */}
      {favorites.length === 0 ? (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-8 text-center">
          <p className="text-slate-400">No favorites yet. Add some items to track!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((favorite) => {
            const price = pricesData?.[favorite.id];
            const details = itemDetailsData?.[favorite.id];
            const history = historyData?.[favorite.id] || [];
            const currentPrice = price ? (price.high + price.low) / 2 : null;
            const iconUrl = resolveIconUrl(details?.icon);

            // Calculate 30D average
            const avg30 = history.length > 0 
              ? history.reduce((sum, h) => sum + h.price, 0) / history.length 
              : currentPrice;

            // Calculate price percentage from average
            const percentFromAvg = currentPrice && avg30 ? ((currentPrice - avg30) / avg30) * 100 : 0;

            // Get high/low from history
            const historyHigh = history.length > 0 ? Math.max(...history.map(h => h.price)) : price?.high;
            const historyLow = history.length > 0 ? Math.min(...history.map(h => h.price)) : price?.low;

            // Oversold/overbought indicator
            const priceRange = (historyHigh ?? 0) - (historyLow ?? 0);
            const pricePosition = priceRange > 0 && currentPrice ? (((currentPrice ?? 0) - (historyLow ?? 0)) / priceRange) * 100 : 50;
            const isOversold = pricePosition < 30;
            const isOverbought = pricePosition > 70;

            // Volatility
            const volatility = history.length > 1
              ? Math.sqrt(
                  history.reduce((sum, h) => sum + Math.pow(h.price - (avg30 || 0), 2), 0) / 
                  history.length
                )
              : 0;

            // Spread for flipping
            const netSell = price?.high ? Math.floor(price.high * 0.98) : 0;
            const netProfit = price?.low ? netSell - price.low : 0;
            const roi = price?.low ? (netProfit / price.low) * 100 : 0;

            // Time since added
            const hoursAgo = Math.floor((Date.now() - favorite.addedAt) / (1000 * 60 * 60));

            const formatNumber = (value: number) => {
              const abs = Math.abs(value);
              if (abs < 100_000) {
                return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
              }
              if (abs < 1_000_000) {
                return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
              }
              return `${(value / 1_000_000).toFixed(2).replace(/\.00$/, '').replace(/\.0$/, '')}M`;
            };

            return (
              <div
                key={favorite.id}
                onClick={() => router.push(`/item/${favorite.id}`)}
                className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg overflow-hidden hover:border-osrs-accent/50 transition-all cursor-pointer hover:shadow-lg hover:shadow-osrs-accent/20 hover:-translate-y-1"
              >
                {/* Header */}
                <div className="p-4 border-b border-slate-700 bg-slate-900/50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 bg-slate-800 border border-slate-700 rounded flex-shrink-0 flex items-center justify-center">
                        {iconUrl ? (
                          <img src={iconUrl} alt={favorite.name} className="w-8 h-8" />
                        ) : (
                          <span>🪙</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-100 truncate">{favorite.name}</h3>
                        <p className="text-xs text-slate-500">Added {hoursAgo > 24 ? Math.floor(hoursAgo / 24) + 'd' : hoursAgo + 'h'} ago</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromFavorites(favorite.id);
                      }}
                      className="text-slate-500 hover:text-red-400 text-lg ml-2 flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Status badges */}
                  <div className="flex gap-2 flex-wrap">
                    {isOversold && (
                      <div className="px-2 py-1 rounded text-xs font-bold bg-green-900/30 text-green-400 border border-green-700">
                        OVERSOLD
                      </div>
                    )}
                    {isOverbought && (
                      <div className="px-2 py-1 rounded text-xs font-bold bg-red-900/30 text-red-400 border border-red-700">
                        OVERBOUGHT
                      </div>
                    )}
                    {details?.members && (
                      <div className="px-2 py-1 rounded text-xs font-bold bg-purple-900/30 text-purple-400 border border-purple-700">
                        MEMBERS
                      </div>
                    )}
                  </div>
                </div>

                {/* Price and Movement */}
                <div className="p-4 space-y-3 border-b border-slate-700/50">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
                      <p className="text-xs text-slate-400 mb-1">CURRENT</p>
                      <p className="text-lg font-bold text-osrs-accent">
                        {currentPrice !== null ? formatNumber(currentPrice) : 'N/A'}
                        <span className="text-xs text-slate-400 ml-1">gp</span>
                      </p>
                    </div>
                    <div className={`bg-slate-800/50 p-2 rounded border ${
                      percentFromAvg > 0 ? 'border-red-700/50' : 'border-green-700/50'
                    }`}>
                      <p className="text-xs text-slate-400 mb-1">vs 30D AVG</p>
                      <p className={`text-lg font-bold ${
                        percentFromAvg > 5 ? 'text-red-400' : percentFromAvg < -5 ? 'text-green-400' : 'text-slate-300'
                      }`}>
                        {percentFromAvg > 0 ? '+' : ''}{percentFromAvg.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-800/50 p-2 rounded border border-slate-700 text-center">
                      <p className="text-xs text-slate-500">30D AVG</p>
                      <p className="text-sm font-semibold text-slate-200">
                        {avg30 ? formatNumber(Math.round(avg30)) : 'N/A'}
                      </p>
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded border border-slate-700 text-center">
                      <p className="text-xs text-slate-500">VOLATILITY</p>
                      <p className="text-sm font-semibold text-blue-400">
                        {volatility > 0 ? formatNumber(Math.round(volatility)) : 'N/A'}
                      </p>
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded border border-slate-700 text-center">
                      <p className="text-xs text-slate-500">SPREAD</p>
                      <p className="text-sm font-semibold text-slate-200">
                        {price ? formatNumber(price.high - price.low) : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-800/50 p-2 rounded border border-slate-700 text-center">
                      <p className="text-xs text-slate-500">NET PROFIT*</p>
                      <p className={`text-sm font-semibold ${roi > 1 ? 'text-green-400' : 'text-slate-300'}`}>
                        {netProfit > 0 ? '+' : ''}{formatNumber(netProfit)}
                      </p>
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded border border-slate-700 text-center">
                      <p className="text-xs text-slate-500">ROI*</p>
                      <p className={`text-sm font-semibold ${roi > 1 ? 'text-green-400' : 'text-slate-300'}`}>
                        {roi > 0 ? '+' : ''}{roi.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-900/30 text-xs text-slate-500 text-center border-t border-slate-700">
                  * Based on current bid/ask (2% GE tax included)
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
