import type { Agent } from "~/db/schema/agents";
import type { ModelId } from "~/lib/models";
// Import provider abstraction layer - registers Anthropic factory on import
import "~/lib/providers/anthropic";
import { getProvider, getProviderForModel } from "~/lib/providers/registry";
import type { ChatMessage, ToolConfig } from "~/lib/providers/types";
import { decrypt } from "./encryption.server";

export interface AgentRunParams {
  agent: Agent;
  userInput: string;
  encryptedApiKey: string;
  model: ModelId;
  traitContext?: string; // Combined trait context to prepend to instructions
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
  model?: string;
}

/**
 * Build the system prompt by prepending trait context to agent instructions.
 */
function buildSystemPrompt(instructions: string, traitContext?: string): string {
  if (!traitContext) return instructions;

  // Prepend trait context to instructions with separator
  return `${traitContext}\n\n---\n\n${instructions}`;
}

export async function runAgent(
  params: AgentRunParams
): Promise<AgentRunResult> {
  const { agent, userInput, encryptedApiKey, model, traitContext } = params;

  try {
    // Get provider using abstraction layer
    const providerId = getProviderForModel(model);
    const decryptedKey = decrypt(encryptedApiKey);
    const provider = getProvider(providerId, decryptedKey);

    // Build messages for chat
    const systemPrompt = buildSystemPrompt(agent.instructions, traitContext);
    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userInput },
    ];

    // All agents have access to web_search and web_fetch tools
    // The model decides which to use based on instructions and input
    const tools: ToolConfig[] = [
      { type: "web_search", maxUses: 5 },
      { type: "web_fetch", maxUses: 5 },
    ];

    const result = await provider.chat(messages, { model, tools });

    return {
      success: true,
      content: result.content,
      citations: result.citations,
      usage: result.usage,
      model,
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
