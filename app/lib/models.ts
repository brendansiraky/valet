/**
 * Model definitions organized by provider.
 */

/**
 * Anthropic Claude models.
 */
export const ANTHROPIC_MODELS = [
  { id: "claude-opus-4-5-20251101", name: "Claude Opus 4.5", provider: "anthropic" },
  { id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5", provider: "anthropic" },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", provider: "anthropic" },
] as const;

/**
 * All available models across all providers.
 * OpenAI models will be added in Phase 12.
 */
export const ALL_MODELS = [...ANTHROPIC_MODELS] as const;

/**
 * Legacy export for backward compatibility.
 * @deprecated Use ANTHROPIC_MODELS or ALL_MODELS instead.
 */
export const AVAILABLE_MODELS = ANTHROPIC_MODELS;

export type ModelId = (typeof ALL_MODELS)[number]["id"];
