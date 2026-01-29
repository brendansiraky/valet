/**
 * Provider registry for managing AI provider factories.
 *
 * Uses factory pattern because providers need API keys at construction time.
 * Factories are registered at module load, instances created on demand.
 */

import type { AIProvider } from "./types";

/**
 * Factory function that creates a provider instance with an API key.
 */
export type ProviderFactory = (apiKey: string) => AIProvider;

/**
 * Registry of provider factories by provider ID.
 */
const providerFactories = new Map<string, ProviderFactory>();

/**
 * Register a provider factory.
 * Called by provider modules at import time for self-registration.
 */
export function registerProviderFactory(
  providerId: string,
  factory: ProviderFactory
): void {
  providerFactories.set(providerId, factory);
}

/**
 * Create a provider instance with the given API key.
 * @throws Error if provider ID is not registered
 */
export function getProvider(providerId: string, apiKey: string): AIProvider {
  const factory = providerFactories.get(providerId);
  if (!factory) {
    throw new Error(`Unknown provider: ${providerId}`);
  }
  return factory(apiKey);
}

/**
 * Get the provider ID for a given model ID.
 * Model IDs encode their provider (e.g., claude-* for Anthropic).
 * @throws Error if model provider cannot be determined
 */
export function getProviderForModel(modelId: string): string {
  // Claude models -> anthropic
  if (modelId.startsWith("claude-")) {
    return "anthropic";
  }
  // OpenAI models (gpt-*, o3-*, o4-*)
  if (modelId.startsWith("gpt-") || modelId.startsWith("o3-") || modelId.startsWith("o4-")) {
    return "openai";
  }
  throw new Error(`Unknown model provider: ${modelId}`);
}

/**
 * Get all registered provider IDs.
 */
export function getAllProviderIds(): string[] {
  return Array.from(providerFactories.keys());
}
