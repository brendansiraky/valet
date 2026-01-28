export const AVAILABLE_MODELS = [
  { id: "claude-opus-4-5-20251101", name: "Claude Opus 4.5" },
] as const;

export type ModelId = (typeof AVAILABLE_MODELS)[number]["id"];
