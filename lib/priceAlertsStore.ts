import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './supabase';

export interface PriceAlert {
  id: string;
  itemId: number;
  itemName: string;
  targetPrice: number;
  condition: 'above' | 'below';
  createdAt: number;
  triggered: boolean;
  notified: boolean;
  synced?: boolean;
}

interface PriceAlertsState {
  alerts: PriceAlert[];
  addAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'triggered' | 'notified'>) => Promise<void>;
  removeAlert: (id: string) => Promise<void>;
  markTriggered: (id: string) => void;
  markNotified: (id: string) => void;
  checkAlerts: (itemId: number, currentPrice: number) => PriceAlert[];
  loadFromSupabase: () => Promise<void>;
}

export const usePriceAlertsStore = create<PriceAlertsState>()(
  persist(
    (set, get) => ({
      alerts: [],
      
      addAlert: async (alert) => {
        const newAlert: PriceAlert = {
          ...alert,
          id: Date.now().toString(),
          createdAt: Date.now(),
          triggered: false,
          notified: false,
          synced: false,
        };
        set((state) => ({ alerts: [...state.alerts, newAlert] }));

        // Try to sync to Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { error } = await supabase
            .from('price_alerts')
            .insert({
              user_id: session.user.id,
              item_id: alert.itemId,
              item_name: alert.itemName,
              alert_type: alert.condition,
              alert_price: alert.targetPrice,
              is_active: true,
            });

          if (!error) {
            set((state) => ({
              alerts: state.alerts.map(a =>
                a.id === newAlert.id ? { ...a, synced: true } : a
              )
            }));
          }
        }
      },
      
      removeAlert: async (id) => {
        set((state) => ({ alerts: state.alerts.filter(a => a.id !== id) }));

        // Try to sync to Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Find the alert to get item_id
          const alert = get().alerts.find(a => a.id === id);
          if (alert) {
            await supabase
              .from('price_alerts')
              .delete()
              .eq('user_id', session.user.id)
              .eq('item_id', alert.itemId);
          }
        }
      },
      
      markTriggered: (id) => {
        set((state) => ({
          alerts: state.alerts.map(a => a.id === id ? { ...a, triggered: true } : a)
        }));
      },
      
      markNotified: (id) => {
        set((state) => ({
          alerts: state.alerts.map(a => a.id === id ? { ...a, notified: true } : a)
        }));
      },
      
      checkAlerts: (itemId, currentPrice) => {
        const alerts = get().alerts.filter(a => a.itemId === itemId && !a.triggered);
        const triggered: PriceAlert[] = [];
        
        alerts.forEach(alert => {
          const shouldTrigger = 
            (alert.condition === 'below' && currentPrice <= alert.targetPrice) ||
            (alert.condition === 'above' && currentPrice >= alert.targetPrice);
          
          if (shouldTrigger) {
            get().markTriggered(alert.id);
            triggered.push(alert);
            
            // Show browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`Price Alert: ${alert.itemName}`, {
                body: `${alert.itemName} is now ${currentPrice}gp (target: ${alert.condition} ${alert.targetPrice}gp)`,
                icon: '/favicon.svg',
              });
              get().markNotified(alert.id);
            }
          }
        });
        
        return triggered;
      },

      loadFromSupabase: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: alertsData } = await supabase
          .from('price_alerts')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('is_active', true);

        if (alertsData) {
          const alerts: PriceAlert[] = alertsData.map((alert: any) => ({
            id: alert.id,
            itemId: alert.item_id,
            itemName: alert.item_name,
            targetPrice: alert.alert_price,
            condition: alert.alert_type as 'above' | 'below',
            createdAt: new Date(alert.created_at).getTime(),
            triggered: false,
            notified: false,
            synced: true,
          }));

          set({ alerts });
        }
      },
    }),
    {
      name: 'osrs-price-alerts',
    }
  )
);
      },
    }),
    {
      name: 'price-alerts-storage',
    }
  )
);
