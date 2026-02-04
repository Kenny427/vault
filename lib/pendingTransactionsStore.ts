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
  itemId?: number;
}

interface PendingTransactionsStore {
  transactions: PendingTransaction[];
  handledIds: string[];
  addTransaction: (
    tx: Omit<PendingTransaction, 'id' | 'timestamp'> &
      Partial<Pick<PendingTransaction, 'id' | 'timestamp'>>
  ) => void;
  removeTransaction: (id: string) => void;
  markHandled: (id: string) => void;
  clearAll: () => void;
  clearByType: (type: 'BUY' | 'SELL') => void;
}

export const usePendingTransactionsStore = create<PendingTransactionsStore>()(
  persist(
    (set) => ({
      transactions: [],
      handledIds: [],

      addTransaction: (tx) => {
        const id = tx.id || `${Date.now()}-${Math.random()}`;
        const timestamp = tx.timestamp || Date.now();
        set((state) => ({
          transactions: [
            {
              ...tx,
              id,
              timestamp,
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

      markHandled: (id) => {
        set((state) => ({
          handledIds: state.handledIds.includes(id)
            ? state.handledIds
            : [id, ...state.handledIds].slice(0, 1000),
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
