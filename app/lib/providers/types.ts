/**
 * Provider abstraction types for multi-provider AI support.
 *
 * These types define a common interface for interacting with different
 * AI providers (Anthropic, OpenAI, etc.) without coupling to specific SDKs.
 */

/**
 * Message format for chat interactions.
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Options for chat completion requests.
 */
export interface ChatOptions {
  model: string;
  maxTokens?: number;
  tools?: ToolConfig[];
}

/**
 * Result from a chat completion.
 */
export interface ChatResult {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  citations?: Array<{ url: string; title?: string }>;
}

/**
 * Tool configuration for provider capabilities.
 * Each provider translates these to their specific tool formats.
 */
export interface ToolConfig {
  type: "web_search" | "web_fetch";
  maxUses?: number;
}

/**
 * Model information returned by providers.
 */
export interface ProviderModel {
  id: string;
  name: string;
  provider: string;
}

/**
 * Provider interface that all AI providers must implement.
 */
export interface AIProvider {
  /** Provider identifier (e.g., 'anthropic', 'openai') */
  readonly id: string;

  /**
   * Execute a chat completion with optional tools.
   */
  chat(messages: ChatMessage[], options: ChatOptions): Promise<ChatResult>;

  /**
   * Validate that an API key works for this provider.
   */
  validateKey(apiKey: string): Promise<boolean>;

  /**
   * Get available models for this provider.
   */
  getModels(): ProviderModel[];
}
