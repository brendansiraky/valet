# Phase 3: Agent Capabilities - Research

**Researched:** 2026-01-28
**Domain:** AI Agent Capabilities (LLM, Web Search, URL Fetching)
**Confidence:** HIGH

## Summary

This phase enables agents to perform useful work through three capabilities: generating text via the Anthropic API (CAPS-01), performing web searches (CAPS-02), and reading URL content (CAPS-03). Research revealed that Anthropic provides built-in tools for both web search and URL fetching, significantly simplifying implementation.

The project already has @anthropic-ai/sdk v0.71.2 installed with a basic client factory. The key insight is that Anthropic's built-in `web_search_20250305` and `web_fetch_20250910` tools eliminate the need for third-party search APIs or custom URL fetching infrastructure. Claude handles search and fetch operations server-side, with results integrated directly into the conversation.

For fallback URL fetching (when Anthropic's tool is unsuitable), the standard stack is node-fetch + jsdom + @mozilla/readability, with ssrf-req-filter for SSRF prevention.

**Primary recommendation:** Use Anthropic's built-in web search and web fetch tools as the primary implementation. They provide search via Brave Search and URL content extraction with PDF support, both integrated into the Claude conversation context with automatic citations.

## Standard Stack

### Core (Anthropic Built-in Tools)

| Tool | Type | Purpose | Why Standard |
|------|------|---------|--------------|
| web_search_20250305 | Anthropic Tool | Web search via Brave Search | Built into Claude, no third-party API needed, automatic citations |
| web_fetch_20250910 | Anthropic Tool | URL content retrieval | Built into Claude, handles HTML/PDF, no additional cost beyond tokens |
| @anthropic-ai/sdk | npm ^0.71.2 | API client | Already installed, official TypeScript SDK |

### Supporting (Fallback URL Fetching)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jsdom | ^27.x | DOM parsing in Node.js | Fallback when Anthropic's web_fetch is unsuitable |
| @mozilla/readability | ^0.5.x | Content extraction | Extract article content from HTML |
| ssrf-req-filter | ^1.x | SSRF prevention | Protect custom URL fetching from SSRF attacks |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Anthropic web_search | Serper API ($0.30-1/1k), Brave API ($3-5/1k) | External API costs, more control over search parameters |
| Anthropic web_fetch | Custom fetch + readability | More control, supports JS-rendered pages (with Puppeteer), but more complexity |

**Installation (if fallback needed):**
```bash
npm install jsdom @mozilla/readability ssrf-req-filter
```

## Architecture Patterns

### Recommended Project Structure
```
app/
├── services/
│   ├── anthropic.server.ts       # Existing client factory
│   ├── agent-runner.server.ts    # NEW: Orchestrates agent execution
│   └── capabilities/
│       ├── text-generation.server.ts  # CAPS-01: LLM text generation
│       ├── web-search.server.ts       # CAPS-02: Web search
│       └── url-fetch.server.ts        # CAPS-03: URL content fetching
├── lib/
│   └── models.ts                 # Existing model definitions
```

### Pattern 1: Capability Service Pattern
**What:** Each capability is a separate service module that can be composed
**When to use:** Always - clean separation of concerns

```typescript
// Source: Anthropic SDK documentation
// app/services/capabilities/text-generation.server.ts
import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

export interface TextGenerationParams {
  client: Anthropic;
  model: string;
  systemPrompt: string;
  messages: MessageParam[];
  maxTokens?: number;
}

export async function generateText(params: TextGenerationParams) {
  const { client, model, systemPrompt, messages, maxTokens = 4096 } = params;

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  });

  return response;
}
```

### Pattern 2: Streaming Response Pattern
**What:** Stream Claude's response for real-time UI updates
**When to use:** When displaying agent output to users in real-time

```typescript
// Source: Anthropic streaming documentation
import Anthropic from "@anthropic-ai/sdk";

export async function* streamText(params: TextGenerationParams) {
  const { client, model, systemPrompt, messages, maxTokens = 4096 } = params;

  const stream = await client.messages.stream({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield event.delta.text;
    }
  }

  return stream.finalMessage();
}
```

### Pattern 3: Built-in Tools Pattern
**What:** Enable Anthropic's server-side tools in API requests
**When to use:** For CAPS-02 and CAPS-03

```typescript
// Source: Anthropic web search/fetch documentation
import Anthropic from "@anthropic-ai/sdk";

export interface AgentRunParams {
  client: Anthropic;
  model: string;
  systemPrompt: string;
  userInput: string;
  enableWebSearch?: boolean;
  enableUrlFetch?: boolean;
}

export async function runAgentWithCapabilities(params: AgentRunParams) {
  const { client, model, systemPrompt, userInput, enableWebSearch, enableUrlFetch } = params;

  const tools: Anthropic.Tool[] = [];

  if (enableWebSearch) {
    tools.push({
      type: "web_search_20250305",
      name: "web_search",
      max_uses: 5,
    });
  }

  if (enableUrlFetch) {
    tools.push({
      type: "web_fetch_20250910",
      name: "web_fetch",
      max_uses: 5,
      citations: { enabled: true },
    });
  }

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userInput }],
    tools: tools.length > 0 ? tools : undefined,
  }, {
    headers: enableUrlFetch ? { "anthropic-beta": "web-fetch-2025-09-10" } : undefined,
  });

  return response;
}
```

### Anti-Patterns to Avoid

- **Exposing API keys to client:** Never send Anthropic API keys to the browser; always call from server
- **Unbounded tool usage:** Always set `max_uses` on tools to prevent runaway costs
- **Ignoring stop_reason:** Check `stop_reason` for `pause_turn` and handle appropriately
- **Hard-coding models:** Use the shared AVAILABLE_MODELS from ~/lib/models.ts

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Web search | Custom search scraper | Anthropic web_search_20250305 | Legal issues, maintenance, rate limits, already built into Claude |
| URL content extraction | Custom HTML parser | Anthropic web_fetch_20250910 | Handles HTML + PDF, integrated citations, no SSRF concerns |
| Article content extraction | Custom parser | @mozilla/readability (fallback only) | Edge cases, encoding issues, content detection |
| SSRF prevention | IP/hostname validation regex | ssrf-req-filter library | DNS rebinding, encoding bypasses, redirect chains |
| Streaming SSE | Manual event parsing | SDK's .stream() method | Connection handling, error recovery, proper event parsing |

**Key insight:** Anthropic's built-in tools handle the complexity of web operations server-side, including content extraction, citation generation, and security. Only build custom solutions if you need capabilities the built-in tools don't provide (like JS-rendered pages).

## Common Pitfalls

### Pitfall 1: Web Fetch Beta Header Omission
**What goes wrong:** API returns error when using web_fetch without beta header
**Why it happens:** web_fetch_20250910 is still in beta, requires explicit opt-in
**How to avoid:** Always include `anthropic-beta: web-fetch-2025-09-10` header
**Warning signs:** 400/404 errors mentioning unknown tool type

### Pitfall 2: Tool Response Handling
**What goes wrong:** Failing to handle `server_tool_use` and `web_search_tool_result` content blocks
**Why it happens:** Claude's response contains multiple content block types when tools are used
**How to avoid:** Parse response.content array, handle each block type appropriately
**Warning signs:** Missing search results in UI, incomplete responses

### Pitfall 3: Token Cost Explosion
**What goes wrong:** Fetching large PDFs consumes 100k+ tokens per request
**Why it happens:** No `max_content_tokens` limit set on web_fetch
**How to avoid:** Always set `max_content_tokens` (suggest 25000 for web pages, higher for PDFs)
**Warning signs:** Unexpectedly high API costs, slow responses

### Pitfall 4: URL Validation in Web Fetch
**What goes wrong:** Claude can only fetch URLs that appear in conversation context
**Why it happens:** Security feature to prevent data exfiltration
**How to avoid:** Ensure URLs are in user messages or from prior search/fetch results
**Warning signs:** `url_not_allowed` errors

### Pitfall 5: Streaming + Tools Delay
**What goes wrong:** Long pauses during streaming when tools execute
**Why it happens:** Tool execution happens server-side, stream pauses until complete
**How to avoid:** Show loading indicator during tool execution, handle gracefully in UI
**Warning signs:** User confusion about "frozen" responses

### Pitfall 6: Citations Required for Display
**What goes wrong:** Legal/compliance issues when showing search results to users
**Why it happens:** Anthropic requires citations when displaying web content to end users
**How to avoid:** Enable citations, display them alongside content
**Warning signs:** Content displayed without source attribution

## Code Examples

### Basic Text Generation (CAPS-01)
```typescript
// Source: Anthropic SDK documentation
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: decryptedApiKey });

const message = await client.messages.create({
  model: "claude-opus-4-5-20251101",
  max_tokens: 4096,
  system: agent.instructions,
  messages: [{ role: "user", content: userInput }],
});

// Handle response
for (const block of message.content) {
  if (block.type === "text") {
    console.log(block.text);
  }
}
```

### Web Search with Streaming (CAPS-02)
```typescript
// Source: Anthropic streaming documentation
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: decryptedApiKey });

const stream = await client.messages.stream({
  model: "claude-opus-4-5-20251101",
  max_tokens: 4096,
  system: agent.instructions,
  messages: [{ role: "user", content: "What is the current weather in NYC?" }],
  tools: [{
    type: "web_search_20250305",
    name: "web_search",
    max_uses: 3,
  }],
});

stream.on("text", (text) => {
  // Stream text to client
  process.stdout.write(text);
});

const finalMessage = await stream.finalMessage();

// Extract citations from response
for (const block of finalMessage.content) {
  if (block.type === "text" && block.citations) {
    for (const citation of block.citations) {
      console.log(`Source: ${citation.url}`);
    }
  }
}
```

### URL Fetching (CAPS-03)
```typescript
// Source: Anthropic web fetch documentation
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: decryptedApiKey });

const response = await client.messages.create({
  model: "claude-opus-4-5-20251101",
  max_tokens: 4096,
  system: agent.instructions,
  messages: [{
    role: "user",
    content: "Please summarize the article at https://example.com/article"
  }],
  tools: [{
    type: "web_fetch_20250910",
    name: "web_fetch",
    max_uses: 3,
    max_content_tokens: 25000,
    citations: { enabled: true },
  }],
}, {
  headers: { "anthropic-beta": "web-fetch-2025-09-10" },
});
```

### Fallback URL Fetching (Custom Implementation)
```typescript
// Source: Mozilla Readability, jsdom, ssrf-req-filter documentation
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import ssrfFilter from "ssrf-req-filter";

export async function fetchAndExtractContent(url: string) {
  // Validate URL first
  const parsedUrl = new URL(url);
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Only HTTP(S) URLs allowed");
  }

  // Fetch with SSRF protection
  const response = await fetch(url, {
    agent: ssrfFilter(url),
    headers: {
      "User-Agent": "Valet/1.0 (Content Reader)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }

  const html = await response.text();

  // Parse with jsdom
  const dom = new JSDOM(html, { url });

  // Extract with Readability
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article) {
    throw new Error("Could not extract article content");
  }

  return {
    title: article.title,
    content: article.content,
    textContent: article.textContent,
    excerpt: article.excerpt,
    byline: article.byline,
    length: article.length,
  };
}
```

### Error Handling Pattern
```typescript
// Source: Anthropic SDK documentation
import Anthropic from "@anthropic-ai/sdk";

try {
  const response = await client.messages.create({...});

  // Check for tool errors in response
  for (const block of response.content) {
    if (block.type === "web_search_tool_result" &&
        block.content?.type === "web_search_tool_result_error") {
      console.error(`Search error: ${block.content.error_code}`);
    }
    if (block.type === "web_fetch_tool_result" &&
        block.content?.type === "web_fetch_tool_error") {
      console.error(`Fetch error: ${block.content.error_code}`);
    }
  }
} catch (err) {
  if (err instanceof Anthropic.APIError) {
    console.error(`API Error ${err.status}: ${err.message}`);
    // Handle rate limits, auth errors, etc.
  }
  throw err;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Third-party search APIs (Serper, SerpAPI) | Anthropic web_search_20250305 | March 2025 | No external API needed, search integrated into Claude |
| Custom URL fetching + parsing | Anthropic web_fetch_20250910 | September 2025 | Built-in PDF support, citations, no SSRF concerns |
| client.messages.create() for streaming | client.messages.stream() | SDK v0.x | Cleaner API with event handlers |

**Deprecated/outdated:**
- External search APIs: Still valid but unnecessary with Anthropic's built-in tool
- Manual HTML parsing for Claude: web_fetch handles content extraction

## Open Questions

1. **Web Fetch JS-Rendered Pages**
   - What we know: Anthropic's web_fetch does not support JS-rendered pages
   - What's unclear: Whether this limitation affects many real-world use cases
   - Recommendation: Document limitation; consider Puppeteer fallback if needed in future

2. **Web Search Pricing at Scale**
   - What we know: $10/1000 searches, plus token costs for results
   - What's unclear: Exact token consumption patterns for search results
   - Recommendation: Monitor usage closely during initial deployment, set conservative max_uses

3. **Organization-Level Domain Restrictions**
   - What we know: Console has settings that can conflict with request-level filters
   - What's unclear: Default settings, how to check/configure
   - Recommendation: Check Anthropic Console settings before deployment

## Sources

### Primary (HIGH confidence)
- [Anthropic SDK TypeScript GitHub](https://github.com/anthropics/anthropic-sdk-typescript) - SDK patterns, streaming, error handling
- [Anthropic Streaming Docs](https://platform.claude.com/docs/en/api/messages-streaming) - Event types, streaming patterns
- [Anthropic Web Search Tool Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool) - Tool configuration, pricing, usage
- [Anthropic Web Fetch Tool Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-fetch-tool) - Beta header, options, security

### Secondary (MEDIUM confidence)
- [Mozilla Readability GitHub](https://github.com/mozilla/readability) - Content extraction API
- [ssrf-req-filter GitHub](https://github.com/y-mehta/ssrf-req-filter) - SSRF prevention patterns
- [jsdom GitHub](https://github.com/jsdom/jsdom) - DOM parsing in Node.js

### Tertiary (LOW confidence)
- WebSearch results for SSRF prevention best practices - General patterns, need validation
- WebSearch results for search API pricing - May vary, check official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Anthropic official documentation, SDK code
- Architecture: HIGH - Based on official SDK patterns and examples
- Pitfalls: HIGH - Documented in official Anthropic docs

**Research date:** 2026-01-28
**Valid until:** 60 days for stable Anthropic tools (watch for web_fetch graduating from beta)
