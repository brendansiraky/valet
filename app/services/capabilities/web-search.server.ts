import type Anthropic from "@anthropic-ai/sdk";
import type { TextBlock } from "@anthropic-ai/sdk/resources/messages";

export interface WebSearchParams {
  client: Anthropic;
  model: string;
  systemPrompt: string;
  userInput: string;
  maxSearches?: number; // max_uses for web_search tool, default 5
  maxTokens?: number;
}

export interface WebSearchResult {
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

export async function runWithWebSearch(
  params: WebSearchParams
): Promise<WebSearchResult> {
  const {
    client,
    model,
    systemPrompt,
    userInput,
    maxSearches = 5,
    maxTokens = 4096,
  } = params;

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userInput }],
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: maxSearches,
      },
    ],
  });

  // Extract text content and citations from response
  const textBlocks = response.content.filter(
    (block): block is TextBlock => block.type === "text"
  );

  const content = textBlocks.map((block) => block.text).join("");

  // Extract citations from text blocks that have them
  const citations: WebSearchResult["citations"] = [];
  for (const block of textBlocks) {
    if ("citations" in block && Array.isArray(block.citations)) {
      for (const citation of block.citations) {
        // Citation has url and optionally title
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

  // Check for errors in web_search_tool_result blocks
  for (const block of response.content) {
    if (block.type === "web_search_tool_result") {
      // The block content could indicate an error
      const blockContent = block as unknown as {
        content?: { type?: string; error_code?: string };
      };
      if (blockContent.content?.type === "web_search_tool_result_error") {
        console.error(
          `Web search error: ${blockContent.content.error_code || "unknown"}`
        );
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
