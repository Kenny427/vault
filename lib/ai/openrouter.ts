/**
 * OpenRouter API client wrapper
 * Provides unified interface for multiple AI models with consistent behavior
 * Replaces direct OpenAI API usage with OpenRouter routing
 */

export interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OpenRouterResponse {
  id: string;
  choices: Array<{
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export interface OpenRouterClientOptions {
  apiKey?: string;
  baseURL?: string;
}

/**
 * OpenRouter client - manages API calls to OpenRouter
 * Designed to be a drop-in replacement for OpenAI client
 */
class OpenRouterClient {
  private apiKey: string;
  private baseURL: string;

  constructor(options: OpenRouterClientOptions = {}) {
    // Fallback order: passed option → env variable → hardcoded (server-side only)
    this.apiKey = options.apiKey || process.env.OPENROUTER_API_KEY || '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';
    this.baseURL = options.baseURL || 'https://openrouter.io/api/v1';

    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }
  }

  /**
   * Create a chat completion using OpenRouter
   * Compatible with OpenAI SDK structure for easy migration
   */
  chat = {
    completions: {
      create: async (params: {
        model: string;
        messages: OpenRouterMessage[];
        temperature?: number;
        max_tokens?: number;
        top_p?: number;
        frequency_penalty?: number;
        presence_penalty?: number;
      }): Promise<{
        choices: Array<{
          message: {
            content: string | null;
          };
        }>;
        usage: {
          prompt_tokens: number;
          completion_tokens: number;
        };
      }> => {
        return this._makeRequest(params);
      },
    },
  };

  /**
   * Make HTTP request to OpenRouter API
   */
  private async _makeRequest(params: {
    model: string;
    messages: OpenRouterMessage[];
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
  }): Promise<any> {
    const payload = {
      model: params.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.max_tokens ?? 1500,
      ...(params.top_p !== undefined && { top_p: params.top_p }),
      ...(params.frequency_penalty !== undefined && { frequency_penalty: params.frequency_penalty }),
      ...(params.presence_penalty !== undefined && { presence_penalty: params.presence_penalty }),
    };

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://flipping.guide',
          'X-Title': 'OSRS Flipping Dashboard',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenRouter API error: ${error.error?.message || response.statusText}`);
      }

      const data: OpenRouterResponse = await response.json();

      return {
        choices: [
          {
            message: {
              content: data.choices[0]?.message?.content || null,
            },
          },
        ],
        usage: {
          prompt_tokens: data.usage?.prompt_tokens || 0,
          completion_tokens: data.usage?.completion_tokens || 0,
        },
      };
    } catch (error) {
      console.error('OpenRouter API request failed:', error);
      throw error;
    }
  }
}

// Lazy-loaded singleton instance
let clientInstance: OpenRouterClient | null = null;

export function getOpenRouterClient(options?: OpenRouterClientOptions): OpenRouterClient {
  if (!clientInstance) {
    clientInstance = new OpenRouterClient(options);
  }
  return clientInstance;
}

export default OpenRouterClient;
