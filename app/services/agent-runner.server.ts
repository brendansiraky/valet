import type { Agent } from "~/db/schema/agents";
import type { ModelId } from "~/lib/models";
import { createAnthropicClient } from "./anthropic.server";
import { generateText } from "./capabilities/text-generation.server";
import { runWithWebSearch } from "./capabilities/web-search.server";
import { runWithUrlFetch } from "./capabilities/url-fetch.server";

export interface AgentRunParams {
  agent: Agent;
  userInput: string;
  encryptedApiKey: string;
  model: ModelId;
  capabilities?: {
    webSearch?: boolean;
    urlFetch?: boolean;
  };
}

export interface AgentRunResult {
  success: boolean;
  content?: string;
  error?: string;
  citations?: Array<{ url: string; title?: string }>;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export async function runAgent(
  params: AgentRunParams
): Promise<AgentRunResult> {
  const { agent, userInput, encryptedApiKey, model, capabilities } = params;

  try {
    const client = createAnthropicClient(encryptedApiKey);

    // Route to appropriate capability based on flags
    // For now, webSearch and urlFetch are mutually exclusive with text-only
    // Combined capabilities will be added in Phase 5 execution engine

    if (capabilities?.webSearch) {
      const result = await runWithWebSearch({
        client,
        model,
        systemPrompt: agent.instructions,
        userInput,
      });

      return {
        success: true,
        content: result.content,
        citations: result.citations,
        usage: result.usage,
      };
    }

    if (capabilities?.urlFetch) {
      const result = await runWithUrlFetch({
        client,
        model,
        systemPrompt: agent.instructions,
        userInput,
      });

      return {
        success: true,
        content: result.content,
        citations: result.citations,
        usage: result.usage,
      };
    }

    // Default: text generation only
    const result = await generateText({
      client,
      model,
      systemPrompt: agent.instructions,
      messages: [{ role: "user", content: userInput }],
    });

    return {
      success: true,
      content: result.content,
      usage: result.usage,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return {
      success: false,
      error: errorMessage,
    };
  }
}
