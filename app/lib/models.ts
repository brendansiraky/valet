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
 * OpenAI GPT models.
 */
export const OPENAI_MODELS = [
  { id: "gpt-5.2-pro", name: "GPT-5.2 Pro", provider: "openai" },
  { id: "gpt-5.2", name: "GPT-5.2", provider: "openai" },
  { id: "gpt-4o", name: "GPT-4o", provider: "openai" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai" },
  { id: "o3-mini", name: "o3-mini (Reasoning)", provider: "openai" },
] as const;

/**
 * All available models across all providers.
 */
export const ALL_MODELS = [...ANTHROPIC_MODELS, ...OPENAI_MODELS] as const;

/**
 * Legacy export for backward compatibility.
 * @deprecated Use ANTHROPIC_MODELS or ALL_MODELS instead.
 */
export const AVAILABLE_MODELS = ANTHROPIC_MODELS;

export type ModelId = (typeof ALL_MODELS)[number]["id"];
