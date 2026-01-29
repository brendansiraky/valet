# Phase 14: Artifact Storage - Research

**Researched:** 2026-01-29
**Domain:** PostgreSQL JSONB storage, Drizzle ORM, Remix data patterns
**Confidence:** HIGH

## Summary

Phase 14 implements persistent storage for pipeline outputs (artifacts) with metadata. The codebase already has established patterns for JSONB storage (`flowData` in pipelines, `variables` in pipeline_runs) and run tracking (`pipeline_runs`, `pipeline_run_steps` tables). This phase extends these patterns to store artifact data.

The primary technical decision is whether to:
1. **Extend existing `pipeline_runs`** - Add artifact columns to the existing run tracking table
2. **Create a new `artifacts` table** - Separate concern with dedicated table

Given the requirements specify "view past pipeline run outputs" and that `pipeline_runs` already stores `finalOutput` as text, the recommended approach is to **extend the existing schema** by adding metadata columns to `pipeline_runs` rather than creating a new table. This avoids data duplication and maintains the one-to-one relationship between runs and their output.

**Primary recommendation:** Add `model`, `inputTokens`, `outputTokens`, and `cost` columns to `pipeline_runs`, and update `finalOutput` to JSONB for structured storage including step outputs.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | ^0.45.1 | ORM with JSONB support | Already in use, `.$type<T>()` for type safety |
| drizzle-kit | ^0.31.8 | Migrations | Already in use for schema changes |
| postgres | ^3.4.8 | PostgreSQL driver | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| drizzle-zod | ^0.8.3 | Schema validation | If runtime validation needed |
| zod | (existing) | Type validation | For artifact structure validation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JSONB for output | TEXT | TEXT already used, but JSONB enables structured queries and step-level access |
| Extend pipeline_runs | New artifacts table | New table adds complexity; runs already have 1:1 relationship with output |
| Store cost in DB | Calculate on read | Stored cost captures actual pricing at time of run |

**Installation:**
No new packages required - all dependencies already installed.

## Architecture Patterns

### Recommended Schema Enhancement

Extend `pipeline_runs` rather than creating a new table:

```typescript
// app/db/schema/pipeline-runs.ts

// Type for structured artifact output
export interface ArtifactOutput {
  steps: Array<{
    agentId: string;
    agentName: string;
    output: string;
    stepOrder: number;
  }>;
  finalOutput: string;
}

// Extended pipeline_runs columns
export const pipelineRuns = pgTable(
  "pipeline_runs",
  {
    // ... existing columns ...

    // NEW: Replace text finalOutput with structured JSONB
    artifactData: jsonb("artifact_data").$type<ArtifactOutput>(),

    // NEW: Metadata columns
    model: text("model"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    cost: numeric("cost", { precision: 10, scale: 6 }), // Stores up to $9999.999999
  },
  // ... existing indexes ...
);
```

### Recommended Project Structure
```
app/
├── db/schema/
│   └── pipeline-runs.ts     # Extend with artifact columns
├── routes/
│   └── artifacts.tsx        # List view for past runs
│   └── artifacts.$id.tsx    # Single artifact viewer (reuse OutputViewer)
├── components/
│   └── output-viewer/       # Already exists - reuse for artifact viewing
│       ├── output-viewer.tsx
│       └── markdown-viewer.tsx
```

### Pattern 1: JSONB with Type Safety
**What:** Use `.$type<T>()` for compile-time type safety on JSONB columns
**When to use:** Always when storing structured JSON data
**Example:**
```typescript
// Source: https://orm.drizzle.team/docs/column-types/pg
import { jsonb, pgTable } from "drizzle-orm/pg-core";

interface ArtifactOutput {
  steps: Array<{ agentId: string; output: string }>;
  finalOutput: string;
}

export const pipelineRuns = pgTable("pipeline_runs", {
  artifactData: jsonb("artifact_data").$type<ArtifactOutput>(),
});

// Type-safe insert
await db.insert(pipelineRuns).values({
  artifactData: {
    steps: [{ agentId: "abc", output: "Hello" }],
    finalOutput: "Done"
  }
});
```

### Pattern 2: Offset Pagination for Artifact List
**What:** Use limit/offset pagination for browsing past runs
**When to use:** Artifact lists with reasonable size (< 10,000 runs per user)
**Example:**
```typescript
// Source: https://orm.drizzle.team/docs/guides/limit-offset-pagination
const getArtifacts = async (userId: string, page = 1, pageSize = 20) => {
  return await db
    .select()
    .from(pipelineRuns)
    .where(
      and(
        eq(pipelineRuns.userId, userId),
        eq(pipelineRuns.status, "completed")
      )
    )
    .orderBy(desc(pipelineRuns.completedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
};
```

### Pattern 3: Store Cost at Write Time
**What:** Calculate and store cost when run completes, not on read
**When to use:** Always - pricing may change, want historical accuracy
**Example:**
```typescript
// In pipeline-executor.server.ts after completion
import { calculateCost } from "~/lib/pricing";

const cost = calculateCost(model, usage.totalInputTokens, usage.totalOutputTokens);

await db
  .update(pipelineRuns)
  .set({
    status: "completed",
    artifactData: {
      steps: stepOutputs,
      finalOutput: currentInput,
    },
    model,
    inputTokens: usage.totalInputTokens,
    outputTokens: usage.totalOutputTokens,
    cost: cost.toString(), // numeric column expects string
    completedAt: new Date(),
  })
  .where(eq(pipelineRuns.id, runId));
```

### Anti-Patterns to Avoid
- **Storing cost as computed field:** Model pricing changes; always store actual cost at run time
- **TEXT for structured output:** Prevents querying individual steps, harder to extend
- **Separate artifacts table with duplicated data:** Creates sync issues with pipeline_runs
- **Cursor pagination for small datasets:** Over-engineering; offset is simpler and sufficient

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cost calculation | Custom calculation | `calculateCost()` from `~/lib/pricing` | Already handles model lookup, edge cases |
| Cost formatting | String manipulation | `formatCost()` from `~/lib/pricing` | Handles <$0.01 edge case |
| Token formatting | Number formatting | `formatTokens()` from `~/lib/pricing` | Handles K/M abbreviations |
| Output rendering | Custom markdown | `MarkdownViewer` component | Already handles code blocks, styling |
| Tabbed output view | Custom tabs | `OutputViewer` component | Already has tabs, download buttons |

**Key insight:** The output viewer and pricing utilities already exist. The artifact viewer should reuse `OutputViewer` component with data loaded from database instead of live run state.

## Common Pitfalls

### Pitfall 1: JSONB String Serialization
**What goes wrong:** JSONB data inserted as escaped string `"{\"key\": \"value\"}"` instead of actual JSON
**Why it happens:** Some drivers/ORMs double-serialize when passing JavaScript objects
**How to avoid:** The postgres-js driver with Drizzle handles this correctly; ensure you pass JavaScript objects, not `JSON.stringify()` results
**Warning signs:** Retrieved JSONB data is a string instead of an object

### Pitfall 2: Missing Migration for Existing Data
**What goes wrong:** New columns are NOT NULL but existing rows have no data
**Why it happens:** Schema change doesn't account for historical data
**How to avoid:** Make new columns nullable OR provide defaults OR run data migration
**Warning signs:** Migration fails or app errors on loading old runs

### Pitfall 3: Large JSONB Documents
**What goes wrong:** Slow queries, excessive storage, TOAST overhead
**Why it happens:** Storing very long outputs (e.g., full documents) in JSONB
**How to avoid:** Monitor output sizes; consider truncation for extremely long outputs (> 64KB)
**Warning signs:** Query times increase with output length

### Pitfall 4: Pagination Without Order
**What goes wrong:** Same artifact appears on multiple pages or skipped
**Why it happens:** No ORDER BY clause in paginated query
**How to avoid:** Always order by a unique column (id) or timestamp + id
**Warning signs:** Duplicate entries or missing entries when paging

### Pitfall 5: Cost Precision Loss
**What goes wrong:** Very small costs display as $0.00 or lose precision
**Why it happens:** Using float/double instead of numeric, or insufficient decimal places
**How to avoid:** Use `numeric(10, 6)` for 6 decimal places; use `formatCost()` for display
**Warning signs:** All small runs show same cost or $0.00

## Code Examples

Verified patterns from official sources and codebase:

### Schema Migration
```typescript
// app/db/schema/pipeline-runs.ts
import {
  index, integer, jsonb, numeric, pgTable, text, timestamp
} from "drizzle-orm/pg-core";

export interface ArtifactOutput {
  steps: Array<{
    agentId: string;
    agentName: string;
    output: string;
    stepOrder: number;
  }>;
  finalOutput: string;
}

export const pipelineRuns = pgTable(
  "pipeline_runs",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    pipelineId: text("pipeline_id").notNull().references(() => pipelines.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().$type<RunStatus>().default("pending"),
    input: text("input").notNull(),
    variables: jsonb("variables").$type<Record<string, string>>(),

    // Artifact storage (structured output)
    artifactData: jsonb("artifact_data").$type<ArtifactOutput>(),

    // Run metadata
    model: text("model"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    cost: numeric("cost", { precision: 10, scale: 6 }),

    // Timestamps
    error: text("error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    index("pipeline_runs_user_id_idx").on(table.userId),
    index("pipeline_runs_pipeline_id_idx").on(table.pipelineId),
  ]
);
```

### Artifact List Loader (Remix Pattern)
```typescript
// app/routes/artifacts.tsx
import { desc, eq, and } from "drizzle-orm";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");
  if (!userId) return redirect("/login");

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const pageSize = 20;

  const artifacts = await db
    .select({
      id: pipelineRuns.id,
      pipelineName: pipelines.name,
      model: pipelineRuns.model,
      inputTokens: pipelineRuns.inputTokens,
      outputTokens: pipelineRuns.outputTokens,
      cost: pipelineRuns.cost,
      completedAt: pipelineRuns.completedAt,
    })
    .from(pipelineRuns)
    .innerJoin(pipelines, eq(pipelineRuns.pipelineId, pipelines.id))
    .where(
      and(
        eq(pipelineRuns.userId, userId),
        eq(pipelineRuns.status, "completed")
      )
    )
    .orderBy(desc(pipelineRuns.completedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { artifacts, page, pageSize };
}
```

### Artifact Detail Loader
```typescript
// app/routes/artifacts.$id.tsx
export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");
  if (!userId) return redirect("/login");

  const { id } = params;

  const [artifact] = await db
    .select()
    .from(pipelineRuns)
    .innerJoin(pipelines, eq(pipelineRuns.pipelineId, pipelines.id))
    .where(
      and(
        eq(pipelineRuns.id, id!),
        eq(pipelineRuns.userId, userId)
      )
    );

  if (!artifact) {
    throw new Response("Artifact not found", { status: 404 });
  }

  return {
    artifact: artifact.pipeline_runs,
    pipeline: artifact.pipelines,
  };
}
```

### Update Pipeline Executor to Store Artifacts
```typescript
// In pipeline-executor.server.ts, update completion logic
import { calculateCost } from "~/lib/pricing";

// After all steps complete
const artifactData: ArtifactOutput = {
  steps: steps.map((step, index) => ({
    agentId: step.agentId,
    agentName: step.agentName,
    output: stepOutputs.get(index) || "",
    stepOrder: index,
  })),
  finalOutput: currentInput,
};

const cost = calculateCost(model, usage.totalInputTokens, usage.totalOutputTokens);

await db
  .update(pipelineRuns)
  .set({
    status: "completed",
    artifactData,
    model,
    inputTokens: usage.totalInputTokens,
    outputTokens: usage.totalOutputTokens,
    cost: cost.toString(),
    completedAt: new Date(),
  })
  .where(eq(pipelineRuns.id, runId));
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| TEXT for JSON storage | JSONB with typed schema | PostgreSQL standard | Better querying, validation |
| Calculate cost on read | Store cost at write time | Best practice | Historical accuracy, simpler queries |
| Separate output column | Structured ArtifactOutput | This phase | Step-level access, consistent format |

**Deprecated/outdated:**
- `finalOutput` text column: Will be replaced by `artifactData` JSONB (need migration strategy)
- Calculating cost on read: Prices change; store at run completion time

## Open Questions

Things that couldn't be fully resolved:

1. **Migration strategy for existing runs**
   - What we know: Existing `pipeline_runs` have `finalOutput` as text, new column will be JSONB
   - What's unclear: Should existing runs be migrated or left as-is?
   - Recommendation: Add new `artifactData` column as nullable; existing runs show only `finalOutput`, new runs populate both during transition, then deprecate `finalOutput`

2. **Output size limits**
   - What we know: TOAST handles large values but performance degrades
   - What's unclear: What's the typical output size? Should we truncate?
   - Recommendation: Monitor output sizes post-launch; add truncation if needed

3. **Retention policy**
   - What we know: Requirements don't specify retention
   - What's unclear: Should old artifacts be automatically deleted?
   - Recommendation: Defer to v1.3+; no automatic deletion in v1.2

## Sources

### Primary (HIGH confidence)
- Drizzle ORM PostgreSQL column types - https://orm.drizzle.team/docs/column-types/pg
- Drizzle ORM limit/offset pagination - https://orm.drizzle.team/docs/guides/limit-offset-pagination
- Codebase: `app/db/schema/pipeline-runs.ts` - Existing schema patterns
- Codebase: `app/db/schema/pipelines.ts` - JSONB `.$type<T>()` pattern
- Codebase: `app/lib/pricing.ts` - Cost calculation utilities
- Codebase: `app/components/output-viewer/` - Existing output display components

### Secondary (MEDIUM confidence)
- PostgreSQL JSONB documentation - https://www.postgresql.org/docs/current/datatype-json.html
- PostgreSQL as JSON database best practices - https://aws.amazon.com/blogs/database/postgresql-as-a-json-database-advanced-patterns-and-best-practices/

### Tertiary (LOW confidence)
- Community pagination patterns - Multiple WebSearch results (verify with official docs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing codebase dependencies and patterns
- Architecture: HIGH - Extending established schema patterns from pipeline_runs
- Pitfalls: MEDIUM - Based on general PostgreSQL/JSONB knowledge and codebase patterns

**Research date:** 2026-01-29
**Valid until:** 60 days (stable domain, codebase patterns well-established)
