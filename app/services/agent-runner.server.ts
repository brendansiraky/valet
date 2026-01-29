import type { Agent } from "~/db/schema/agents";
import type { ModelId } from "~/lib/models";
import { createAnthropicClient } from "./anthropic.server";
import { runWithTools } from "./capabilities/run-with-tools.server";

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
    const client = createAnthropicClient(encryptedApiKey);
    const systemPrompt = buildSystemPrompt(agent.instructions, traitContext);

    // All agents have access to web_search and web_fetch tools
    // The model decides which to use based on instructions and input
    const result = await runWithTools({
      client,
      model,
      systemPrompt,
      userInput,
    });

    return {
      success: true,
      content: result.content,
      citations: result.citations,
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
