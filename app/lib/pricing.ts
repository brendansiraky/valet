/**
 * Model pricing utilities for cost calculation and display.
 *
 * Pricing source: Anthropic API pricing
 * Last verified: 2026-01-29
 */

/**
 * Pricing per million tokens for each model.
 */
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // Anthropic models
  "claude-opus-4-5-20251101": { input: 5, output: 25 },
  "claude-sonnet-4-5-20250929": { input: 3, output: 15 },
  "claude-haiku-4-5-20251001": { input: 1, output: 5 },
  // OpenAI models
  "gpt-5.2-pro": { input: 10, output: 30 },
  "gpt-5.2": { input: 1.75, output: 14 },
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  // OpenAI reasoning models
  "o3-mini": { input: 1.1, output: 4.4 },
};

/**
 * Calculate cost in USD for token usage.
 * Falls back to Sonnet pricing if model is unknown.
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model] ?? MODEL_PRICING["claude-sonnet-4-5-20250929"];

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;

  return inputCost + outputCost;
}

/**
 * Format cost for display.
 * Returns "<$0.01" for very small costs, otherwise "$X.XX".
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return "<$0.01";
  }
  return `$${cost.toFixed(2)}`;
}

/**
 * Format token count for display.
 * Returns "X.XM" for millions, "X.XK" for thousands, raw number for <1000.
 */
export function formatTokens(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`;
  }
  return count.toString();
}

/**
 * Format pricing for model selection display.
 * Returns "$X.XX/M" format for price per million tokens.
 */
export function formatModelPrice(modelId: string): string | null {
  const pricing = MODEL_PRICING[modelId];
  if (!pricing) return null;

  // Show input price as the primary indicator (most relevant for users)
  return `$${pricing.input}/M`;
}
