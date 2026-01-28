import type Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, TextBlock } from "@anthropic-ai/sdk/resources/messages";

export interface TextGenerationParams {
  client: Anthropic;
  model: string;
  systemPrompt: string;
  messages: MessageParam[];
  maxTokens?: number;
}

export interface TextGenerationResult {
  content: string;
  stopReason: string | null;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export async function generateText(
  params: TextGenerationParams
): Promise<TextGenerationResult> {
  const { client, model, systemPrompt, messages, maxTokens = 4096 } = params;

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  });

  // Extract text content from response - concatenate all text blocks
  const textContent = response.content
    .filter((block): block is TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  return {
    content: textContent,
    stopReason: response.stop_reason,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}
