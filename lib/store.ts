import { create } from 'zustand';
import { FlipOpportunity } from './analysis';

export interface WatchlistItem {
  id: number;
  name: string;
  addedAt: number;
  notes?: string;
}

export interface FavoriteItem {
  id: number;
  name: string;
  addedAt: number;
}

interface DashboardStore {
  // Watchlist
  watchlist: WatchlistItem[];
  addToWatchlist: (item: WatchlistItem) => void;
  removeFromWatchlist: (itemId: number) => void;
  updateWatchlistNote: (itemId: number, note: string) => void;

  // Favorites
  favorites: FavoriteItem[];
  addToFavorites: (item: FavoriteItem) => void;
  removeFromFavorites: (itemId: number) => void;

  // Filters and settings
  minOpportunityScore: number;
  setMinOpportunityScore: (score: number) => void;
  
  showBuyOpportunities: boolean;
  setShowBuyOpportunities: (show: boolean) => void;
  
  showSellOpportunities: boolean;
  setShowSellOpportunities: (show: boolean) => void;

  // View preferences
  selectedTimeframe: '7d' | '30d' | '90d' | '1y';
  setSelectedTimeframe: (timeframe: '7d' | '30d' | '90d' | '1y') => void;

  // Search and filter
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Cached opportunities
  cachedOpportunities: FlipOpportunity[];
  setCachedOpportunities: (opps: FlipOpportunity[]) => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  // Watchlist
  watchlist: (() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('osrs-watchlist');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  })(),

  addToWatchlist: (item) =>
    set((state) => {
      const updated = [...state.watchlist, item];
      localStorage.setItem('osrs-watchlist', JSON.stringify(updated));
      return { watchlist: updated };
    }),

  removeFromWatchlist: (itemId) =>
    set((state) => {
      const updated = state.watchlist.filter(item => item.id !== itemId);
      localStorage.setItem('osrs-watchlist', JSON.stringify(updated));
      return { watchlist: updated };
    }),

  updateWatchlistNote: (itemId, note) =>
    set((state) => {
      const updated = state.watchlist.map(item =>
        item.id === itemId ? { ...item, notes: note } : item
      );
      localStorage.setItem('osrs-watchlist', JSON.stringify(updated));
      return { watchlist: updated };
    }),

  // Favorites
  favorites: (() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('osrs-favorites');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  })(),

  addToFavorites: (item) =>
    set((state) => {
      if (state.favorites.some(fav => fav.id === item.id)) {
        return state;
      }
      const updated = [...state.favorites, item];
      localStorage.setItem('osrs-favorites', JSON.stringify(updated));
      return { favorites: updated };
    }),

  removeFromFavorites: (itemId) =>
    set((state) => {
      const updated = state.favorites.filter(item => item.id !== itemId);
      localStorage.setItem('osrs-favorites', JSON.stringify(updated));
      return { favorites: updated };
    }),

  // Filters and settings
  minOpportunityScore: 40,
  setMinOpportunityScore: (score) => set({ minOpportunityScore: score }),

  showBuyOpportunities: true,
  setShowBuyOpportunities: (show) => set({ showBuyOpportunities: show }),

  showSellOpportunities: true,
  setShowSellOpportunities: (show) => set({ showSellOpportunities: show }),

  // View preferences
  selectedTimeframe: '30d',
  setSelectedTimeframe: (timeframe) => set({ selectedTimeframe: timeframe }),

  // Search and filter
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Cached opportunities
  cachedOpportunities: [],
  setCachedOpportunities: (opps) => set({ cachedOpportunities: opps }),
}));
