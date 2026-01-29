# Phase 12: OpenAI Integration - Research

**Researched:** 2026-01-29
**Domain:** OpenAI SDK integration with existing provider abstraction
**Confidence:** HIGH

## Summary

This research investigates how to implement an OpenAI provider that conforms to the existing AIProvider interface established in Phase 11. The project already has a well-defined provider abstraction with Anthropic as the reference implementation.

OpenAI's official Node.js SDK (v6.17.0 as of January 2026) provides two main APIs: the newer **Responses API** and the legacy **Chat Completions API**. For this integration, the Chat Completions API is the appropriate choice because:
1. It's the industry standard with broad support and indefinite commitment from OpenAI
2. It maps more directly to our existing message-based interface
3. It's simpler for stateless operations (which matches our current architecture)
4. The Responses API requires different state management patterns

A key finding is that **OpenAI does not have a `web_fetch` equivalent** - they only provide `web_search`. The `web_search` tool is only available in the Responses API, not Chat Completions. This means the OpenAI provider will have limited tool parity with Anthropic.

**Primary recommendation:** Use the Chat Completions API for consistency with the message-based AIProvider interface. Implement `web_search` as best-effort using the Responses API as a fallback when tools are requested, or gracefully degrade by omitting unsupported tools.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| openai | 6.17.x | Official OpenAI SDK | Official TypeScript SDK with full API coverage |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none required) | - | SDK includes all needed types | - |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| openai SDK | Direct HTTP calls | SDK provides type safety, error handling, streaming support |
| Chat Completions | Responses API | Responses API has richer tools but different message format |

**Installation:**
```bash
npm install openai
```

## Architecture Patterns

### Recommended Project Structure
```
app/lib/providers/
├── types.ts           # Existing - no changes
├── registry.ts        # Existing - add gpt-* prefix detection
├── anthropic.ts       # Existing reference implementation
└── openai.ts          # NEW - OpenAI provider implementation
```

### Pattern 1: Provider Self-Registration
**What:** Providers register their factories at module import time
**When to use:** All provider implementations
**Example:**
```typescript
// Source: Existing anthropic.ts pattern
import { registerProviderFactory } from "./registry";

export class OpenAIProvider implements AIProvider {
  readonly id = "openai";
  // ...implementation
}

// Self-register factory when module is imported
registerProviderFactory("openai", (apiKey) => new OpenAIProvider(apiKey));
```

### Pattern 2: Message Format Conversion
**What:** Convert internal ChatMessage format to OpenAI's format
**When to use:** In the chat() method
**Example:**
```typescript
// Source: OpenAI SDK documentation
// Internal format
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// OpenAI format (Chat Completions API)
// Uses "developer" for system messages in newer models, "system" still supported
const openAIMessages = messages.map((m) => ({
  role: m.role === "system" ? "system" : m.role, // "system" still works
  content: m.content,
}));
```

### Pattern 3: Tool Capability Degradation
**What:** Gracefully handle tool capabilities that don't exist in OpenAI
**When to use:** When ToolConfig includes unsupported tools
**Example:**
```typescript
private mapTools(config?: ToolConfig[]): void {
  if (!config?.length) return;

  for (const tool of config) {
    if (tool.type === "web_search") {
      // OpenAI web_search only available in Responses API
      // Option 1: Skip (graceful degradation)
      // Option 2: Use Responses API for this request
      console.warn("web_search tool requires Responses API fallback");
    }
    if (tool.type === "web_fetch") {
      // OpenAI has no equivalent - skip gracefully
      console.warn("web_fetch not supported by OpenAI provider");
    }
  }
}
```

### Anti-Patterns to Avoid
- **Don't use Responses API for all requests:** Only use it when web_search is needed; Chat Completions is simpler for basic chat
- **Don't mix API styles:** Pick one API per request, don't try to combine
- **Don't assume tool parity:** OpenAI lacks web_fetch; handle missing capabilities gracefully

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| API client | HTTP wrapper | `openai` package | SDK handles auth, retries, streaming, types |
| Error handling | Custom error types | SDK's APIError subclasses | Already categorized (RateLimitError, AuthenticationError, etc.) |
| Streaming | Manual SSE parsing | SDK's async iterator | Handles chunking, buffering correctly |
| Model validation | Custom model lists | SDK's models.list() | Authoritative source |

**Key insight:** The OpenAI SDK is mature and handles edge cases (retries, timeouts, proper error types). Don't bypass it.

## Common Pitfalls

### Pitfall 1: Using deprecated functions parameter
**What goes wrong:** Using `functions` instead of `tools` causes deprecation warnings
**Why it happens:** Old tutorials and training data reference deprecated API
**How to avoid:** Always use `tools` array with `type: "function"` wrapper
**Warning signs:** Deprecation warnings in console

### Pitfall 2: Assuming web_search works in Chat Completions
**What goes wrong:** Adding `web_search` tool to Chat Completions request fails
**Why it happens:** `web_search` is only available in Responses API
**How to avoid:** Check tool availability per API; use Responses API for web_search or skip the tool
**Warning signs:** Invalid tool type errors, unexpected API responses

### Pitfall 3: Not handling tool_calls response format
**What goes wrong:** Missing tool calls in assistant responses
**Why it happens:** OpenAI returns tool calls in a different structure than content
**How to avoid:** Check `response.choices[0].message.tool_calls` explicitly
**Warning signs:** Undefined content when model wants to call a tool

### Pitfall 4: Rate limit headers in exceptions
**What goes wrong:** Can't implement proper backoff
**Why it happens:** Node SDK throws exceptions without rate limit headers
**How to avoid:** Use built-in retry with exponential backoff, or catch and wait
**Warning signs:** 429 errors without rate limit info

### Pitfall 5: Token counting differences
**What goes wrong:** Usage stats don't match expected format
**Why it happens:** OpenAI uses `prompt_tokens`/`completion_tokens`, we use `inputTokens`/`outputTokens`
**How to avoid:** Map fields explicitly in result conversion
**Warning signs:** Undefined or zero token counts

## Code Examples

Verified patterns from official sources:

### Basic Chat Completion (HIGH confidence - official SDK docs)
```typescript
// Source: https://github.com/openai/openai-node
import OpenAI from "openai";

const client = new OpenAI({ apiKey });

const response = await client.chat.completions.create({
  model: "gpt-5.2",
  messages: [
    { role: "system", content: "You are helpful." },
    { role: "user", content: "Hello" },
  ],
  max_tokens: 4096,
});

const content = response.choices[0].message.content;
const usage = {
  inputTokens: response.usage?.prompt_tokens ?? 0,
  outputTokens: response.usage?.completion_tokens ?? 0,
};
```

### API Key Validation (HIGH confidence - community pattern, official models endpoint)
```typescript
// Source: Common pattern using models.list()
async validateKey(apiKey: string): Promise<boolean> {
  try {
    const testClient = new OpenAI({ apiKey });
    // Models list is a lightweight way to validate
    await testClient.models.list();
    return true;
  } catch {
    return false;
  }
}
```

### Error Handling (HIGH confidence - official SDK docs)
```typescript
// Source: https://github.com/openai/openai-node
import OpenAI, { APIError, RateLimitError, AuthenticationError } from "openai";

try {
  const response = await client.chat.completions.create({...});
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Invalid API key
  } else if (error instanceof RateLimitError) {
    // Rate limited - retry with backoff
  } else if (error instanceof APIError) {
    // Other API error - check status code
    console.error(`API Error ${error.status}: ${error.message}`);
  }
  throw error;
}
```

### Responses API with Web Search (HIGH confidence - official docs)
```typescript
// Source: OpenAI web search documentation
// Only use when web_search tool is requested
const response = await client.responses.create({
  model: "gpt-5.2",
  input: "What was a positive news story from today?",
  tools: [{ type: "web_search" }],
});

// Extract text
const outputText = response.output_text;

// Extract citations from annotations
const citations = [];
for (const item of response.output) {
  if ("content" in item) {
    for (const content of item.content) {
      if ("annotations" in content) {
        for (const annotation of content.annotations) {
          if (annotation.type === "url_citation") {
            citations.push({
              url: annotation.url,
              title: annotation.title,
            });
          }
        }
      }
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `functions` parameter | `tools` array with `type: "function"` | 2023 | Must use tools array |
| Assistants API | Responses API | March 2025 | Assistants deprecated, sunset Aug 2026 |
| Chat Completions only | Chat Completions + Responses | March 2025 | Responses API has built-in tools |
| GPT-4 | GPT-5.2 | Late 2025 | Latest flagship model |

**Deprecated/outdated:**
- `functions` parameter: Use `tools` array instead
- `runFunctions`: Use `runTools` helper instead
- Assistants API: Shutting down August 2026, use Responses API

## Open Questions

Things that couldn't be fully resolved:

1. **Responses API vs Chat Completions for web_search**
   - What we know: web_search only works in Responses API, not Chat Completions
   - What's unclear: Best pattern for hybrid usage (Chat Completions for simple requests, Responses for web_search)
   - Recommendation: Start with Chat Completions only, skip web_search gracefully. Add Responses API fallback in future iteration.

2. **Streaming implementation**
   - What we know: Both APIs support streaming with async iterators
   - What's unclear: Exact event format differences between Chat Completions and Responses streaming
   - Recommendation: Implement non-streaming first, add streaming in later task if needed

3. **Citations format mapping**
   - What we know: OpenAI uses `url_citation` annotations in Responses API, Chat Completions doesn't have built-in citations
   - What's unclear: How to get citations when using Chat Completions (not possible without web_search)
   - Recommendation: Return empty citations array for Chat Completions, populate from Responses API when using web_search

## Provider Capability Mapping

Critical understanding for implementation:

| Our Tool Type | Anthropic Support | OpenAI Support | Notes |
|---------------|-------------------|----------------|-------|
| `web_search` | Yes (API tool) | Responses API only | Not in Chat Completions |
| `web_fetch` | Yes (API tool) | No equivalent | Must skip gracefully |

**Implementation Strategy:**
1. For requests WITHOUT tools: Use Chat Completions (simple, direct mapping)
2. For requests WITH web_search: Either use Responses API or skip the tool with warning
3. For requests WITH web_fetch: Skip the tool with warning (OpenAI doesn't have this)

## Model IDs

OpenAI model naming convention for registry detection:

| Pattern | Models | Status |
|---------|--------|--------|
| `gpt-5*` | gpt-5, gpt-5.1, gpt-5.2, gpt-5-mini | Current flagship family |
| `gpt-4*` | gpt-4, gpt-4o, gpt-4.1, gpt-4o-mini | Previous generation, still supported |
| `o3-*`, `o4-*` | o3-mini, o4-mini | Reasoning models |

**Registry detection pattern:**
```typescript
// In registry.ts getProviderForModel()
if (modelId.startsWith("gpt-") || modelId.startsWith("o3-") || modelId.startsWith("o4-")) {
  return "openai";
}
```

**Initial model list (for OPENAI_MODELS constant):**
```typescript
export const OPENAI_MODELS = [
  { id: "gpt-5.2", name: "GPT-5.2", provider: "openai" },
  { id: "gpt-5.1", name: "GPT-5.1", provider: "openai" },
  { id: "gpt-4o", name: "GPT-4o", provider: "openai" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai" },
] as const;
```

## Sources

### Primary (HIGH confidence)
- [openai-node GitHub](https://github.com/openai/openai-node) - SDK patterns, installation, basic usage
- [OpenAI Node.js releases](https://github.com/openai/openai-node/releases) - Version 6.17.0 current
- OpenAI SDK helpers.md - runTools, streaming patterns

### Secondary (MEDIUM confidence)
- [OpenAI Cookbook: Responses API](https://cookbook.openai.com/examples/responses_api/responses_example) - Web search code examples
- [Cloudflare Workers Tutorial](https://developers.cloudflare.com/workers/tutorials/openai-function-calls-workers/) - Tool calling patterns
- [OpenAI for Developers 2025](https://developers.openai.com/blog/openai-for-developers-2025/) - API direction, tool support

### Tertiary (LOW confidence)
- WebSearch results for model names (verified against multiple sources)
- Community discussions on Chat Completions vs Responses API tradeoffs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official SDK, single recommended package
- Architecture: HIGH - Follows existing Phase 11 patterns
- Pitfalls: MEDIUM - Based on documentation and community patterns
- Tool mapping: HIGH - Verified OpenAI only has web_search in Responses API

**Research date:** 2026-01-29
**Valid until:** 2026-02-28 (30 days - SDK is stable but OpenAI adds features frequently)
