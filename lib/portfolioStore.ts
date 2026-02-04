import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './supabase';

export interface PortfolioItem {
  id: string;
  itemId: number;
  itemName: string;
  quantity: number;
  buyPrice: number;
  datePurchased: number;
  notes?: string;
  lots?: LotRecord[];
  sales?: SaleRecord[];
  synced?: boolean;
}

export interface LotRecord {
  id: string;
  quantity: number;
  buyPrice: number;
  datePurchased: number;
  notes?: string;
}

export interface SaleRecord {
  id: string;
  quantity: number;
  sellPrice: number;
  dateSold: number;
  notes?: string;
}

interface PortfolioStore {
  items: PortfolioItem[];
  addItem: (item: Omit<PortfolioItem, 'id'>) => Promise<void>;
  addSale: (itemId: string, sale: Omit<SaleRecord, 'id'>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateItem: (id: string, updates: Partial<PortfolioItem>) => Promise<void>;
  clearPortfolio: () => void;
  loadFromSupabase: () => Promise<void>;
}

export const usePortfolioStore = create<PortfolioStore>()(
  persist(
    (set) => ({
      items: [],
      
      addItem: async (item) => {
        const newLotId = `${Date.now()}-${Math.random()}`;
        let mergedItemId: string | null = null;
        let mergedQuantity: number | null = null;
        let mergedBuyPrice: number | null = null;

        set((state) => {
          const existingIndex = state.items.findIndex((i) => i.itemId === item.itemId);

          if (existingIndex === -1) {
            const newId = `${Date.now()}-${Math.random()}`;
            mergedItemId = newId;
            mergedQuantity = item.quantity;
            mergedBuyPrice = item.buyPrice;
            return {
              items: [
                ...state.items,
                {
                  ...item,
                  id: newId,
                  lots: [
                    {
                      id: newLotId,
                      quantity: item.quantity,
                      buyPrice: item.buyPrice,
                      datePurchased: item.datePurchased,
                      notes: item.notes,
                    },
                  ],
                  sales: item.sales ?? [],
                  synced: false,
                },
              ],
            };
          }

          const existing = state.items[existingIndex];
          const existingLots = existing.lots && existing.lots.length > 0
            ? existing.lots
            : [
                {
                  id: `${existing.id}-lot`,
                  quantity: existing.quantity,
                  buyPrice: existing.buyPrice,
                  datePurchased: existing.datePurchased,
                  notes: existing.notes,
                },
              ];

          const newQuantity = existing.quantity + item.quantity;
          const weightedBuyPrice = Math.round(
            (existing.buyPrice * existing.quantity + item.buyPrice * item.quantity) / newQuantity
          );

          const updated = {
            ...existing,
            quantity: newQuantity,
            buyPrice: weightedBuyPrice,
            lots: [
              ...existingLots,
              {
                id: newLotId,
                quantity: item.quantity,
                buyPrice: item.buyPrice,
                datePurchased: item.datePurchased,
                notes: item.notes,
              },
            ],
            synced: false,
          };

          mergedItemId = existing.id;
          mergedQuantity = updated.quantity;
          mergedBuyPrice = updated.buyPrice;

          return {
            items: state.items.map((i, idx) => (idx === existingIndex ? updated : i)),
          };
        });

        // Try to sync to Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          if (mergedItemId) {
            const itemRow = await supabase
              .from('portfolio_items')
              .select('id')
              .eq('local_id', mergedItemId)
              .single();

            if (itemRow.data?.id) {
              await supabase
                .from('portfolio_items')
                .update({
                  quantity: mergedQuantity ?? item.quantity,
                  buy_price: mergedBuyPrice ?? item.buyPrice,
                })
                .eq('id', itemRow.data.id);
            } else {
              const { error } = await supabase
                .from('portfolio_items')
                .insert({
                  user_id: session.user.id,
                  item_id: item.itemId,
                  item_name: item.itemName,
                  quantity: mergedQuantity ?? item.quantity,
                  buy_price: mergedBuyPrice ?? item.buyPrice,
                  date_purchased: new Date(item.datePurchased).toISOString(),
                  notes: item.notes,
                  local_id: mergedItemId,
                });

              if (!error) {
                set((state) => ({
                  items: state.items.map((i) =>
                    i.id === mergedItemId ? { ...i, synced: true } : i
                  ),
                }));
              }
            }
          }
        }
      },

      addSale: async (itemId, sale) => {
        const newSaleId = `${Date.now()}-${Math.random()}`;
        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  sales: [
                    ...(item.sales ?? []),
                    {
                      ...sale,
                      id: newSaleId,
                    },
                  ],
                  synced: false,
                }
              : item
          ),
        }));

        // Try to sync to Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const item = await supabase
            .from('portfolio_items')
            .select('id')
            .eq('local_id', itemId)
            .single();
          
          if (item.data?.id) {
            const { error } = await supabase
              .from('sales')
              .insert({
                portfolio_item_id: item.data.id,
                quantity: sale.quantity,
                sell_price: sale.sellPrice,
                date_sold: new Date(sale.dateSold).toISOString(),
                notes: sale.notes,
              });
            
            if (!error) {
              set((state) => ({
                items: state.items.map((i) =>
                  i.id === itemId ? { ...i, synced: true } : i
                ),
              }));
            }
          }
        }
      },

      removeItem: async (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));

        // Try to sync to Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const item = await supabase
            .from('portfolio_items')
            .select('id')
            .eq('local_id', id)
            .single();
          
          if (item.data?.id) {
            await supabase
              .from('portfolio_items')
              .delete()
              .eq('id', item.data.id);
          }
        }
      },

      updateItem: async (id, updates) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...updates, synced: false } : item
          ),
        }));

        // Try to sync to Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (session && updates.quantity !== undefined) {
          const item = await supabase
            .from('portfolio_items')
            .select('id')
            .eq('local_id', id)
            .single();
          
          if (item.data?.id) {
            const { error } = await supabase
              .from('portfolio_items')
              .update({ quantity: updates.quantity })
              .eq('id', item.data.id);
            
            if (!error) {
              set((state) => ({
                items: state.items.map((i) =>
                  i.id === id ? { ...i, synced: true } : i
                ),
              }));
            }
          }
        }
      },

      clearPortfolio: () => set({ items: [] }),

      loadFromSupabase: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: portfolioData } = await supabase
          .from('portfolio_items')
          .select(`
            id,
            local_id,
            item_id,
            item_name,
            quantity,
            buy_price,
            date_purchased,
            notes,
            sales (
              id,
              quantity,
              sell_price,
              date_sold,
              notes
            )
          `)
          .eq('user_id', session.user.id);

        if (portfolioData) {
          const items: PortfolioItem[] = portfolioData.map((item: any) => ({
            id: item.local_id || item.id,
            itemId: item.item_id,
            itemName: item.item_name,
            quantity: item.quantity,
            buyPrice: item.buy_price,
            datePurchased: new Date(item.date_purchased).getTime(),
            notes: item.notes,
            sales: (item.sales || []).map((sale: any) => ({
              id: sale.id,
              quantity: sale.quantity,
              sellPrice: sale.sell_price,
              dateSold: new Date(sale.date_sold).getTime(),
              notes: sale.notes,
            })),
            synced: true,
          }));

          set({ items });
        }
      },
    }),
    {
      name: 'osrs-portfolio-storage',
    }
  )
);
