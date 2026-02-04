import { usePendingTransactionsStore } from './pendingTransactionsStore';

/**
 * Initialize DINK webhook listener
 * This should be called once when the app loads
 * It listens for messages from DINK plugin and stores them
 */
export function initDinkWebhookListener() {
  if (typeof window === 'undefined') return;

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

  window.addEventListener('message', handleMessage);

  return () => {
    window.removeEventListener('message', handleMessage);
  };
}
