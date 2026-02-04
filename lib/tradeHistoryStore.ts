import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CompletedTrade {
  id: string;
  itemId: number;
  itemName: string;
  quantityBought: number;
  buyPrice: number;
  buyDate: number;
  quantitySold: number;
  sellPrice: number;
  sellDate: number;
  profit: number;
  roi: number;
  holdDays: number;
  notes?: string;
}

interface TradeHistoryState {
  trades: CompletedTrade[];
  addTrade: (trade: Omit<CompletedTrade, 'id'>) => void;
  removeTrade: (id: string) => void;
  updateTrade: (id: string, updates: Partial<CompletedTrade>) => void;
  getTotalProfit: () => number;
  getSuccessRate: () => number;
  getBestTrade: () => CompletedTrade | null;
  getWorstTrade: () => CompletedTrade | null;
}

export const useTradeHistoryStore = create<TradeHistoryState>()(
  persist(
    (set, get) => ({
      trades: [],
      
      addTrade: (trade) => {
        const newTrade: CompletedTrade = {
          ...trade,
          id: Date.now().toString(),
        };
        set((state) => ({ trades: [newTrade, ...state.trades] }));
      },
      
      removeTrade: (id) => {
        set((state) => ({ trades: state.trades.filter(t => t.id !== id) }));
      },
      
      updateTrade: (id, updates) => {
        set((state) => ({
          trades: state.trades.map(t => t.id === id ? { ...t, ...updates } : t)
        }));
      },
      
      getTotalProfit: () => {
        return get().trades.reduce((sum, trade) => sum + trade.profit, 0);
      },
      
      getSuccessRate: () => {
        const trades = get().trades;
        if (trades.length === 0) return 0;
        const profitable = trades.filter(t => t.profit > 0).length;
        return (profitable / trades.length) * 100;
      },
      
      getBestTrade: () => {
        const trades = get().trades;
        if (trades.length === 0) return null;
        return trades.reduce((best, trade) => 
          trade.profit > best.profit ? trade : best
        );
      },
      
      getWorstTrade: () => {
        const trades = get().trades;
        if (trades.length === 0) return null;
        return trades.reduce((worst, trade) => 
          trade.profit < worst.profit ? trade : worst
        );
      },
    }),
    {
      name: 'trade-history-storage',
    }
  )
);
