import type Anthropic from "@anthropic-ai/sdk";
import type { TextBlock, Tool } from "@anthropic-ai/sdk/resources/messages";

export interface RunWithToolsParams {
  client: Anthropic;
  model: string;
  systemPrompt: string;
  userInput: string;
  maxSearches?: number;
  maxFetches?: number;
  maxContentTokens?: number;
  maxTokens?: number;
}

export interface RunWithToolsResult {
  content: string;
  citations: Array<{
    url: string;
    title?: string;
  }>;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

// web_fetch is in beta - SDK types may not include it yet
interface WebFetchTool {
  type: "web_fetch_20250910";
  name: "web_fetch";
  max_uses: number;
  max_content_tokens: number;
  citations: { enabled: boolean };
}

/**
 * Run agent with both web_search and web_fetch tools available.
 * The model will decide which tools to use based on context.
 */
export async function runWithTools(
  params: RunWithToolsParams
): Promise<RunWithToolsResult> {
  const {
    client,
    model,
    systemPrompt,
    userInput,
    maxSearches = 5,
    maxFetches = 5,
    maxContentTokens = 25000,
    maxTokens = 4096,
  } = params;

  const webSearchTool = {
    type: "web_search_20250305" as const,
    name: "web_search" as const,
    max_uses: maxSearches,
  };

  const webFetchTool: WebFetchTool = {
    type: "web_fetch_20250910",
    name: "web_fetch",
    max_uses: maxFetches,
    max_content_tokens: maxContentTokens,
    citations: { enabled: true },
  };

  // Include both tools - model decides which to use based on instructions/input
  const response = await client.messages.create(
    {
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userInput }],
      tools: [webSearchTool, webFetchTool as unknown as Tool],
    },
    {
      // web_fetch requires beta header
      headers: { "anthropic-beta": "web-fetch-2025-09-10" },
    }
  );

  // Extract text content and citations from response
  const textBlocks = response.content.filter(
    (block): block is TextBlock => block.type === "text"
  );

  const content = textBlocks.map((block) => block.text).join("");

  // Extract citations from text blocks that have them
  const citations: RunWithToolsResult["citations"] = [];
  for (const block of textBlocks) {
    if ("citations" in block && Array.isArray(block.citations)) {
      for (const citation of block.citations) {
        if ("url" in citation && typeof citation.url === "string") {
          citations.push({
            url: citation.url,
            title:
              "title" in citation && typeof citation.title === "string"
                ? citation.title
                : undefined,
          });
        }
      }
    }
  }

  return {
    content,
    citations,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}
