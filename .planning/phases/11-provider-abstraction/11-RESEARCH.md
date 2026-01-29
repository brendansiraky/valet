# Phase 11: Provider Abstraction Layer - Research

**Researched:** 2026-01-29
**Domain:** AI Provider Abstraction, Multi-LLM Integration, Live Data Relationships
**Confidence:** HIGH

## Summary

Phase 11 creates the foundation for multi-provider AI support by implementing a provider abstraction layer. The research focused on three key areas: (1) provider abstraction patterns in the TypeScript ecosystem, (2) how to refactor the existing Anthropic-specific code to use the abstraction, and (3) implementing live agent-pipeline relationships with orphan handling.

The TypeScript ecosystem has mature solutions for provider abstraction, led by the Vercel AI SDK which dominates with 20M+ monthly downloads. However, the project should implement a **lightweight custom abstraction** rather than adopting the AI SDK wholesale, because:
- The current codebase already works with Anthropic's specific beta features (web_search, web_fetch)
- AI SDK would require significant refactoring of the existing streaming and tool integration
- A thin abstraction layer preserves existing code while enabling provider switching

For the live agent-pipeline relationship, the current architecture stores agent data as snapshots in `flowData.nodes[].data`. This must change to store only agent IDs, with fresh agent data fetched at execution time.

**Primary recommendation:** Create a minimal `AIProvider` interface with `chat()` method, implement `AnthropicProvider`, refactor job-queue.server.ts to use the interface, and change pipeline flowData to store agent IDs only (not snapshots).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @anthropic-ai/sdk | ^0.71.2 | Anthropic API client (existing) | Already in use, type-safe, supports beta features |
| zod | ^4.3.6 | Schema validation (existing) | Already in use for validation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None new | - | - | Custom abstraction uses existing dependencies |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom abstraction | Vercel AI SDK | AI SDK is comprehensive but requires significant refactoring; custom is lighter and preserves existing Anthropic beta tool integration |
| Custom abstraction | LangChain.js | LangChain adds heavy abstractions; overkill for this use case |
| Custom abstraction | TetherAI | Minimal but less mature; custom matches project patterns better |

**Installation:**
```bash
# No new packages needed - use existing dependencies
```

## Architecture Patterns

### Recommended Project Structure
```
app/
├── lib/
│   ├── providers/
│   │   ├── types.ts           # Provider interface definitions
│   │   ├── registry.ts        # Provider registration & lookup
│   │   └── anthropic.ts       # Anthropic provider implementation
│   ├── models.ts              # Model definitions (expand for multi-provider)
│   └── pricing.ts             # Pricing by provider (expand)
├── services/
│   ├── anthropic.server.ts    # Keep for API key validation, simplify
│   ├── agent-runner.server.ts # Refactor to use provider interface
│   └── pipeline-executor.server.ts  # Refactor to use provider interface
└── db/schema/
    └── api-keys.ts            # Already has provider column
```

### Pattern 1: Provider Interface Pattern
**What:** Define a minimal interface that all providers must implement
**When to use:** When adding new AI providers
**Example:**
```typescript
// Source: Custom pattern derived from AI SDK and codebase analysis

// app/lib/providers/types.ts
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  model: string;
  maxTokens?: number;
  tools?: ToolConfig[];
}

export interface ChatResult {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  citations?: Array<{ url: string; title?: string }>;
}

export interface AIProvider {
  readonly id: string;  // 'anthropic', 'openai', etc.

  /**
   * Execute a chat completion with optional tools.
   */
  chat(
    messages: ChatMessage[],
    options: ChatOptions
  ): Promise<ChatResult>;

  /**
   * Validate that an API key works for this provider.
   */
  validateKey(apiKey: string): Promise<boolean>;

  /**
   * Get available models for this provider.
   */
  getModels(): ProviderModel[];
}

export interface ProviderModel {
  id: string;
  name: string;
  provider: string;
}

export interface ToolConfig {
  type: "web_search" | "web_fetch";
  maxUses?: number;
}
```

### Pattern 2: Provider Registry Pattern
**What:** Central registry for provider lookup by ID
**When to use:** When selecting provider based on model or user preference
**Example:**
```typescript
// app/lib/providers/registry.ts

const providers = new Map<string, AIProvider>();

export function registerProvider(provider: AIProvider): void {
  providers.set(provider.id, provider);
}

export function getProvider(providerId: string): AIProvider {
  const provider = providers.get(providerId);
  if (!provider) {
    throw new Error(`Unknown provider: ${providerId}`);
  }
  return provider;
}

export function getProviderForModel(modelId: string): AIProvider {
  // Model IDs include provider prefix, e.g., "claude-sonnet-4-5-20250929"
  // In Phase 12+, will need mapping logic for OpenAI models
  if (modelId.startsWith("claude-") || modelId.startsWith("anthropic/")) {
    return getProvider("anthropic");
  }
  throw new Error(`Cannot determine provider for model: ${modelId}`);
}

export function getAllProviders(): AIProvider[] {
  return Array.from(providers.values());
}
```

### Pattern 3: Live Agent Reference Pattern
**What:** Store agent IDs in pipeline flowData, fetch fresh data at execution
**When to use:** Always - replaces current snapshot pattern
**Example:**
```typescript
// Current (snapshot - BAD):
flowData.nodes[i].data = {
  agentId: "uuid",
  agentName: "Researcher",        // Snapshot - becomes stale
  agentInstructions: "...",       // Snapshot - becomes stale
};

// New (live reference - GOOD):
flowData.nodes[i].data = {
  agentId: "uuid",
  // No snapshot fields - fetch fresh at execution
};

// In buildStepsFromFlow() - already does fresh fetch!
const [agent] = await db.select().from(agents).where(eq(agents.id, agentId));
```

### Pattern 4: Orphan Handling Pattern
**What:** Gracefully handle deleted agents in pipelines
**When to use:** During pipeline execution and display
**Example:**
```typescript
// In buildStepsFromFlow()
const [agent] = await db.select().from(agents).where(eq(agents.id, agentId));

if (!agent) {
  // Option A: Skip step with warning
  console.warn(`Agent ${agentId} deleted, skipping step`);
  continue;

  // Option B: Fail pipeline run with clear error
  throw new Error(`Agent "${node.data.agentName}" has been deleted. Please update the pipeline.`);

  // Option C: Mark step as orphaned in run record (recommended)
  steps.push({
    agentId,
    agentName: node.data.agentName ?? "Deleted Agent",
    instructions: "",
    order: steps.length,
    isOrphaned: true,
  });
}
```

### Anti-Patterns to Avoid
- **Leaky abstraction:** Don't expose Anthropic-specific types through the provider interface. Keep `TextBlock`, `Tool`, beta headers internal to the Anthropic provider.
- **Over-abstraction:** Don't try to abstract streaming yet. Phase 11 focuses on basic chat completion; streaming abstraction can come in Phase 12+ if needed.
- **Snapshot agent data:** Don't store agent name/instructions in flowData. Store only agentId and fetch fresh.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| API key encryption | Custom crypto | Existing encryption.server.ts | Already working, tested |
| Model pricing | In-memory only | Extend existing pricing.ts | Already has pattern for pricing lookup |
| Topological sort | Custom algorithm | Existing buildStepsFromFlow() | Already implements Kahn's algorithm |
| Provider-model mapping | Complex lookup | Simple prefix matching | Model IDs already encode provider info |

**Key insight:** The codebase already has good foundations. The abstraction layer adds a thin interface over existing code, not a rewrite.

## Common Pitfalls

### Pitfall 1: Breaking Anthropic Beta Features
**What goes wrong:** Abstracting away Anthropic-specific tool formats loses web_search/web_fetch functionality
**Why it happens:** Trying to make tools fully provider-agnostic when Anthropic has unique server-side tools
**How to avoid:** Keep tool handling provider-specific inside provider implementations. The provider interface receives generic tool config, but each provider translates to its format.
**Warning signs:** web_search stops working after refactor

### Pitfall 2: Stale Agent Data in Pipelines
**What goes wrong:** Editing an agent doesn't affect pipelines using it
**Why it happens:** Current code stores agent snapshots in flowData
**How to avoid:** Store only agentId in flowData, fetch fresh data in buildStepsFromFlow() (which already does this - the snapshot is only for UI display)
**Warning signs:** Renaming agent shows old name in pipeline builder

### Pitfall 3: Silent Failures on Deleted Agents
**What goes wrong:** Pipeline runs with missing agents silently skip steps or fail cryptically
**Why it happens:** No check for agent existence before execution
**How to avoid:** Explicit orphan checking with clear error messages
**Warning signs:** Pipelines produce incomplete output, users confused

### Pitfall 4: Provider Registry Initialization Race
**What goes wrong:** Provider requested before registration
**Why it happens:** Module load order not guaranteed in ESM
**How to avoid:** Lazy initialization in registry getter, or ensure providers self-register on module import
**Warning signs:** "Unknown provider: anthropic" errors on first request

### Pitfall 5: Mixing Provider and Model Concepts
**What goes wrong:** Tight coupling between API key lookup and model selection
**Why it happens:** Current code assumes one provider = one API key = one model list
**How to avoid:** Keep model selection separate from API key lookup. A user might have keys for multiple providers.
**Warning signs:** Can't use different providers in same pipeline

## Code Examples

Verified patterns from official sources and codebase:

### Anthropic Provider Implementation
```typescript
// app/lib/providers/anthropic.ts
import Anthropic from "@anthropic-ai/sdk";
import type { TextBlock, Tool } from "@anthropic-ai/sdk/resources/messages";
import type { AIProvider, ChatMessage, ChatOptions, ChatResult, ProviderModel, ToolConfig } from "./types";
import { ANTHROPIC_MODELS } from "~/lib/models";

export class AnthropicProvider implements AIProvider {
  readonly id = "anthropic";
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async chat(messages: ChatMessage[], options: ChatOptions): Promise<ChatResult> {
    const systemMessage = messages.find(m => m.role === "system");
    const conversationMessages = messages
      .filter(m => m.role !== "system")
      .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

    // Build Anthropic-specific tool configuration
    const tools = this.buildTools(options.tools);
    const headers = this.buildHeaders(options.tools);

    const response = await this.client.messages.create(
      {
        model: options.model,
        max_tokens: options.maxTokens ?? 4096,
        system: systemMessage?.content,
        messages: conversationMessages,
        tools: tools.length > 0 ? tools : undefined,
      },
      headers ? { headers } : undefined
    );

    // Extract text and citations
    const textBlocks = response.content.filter(
      (block): block is TextBlock => block.type === "text"
    );

    return {
      content: textBlocks.map(b => b.text).join(""),
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      citations: this.extractCitations(textBlocks),
    };
  }

  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const testClient = new Anthropic({ apiKey });
      await testClient.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      });
      return true;
    } catch {
      return false;
    }
  }

  getModels(): ProviderModel[] {
    return ANTHROPIC_MODELS.map(m => ({
      id: m.id,
      name: m.name,
      provider: "anthropic",
    }));
  }

  private buildTools(config?: ToolConfig[]): Tool[] {
    if (!config?.length) return [];

    const tools: Tool[] = [];
    for (const tool of config) {
      if (tool.type === "web_search") {
        tools.push({
          type: "web_search_20250305",
          name: "web_search",
          max_uses: tool.maxUses ?? 5,
        } as unknown as Tool);
      }
      if (tool.type === "web_fetch") {
        tools.push({
          type: "web_fetch_20250910",
          name: "web_fetch",
          max_uses: tool.maxUses ?? 5,
          max_content_tokens: 25000,
          citations: { enabled: true },
        } as unknown as Tool);
      }
    }
    return tools;
  }

  private buildHeaders(tools?: ToolConfig[]): Record<string, string> | undefined {
    const hasWebFetch = tools?.some(t => t.type === "web_fetch");
    if (hasWebFetch) {
      return { "anthropic-beta": "web-fetch-2025-09-10" };
    }
    return undefined;
  }

  private extractCitations(blocks: TextBlock[]): ChatResult["citations"] {
    const citations: ChatResult["citations"] = [];
    for (const block of blocks) {
      if ("citations" in block && Array.isArray(block.citations)) {
        for (const c of block.citations) {
          if ("url" in c && typeof c.url === "string") {
            citations.push({ url: c.url, title: c.title as string | undefined });
          }
        }
      }
    }
    return citations;
  }
}
```

### Live Agent Fetch in Pipeline Execution
```typescript
// Modified buildStepsFromFlow() with orphan handling
async function buildStepsFromFlow(
  flowData: { nodes: any[]; edges: any[] },
  defaultModel?: string | null
): Promise<PipelineStep[]> {
  const { nodes, edges } = flowData;

  // ... existing topological sort ...

  const steps: PipelineStep[] = [];
  const orphanedAgents: string[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const node = nodes.find((n) => n.id === sorted[i]);
    if (!node || node.type !== "agent") continue;

    const agentId = node.data.agentId;
    const [agent] = await db.select().from(agents).where(eq(agents.id, agentId));

    if (!agent) {
      // Track orphaned agent for error message
      orphanedAgents.push(node.data.agentName ?? agentId);
      continue;
    }

    // ... existing trait loading ...

    steps.push({
      agentId: agent.id,
      agentName: agent.name,  // Fresh from DB
      instructions: agent.instructions,  // Fresh from DB
      order: steps.length,
      traitContext,
      model: agent.model,
    });
  }

  if (orphanedAgents.length > 0) {
    throw new Error(
      `Pipeline cannot run: ${orphanedAgents.length} agent(s) have been deleted: ${orphanedAgents.join(", ")}. Please update the pipeline.`
    );
  }

  return steps;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Provider-specific SDK code | Provider abstraction (AI SDK, custom) | 2024-2025 | Enables multi-provider without rewrites |
| Static agent data in pipelines | Live references, fetch at execution | Best practice | Agent edits reflected immediately |
| Hard delete entities | Soft delete / orphan handling | Best practice | Graceful degradation in dependent entities |

**Deprecated/outdated:**
- LangChain for simple use cases: Overkill for straightforward chat + tools. Use lighter abstractions.
- AI SDK V1 specification: V3 is current. Provider packages must use V2+ for AI SDK 5+.

## Open Questions

Things that couldn't be fully resolved:

1. **Streaming abstraction scope**
   - What we know: Current code doesn't stream to client; uses SSE for progress events only
   - What's unclear: Will Phase 12+ need streaming text to client?
   - Recommendation: Defer streaming abstraction. Current SSE pattern works; expand if needed later.

2. **Tool capability negotiation**
   - What we know: Anthropic has web_search/web_fetch; OpenAI has different tools
   - What's unclear: How to handle when user requests web_search but provider doesn't support it
   - Recommendation: Phase 12 research should define capability flags per provider. For Phase 11, Anthropic has all needed capabilities.

3. **Multi-key per provider**
   - What we know: Current schema has one key per user per provider
   - What's unclear: Will users need multiple keys for same provider (e.g., org + personal)?
   - Recommendation: Defer. One key per provider is simpler and covers 90% of cases.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `app/services/anthropic.server.ts`, `run-with-tools.server.ts`, `job-queue.server.ts`
- Codebase analysis: `app/db/schema/api-keys.ts` (has provider column), `app/stores/pipeline-store.ts`
- Anthropic SDK documentation via WebSearch - tool use patterns, beta headers

### Secondary (MEDIUM confidence)
- [Vercel AI SDK](https://ai-sdk.dev/docs/introduction) - Provider abstraction patterns, interface design
- [AI SDK Custom Providers](https://ai-sdk.dev/providers/community-providers/custom-providers) - LanguageModelV3 specification
- [AI SDK Anthropic Provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic) - Anthropic-specific tool patterns
- WebSearch results for multi-provider abstraction patterns - confirms registry pattern is standard

### Tertiary (LOW confidence)
- [TetherAI](https://medium.com/@nbursa/tetherai-a-minimal-typescript-sdk-for-ai-provider-abstraction-2800d4721669) - Alternative minimal abstraction approach
- WebSearch for orphan handling patterns - common but implementation-specific

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Based on existing codebase, no new dependencies needed
- Architecture: HIGH - Patterns derived from AI SDK and adapted to existing code
- Pitfalls: HIGH - Identified from codebase analysis and common patterns
- Live agent relationship: HIGH - Clear path from current to target architecture
- Orphan handling: MEDIUM - Multiple valid approaches, recommendation is reasonable

**Research date:** 2026-01-29
**Valid until:** 60 days (stable domain, custom implementation)
