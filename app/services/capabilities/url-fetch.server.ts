import type Anthropic from "@anthropic-ai/sdk";
import type {
  TextBlock,
  Tool,
  ContentBlock,
} from "@anthropic-ai/sdk/resources/messages";

export interface UrlFetchParams {
  client: Anthropic;
  model: string;
  systemPrompt: string;
  userInput: string; // Must contain the URL(s) to fetch
  maxFetches?: number; // max_uses for web_fetch tool, default 5
  maxContentTokens?: number; // Per RESEARCH.md, suggest 25000
  maxTokens?: number;
}

export interface UrlFetchResult {
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

// web_fetch_20250910 is in beta - SDK types may not include it yet
// We cast to Tool to work around this
interface WebFetchTool {
  type: "web_fetch_20250910";
  name: "web_fetch";
  max_uses: number;
  max_content_tokens: number;
  citations: { enabled: boolean };
}

export async function runWithUrlFetch(
  params: UrlFetchParams
): Promise<UrlFetchResult> {
  const {
    client,
    model,
    systemPrompt,
    userInput,
    maxFetches = 5,
    maxContentTokens = 25000,
    maxTokens = 4096,
  } = params;

  // web_fetch is in beta - cast tool definition since SDK types may lag behind API
  const webFetchTool: WebFetchTool = {
    type: "web_fetch_20250910",
    name: "web_fetch",
    max_uses: maxFetches,
    max_content_tokens: maxContentTokens,
    citations: { enabled: true },
  };

  // CRITICAL: web_fetch is in beta and requires the anthropic-beta header
  const response = await client.messages.create(
    {
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userInput }],
      tools: [webFetchTool as unknown as Tool],
    },
    {
      headers: { "anthropic-beta": "web-fetch-2025-09-10" },
    }
  );

  // Extract text content and citations from response
  const textBlocks = response.content.filter(
    (block): block is TextBlock => block.type === "text"
  );

  const content = textBlocks.map((block) => block.text).join("");

  // Extract citations from text blocks that have them
  const citations: UrlFetchResult["citations"] = [];
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

  // Check for errors in web_fetch_tool_result blocks (beta feature, may not be typed)
  for (const block of response.content) {
    // Cast to string to avoid type union comparison issues with beta types
    const blockType = (block as { type: string }).type;
    if (blockType === "web_fetch_tool_result") {
      // The block content could indicate an error
      const blockContent = block as unknown as {
        content?: { type?: string; error_code?: string };
      };
      if (blockContent.content?.type === "web_fetch_tool_error") {
        console.error(
          `URL fetch error: ${blockContent.content.error_code || "unknown"}`
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
