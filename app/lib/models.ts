export const AVAILABLE_MODELS = [
  { id: "claude-opus-4-5-20251101", name: "Claude Opus 4.5" },
  { id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5" },
  { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" },
] as const;

export type ModelId = (typeof AVAILABLE_MODELS)[number]["id"];
