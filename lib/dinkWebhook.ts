import { usePendingTransactionsStore } from './pendingTransactionsStore';
import { supabase } from './supabase';

// Singleton guard to prevent multiple initializations
let isInitialized = false;
let cleanupFunction: (() => void) | null = null;

/**
 * Initialize DINK webhook listener
 * This should be called once when the app loads
 * It listens for messages from DINK plugin and stores them
 */
export function initDinkWebhookListener() {
  if (typeof window === 'undefined') return () => {};
  
  // If already initialized, return existing cleanup function
  if (isInitialized && cleanupFunction) {
    return cleanupFunction;
  }

  isInitialized = true;

  // Listen for messages from DINK extension/plugin
  // DINK can send messages via window.postMessage
  const handleMessage = (event: MessageEvent) => {
    // Verify origin for security
    if (event.data?.source !== 'dink-plugin') return;

    const { username, type, itemName, status } = event.data;

    if (username && type && itemName && status) {
      const store = usePendingTransactionsStore.getState();
      store.addTransaction({
        username,
        type: type.toUpperCase() as 'BUY' | 'SELL',
        itemName,
        status,
      });

      // Notify user visually (optional)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New GE Transaction', {
          body: `${type.toUpperCase()} ${itemName}`,
          icon: '🔔',
        });
      }
    }
  };

  const pollServer = async () => {
    try {
      // Get current user's all RSN accounts from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      const { data: rsnAccounts } = await supabase
        .from('user_rsn_accounts')
        .select('rsn')
        .eq('user_id', session.user.id);

      const userRsns = new Set((rsnAccounts || []).map((item: any) => item.rsn.toLowerCase()));
      if (userRsns.size === 0) return;

      const response = await fetch('/api/webhooks/dink');
      if (!response.ok) return;
      const data = await response.json();

      const parsed = Array.isArray(data.parsedTransactions) ? data.parsedTransactions : [];
      if (parsed.length === 0) return;

      const store = usePendingTransactionsStore.getState();
      const existingIds = new Set(store.transactions.map((tx) => tx.id));
      const handledIds = new Set(store.handledIds);

      parsed.forEach((tx: any) => {
        // Only add transactions matching user's RSN accounts (case-insensitive)
        if (!userRsns.has(tx.username?.toLowerCase())) return;
        if (!tx?.id || existingIds.has(tx.id) || handledIds.has(tx.id)) return;
        if (tx.type !== 'BUY' && tx.type !== 'SELL') return;

        store.addTransaction({
          id: tx.id,
          username: tx.username || 'Unknown',
          type: tx.type,
          itemName: tx.itemName || 'Unknown',
          status: tx.status || 'UNKNOWN',
          timestamp: typeof tx.timestamp === 'number' ? tx.timestamp : Date.now(),
          quantity: tx.quantity,
          price: tx.price,
          itemId: tx.itemId,
        });
      });
    } catch {
      // Ignore polling errors
    }
  };

  const intervalId = window.setInterval(pollServer, 15000);
  pollServer();

  window.addEventListener('message', handleMessage);

  cleanupFunction = () => {
    isInitialized = false;
    cleanupFunction = null;
    window.removeEventListener('message', handleMessage);
    window.clearInterval(intervalId);
  };
  
  return cleanupFunction;
}
