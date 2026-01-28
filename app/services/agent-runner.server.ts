import type { Agent } from "~/db/schema/agents";
import type { ModelId } from "~/lib/models";
import { createAnthropicClient } from "./anthropic.server";
import { generateText } from "./capabilities/text-generation.server";

export interface AgentRunParams {
  agent: Agent;
  userInput: string;
  encryptedApiKey: string;
  model: ModelId;
}

export interface AgentRunResult {
  success: boolean;
  content?: string;
  error?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export async function runAgent(params: AgentRunParams): Promise<AgentRunResult> {
  const { agent, userInput, encryptedApiKey, model } = params;

  try {
    const client = createAnthropicClient(encryptedApiKey);

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
