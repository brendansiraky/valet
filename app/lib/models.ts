export const AVAILABLE_MODELS = [
  { id: "claude-opus-4-5-20251101", name: "Claude Opus 4.5" },
  { id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5" },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5" },
] as const;

export type ModelId = (typeof AVAILABLE_MODELS)[number]["id"];
