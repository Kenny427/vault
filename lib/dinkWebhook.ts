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
      // Get current user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      // Query pending_transactions directly from Supabase (RLS handles filtering)
      const { data: transactions } = await supabase
        .from('pending_transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!transactions || transactions.length === 0) return;

      const store = usePendingTransactionsStore.getState();
      const existingIds = new Set(store.transactions.map((tx) => tx.id));
      const handledIds = new Set(store.handledIds);

      const newTransactions = transactions
        .map((tx: any) => {
          const txId = tx.dink_webhook_id || `db-${tx.id}`;
          if (existingIds.has(txId) || handledIds.has(txId)) return null;
          
          const type = tx.type.toUpperCase() as 'BUY' | 'SELL';
          if (type !== 'BUY' && type !== 'SELL') return null;

          return {
            id: txId,
            username: 'Player', // Username not stored in pending_transactions
            type: type,
            itemName: tx.item_name || 'Unknown',
            status: 'PENDING',
            timestamp: new Date(tx.created_at).getTime(),
            quantity: tx.quantity,
            price: tx.price,
            itemId: tx.item_id,
            synced: true, // Already in Supabase
          };
        })
        .filter((tx: any): tx is NonNullable<typeof tx> => tx !== null);

      if (newTransactions.length > 0) {
        // Update state directly without triggering Supabase insert
        usePendingTransactionsStore.setState((state) => ({
          transactions: [...newTransactions, ...state.transactions],
        }));
      }
    } catch {
      // Ignore polling errors
    }
  };

  const intervalId = window.setInterval(pollServer, 5000);
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
