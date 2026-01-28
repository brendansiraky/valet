# Architecture Research

**Domain:** AI Agent Pipeline Builder / Visual AI Workflow Tool
**Researched:** 2026-01-28
**Confidence:** HIGH (multiple authoritative sources: Anthropic official docs, Azure Architecture Center, LangGraph documentation patterns, industry implementations)

## Standard Architecture

### System Overview

```
                              USER INTERFACE LAYER
┌─────────────────────────────────────────────────────────────────────────────┐
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Template   │  │   Agent     │  │  Pipeline   │  │  Document   │        │
│  │   Editor    │  │  Config UI  │  │  Run View   │  │  Download   │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                │               │
├─────────┴────────────────┴────────────────┴────────────────┴───────────────┤
│                           API / ACTION LAYER                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Remix Actions/Loaders  |  SSE Endpoints  |  WebSocket (optional)   │   │
│  └───────────────────────────────────┬─────────────────────────────────┘   │
├──────────────────────────────────────┼─────────────────────────────────────┤
│                         ORCHESTRATION LAYER                                 │
│  ┌─────────────────┐  ┌──────────────┴───────────────┐  ┌──────────────┐   │
│  │ Template Engine │  │     Pipeline Executor        │  │  Job Queue   │   │
│  │  (CRUD + Wire)  │  │  (Sequential Agent Runner)   │  │  (pg-boss)   │   │
│  └────────┬────────┘  └──────────────┬───────────────┘  └──────┬───────┘   │
│           │                          │                          │          │
├───────────┴──────────────────────────┴──────────────────────────┴──────────┤
│                          INTELLIGENCE LAYER                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐     │
│  │  Agent Runtime  │  │  Anthropic SDK  │  │  Prompt Template Engine │     │
│  │  (exec single)  │  │  (LLM calls)    │  │  (instruction assembly) │     │
│  └────────┬────────┘  └────────┬────────┘  └────────────┬────────────┘     │
│           │                    │                        │                  │
├───────────┴────────────────────┴────────────────────────┴──────────────────┤
│                           DATA LAYER                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Templates  │  │    Agents    │  │  Executions  │  │  Artifacts   │    │
│  │   (Drizzle)  │  │   (Drizzle)  │  │  (Drizzle)   │  │ (File Store) │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                   PostgreSQL
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Template Editor | Define reusable pipeline blueprints; wire agents in sequence | React form with drag-drop ordering or list-based UI |
| Agent Config UI | Define single agent: name, instructions, model params | Form with instruction textarea, model/temperature selectors |
| Pipeline Run View | Display execution progress; show stage status in real-time | SSE-powered progress indicator, stage-by-stage output display |
| Document Download | Retrieve and download final pipeline artifacts | File download endpoint, optional preview |
| Template Engine | CRUD for templates; validate agent ordering; persist wiring | Remix actions + Drizzle ORM |
| Pipeline Executor | Orchestrate sequential agent execution; manage state between stages | Job queue processor; sequential loop with state passing |
| Job Queue | Background processing; retry logic; execution isolation | pg-boss (PostgreSQL-native job queue) |
| Agent Runtime | Execute single agent: build prompt, call LLM, extract output | Anthropic SDK wrapper with retry/error handling |
| Anthropic SDK | Direct LLM communication; streaming responses | @anthropic-ai/sdk with streaming enabled |
| Prompt Template Engine | Assemble final prompt from agent instructions + previous outputs | String interpolation with variable substitution |

## Recommended Project Structure

```
app/
├── routes/                    # Remix route modules
│   ├── _index.tsx             # Dashboard / landing
│   ├── templates/             # Template CRUD routes
│   │   ├── _layout.tsx
│   │   ├── new.tsx
│   │   ├── $templateId.tsx
│   │   └── $templateId.edit.tsx
│   ├── pipelines/             # Pipeline execution routes
│   │   ├── run.$templateId.tsx
│   │   └── $executionId.tsx
│   ├── api/                   # API-only routes
│   │   ├── executions.$id.stream.ts  # SSE endpoint
│   │   └── artifacts.$id.download.ts
│   └── auth/                  # Auth routes (Lucia)
├── components/                # Shared UI components
│   ├── template/              # Template-specific components
│   ├── pipeline/              # Execution-specific components
│   └── ui/                    # shadcn/ui primitives
├── lib/                       # Core business logic
│   ├── pipeline/              # Pipeline execution engine
│   │   ├── executor.server.ts      # Main execution orchestrator
│   │   ├── agent-runner.server.ts  # Single agent execution
│   │   ├── state-manager.server.ts # State between stages
│   │   └── types.ts
│   ├── anthropic/             # Anthropic SDK wrapper
│   │   ├── client.server.ts
│   │   └── streaming.server.ts
│   ├── queue/                 # Job queue (pg-boss)
│   │   ├── client.server.ts
│   │   ├── handlers/
│   │   │   └── pipeline.server.ts
│   │   └── types.ts
│   └── auth/                  # Auth utilities (Lucia)
├── db/                        # Database layer
│   ├── schema/                # Drizzle schema files
│   │   ├── users.ts
│   │   ├── templates.ts
│   │   ├── agents.ts
│   │   ├── executions.ts
│   │   └── artifacts.ts
│   ├── migrations/
│   └── index.ts               # Drizzle client export
└── utils/                     # Shared utilities
```

### Structure Rationale

- **routes/**: Remix convention; colocates loaders/actions with UI
- **lib/pipeline/**: Core execution logic isolated from web layer; testable independently
- **lib/anthropic/**: SDK wrapper allows mocking in tests, centralizes retry logic
- **lib/queue/**: Job queue isolated for potential extraction to separate worker process
- **db/schema/**: Drizzle schema per domain entity; clear ownership boundaries
- **components/**: Presentational components separated from data-fetching routes

## Architectural Patterns

### Pattern 1: Sequential Pipeline Execution

**What:** Chain agents in predefined linear order where output from agent N becomes input to agent N+1. Each agent processes the complete output from the previous stage.

**When to use:** Fixed, predictable workflows. Document generation where each stage adds value (outline, draft, review, format). Your use case.

**Trade-offs:**
- PRO: Simple to understand, debug, and build
- PRO: Clear data flow; easy to log and audit
- CON: No parallelism; total time = sum of all stages
- CON: Single point of failure stops entire pipeline

**Example:**
```typescript
// lib/pipeline/executor.server.ts
interface PipelineState {
  templateId: string;
  executionId: string;
  currentStageIndex: number;
  stageOutputs: Map<string, string>;
  finalOutput: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
}

async function executePipeline(
  template: Template,
  initialInput: string,
  onProgress: (state: PipelineState) => void
): Promise<PipelineState> {
  const state: PipelineState = {
    templateId: template.id,
    executionId: generateId(),
    currentStageIndex: 0,
    stageOutputs: new Map(),
    finalOutput: null,
    status: 'running',
  };

  let currentInput = initialInput;

  for (const agent of template.agents) {
    state.currentStageIndex = template.agents.indexOf(agent);
    onProgress(state);

    try {
      const output = await runAgent(agent, currentInput);
      state.stageOutputs.set(agent.id, output);
      currentInput = output; // Chain to next agent
    } catch (error) {
      state.status = 'failed';
      state.error = error.message;
      onProgress(state);
      throw error;
    }
  }

  state.finalOutput = currentInput;
  state.status = 'completed';
  onProgress(state);
  return state;
}
```

### Pattern 2: State Isolation Between Agents

**What:** Each agent receives only what it needs, not the entire pipeline state. Agent wrappers convert parent state to agent-specific input.

**When to use:** When agents have different input requirements. When you want to prevent accidental coupling between stages.

**Trade-offs:**
- PRO: Agents are independently testable
- PRO: Clear contracts between stages
- CON: Requires explicit state transformation logic

**Example:**
```typescript
// lib/pipeline/state-manager.server.ts
interface AgentInput {
  instruction: string;
  previousOutput: string;
  variables: Record<string, string>;
}

function prepareAgentInput(
  agent: Agent,
  pipelineState: PipelineState,
  userInput: Record<string, string>
): AgentInput {
  // Get output from previous agent (or initial input if first)
  const previousAgentId = getPreviousAgentId(agent, pipelineState);
  const previousOutput = previousAgentId
    ? pipelineState.stageOutputs.get(previousAgentId) ?? ''
    : userInput.initialPrompt;

  // Assemble variables for prompt template
  const variables = {
    ...userInput,
    previousOutput,
    // Add any stage-specific variables
  };

  return {
    instruction: agent.instruction,
    previousOutput,
    variables,
  };
}
```

### Pattern 3: Job Queue with pg-boss

**What:** Use PostgreSQL as a job queue for pipeline execution. pg-boss provides exactly-once delivery, retry logic, and dead letter queues using SKIP LOCKED.

**When to use:** Background processing. Execution that may take minutes. Need for reliable retry and failure handling.

**Trade-offs:**
- PRO: No additional infrastructure (Redis, RabbitMQ)
- PRO: Transactional consistency with application data
- PRO: Reliable exactly-once execution
- CON: Not suitable for high-throughput (1000s of jobs/second)
- CON: PostgreSQL becomes single point of failure

**Example:**
```typescript
// lib/queue/client.server.ts
import PgBoss from 'pg-boss';

const boss = new PgBoss(process.env.DATABASE_URL);

// Register pipeline execution handler
boss.work('pipeline:execute', async (job) => {
  const { templateId, userId, userInput } = job.data;

  const template = await db.query.templates.findFirst({
    where: eq(templates.id, templateId),
    with: { agents: true },
  });

  const execution = await createExecution(templateId, userId);

  try {
    await executePipeline(template, userInput, async (state) => {
      // Update execution record on each state change
      await updateExecution(execution.id, state);
      // Emit SSE event for real-time UI update
      await emitProgressEvent(execution.id, state);
    });
  } catch (error) {
    await markExecutionFailed(execution.id, error);
    throw error; // Let pg-boss handle retry
  }
});

// Queue a pipeline execution
export async function queuePipelineExecution(
  templateId: string,
  userId: string,
  userInput: Record<string, string>
) {
  const jobId = await boss.send('pipeline:execute', {
    templateId,
    userId,
    userInput,
  }, {
    retryLimit: 3,
    retryDelay: 5000,
  });

  return jobId;
}
```

### Pattern 4: Server-Sent Events for Progress

**What:** SSE provides one-way server-to-client streaming over standard HTTP. Ideal for real-time progress updates during pipeline execution.

**When to use:** Real-time UI updates for long-running operations. When client only needs to receive (not send) data. LLM response streaming.

**Trade-offs:**
- PRO: Native browser support via EventSource API
- PRO: Automatic reconnection handling
- PRO: Simpler than WebSockets for one-way data
- CON: One-way only; can't send data back
- CON: Limited to ~6 connections per domain in some browsers

**Example:**
```typescript
// app/routes/api/executions.$id.stream.ts
import { LoaderFunctionArgs } from '@remix-run/node';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const executionId = params.id;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Subscribe to execution updates
      const unsubscribe = subscribeToExecution(executionId, (state) => {
        const data = JSON.stringify({
          status: state.status,
          currentStage: state.currentStageIndex,
          stageOutputs: Object.fromEntries(state.stageOutputs),
        });

        controller.enqueue(encoder.encode(`data: ${data}\n\n`));

        if (state.status === 'completed' || state.status === 'failed') {
          controller.close();
        }
      });

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

## Data Flow

### Pipeline Execution Flow

```
User clicks "Run Pipeline"
    ↓
[Remix Action] validates input, creates Execution record
    ↓
[Remix Action] queues job via pg-boss
    ↓
[Response] returns executionId, redirects to execution view
    ↓
[Client] opens SSE connection to /api/executions/{id}/stream
    ↓
[pg-boss Worker] picks up job, starts executePipeline()
    ↓
┌─────────────────────────────────────────────────────────┐
│  FOR EACH AGENT in template.agents:                      │
│    ↓                                                     │
│  [Agent Runner] prepares input from previous output      │
│    ↓                                                     │
│  [Anthropic SDK] calls Claude API with streaming         │
│    ↓                                                     │
│  [Agent Runner] accumulates response, extracts output    │
│    ↓                                                     │
│  [State Manager] stores output in pipeline state         │
│    ↓                                                     │
│  [Progress Emitter] updates DB + emits SSE event         │
│    ↓                                                     │
│  [Client] receives SSE, updates UI                       │
└─────────────────────────────────────────────────────────┘
    ↓
[Pipeline Complete] Final output stored as Artifact
    ↓
[SSE] sends completion event with artifact ID
    ↓
[Client] displays download button
```

### Database State Management

```
Execution States:
┌──────────┐    ┌─────────┐    ┌───────────┐    ┌───────────┐
│ pending  │ →  │ running │ →  │ completed │    │  failed   │
└──────────┘    └────┬────┘    └───────────┘    └───────────┘
                     │                               ↑
                     └─── (on error) ────────────────┘

Stage States (per agent in execution):
┌──────────┐    ┌─────────┐    ┌───────────┐    ┌───────────┐
│ pending  │ →  │ running │ →  │ completed │    │  failed   │
└──────────┘    └─────────┘    └───────────┘    └───────────┘
```

### Key Data Flows

1. **Template Creation:** User → Form → Remix Action → Drizzle → PostgreSQL
2. **Pipeline Trigger:** User → Remix Action → pg-boss Queue → Background Worker
3. **Progress Updates:** Worker → Database Update + SSE Emit → Client UI
4. **Artifact Retrieval:** Client → Remix Loader → File Store/S3 → Download

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-100 users | Monolith is fine. Single Remix server runs both web + pg-boss worker. SQLite or single PostgreSQL instance. |
| 100-1k users | Separate pg-boss worker process. Add connection pooling (PgBouncer). Consider read replicas if read-heavy. |
| 1k-10k users | Multiple worker processes. Redis for SSE pub/sub (cross-process). Object storage for artifacts (S3/R2). |
| 10k+ users | Dedicated queue service. Horizontal scaling with load balancer. Consider moving to managed queue service if pg-boss bottlenecks. |

### Scaling Priorities

1. **First bottleneck: Anthropic API rate limits**
   - Problem: Too many concurrent LLM calls hit rate limits
   - Fix: Queue with concurrency control; respect rate limit headers; implement exponential backoff

2. **Second bottleneck: Long-running SSE connections**
   - Problem: Many concurrent users = many open connections
   - Fix: Use Redis pub/sub for SSE across processes; consider polling fallback for very high scale

3. **Third bottleneck: Artifact storage**
   - Problem: Large documents fill up disk
   - Fix: Move to object storage (S3, Cloudflare R2); implement retention policies

## Anti-Patterns

### Anti-Pattern 1: Storing Full LLM Responses in Session/Memory

**What people do:** Keep all agent outputs in server memory or session during execution.

**Why it's wrong:** Long pipelines accumulate large text. Memory grows unbounded. Server crash loses all state. Can't resume after failure.

**Do this instead:** Persist each stage output to database immediately. Store only current stage in memory. Enable resume from any checkpoint.

### Anti-Pattern 2: Synchronous Pipeline Execution in Request Handler

**What people do:** Execute entire pipeline within a single HTTP request/response cycle.

**Why it's wrong:** Request timeouts (30-60s typical). User sees spinner with no feedback. Connection drop = lost work. Poor UX.

**Do this instead:** Queue pipeline execution as background job. Return immediately with execution ID. Stream progress via SSE. Client polls/streams for updates.

### Anti-Pattern 3: Generic "Pipeline State" Object Passed Everywhere

**What people do:** Create single state object containing everything, pass it to every agent.

**Why it's wrong:** Tight coupling. Agents see data they don't need. Hard to test agents in isolation. State object grows unwieldy.

**Do this instead:** Define clear input/output contracts per agent. Use state manager to transform between stages. Each agent receives only what it needs.

### Anti-Pattern 4: Ignoring Partial Failures

**What people do:** If any stage fails, mark entire pipeline as failed and discard all work.

**Why it's wrong:** Wastes successful LLM calls (cost). User loses partial progress. No way to retry from failure point.

**Do this instead:** Store each stage result immediately. On failure, preserve completed stages. Allow retry from failed stage. Show partial results to user.

### Anti-Pattern 5: Building Custom Real-Time System Instead of Using SSE

**What people do:** Build WebSocket infrastructure, or polling every 500ms, for progress updates.

**Why it's wrong:** WebSocket is overkill for one-way updates. Polling wastes resources and adds latency. More infrastructure to maintain.

**Do this instead:** Use SSE for progress streaming. It's built for this. Native browser support. Automatic reconnection. Falls back to polling naturally if needed.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Anthropic API | SDK client with streaming | Rate limit handling critical; use exponential backoff |
| PostgreSQL | Drizzle ORM | Use transactions for state consistency |
| File Storage | Local dev, S3/R2 prod | Abstract behind interface for easy swap |
| Auth Provider | Lucia (session-based) | Standard session management |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Routes ↔ Pipeline Engine | Function calls (same process) | Pass execution callbacks for progress |
| Pipeline Engine ↔ Job Queue | pg-boss API | Queue for execution, subscribe for completion |
| Job Queue ↔ SSE Endpoints | Database + Events | Worker updates DB, triggers event for SSE |
| Agent Runner ↔ Anthropic SDK | Direct SDK calls | Wrapper handles retry, streaming accumulation |

## Build Order Implications

Based on component dependencies, recommended implementation order:

### Phase 1: Foundation
1. **Database Schema** - Templates, Agents, Executions tables
2. **Basic CRUD** - Template and Agent creation/editing
3. **Anthropic SDK Wrapper** - Single agent execution (no pipeline yet)

*Rationale: Can't build pipeline execution without agents; can't run agents without SDK wrapper; can't store anything without schema.*

### Phase 2: Execution Core
4. **Pipeline Executor** - Sequential agent chaining
5. **State Manager** - State transformation between stages
6. **pg-boss Integration** - Background job processing

*Rationale: Pipeline executor depends on agent runner from Phase 1. Job queue enables non-blocking execution.*

### Phase 3: Real-Time UX
7. **SSE Progress Streaming** - Real-time updates to client
8. **Execution UI** - Progress display, stage indicators
9. **Artifact Storage** - Final document persistence and download

*Rationale: Progress streaming only useful once execution exists. Artifacts are final output of complete pipeline.*

### Phase 4: Polish
10. **Error Recovery** - Retry from failed stage
11. **Template Versioning** - Track changes, enable rollback
12. **Usage Analytics** - Token consumption, execution times

*Rationale: Recovery and versioning are enhancements to working system. Analytics requires data from real usage.*

## Sources

- [Anthropic: Building Effective Agents](https://www.anthropic.com/research/building-effective-agents) - Official patterns for agent architecture (HIGH confidence)
- [Azure Architecture Center: AI Agent Orchestration Patterns](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns) - Enterprise patterns for sequential orchestration (HIGH confidence)
- [Pipeline of Agents Pattern - Vitalii Honchar](https://vitaliihonchar.com/insights/how-to-build-pipeline-of-agents) - LangGraph implementation details (MEDIUM confidence)
- [Flow-Run System Design - Vitalii Honchar](https://vitaliihonchar.com/insights/flow-run-system-design) - Database schema and execution engine design (MEDIUM confidence)
- [pg-boss GitHub](https://github.com/timgit/pg-boss) - PostgreSQL job queue documentation (HIGH confidence)
- [SSE for LLM Streaming - Procedure Tech](https://procedure.tech/blogs/the-streaming-backbone-of-llms-why-server-sent-events-(sse)-still-wins-in-2025) - SSE vs WebSocket comparison (MEDIUM confidence)
- [LLM Orchestration Frameworks - AIMultiple](https://research.aimultiple.com/llm-orchestration/) - Framework benchmarks 2026 (MEDIUM confidence)
- [Design Patterns for Agentic Workflows - HuggingFace](https://huggingface.co/blog/dcarpintero/design-patterns-for-building-agentic-workflows) - Pattern taxonomy (MEDIUM confidence)

---
*Architecture research for: AI Agent Pipeline Builder*
*Researched: 2026-01-28*
