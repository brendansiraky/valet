/**
 * OpenAI provider implementation.
 *
 * Implements the AIProvider interface using the OpenAI SDK,
 * using the Responses API for message-based interactions.
 *
 * Note: OpenAI does not support web_fetch or web_search tools in Responses API.
 * These tools will be skipped with a warning when requested.
 */

import OpenAI from "openai";
import type { EasyInputMessage } from "openai/resources/responses/responses";
import { OPENAI_MODELS } from "~/lib/models";
import { registerProviderFactory } from "./registry";
import type {
  AIProvider,
  ChatMessage,
  ChatOptions,
  ChatResult,
  ProviderModel,
} from "./types";

export class OpenAIProvider implements AIProvider {
  readonly id = "openai";
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async chat(messages: ChatMessage[], options: ChatOptions): Promise<ChatResult> {
    console.log(`[OpenAI] chat() called with model: ${options.model}`);

    // Log warning for unsupported tools
    if (options.tools?.length) {
      const unsupported = options.tools
        .filter((t) => t.type === "web_search" || t.type === "web_fetch")
        .map((t) => t.type);
      if (unsupported.length > 0) {
        console.warn(
          `[OpenAI] Skipping unsupported tools: ${unsupported.join(", ")}. ` +
            `OpenAI Responses API does not support these tools.`
        );
      }
    }

    // Map messages to OpenAI Responses API format
    const input: EasyInputMessage[] = messages.map((m) => ({
      role: m.role === "system" ? "developer" : m.role,
      content: m.content,
    }));

    const response = await this.client.responses.create({
      model: options.model,
      max_output_tokens: options.maxTokens ?? 4096,
      input,
    });

    return {
      content: response.output_text,
      usage: {
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
      },
      citations: [], // Responses API doesn't have built-in citations
    };
  }

  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const testClient = new OpenAI({ apiKey });
      // Use models.list() as a lightweight validation
      await testClient.models.list();
      return true;
    } catch {
      return false;
    }
  }

  getModels(): ProviderModel[] {
    return OPENAI_MODELS.map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
    }));
  }
}

// Self-register factory when module is imported
registerProviderFactory("openai", (apiKey) => new OpenAIProvider(apiKey));
