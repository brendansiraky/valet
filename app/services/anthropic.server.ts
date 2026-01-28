import Anthropic from "@anthropic-ai/sdk";
import { decrypt } from "./encryption.server";

// Re-export from shared module for server-side consumers
export { AVAILABLE_MODELS, type ModelId } from "~/lib/models";

export function createAnthropicClient(encryptedApiKey: string): Anthropic {
  const apiKey = decrypt(encryptedApiKey);
  return new Anthropic({ apiKey });
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const client = new Anthropic({ apiKey });
    // Make a minimal API call to validate the key (using cheapest model)
    await client.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1,
      messages: [{ role: "user", content: "hi" }],
    });
    return true;
  } catch (error) {
    console.error("API key validation failed:", error);
    return false;
  }
}
