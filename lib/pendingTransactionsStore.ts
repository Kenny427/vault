import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './supabase';

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
  synced?: boolean;
}

interface PendingTransactionsStore {
  transactions: PendingTransaction[];
  handledIds: string[];
  addTransaction: (
    tx: Omit<PendingTransaction, 'id' | 'timestamp'> &
      Partial<Pick<PendingTransaction, 'id' | 'timestamp'>>
  ) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  markHandled: (id: string) => void;
  clearAll: () => void;
  clearByType: (type: 'BUY' | 'SELL') => void;
  loadFromSupabase: () => Promise<void>;
}

export const usePendingTransactionsStore = create<PendingTransactionsStore>()(
  persist(
    (set) => ({
      transactions: [],
      handledIds: [],

      addTransaction: async (tx) => {
        const id = tx.id || `${Date.now()}-${Math.random()}`;
        const timestamp = tx.timestamp || Date.now();
        set((state) => ({
          transactions: [
            {
              ...tx,
              id,
              timestamp,
              synced: false,
            },
            ...state.transactions,
          ],
        }));

        // Try to sync to Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { error } = await supabase
            .from('pending_transactions')
            .insert({
              user_id: session.user.id,
              item_id: tx.itemId || 0,
              item_name: tx.itemName,
              quantity: tx.quantity || 0,
              price: tx.price || 0,
              type: tx.type.toLowerCase(),
              dink_webhook_id: id,
            });

          if (!error) {
            set((state) => ({
              transactions: state.transactions.map(t =>
                t.id === id ? { ...t, synced: true } : t
              )
            }));
          }
        }
      },

      removeTransaction: async (id) => {
        set((state) => ({
          transactions: state.transactions.filter((tx) => tx.id !== id),
        }));

        // Try to sync to Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase
            .from('pending_transactions')
            .delete()
            .eq('user_id', session.user.id)
            .eq('dink_webhook_id', id);
        }
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

      loadFromSupabase: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: txData } = await supabase
          .from('pending_transactions')
          .select('*')
          .eq('user_id', session.user.id);

        if (txData) {
          const transactions: PendingTransaction[] = txData.map((tx: any) => ({
            id: tx.dink_webhook_id,
            username: 'unknown',
            type: tx.type === 'buy' ? 'BUY' : 'SELL',
            itemName: tx.item_name,
            status: 'pending',
            timestamp: new Date(tx.created_at).getTime(),
            quantity: tx.quantity,
            price: tx.price,
            itemId: tx.item_id,
            synced: true,
          }));

          set({ transactions });
        }
      },
    }),
    {
      name: 'osrs-pending-transactions-storage',
    }
  )
);

