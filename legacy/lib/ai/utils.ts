/**
 * AI Utilities - Helper functions for AI integration
 */

/**
 * Generate a unique request ID for tracking
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Extract JSON from AI response (handles markdown code blocks and extra whitespace)
 */
export function extractJSON<T = any>(text: string): T | null {
  try {
    // Try to find JSON in the response
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('No JSON found in response');
      return null;
    }

    return JSON.parse(jsonMatch[0]) as T;
  } catch (error) {
    console.error('Failed to parse JSON from response:', error);
    return null;
  }
}

/**
 * Format tokens for display
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  } else if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

/**
 * Estimate token count (rough approximation: ~4 chars per token)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Truncate text for token limits
 */
export function truncateForTokens(text: string, maxTokens: number): string {
  const estimatedTokens = estimateTokens(text);
  if (estimatedTokens <= maxTokens) {
    return text;
  }

  const charLimit = Math.floor((maxTokens / estimatedTokens) * text.length * 0.95);
  return text.substring(0, charLimit).trim();
}

/**
 * Build system prompt with instructions
 */
export function buildSystemPrompt(role: string, constraints: string[] = []): string {
  let prompt = `You are a ${role}.`;

  if (constraints.length > 0) {
    prompt += ` Follow these constraints:\n`;
    constraints.forEach((constraint, i) => {
      prompt += `${i + 1}. ${constraint}\n`;
    });
  }

  return prompt;
}

/**
 * Create a rate limiter for API calls (in-memory)
 */
export class SimpleRateLimiter {
  private calls: number[] = [];
  private maxCalls: number;
  private windowMs: number;

  constructor(maxCalls: number = 10, windowMs: number = 60000) {
    this.maxCalls = maxCalls;
    this.windowMs = windowMs;
  }

  /**
   * Check if a call is allowed
   */
  isAllowed(): boolean {
    const now = Date.now();
    this.calls = this.calls.filter(time => now - time < this.windowMs);

    if (this.calls.length < this.maxCalls) {
      this.calls.push(now);
      return true;
    }

    return false;
  }

  /**
   * Get remaining calls in current window
   */
  getRemaining(): number {
    const now = Date.now();
    this.calls = this.calls.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxCalls - this.calls.length);
  }

  /**
   * Get time until next call is allowed (ms)
   */
  getWaitTime(): number {
    if (this.calls.length < this.maxCalls) {
      return 0;
    }

    const oldestCall = Math.min(...this.calls);
    return Math.max(0, oldestCall + this.windowMs - Date.now());
  }
}
