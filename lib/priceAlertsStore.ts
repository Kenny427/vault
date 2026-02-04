import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PriceAlert {
  id: string;
  itemId: number;
  itemName: string;
  targetPrice: number;
  condition: 'above' | 'below';
  createdAt: number;
  triggered: boolean;
  notified: boolean;
}

interface PriceAlertsState {
  alerts: PriceAlert[];
  addAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'triggered' | 'notified'>) => void;
  removeAlert: (id: string) => void;
  markTriggered: (id: string) => void;
  markNotified: (id: string) => void;
  checkAlerts: (itemId: number, currentPrice: number) => PriceAlert[];
}

export const usePriceAlertsStore = create<PriceAlertsState>()(
  persist(
    (set, get) => ({
      alerts: [],
      
      addAlert: (alert) => {
        const newAlert: PriceAlert = {
          ...alert,
          id: Date.now().toString(),
          createdAt: Date.now(),
          triggered: false,
          notified: false,
        };
        set((state) => ({ alerts: [...state.alerts, newAlert] }));
      },
      
      removeAlert: (id) => {
        set((state) => ({ alerts: state.alerts.filter(a => a.id !== id) }));
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
    }),
    {
      name: 'price-alerts-storage',
    }
  )
);
