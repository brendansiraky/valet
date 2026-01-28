import Anthropic from "@anthropic-ai/sdk";
import { decrypt } from "./encryption.server";

export function createAnthropicClient(encryptedApiKey: string): Anthropic {
  const apiKey = decrypt(encryptedApiKey);
  return new Anthropic({ apiKey });
}

export const AVAILABLE_MODELS = [
  { id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5 (Latest)" },
  { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
  { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku (Fast)" },
  { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
] as const;

export type ModelId = (typeof AVAILABLE_MODELS)[number]["id"];

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const client = new Anthropic({ apiKey });
    // Make a minimal API call to validate the key
    await client.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 1,
      messages: [{ role: "user", content: "hi" }],
    });
    return true;
  } catch {
    return false;
  }
}
