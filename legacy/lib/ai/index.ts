/**
 * AI Integration Helper - Unified interface for making AI requests
 * Handles client creation, model routing, and cost tracking
 */

import { getOpenRouterClient } from './openrouter';
import { selectModel, TaskType, ROUTING_STRATEGIES, RoutingStrategy, estimateCost } from './modelRouter';
import { getCostTracker } from './costs';
import { generateRequestId } from './utils';

// Re-export commonly used types and utilities
export type { TaskType, RoutingStrategy };
export { ROUTING_STRATEGIES, selectModel };
export { getCostTracker };
export { generateRequestId };

export interface AIRequestOptions {
  taskType: TaskType;
  temperature?: number;
  maxTokens?: number;
  strategy?: RoutingStrategy;
  userId?: string;
}

export interface AIResponse {
  content: string;
  model: string;
  tokens: {
    prompt: number;
    completion: number;
  };
  cost: number;
  requestId: string;
}

/**
 * Make an AI request with automatic model selection and cost tracking
 */
export async function makeAIRequest(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  options: AIRequestOptions
): Promise<AIResponse> {
  const requestId = generateRequestId();

  try {
    // Select model based on task type
    const strategy = options.strategy || ROUTING_STRATEGIES['balanced'];
    const model = selectModel(options.taskType, strategy);

    console.log(`[${requestId}] Using model: ${model.name} for task: ${options.taskType}`);

    // Get OpenRouter client
    const client = getOpenRouterClient();

    // Make request
    const response = await client.chat.completions.create({
      model: model.alias,
      messages,
      temperature: options.temperature ?? 0,
      max_tokens: options.maxTokens ?? model.maxTokens,
    });

    const content = response.choices[0]?.message?.content || '';
    const promptTokens = response.usage?.prompt_tokens || 0;
    const completionTokens = response.usage?.completion_tokens || 0;

    // Calculate cost
    const cost = estimateCost(model, promptTokens, completionTokens);

    // Track cost
    const tracker = getCostTracker();
    tracker.recordCall(model.name, options.taskType, promptTokens, completionTokens, cost, requestId, options.userId);

    console.log(
      `[${requestId}] Completed: ${promptTokens} → ${completionTokens} tokens, cost: $${cost.toFixed(4)}`
    );

    return {
      content,
      model: model.name,
      tokens: {
        prompt: promptTokens,
        completion: completionTokens,
      },
      cost,
      requestId,
    };
  } catch (error) {
    console.error(`[${requestId}] AI request failed:`, error);
    throw error;
  }
}

/**
 * Helper to quickly make a simple request without complex options
 */
export async function queryAI(prompt: string, taskType: TaskType = 'text-generation'): Promise<string> {
  const response = await makeAIRequest([{ role: 'user', content: prompt }], {
    taskType,
  });
  return response.content;
}

/**
 * Make a request with a specific model (bypasses routing)
 */
export async function makeAIRequestWithModel(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  modelName: string,
  taskType: TaskType,
  options?: {
    temperature?: number;
    maxTokens?: number;
    userId?: string;
  }
): Promise<AIResponse> {
  const requestId = generateRequestId();

  try {
    const client = getOpenRouterClient();

    const response = await client.chat.completions.create({
      model: modelName,
      messages,
      temperature: options?.temperature ?? 0,
      max_tokens: options?.maxTokens ?? 1500,
    });

    const content = response.choices[0]?.message?.content || '';
    const promptTokens = response.usage?.prompt_tokens || 0;
    const completionTokens = response.usage?.completion_tokens || 0;

    // For cost tracking (cost estimation only, model not in catalog)
    const estimatedCost = (promptTokens * 0.001) + (completionTokens * 0.002);

    const tracker = getCostTracker();
    tracker.recordCall(modelName, taskType, promptTokens, completionTokens, estimatedCost, requestId, options?.userId);

    return {
      content,
      model: modelName,
      tokens: {
        prompt: promptTokens,
        completion: completionTokens,
      },
      cost: estimatedCost,
      requestId,
    };
  } catch (error) {
    console.error(`[${requestId}] AI request failed:`, error);
    throw error;
  }
}

export default makeAIRequest;
