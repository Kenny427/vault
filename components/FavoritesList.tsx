'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useDashboardStore } from '@/lib/store';
import { getItemPrice, resolveIconUrl, getItemDetails } from '@/lib/api/osrs';

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
            const currentPrice = price ? (price.high + price.low) / 2 : null;
            const iconUrl = resolveIconUrl(details?.icon);

            return (
              <div
                key={favorite.id}
                className="bg-slate-900 border border-slate-700 rounded-lg p-4 hover:border-osrs-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 bg-slate-800 border border-slate-700 rounded flex-shrink-0 flex items-center justify-center">
                      {iconUrl ? (
                        <img src={iconUrl} alt={favorite.name} className="w-8 h-8" />
                      ) : (
                        <span>🪙</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-100 truncate">{favorite.name}</h3>
                      <p className="text-xs text-slate-500">ID: {favorite.id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromFavorites(favorite.id)}
                    className="text-slate-500 hover:text-red-400 text-lg ml-2 flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>

                {currentPrice !== null ? (
                  <div className="space-y-2 mb-3">
                    <div>
                      <div className="text-xs text-slate-500">Mid Price</div>
                      <div className="text-lg font-bold text-osrs-accent">
                        {Math.floor(currentPrice).toLocaleString()}gp
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-xs text-slate-500">High</div>
                        <div className="text-sm font-semibold text-slate-200">
                          {Math.floor(price.high).toLocaleString()}gp
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Low</div>
                        <div className="text-sm font-semibold text-slate-200">
                          {Math.floor(price.low).toLocaleString()}gp
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                      <div>
                        <div className="text-xs text-slate-500">Spread</div>
                        <div className="text-sm font-semibold text-blue-400">
                          {Math.floor(price.high - price.low).toLocaleString()}gp
                        </div>
                      </div>
                      {details?.members !== undefined && (
                        <div className={`text-xs px-2 py-1 rounded ${details.members ? 'bg-purple-900 text-purple-300' : 'bg-green-900 text-green-300'}`}>
                          {details.members ? 'Members' : 'Free'}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 mb-3">Loading price...</div>
                )}

                <button
                  onClick={() => router.push(`/item/${favorite.id}`)}
                  className="w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-sm font-medium transition-colors"
                >
                  View Details
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
