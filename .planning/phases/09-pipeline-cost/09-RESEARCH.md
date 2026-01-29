# Phase 9: Pipeline & Cost - Research

**Researched:** 2026-01-29
**Domain:** Pipeline execution with unified tools, token usage tracking, cost estimation
**Confidence:** HIGH

## Summary

Phase 9 completes the v1.1 milestone by bringing pipeline execution up to parity with the agent test dialog (unified tools) and adding cost visibility. The core work is straightforward: (1) refactor `pipeline-executor.server.ts` to use `runWithTools` instead of direct `client.messages.stream()`, (2) accumulate token usage across all steps, (3) calculate estimated cost based on model pricing, and (4) display results in the UI.

The unified tools pattern (established in Phase 8) means all agents have access to `web_search` and `web_fetch` automatically - the model decides what to use based on context. The Anthropic SDK's `finalMessage()` method provides usage data (input/output tokens) after each step completes. Cost calculation uses the official pricing: Opus 4.5 ($5/$25 per MTok), Sonnet 4.5 ($3/$15 per MTok), Haiku 4.5 ($1/$5 per MTok).

**Primary recommendation:** Replace streaming in pipeline executor with `runWithTools` calls, accumulate usage data in a new `pipeline_complete` event payload, and display tokens + estimated cost in the completion UI.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @anthropic-ai/sdk | 0.71+ | AI execution with tools | Existing `runWithTools` helper handles web_search + web_fetch |
| drizzle-orm | existing | Database operations | Existing schema can store usage data |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| No new dependencies | - | - | All functionality built on existing stack |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom cost calculation | Third-party pricing API | APIs can be stale; static map is simpler and sufficient |
| Storing cost per step | Storing total cost per run | Per-step gives more granularity but adds complexity; total is sufficient for v1.1 |

**Installation:**
```bash
# No new packages needed - using existing stack
```

## Architecture Patterns

### Recommended Project Structure
```
app/
├── lib/
│   └── pricing.ts                    # NEW: Model pricing constants + calculation
├── services/
│   ├── pipeline-executor.server.ts   # MODIFY: Use runWithTools, accumulate usage
│   └── run-emitter.server.ts         # MODIFY: Add usage to pipeline_complete event
├── db/schema/
│   └── pipeline-runs.ts              # MODIFY: Add totalInputTokens, totalOutputTokens columns
└── components/
    └── pipeline-runner/
        └── run-progress.tsx          # MODIFY: Display cost summary on completion
```

### Pattern 1: Unified Tools Execution
**What:** Use `runWithTools` for each pipeline step instead of direct streaming
**When to use:** All pipeline step executions
**Example:**
```typescript
// Source: Existing run-with-tools.server.ts pattern
import { runWithTools } from '~/services/capabilities/run-with-tools.server';

interface StepResult {
  content: string;
  usage: { inputTokens: number; outputTokens: number };
}

async function executeStep(
  client: Anthropic,
  model: string,
  systemPrompt: string,
  userInput: string
): Promise<StepResult> {
  const result = await runWithTools({
    client,
    model,
    systemPrompt,
    userInput,
  });

  return {
    content: result.content,
    usage: result.usage,
  };
}
```

### Pattern 2: Usage Accumulation
**What:** Sum input/output tokens across all steps in a pipeline run
**When to use:** After each step completes, track running totals
**Example:**
```typescript
// Source: Derived from existing pipeline executor pattern
interface RunUsage {
  totalInputTokens: number;
  totalOutputTokens: number;
}

async function executePipeline(params: ExecutePipelineParams) {
  const runUsage: RunUsage = { totalInputTokens: 0, totalOutputTokens: 0 };

  for (const step of steps) {
    const result = await executeStep(client, model, step.instructions, currentInput);

    // Accumulate usage
    runUsage.totalInputTokens += result.usage.inputTokens;
    runUsage.totalOutputTokens += result.usage.outputTokens;

    currentInput = result.content;
  }

  // Emit with usage data
  runEmitter.emitRunEvent(runId, {
    type: 'pipeline_complete',
    finalOutput: currentInput,
    usage: runUsage,
  });
}
```

### Pattern 3: Cost Calculation
**What:** Calculate estimated cost from token counts and model pricing
**When to use:** When displaying cost to user after pipeline completion
**Example:**
```typescript
// Source: Anthropic pricing documentation
// app/lib/pricing.ts

interface ModelPricing {
  inputPerMillion: number;  // USD
  outputPerMillion: number; // USD
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  'claude-opus-4-5-20251101': { inputPerMillion: 5, outputPerMillion: 25 },
  'claude-sonnet-4-5-20250929': { inputPerMillion: 3, outputPerMillion: 15 },
  'claude-haiku-4-5-20251001': { inputPerMillion: 1, outputPerMillion: 5 },
};

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['claude-sonnet-4-5-20250929'];

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;

  return inputCost + outputCost;
}

export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `<$0.01`;
  }
  return `$${cost.toFixed(2)}`;
}
```

### Pattern 4: Usage in SSE Events
**What:** Include usage data in the `pipeline_complete` event
**When to use:** When emitting completion to client
**Example:**
```typescript
// Source: Extending existing RunEvent type
// app/services/run-emitter.server.ts

export type RunEvent =
  | { type: 'step_start'; stepIndex: number; agentName: string }
  | { type: 'text_delta'; stepIndex: number; text: string }
  | { type: 'step_complete'; stepIndex: number; output: string }
  | {
      type: 'pipeline_complete';
      finalOutput: string;
      usage?: { inputTokens: number; outputTokens: number };
      model?: string;
    }
  | { type: 'error'; stepIndex?: number; message: string };
```

### Anti-Patterns to Avoid
- **Fetching pricing from external API:** Don't make HTTP calls for pricing. Use static pricing map updated with model updates.
- **Storing cost instead of tokens:** Store raw token counts; calculate cost at display time. Pricing can change.
- **Per-step cost calculation:** Calculate once at the end, not per step. Reduces complexity.
- **Forgetting model in completion event:** Include model in event so client can calculate cost without separate lookup.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token counting from text | Manual string.length conversion | Anthropic API usage field | API provides exact token counts |
| Tool availability check | Custom capability detection | runWithTools with both tools | Model decides; simplifies code |
| Cost calculation precision | Complex floating point | Simple division + toFixed(2) | USD precision to cents is sufficient |

**Key insight:** The Anthropic SDK provides usage data automatically - no need to estimate or count tokens manually.

## Common Pitfalls

### Pitfall 1: Losing Streaming Granularity
**What goes wrong:** Switching from `stream()` to `runWithTools` loses real-time text streaming
**Why it happens:** `runWithTools` is not a streaming API - it returns complete response
**How to avoid:** This is a known tradeoff. For v1.1, full response per step is acceptable. If streaming is critical, need to modify `runWithTools` to support streaming mode (future enhancement).
**Warning signs:** UI shows "loading" for each step instead of streaming text

### Pitfall 2: Missing Model Information
**What goes wrong:** Can't calculate cost because model not available on client
**Why it happens:** Model is determined server-side, not passed to client
**How to avoid:** Include model in the `pipeline_complete` event payload
**Warning signs:** Cost shows as "$0.00" or "unknown"

### Pitfall 3: Stale Pricing Data
**What goes wrong:** Displayed cost is inaccurate after Anthropic pricing changes
**Why it happens:** Static pricing map not updated when Anthropic changes prices
**How to avoid:** Keep pricing map in a single file; update when models change; add comments with "last verified" date
**Warning signs:** Users report costs don't match their actual bills

### Pitfall 4: Forgetting Trait Context in Pipeline
**What goes wrong:** Traits assigned to agents aren't included when running in pipeline
**Why it happens:** Pipeline executor uses raw agent instructions, not built system prompt
**How to avoid:** Load agent traits and use `buildSystemPrompt` pattern from agent-runner
**Warning signs:** Agent behavior differs between test dialog and pipeline execution

## Code Examples

Verified patterns from official sources:

### Modified Pipeline Executor
```typescript
// Source: Combination of existing executor + runWithTools pattern
// app/services/pipeline-executor.server.ts

import { runWithTools } from './capabilities/run-with-tools.server';

interface PipelineStep {
  agentId: string;
  agentName: string;
  instructions: string;
  order: number;
  traitContext?: string; // NEW: Include trait context
}

interface PipelineUsage {
  totalInputTokens: number;
  totalOutputTokens: number;
}

export async function executePipeline(params: ExecutePipelineParams): Promise<void> {
  const { runId, steps, initialInput, encryptedApiKey, model, variables } = params;
  const client = createAnthropicClient(encryptedApiKey);

  let currentInput = initialInput;
  const usage: PipelineUsage = { totalInputTokens: 0, totalOutputTokens: 0 };

  try {
    for (const step of steps) {
      // Emit step start
      runEmitter.emitRunEvent(runId, {
        type: 'step_start',
        stepIndex: step.order,
        agentName: step.agentName,
      });

      // Build system prompt with trait context
      const systemPrompt = buildSystemPrompt(
        substituteVariables(step.instructions, variables),
        step.traitContext
      );

      // Execute with unified tools
      const result = await runWithTools({
        client,
        model,
        systemPrompt,
        userInput: currentInput || 'Please proceed with your instructions.',
      });

      // Accumulate usage
      usage.totalInputTokens += result.usage.inputTokens;
      usage.totalOutputTokens += result.usage.outputTokens;

      // Emit step complete
      runEmitter.emitRunEvent(runId, {
        type: 'step_complete',
        stepIndex: step.order,
        output: result.content,
      });

      currentInput = result.content;
    }

    // Emit pipeline complete with usage
    runEmitter.emitRunEvent(runId, {
      type: 'pipeline_complete',
      finalOutput: currentInput,
      usage: {
        inputTokens: usage.totalInputTokens,
        outputTokens: usage.totalOutputTokens,
      },
      model,
    });
  } catch (error) {
    // ... error handling
  }
}
```

### Pricing Module
```typescript
// Source: Anthropic official pricing page (Jan 2026)
// app/lib/pricing.ts

export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

// Last verified: 2026-01-29
// Source: https://platform.claude.com/docs/en/about-claude/pricing
export const MODEL_PRICING: Record<string, ModelPricing> = {
  'claude-opus-4-5-20251101': { inputPerMillion: 5, outputPerMillion: 25 },
  'claude-sonnet-4-5-20250929': { inputPerMillion: 3, outputPerMillion: 15 },
  'claude-haiku-4-5-20251001': { inputPerMillion: 1, outputPerMillion: 5 },
};

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['claude-sonnet-4-5-20250929'];
  return (inputTokens / 1_000_000) * pricing.inputPerMillion +
         (outputTokens / 1_000_000) * pricing.outputPerMillion;
}

export function formatCost(cost: number): string {
  if (cost < 0.01) return '<$0.01';
  return `$${cost.toFixed(2)}`;
}

export function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}
```

### Updated RunEvent Types
```typescript
// Source: Extending existing run-emitter types
// app/services/run-emitter.server.ts

export type RunEvent =
  | { type: 'step_start'; stepIndex: number; agentName: string }
  | { type: 'text_delta'; stepIndex: number; text: string }
  | { type: 'step_complete'; stepIndex: number; output: string }
  | {
      type: 'pipeline_complete';
      finalOutput: string;
      usage?: { inputTokens: number; outputTokens: number };
      model?: string;
    }
  | { type: 'error'; stepIndex?: number; message: string };
```

### Cost Display in UI
```typescript
// Source: Pattern for run-progress.tsx completion section
// app/components/pipeline-runner/run-progress.tsx

import { calculateCost, formatCost, formatTokens } from '~/lib/pricing';

// In completion section:
{status === 'completed' && usage && model && (
  <div className="mt-4 p-3 bg-muted rounded-lg">
    <h4 className="text-sm font-medium mb-2">Usage Summary</h4>
    <div className="grid grid-cols-2 gap-2 text-sm">
      <div>
        <span className="text-muted-foreground">Input tokens:</span>
        <span className="ml-2 font-mono">{formatTokens(usage.inputTokens)}</span>
      </div>
      <div>
        <span className="text-muted-foreground">Output tokens:</span>
        <span className="ml-2 font-mono">{formatTokens(usage.outputTokens)}</span>
      </div>
      <div className="col-span-2">
        <span className="text-muted-foreground">Estimated cost:</span>
        <span className="ml-2 font-medium">
          {formatCost(calculateCost(model, usage.inputTokens, usage.outputTokens))}
        </span>
      </div>
    </div>
  </div>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate capability services | Unified `runWithTools` | Phase 8 | Simplified code, model decides |
| No cost visibility | Token + cost display | Phase 9 | User transparency |
| Streaming per step | Full response per step | Phase 9 | Simpler but loses real-time |

**Deprecated/outdated:**
- Individual capability services (`web-search.server.ts`, `url-fetch.server.ts`) still exist but are no longer the primary execution path
- `text-generation.server.ts` used for basic responses, but `runWithTools` is now preferred

## Open Questions

Things that couldn't be fully resolved:

1. **Streaming with unified tools**
   - What we know: `runWithTools` returns complete response, not streaming
   - What's unclear: Whether streaming is important enough to preserve for pipeline UX
   - Recommendation: Accept non-streaming for v1.1; if user feedback demands streaming, refactor in future phase

2. **Cost for tool usage itself**
   - What we know: Web search has additional cost ($10/1000 searches); web fetch is free beyond tokens
   - What's unclear: Whether to track and display search count separately
   - Recommendation: For v1.1, only show token costs; search costs are typically negligible for normal usage

3. **Database storage of usage**
   - What we know: We could add columns to `pipeline_runs` for token totals
   - What's unclear: Whether historical usage data is valuable enough to store
   - Recommendation: Add columns for future analytics, but don't block on complex reporting

## Sources

### Primary (HIGH confidence)
- [Anthropic Pricing Documentation](https://platform.claude.com/docs/en/about-claude/pricing) - Official pricing table for Claude 4.5 models
- [Anthropic SDK TypeScript](https://github.com/anthropics/anthropic-sdk-typescript) - MessageStream API, usage data in finalMessage()
- Existing codebase: `run-with-tools.server.ts`, `pipeline-executor.server.ts`

### Secondary (MEDIUM confidence)
- [Anthropic Messages Streaming Docs](https://docs.anthropic.com/en/api/messages-streaming) - Usage data structure in responses
- [Anthropic SDK helpers.md](https://github.com/anthropics/anthropic-sdk-typescript/blob/main/helpers.md) - finalMessage() returns complete Message with usage

### Tertiary (LOW confidence)
- Community patterns for displaying API costs to end users

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing codebase patterns, no new dependencies
- Architecture: HIGH - Clear integration path with existing executor
- Pitfalls: MEDIUM - Streaming tradeoff is known; trait context integration needs verification

**Research date:** 2026-01-29
**Valid until:** ~2026-02-28 (30 days - pricing may change, but patterns are stable)
