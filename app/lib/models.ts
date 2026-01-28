export const AVAILABLE_MODELS = [
  { id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5 (Latest)" },
  { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
  { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku (Fast)" },
  { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
] as const;

export type ModelId = (typeof AVAILABLE_MODELS)[number]["id"];
