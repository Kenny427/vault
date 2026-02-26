// Simple in-memory rate limiter
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private limit: number;
  private window: number;

  constructor(limit: number = 10, windowMs: number = 60000) {
    this.limit = limit;
    this.window = windowMs;
  }

  check(key: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];
    
    // Remove requests outside the window
    const validRequests = userRequests.filter(time => now - time < this.window);
    
    if (validRequests.length >= this.limit) {
      const oldestRequest = validRequests[0];
      const retryAfter = Math.ceil((oldestRequest + this.window - now) / 1000);
      return { allowed: false, retryAfter };
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return { allowed: true };
  }

  reset(key: string) {
    this.requests.delete(key);
  }
}

// Export rate limiters for different endpoints
export const analyzeFlipsLimiter = new RateLimiter(5, 60000); // 5 per minute
export const analyzeItemLimiter = new RateLimiter(20, 60000); // 20 per minute
export const bulkAnalyzeLimiter = new RateLimiter(3, 60000); // 3 per minute
