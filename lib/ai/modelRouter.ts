/**
 * Model Router - Selects optimal AI model based on task type and complexity
 * Balances cost, speed, and capability for different use cases
 */

export type TaskType =
  | 'item-lookup' // Simple metadata/information retrieval
  | 'price-analysis' // Basic price analysis and trends
  | 'complex-analysis' // Complex pattern recognition and reasoning
  | 'recommendation' // Trading recommendations with nuanced reasoning
  | 'feedback-learning' // Learning from user feedback patterns
  | 'text-generation'; // General text generation

export interface ModelConfig {
  name: string;
  alias: string; // OpenRouter model ID
  costPer1kPrompt: number; // in USD
  costPer1kCompletion: number; // in USD
  speed: number; // 1 (slowest) to 5 (fastest)
  capability: number; // 1 (basic) to 5 (most capable)
  bestFor: TaskType[];
  maxTokens: number;
}

/**
 * Available models and their characteristics
 * Prices are approximate as of February 2026
 */
export const MODEL_CATALOG: Record<string, ModelConfig> = {
  'claude-3.5-haiku': {
    name: 'Claude 3.5 Haiku',
    alias: 'anthropic/claude-3.5-haiku',
    costPer1kPrompt: 0.08,
    costPer1kCompletion: 0.4,
    speed: 5,
    capability: 2,
    bestFor: ['item-lookup', 'price-analysis', 'text-generation'],
    maxTokens: 1024,
  },
  'gpt-4o-mini': {
    name: 'GPT-4o Mini',
    alias: 'openai/gpt-4o-mini',
    costPer1kPrompt: 0.15,
    costPer1kCompletion: 0.6,
    speed: 5,
    capability: 2,
    bestFor: ['item-lookup', 'price-analysis', 'text-generation'],
    maxTokens: 1024,
  },
  'claude-3.5-sonnet': {
    name: 'Claude 3.5 Sonnet',
    alias: 'anthropic/claude-3.5-sonnet',
    costPer1kPrompt: 3.0,
    costPer1kCompletion: 15.0,
    speed: 3,
    capability: 4,
    bestFor: ['complex-analysis', 'recommendation', 'feedback-learning'],
    maxTokens: 4096,
  },
  'gpt-4o': {
    name: 'GPT-4o',
    alias: 'openai/gpt-4o',
    costPer1kPrompt: 5.0,
    costPer1kCompletion: 15.0,
    speed: 3,
    capability: 5,
    bestFor: ['recommendation', 'feedback-learning', 'complex-analysis'],
    maxTokens: 4096,
  },
  'claude-3-opus': {
    name: 'Claude 3 Opus',
    alias: 'anthropic/claude-3-opus',
    costPer1kPrompt: 15.0,
    costPer1kCompletion: 75.0,
    speed: 2,
    capability: 5,
    bestFor: ['recommendation', 'feedback-learning'],
    maxTokens: 4096,
  },
};

export interface RoutingStrategy {
  preferSpeed: boolean;
  maxCostPerRequest: number; // in USD, 0 = no limit
  prioritizeCapability: boolean;
}

/**
 * Default routing strategies for different use cases
 */
export const ROUTING_STRATEGIES: Record<string, RoutingStrategy> = {
  'cost-optimized': {
    preferSpeed: true,
    maxCostPerRequest: 0.05,
    prioritizeCapability: false,
  },
  'balanced': {
    preferSpeed: false,
    maxCostPerRequest: 0.2,
    prioritizeCapability: false,
  },
  'quality-focused': {
    preferSpeed: false,
    maxCostPerRequest: 1.0,
    prioritizeCapability: true,
  },
};

/**
 * Select the best model for a given task
 * Considers both task requirements and current strategy
 */
export function selectModel(
  taskType: TaskType,
  strategy: RoutingStrategy = ROUTING_STRATEGIES['balanced']
): ModelConfig {
  // Get models suitable for this task type
  const suitableModels = Object.values(MODEL_CATALOG).filter(m => m.bestFor.includes(taskType));

  if (suitableModels.length === 0) {
    // Fallback to Claude 3.5 Sonnet for unknown tasks
    return MODEL_CATALOG['claude-3.5-sonnet'];
  }

  // Filter by cost if specified
  let candidates = suitableModels;
  if (strategy.maxCostPerRequest > 0) {
    candidates = candidates.filter(m => {
      const estimatedCost = (m.costPer1kPrompt + m.costPer1kCompletion) / 1000;
      return estimatedCost <= strategy.maxCostPerRequest;
    });
  }

  if (candidates.length === 0) {
    // If cost filter is too restrictive, use cheapest available
    return suitableModels.reduce((a, b) => 
      (a.costPer1kPrompt + a.costPer1kCompletion) < (b.costPer1kPrompt + b.costPer1kCompletion) ? a : b
    );
  }

  // Sort by preference
  if (strategy.prioritizeCapability) {
    candidates.sort((a, b) => b.capability - a.capability);
  } else if (strategy.preferSpeed) {
    candidates.sort((a, b) => b.speed - a.speed);
  } else {
    // Balanced: capability first, then speed
    candidates.sort((a, b) => {
      if (a.capability !== b.capability) return b.capability - a.capability;
      return b.speed - a.speed;
    });
  }

  return candidates[0];
}

/**
 * Calculate estimated cost for a request
 */
export function estimateCost(
  model: ModelConfig,
  promptTokens: number,
  completionTokens: number
): number {
  const promptCost = (promptTokens / 1000) * model.costPer1kPrompt;
  const completionCost = (completionTokens / 1000) * model.costPer1kCompletion;
  return promptCost + completionCost;
}

/**
 * Get model details by name or alias
 */
export function getModel(nameOrAlias: string): ModelConfig | undefined {
  // Check by name
  const byName = Object.values(MODEL_CATALOG).find(m => m.name === nameOrAlias);
  if (byName) return byName;

  // Check by alias
  const byAlias = Object.values(MODEL_CATALOG).find(m => m.alias === nameOrAlias);
  if (byAlias) return byAlias;

  // Check by key
  return MODEL_CATALOG[nameOrAlias];
}

/**
 * List all available models with their characteristics
 */
export function listModels(): ModelConfig[] {
  return Object.values(MODEL_CATALOG);
}
