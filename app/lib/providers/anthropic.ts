/**
 * Anthropic provider implementation.
 *
 * Implements the AIProvider interface using the Anthropic SDK,
 * supporting web_search and web_fetch tools.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { TextBlock, Tool } from "@anthropic-ai/sdk/resources/messages";
import { ANTHROPIC_MODELS } from "~/lib/models";
import { registerProviderFactory } from "./registry";
import type {
  AIProvider,
  ChatMessage,
  ChatOptions,
  ChatResult,
  ProviderModel,
  ToolConfig,
} from "./types";

/**
 * web_fetch tool type - in beta, may not be in SDK types yet.
 */
interface WebFetchTool {
  type: "web_fetch_20250910";
  name: "web_fetch";
  max_uses: number;
  max_content_tokens: number;
  citations: { enabled: boolean };
}

export class AnthropicProvider implements AIProvider {
  readonly id = "anthropic";
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async chat(messages: ChatMessage[], options: ChatOptions): Promise<ChatResult> {
    console.log(`[Anthropic] chat() called with model: ${options.model}`);

    // Extract system message
    const systemMessage = messages.find((m) => m.role === "system");
    const conversationMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    // Build Anthropic-specific tool configuration
    const tools = this.buildTools(options.tools);
    const headers = this.buildHeaders(options.tools);

    const response = await this.client.messages.create(
      {
        model: options.model,
        max_tokens: options.maxTokens ?? 4096,
        system: systemMessage?.content,
        messages: conversationMessages,
        tools: tools.length > 0 ? tools : undefined,
      },
      headers ? { headers } : undefined
    );

    // Extract text and citations
    const textBlocks = response.content.filter(
      (block): block is TextBlock => block.type === "text"
    );

    return {
      content: textBlocks.map((b) => b.text).join(""),
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      citations: this.extractCitations(textBlocks),
    };
  }

  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const testClient = new Anthropic({ apiKey });
      // Use a minimal request to validate the key
      await testClient.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      });
      return true;
    } catch {
      return false;
    }
  }

  getModels(): ProviderModel[] {
    return ANTHROPIC_MODELS.map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
    }));
  }

  private buildTools(config?: ToolConfig[]): Tool[] {
    if (!config?.length) return [];

    const tools: Tool[] = [];
    for (const tool of config) {
      if (tool.type === "web_search") {
        tools.push({
          type: "web_search_20250305",
          name: "web_search",
          max_uses: tool.maxUses ?? 5,
        } as unknown as Tool);
      }
      if (tool.type === "web_fetch") {
        const webFetchTool: WebFetchTool = {
          type: "web_fetch_20250910",
          name: "web_fetch",
          max_uses: tool.maxUses ?? 5,
          max_content_tokens: 25000,
          citations: { enabled: true },
        };
        tools.push(webFetchTool as unknown as Tool);
      }
    }
    return tools;
  }

  private buildHeaders(tools?: ToolConfig[]): Record<string, string> | undefined {
    const hasWebFetch = tools?.some((t) => t.type === "web_fetch");
    if (hasWebFetch) {
      return { "anthropic-beta": "web-fetch-2025-09-10" };
    }
    return undefined;
  }

  private extractCitations(blocks: TextBlock[]): ChatResult["citations"] {
    const citations: ChatResult["citations"] = [];
    for (const block of blocks) {
      if ("citations" in block && Array.isArray(block.citations)) {
        for (const c of block.citations) {
          if ("url" in c && typeof c.url === "string") {
            citations.push({
              url: c.url,
              title: "title" in c && typeof c.title === "string" ? c.title : undefined,
            });
          }
        }
      }
    }
    return citations;
  }
}

// Self-register factory when module is imported
registerProviderFactory("anthropic", (apiKey) => new AnthropicProvider(apiKey));
