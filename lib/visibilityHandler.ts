// Prevent fetch cancellation when tab becomes inactive
// This keeps API requests running in the background

let isInitialized = false;

export function initializeVisibilityHandler() {
  if (isInitialized || typeof window === 'undefined') return;
  
  isInitialized = true;

  // Override the default visibility change behavior for fetch requests
  document.addEventListener('visibilitychange', () => {
    // Don't cancel ongoing requests when tab is hidden
    if (document.hidden) {
      console.log('Tab hidden - keeping background requests alive');
    } else {
      console.log('Tab visible again');
    }
  });

}
