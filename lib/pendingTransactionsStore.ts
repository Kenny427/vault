import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PendingTransaction {
  id: string;
  username: string;
  type: 'BUY' | 'SELL';
  itemName: string;
  status: string;
  timestamp: number;
  quantity?: number;
  price?: number;
}

interface PendingTransactionsStore {
  transactions: PendingTransaction[];
  addTransaction: (tx: Omit<PendingTransaction, 'id' | 'timestamp'>) => void;
  removeTransaction: (id: string) => void;
  clearAll: () => void;
  clearByType: (type: 'BUY' | 'SELL') => void;
}

export const usePendingTransactionsStore = create<PendingTransactionsStore>()(
  persist(
    (set) => ({
      transactions: [],

      addTransaction: (tx) => {
        const id = `${Date.now()}-${Math.random()}`;
        set((state) => ({
          transactions: [
            {
              ...tx,
              id,
              timestamp: Date.now(),
            },
            ...state.transactions,
          ],
        }));
      },

      removeTransaction: (id) => {
        set((state) => ({
          transactions: state.transactions.filter((tx) => tx.id !== id),
        }));
      },

      clearAll: () => {
        set({ transactions: [] });
      },

      clearByType: (type) => {
        set((state) => ({
          transactions: state.transactions.filter((tx) => tx.type !== type),
        }));
      },
    }),
    {
      name: 'osrs-pending-transactions-storage',
    }
  )
);
