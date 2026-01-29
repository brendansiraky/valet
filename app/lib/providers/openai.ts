/**
 * OpenAI provider implementation.
 *
 * Implements the AIProvider interface using the OpenAI SDK,
 * using the Chat Completions API for message-based interactions.
 *
 * Note: OpenAI does not support web_fetch or web_search tools in Chat Completions.
 * These tools will be skipped with a warning when requested.
 */

import OpenAI from "openai";
import { OPENAI_MODELS } from "~/lib/models";
import { registerProviderFactory } from "./registry";
import type {
  AIProvider,
  ChatMessage,
  ChatOptions,
  ChatResult,
  ProviderModel,
  ToolConfig,
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
            `OpenAI Chat Completions API does not support these tools.`
        );
      }
    }

    // Map messages to OpenAI format
    const openAIMessages: OpenAI.ChatCompletionMessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const response = await this.client.chat.completions.create({
      model: options.model,
      max_tokens: options.maxTokens ?? 4096,
      messages: openAIMessages,
    });

    const content = response.choices[0]?.message?.content ?? "";

    return {
      content,
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      },
      citations: [], // Chat Completions API doesn't have built-in citations
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
