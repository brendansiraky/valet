# Phase 5: Execution Engine - Research

**Researched:** 2026-01-28
**Domain:** Pipeline execution with real-time streaming, job queue management
**Confidence:** HIGH

## Summary

Phase 5 implements the execution engine that runs pipelines sequentially, passing output between agents while streaming progress to the user in real-time. The core technical challenge is coordinating three layers: (1) background job processing for reliable execution, (2) Anthropic SDK streaming for agent responses, and (3) Server-Sent Events (SSE) for delivering real-time updates to the browser.

The standard approach uses pg-boss for PostgreSQL-native job queuing (no Redis required), the Anthropic SDK's `.stream()` method for token-by-token output, and remix-utils' `eventStream` helper for SSE delivery to React clients. Pipeline state is tracked in a new `pipeline_runs` table with agent-level progress stored in `pipeline_run_steps`.

**Primary recommendation:** Use a two-layer streaming architecture: pg-boss manages pipeline execution reliability (retry, state persistence), while SSE streams real-time text output directly from Anthropic to the browser without buffering entire responses.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pg-boss | 12.7.1 | Job queue | PostgreSQL-native, exactly-once delivery, no Redis |
| @anthropic-ai/sdk | 0.71.2+ | AI streaming | Native `.stream()` with event helpers |
| remix-utils | 9.0.0 | SSE helpers | `eventStream` + `useEventSource` for React Router |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| events (Node.js) | built-in | EventEmitter | Bridge between job worker and SSE endpoint |
| zod | 4.x | Validation | Type-safe job data and run parameters |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pg-boss | BullMQ | BullMQ needs Redis; pg-boss uses existing PostgreSQL |
| SSE | WebSockets | WebSockets are bidirectional (overkill); SSE simpler for one-way streaming |
| remix-utils SSE | Native EventSource | remix-utils handles connection pooling and cleanup |

**Installation:**
```bash
npm install pg-boss remix-utils
```

## Architecture Patterns

### Recommended Project Structure
```
app/
├── services/
│   ├── pipeline-executor.server.ts    # Core execution logic
│   ├── job-queue.server.ts            # pg-boss singleton
│   └── run-emitter.server.ts          # EventEmitter for SSE bridge
├── routes/
│   ├── api.pipeline.$pipelineId.run.ts       # Start execution
│   └── api.pipeline.run.$runId.stream.ts     # SSE endpoint
├── db/schema/
│   └── pipeline-runs.ts               # New tables for run tracking
└── components/
    └── pipeline-runner/
        ├── run-progress.tsx           # Real-time progress UI
        └── agent-output.tsx           # Streaming output display
```

### Pattern 1: Sequential Pipeline Execution
**What:** Execute agents one-by-one, passing each output as input to the next
**When to use:** All pipeline executions (this is the core pattern)
**Example:**
```typescript
// Source: Anthropic streaming docs + pipeline pattern
interface PipelineStep {
  agentId: string;
  agentName: string;
  instructions: string;
  order: number;
}

async function executePipeline(
  runId: string,
  steps: PipelineStep[],
  initialInput: string,
  client: Anthropic,
  model: string,
  emitter: EventEmitter
) {
  let currentInput = initialInput;

  for (const step of steps) {
    // Emit step start
    emitter.emit(`run:${runId}`, {
      type: 'step_start',
      stepIndex: step.order,
      agentName: step.agentName,
    });

    // Stream agent response
    const stream = client.messages.stream({
      model,
      max_tokens: 4096,
      system: step.instructions,
      messages: [{ role: 'user', content: currentInput }],
    });

    let fullOutput = '';

    stream.on('text', (text) => {
      fullOutput += text;
      emitter.emit(`run:${runId}`, {
        type: 'text_delta',
        stepIndex: step.order,
        text,
      });
    });

    await stream.finalMessage();

    // Pass output to next agent
    currentInput = fullOutput;

    emitter.emit(`run:${runId}`, {
      type: 'step_complete',
      stepIndex: step.order,
      output: fullOutput,
    });
  }

  emitter.emit(`run:${runId}`, { type: 'pipeline_complete' });
}
```

### Pattern 2: SSE Bridge with EventEmitter
**What:** Use Node.js EventEmitter to bridge job worker events to SSE endpoint
**When to use:** Streaming real-time updates to browser
**Example:**
```typescript
// Source: remix-utils SSE docs + Node.js EventEmitter
// app/services/run-emitter.server.ts
import { EventEmitter } from 'events';

// Global singleton - survives across requests
export const runEmitter = new EventEmitter();
runEmitter.setMaxListeners(100); // Allow many concurrent runs

// app/routes/api.pipeline.run.$runId.stream.ts
import { eventStream } from 'remix-utils/sse/server';
import { runEmitter } from '~/services/run-emitter.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const runId = params.runId;

  return eventStream(request.signal, function setup(send) {
    function handleEvent(data: unknown) {
      send({ event: 'update', data: JSON.stringify(data) });
    }

    runEmitter.on(`run:${runId}`, handleEvent);

    return function cleanup() {
      runEmitter.off(`run:${runId}`, handleEvent);
    };
  });
}
```

### Pattern 3: Anthropic Streaming with Tool Use
**What:** Stream responses even when agents use web_search or web_fetch
**When to use:** When agents have capabilities enabled
**Example:**
```typescript
// Source: Anthropic streaming docs - tool use section
const stream = client.messages.stream({
  model,
  max_tokens: 4096,
  system: agent.instructions,
  messages: [{ role: 'user', content: input }],
  tools: [
    { type: 'web_search_20250305', name: 'web_search', max_uses: 5 }
  ],
});

// Stream events include tool use blocks
stream.on('contentBlock', (block) => {
  if (block.type === 'text') {
    // Text content streamed via 'text' event
  } else if (block.type === 'server_tool_use') {
    // Tool invocation (web_search, web_fetch)
    emitter.emit(`run:${runId}`, {
      type: 'tool_use',
      tool: block.name,
    });
  } else if (block.type === 'web_search_tool_result') {
    // Search results received
    emitter.emit(`run:${runId}`, {
      type: 'tool_result',
      tool: 'web_search',
    });
  }
});
```

### Anti-Patterns to Avoid
- **Buffering entire responses:** Don't wait for full agent response before sending to client. Stream token-by-token.
- **Polling for updates:** Don't poll the database for run status. Use SSE for push-based updates.
- **Storing streaming state in database:** Don't write every text delta to DB. Only persist final step outputs.
- **Tight coupling job worker to HTTP:** Don't make HTTP requests from job worker. Use EventEmitter bridge.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Job retry logic | Custom retry with setTimeout | pg-boss retryLimit/retryDelay | Handles exponential backoff, dead letter queues |
| SSE connection management | Raw EventSource + cleanup | remix-utils useEventSource | Handles reconnection, connection pooling per domain |
| Stream accumulation | Manual text concatenation | Anthropic SDK .finalMessage() | Handles all content types, proper usage tracking |
| Job state machine | Custom status enum + transitions | pg-boss job states | Built-in created/active/completed/failed/retry |

**Key insight:** pg-boss provides exactly-once delivery and ACID-compliant job state transitions. Custom job tracking will have race conditions and lost updates under load.

## Common Pitfalls

### Pitfall 1: EventEmitter Memory Leaks
**What goes wrong:** Creating new EventEmitter per request causes memory leaks
**Why it happens:** EventEmitter listeners accumulate if not cleaned up
**How to avoid:** Use a singleton EventEmitter, always remove listeners in cleanup function
**Warning signs:** Memory usage grows over time, "MaxListenersExceededWarning"

### Pitfall 2: SSE Connection Limits
**What goes wrong:** Browsers limit 6 HTTP connections per domain, SSE counts toward this
**Why it happens:** Each useEventSource opens a persistent connection
**How to avoid:** remix-utils pools connections by URL; don't create duplicate SSE endpoints
**Warning signs:** SSE connections fail to establish, long loading times

### Pitfall 3: Lost Streaming on Errors
**What goes wrong:** Network error mid-stream loses partial response
**Why it happens:** No recovery mechanism for interrupted streams
**How to avoid:** Persist step outputs after each agent completes; client can fetch partial results
**Warning signs:** Users see empty output after errors

### Pitfall 4: pg-boss Not Starting
**What goes wrong:** Jobs never process
**Why it happens:** `boss.start()` not called, or called after workers registered
**How to avoid:** Call `boss.start()` once at app startup, before registering workers
**Warning signs:** Jobs stay in 'created' state indefinitely

### Pitfall 5: Anthropic Stream Cancellation
**What goes wrong:** User navigates away, stream keeps running and billing
**Why it happens:** Stream not aborted when SSE connection closes
**How to avoid:** Pass AbortSignal to stream, abort when SSE cleanup runs
**Warning signs:** Unexpected API charges, orphaned streams

## Code Examples

Verified patterns from official sources:

### pg-boss Setup and Job Processing
```typescript
// Source: pg-boss GitHub README
// app/services/job-queue.server.ts
import PgBoss from 'pg-boss';

let boss: PgBoss | null = null;

export async function getJobQueue(): Promise<PgBoss> {
  if (boss) return boss;

  boss = new PgBoss(process.env.DATABASE_URL!);
  boss.on('error', (err) => console.error('pg-boss error:', err));

  await boss.start();

  // Create queue for pipeline runs
  await boss.createQueue('pipeline-run');

  return boss;
}

// Register worker
export async function registerPipelineWorker(
  handler: (job: PgBoss.Job<PipelineRunJob>) => Promise<void>
) {
  const queue = await getJobQueue();
  await queue.work('pipeline-run', async ([job]) => {
    await handler(job);
  });
}
```

### Starting a Pipeline Run
```typescript
// Source: Combination of pg-boss send() and Drizzle insert
// app/routes/api.pipeline.$pipelineId.run.ts
export async function action({ request, params }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get('Cookie'));
  const userId = session.get('userId');
  if (!userId) return json({ error: 'Unauthorized' }, 401);

  const pipelineId = params.pipelineId;
  const formData = await request.formData();
  const input = formData.get('input') as string;
  const variables = JSON.parse(formData.get('variables') as string || '{}');

  // Create run record
  const [run] = await db.insert(pipelineRuns).values({
    pipelineId,
    userId,
    input,
    variables,
    status: 'pending',
  }).returning();

  // Queue job
  const queue = await getJobQueue();
  await queue.send('pipeline-run', {
    runId: run.id,
    pipelineId,
    userId,
    input,
  }, {
    retryLimit: 2,
    retryDelay: 5000,
  });

  return json({ runId: run.id });
}
```

### Client-Side Streaming Hook
```typescript
// Source: remix-utils useEventSource docs
// app/components/pipeline-runner/use-run-stream.ts
import { useEventSource } from 'remix-utils/sse/react';
import { useState, useEffect } from 'react';

interface RunEvent {
  type: 'step_start' | 'text_delta' | 'step_complete' | 'pipeline_complete' | 'error';
  stepIndex?: number;
  agentName?: string;
  text?: string;
  output?: string;
  error?: string;
}

export function useRunStream(runId: string | null) {
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [streamingText, setStreamingText] = useState('');

  const lastEvent = useEventSource(
    runId ? `/api/pipeline/run/${runId}/stream` : null,
    { event: 'update' }
  );

  useEffect(() => {
    if (!lastEvent) return;

    const event: RunEvent = JSON.parse(lastEvent);
    setEvents((prev) => [...prev, event]);

    switch (event.type) {
      case 'step_start':
        setCurrentStep(event.stepIndex!);
        setStreamingText('');
        break;
      case 'text_delta':
        setStreamingText((prev) => prev + event.text);
        break;
      case 'step_complete':
        // Step finished, output stored
        break;
      case 'pipeline_complete':
        // All done
        break;
    }
  }, [lastEvent]);

  return { events, currentStep, streamingText };
}
```

### Database Schema for Run Tracking
```typescript
// Source: Drizzle ORM patterns from existing codebase
// app/db/schema/pipeline-runs.ts
import { pgTable, text, timestamp, jsonb, integer, index } from 'drizzle-orm/pg-core';
import { pipelines } from './pipelines';
import { users } from './users';

export const pipelineRuns = pgTable('pipeline_runs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  pipelineId: text('pipeline_id').notNull()
    .references(() => pipelines.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').notNull().$type<'pending' | 'running' | 'completed' | 'failed'>(),
  input: text('input').notNull(),
  variables: jsonb('variables').$type<Record<string, string>>(),
  finalOutput: text('final_output'),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
}, (table) => [
  index('pipeline_runs_user_id_idx').on(table.userId),
  index('pipeline_runs_pipeline_id_idx').on(table.pipelineId),
]);

export const pipelineRunSteps = pgTable('pipeline_run_steps', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  runId: text('run_id').notNull()
    .references(() => pipelineRuns.id, { onDelete: 'cascade' }),
  agentId: text('agent_id').notNull(),
  stepOrder: integer('step_order').notNull(),
  status: text('status').notNull().$type<'pending' | 'running' | 'completed' | 'failed'>(),
  input: text('input'),
  output: text('output'),
  error: text('error'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
}, (table) => [
  index('pipeline_run_steps_run_id_idx').on(table.runId),
]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Polling for job status | SSE push updates | Standard | Instant feedback, reduced DB load |
| Full response then display | Token streaming | Anthropic SDK | Better UX, lower perceived latency |
| Redis for job queue | PostgreSQL (pg-boss) | pg-boss matured | Simpler infra, one database |
| Custom retry logic | pg-boss retryLimit | Always available | Reliable, exponential backoff |

**Deprecated/outdated:**
- `messages.create({ stream: true })` returns raw iterable; prefer `.stream()` for helper methods
- Bull/BullMQ for simple job queues (requires Redis, unnecessary complexity)

## Open Questions

Things that couldn't be fully resolved:

1. **pg-boss initialization timing in React Router**
   - What we know: pg-boss needs `start()` called once; workers registered after
   - What's unclear: Best place to initialize in React Router app lifecycle
   - Recommendation: Create a separate worker process or use loader-level lazy init

2. **Handling very long pipelines**
   - What we know: SSE connections may timeout after 30-60 seconds of inactivity
   - What's unclear: Best heartbeat/keepalive strategy
   - Recommendation: Send periodic ping events; allow client reconnection with state recovery

3. **Combining capabilities in streaming**
   - What we know: web_search and web_fetch both work with streaming
   - What's unclear: Behavior when both are enabled simultaneously
   - Recommendation: Test during implementation; may need to serialize tool usage

## Sources

### Primary (HIGH confidence)
- [Anthropic SDK TypeScript streaming.ts](https://github.com/anthropics/anthropic-sdk-typescript/blob/main/examples/streaming.ts) - Streaming example code
- [Anthropic helpers.md](https://github.com/anthropics/anthropic-sdk-typescript/blob/main/helpers.md) - MessageStream API
- [Anthropic Messages Streaming Docs](https://platform.claude.com/docs/en/api/messages-streaming) - Event types, tool use streaming
- [pg-boss GitHub](https://github.com/timgit/pg-boss) - Core API, job states
- [remix-utils SSE tutorial](https://sergiodxa.com/tutorials/use-server-sent-events-with-remix) - eventStream pattern
- [remix-utils GitHub](https://github.com/sergiodxa/remix-utils) - Import paths for v9

### Secondary (MEDIUM confidence)
- [TanStack Query SSE discussion](https://github.com/TanStack/query/discussions/418) - Patterns for SSE + React Query
- [LogSnag pg-boss TypeScript guide](https://logsnag.com/blog/deep-dive-into-background-jobs-with-pg-boss-and-typescript) - TypeScript patterns
- [Google Multi-Agent Design Patterns](https://www.infoq.com/news/2026/01/multi-agent-design-patterns/) - Sequential pipeline pattern

### Tertiary (LOW confidence)
- Community blog posts on SSE reconnection strategies

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries have official docs, verified APIs
- Architecture: HIGH - Patterns derived from official examples
- Pitfalls: MEDIUM - Some based on community reports, not personally verified

**Research date:** 2026-01-28
**Valid until:** ~2026-02-28 (30 days - stable libraries)
