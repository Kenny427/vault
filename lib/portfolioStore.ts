import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PortfolioItem {
  id: string;
  itemId: number;
  itemName: string;
  quantity: number;
  buyPrice: number;
  datePurchased: number;
  notes?: string;
  sales?: SaleRecord[];
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
  addItem: (item: Omit<PortfolioItem, 'id'>) => void;
  addSale: (itemId: string, sale: Omit<SaleRecord, 'id'>) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<PortfolioItem>) => void;
  clearPortfolio: () => void;
}

export const usePortfolioStore = create<PortfolioStore>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => ({
          items: [
            ...state.items,
            {
              ...item,
              id: `${Date.now()}-${Math.random()}`,
              sales: item.sales ?? [],
            },
          ],
        })),
      addSale: (itemId, sale) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  sales: [
                    ...(item.sales ?? []),
                    {
                      ...sale,
                      id: `${Date.now()}-${Math.random()}`,
                    },
                  ],
                }
              : item
          ),
        })),
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),
      updateItem: (id, updates) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        })),
      clearPortfolio: () => set({ items: [] }),
    }),
    {
      name: 'osrs-portfolio-storage',
    }
  )
);
