import { create } from 'zustand';
import { FlipOpportunity } from './analysis';
import { supabase } from './supabase';

export interface FavoriteItem {
  id: number;
  name: string;
  addedAt: number;
  synced?: boolean;
}

interface DashboardStore {
  // Favorites
  favorites: FavoriteItem[];
  addToFavorites: (item: FavoriteItem) => Promise<void>;
  removeFromFavorites: (itemId: number) => Promise<void>;
  loadFavoritesFromSupabase: () => Promise<void>;

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
  // Favorites
  favorites: (() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('osrs-favorites');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  })(),

  addToFavorites: async (item) => {
    set((state) => {
      if (state.favorites.some(fav => fav.id === item.id)) {
        return state;
      }
      const updated = [...state.favorites, item];
      localStorage.setItem('osrs-favorites', JSON.stringify(updated));
      return { favorites: updated };
    });

    // Try to sync to Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase
        .from('favorites')
        .insert({
          user_id: session.user.id,
          item_id: item.id,
          item_name: item.name,
        });
    }
  },

  removeFromFavorites: async (itemId) => {
    set((state) => {
      const updated = state.favorites.filter(item => item.id !== itemId);
      localStorage.setItem('osrs-favorites', JSON.stringify(updated));
      return { favorites: updated };
    });

    // Try to sync to Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', session.user.id)
        .eq('item_id', itemId);
    }
  },

  loadFavoritesFromSupabase: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from('favorites')
      .select('id, item_id, item_name, created_at')
      .eq('user_id', session.user.id);

    if (data) {
      const favorites: FavoriteItem[] = data.map((item: any) => ({
        id: item.item_id,
        name: item.item_name,
        addedAt: new Date(item.created_at).getTime(),
        synced: true,
      }));

      set({ favorites });
      localStorage.setItem('osrs-favorites', JSON.stringify(favorites));
    }
  },

  // Filters and settings
  minOpportunityScore: 20,
  setMinOpportunityScore: (score) => set({ minOpportunityScore: score }),

  showBuyOpportunities: true,
  setShowBuyOpportunities: (show) => set({ showBuyOpportunities: show }),

  showSellOpportunities: false,
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
