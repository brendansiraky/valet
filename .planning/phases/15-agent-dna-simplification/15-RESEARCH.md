# Phase 15: Agent DNA & Simplification - Research

**Researched:** 2026-01-29
**Domain:** UI Renaming, Component Cleanup, Database Migration
**Confidence:** HIGH

## Summary

This phase involves three distinct work streams: (1) renaming "Instructions" to "DNA" in agent forms with an explanatory tooltip, (2) moving trait selection from agents to pipeline steps (implementing only the temporary test picker now, full pipeline-level traits in Phase 17), and (3) removing the template variable system entirely.

The codebase is well-structured with clear separation of concerns. All changes touch existing code rather than requiring new architectural patterns. The variable system removal is the largest change, requiring coordinated deletion across UI components, server logic, database schema, and stored data.

**Primary recommendation:** Execute in three sequential work streams: (1) DNA rename + tooltip, (2) trait selector changes, (3) variable system removal. Each stream can be verified independently before proceeding.

## Standard Stack

### Core (Already in Project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn/ui | latest | UI components | Already using Tooltip, Dialog, Form components |
| Drizzle ORM | 0.45.1 | Database schema & migrations | Project's existing ORM |
| lucide-react | 0.563.0 | Icons | Project already imports multiple icons |
| @radix-ui/react-tooltip | 1.2.8 | Accessible tooltips | Already installed and wrapped by shadcn |

### Supporting

No new libraries required. This phase uses existing dependencies.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Radix Tooltip | Native title attr | Tooltip provides richer styling, accessibility |
| Drizzle migration | Raw SQL | Migration ensures tracking, rollback capability |

**Installation:**
No new packages needed.

## Architecture Patterns

### Work Stream 1: DNA Rename + Tooltip

**Files to modify:**
```
app/components/agent-form-dialog.tsx  # Rename label, add tooltip
```

**Pattern: Label with Info Icon Tooltip**
```tsx
// Source: shadcn/ui tooltip pattern
import { Info } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "~/components/ui/tooltip";

<div className="space-y-2">
  <div className="flex items-center gap-1">
    <Label htmlFor="dna">DNA</Label>
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p>Your agent's DNA defines its core personality and behavior -
        think of it as the fundamental traits that make this agent unique.</p>
      </TooltipContent>
    </Tooltip>
  </div>
  <Textarea
    id="dna"
    name="instructions"  // Keep name="instructions" for backward compat
    ...
  />
</div>
```

**Key points:**
- Keep `name="instructions"` on the textarea to avoid backend changes
- Only the visible label changes to "DNA"
- Tooltip uses existing shadcn Tooltip component

### Work Stream 2: Trait Selector Changes

**Files to modify:**
```
app/components/agent-form-dialog.tsx   # Remove traits section
app/components/agent-test-dialog.tsx   # Add temporary trait picker
app/routes/api.agent.$agentId.run.ts   # Accept traitIds from request
```

**Pattern: Temporary State Trait Picker**
```tsx
// In agent-test-dialog.tsx
const [selectedTraitIds, setSelectedTraitIds] = useState<string[]>([]);

// On dialog close, state naturally resets (no persistence needed)
// Pass traitIds in request body to run endpoint
```

**Data flow for test runs:**
1. User opens test dialog
2. User selects traits from checkbox list (fetched from /api/traits or passed as prop)
3. User submits test
4. Request includes `{ input, traitIds }`
5. Server fetches trait contexts, builds combined context
6. Agent runs with temporary trait context
7. On dialog close, selectedTraitIds resets to []

### Work Stream 3: Variable System Removal

**Files to delete:**
```
app/components/pipeline-builder/variable-fill-dialog.tsx
app/components/pipeline-builder/template-dialog.tsx
```

**Files to modify:**
```
app/routes/pipelines.$id.tsx           # Remove variable-related state and dialogs
app/services/pipeline-executor.server.ts  # Remove substituteVariables function
app/db/schema/pipelines.ts             # Remove TemplateVariable type, variables column
app/db/schema/pipeline-runs.ts         # Remove variables column
```

**Database migration pattern:**
```sql
-- Drizzle will generate this, but conceptually:
ALTER TABLE pipeline_templates DROP COLUMN variables;
ALTER TABLE pipeline_runs DROP COLUMN variables;
```

**Execution flow change:**
- Currently: Run button -> VariableFillDialog (if variables) -> Start run
- After: Run button -> Start run immediately

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tooltip | Custom hover state | shadcn Tooltip | Already in project, accessible |
| Form state reset | Manual cleanup | React state + dialog close | useState resets on unmount |

**Key insight:** The trait picker state management is trivial - useState inside the dialog component naturally resets when the dialog closes. No need for explicit cleanup logic.

## Common Pitfalls

### Pitfall 1: Breaking Existing Agent Data
**What goes wrong:** Renaming database column `instructions` to `dna` breaks existing data
**Why it happens:** Assuming UI rename requires DB rename
**How to avoid:** Keep database column as `instructions`, only change UI label
**Warning signs:** Planning to rename columns that contain user data

### Pitfall 2: Orphaned Template References
**What goes wrong:** Deleting template system but leaving references in run history
**Why it happens:** Pipeline runs store `variables` data that becomes meaningless
**How to avoid:**
- Migration sets `variables = NULL` for existing runs (or drop column)
- UI ignores old variable data gracefully
**Warning signs:** Old runs showing undefined/null errors

### Pitfall 3: Trait Fetching in Test Dialog
**What goes wrong:** Test dialog can't access traits list
**Why it happens:** Traits not passed as props to dialog
**How to avoid:** Either pass traits from agents route loader, or fetch via separate API
**Warning signs:** Dialog renders but trait list empty

### Pitfall 4: Migration Order Dependencies
**What goes wrong:** Dropping pipelineTemplates table before pipeline_runs variables column
**Why it happens:** Foreign key or data dependencies
**How to avoid:**
1. First migration: Drop variables columns (both tables)
2. Keep pipelineTemplates table for now (Phase 17 may repurpose or remove)
**Warning signs:** Migration failures on foreign key constraints

## Code Examples

### DNA Label with Tooltip
```tsx
// Source: Verified pattern from app/components/ui/tooltip.tsx
import { Info } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "~/components/ui/tooltip";

// In agent-form-dialog.tsx, replace instructions label section:
<div className="space-y-2">
  <div className="flex items-center gap-1.5">
    <Label htmlFor="instructions">DNA</Label>
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex">
          <Info className="h-4 w-4 text-muted-foreground" />
          <span className="sr-only">What is DNA?</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[240px]">
        Your agent's DNA defines its core identity - the fundamental
        instructions that shape how it thinks and responds.
      </TooltipContent>
    </Tooltip>
  </div>
  <Textarea ... />
</div>
```

### Temporary Trait Picker in Test Dialog
```tsx
// Source: Pattern from existing agent-form-dialog.tsx trait selector
interface AgentTestDialogProps {
  agent: Pick<Agent, "id" | "name">;
  traits: Array<{ id: string; name: string; context: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Inside component:
const [selectedTraitIds, setSelectedTraitIds] = useState<string[]>([]);

// In form/submit:
fetcher.submit(
  { input: input.trim(), traitIds: selectedTraitIds },
  { method: "POST", action: `/api/agent/${agent.id}/run`, encType: "application/json" }
);

// Trait picker UI (similar to agent-form-dialog pattern):
<div className="space-y-2">
  <Label>Test with traits (optional)</Label>
  <div className="max-h-32 overflow-y-auto space-y-2 border rounded-md p-3">
    {traits.map((trait) => (
      <div key={trait.id} className="flex items-center space-x-2">
        <Checkbox
          id={`trait-${trait.id}`}
          checked={selectedTraitIds.includes(trait.id)}
          onCheckedChange={(checked) => {
            setSelectedTraitIds((prev) =>
              checked ? [...prev, trait.id] : prev.filter((id) => id !== trait.id)
            );
          }}
        />
        <label htmlFor={`trait-${trait.id}`} className="text-sm cursor-pointer">
          {trait.name}
        </label>
      </div>
    ))}
  </div>
</div>
```

### Updated API Endpoint for Trait Selection
```tsx
// In api.agent.$agentId.run.ts
const RunAgentSchema = z.object({
  input: z.string().min(1, "Input is required"),
  traitIds: z.array(z.string()).optional(),
});

// Replace hardcoded trait fetch with:
const traitIds = result.data.traitIds || [];
let traitContext: string | undefined;

if (traitIds.length > 0) {
  // Fetch selected traits
  const selectedTraits = await db.query.traits.findMany({
    where: and(
      eq(traits.userId, userId),
      inArray(traits.id, traitIds)
    ),
  });

  traitContext = selectedTraits
    .map((t) => `## ${t.name}\n\n${t.context}`)
    .join("\n\n---\n\n");
}
```

### Drizzle Schema After Variable Removal
```typescript
// app/db/schema/pipelines.ts - Remove TemplateVariable type and variables column
export const pipelineTemplates = pgTable(
  "pipeline_templates",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    pipelineId: text("pipeline_id")
      .notNull()
      .references(() => pipelines.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("pipeline_templates_pipeline_id_idx").on(table.pipelineId)]
);

// app/db/schema/pipeline-runs.ts - Remove variables column
// Just delete the line: variables: jsonb("variables").$type<Record<string, string>>(),
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| {{variables}} in prompts | DNA + traits | v1.3 | Simpler mental model for users |
| Per-agent traits | Per-pipeline-step traits | v1.3 | More flexible composition |

**Deprecated/outdated:**
- Template variable system (`{{placeholder}}`): Over-engineered, replaced by DNA + traits model

## Open Questions

1. **Tooltip copy finalization**
   - What we know: Need human-friendly explanation of "DNA"
   - What's unclear: Exact wording that resonates with non-technical users
   - Recommendation: Start with draft copy, iterate based on user feedback

2. **Trait fetching strategy for test dialog**
   - What we know: Traits needed in test dialog
   - What's unclear: Whether to pass from loader or fetch separately
   - Recommendation: Pass from agents route loader (already fetches traits for form)

3. **pipelineTemplates table future**
   - What we know: Variables column removed, table may be empty
   - What's unclear: Whether to keep table for future use
   - Recommendation: Keep table, Phase 17 may store per-step trait assignments there

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `app/components/agent-form-dialog.tsx` - current trait selector pattern
- Codebase analysis: `app/components/ui/tooltip.tsx` - existing tooltip component
- Codebase analysis: `app/services/pipeline-executor.server.ts` - substituteVariables location
- Codebase analysis: `app/db/schema/pipelines.ts` - TemplateVariable type, pipelineTemplates table
- Codebase analysis: `app/db/schema/pipeline-runs.ts` - variables column

### Secondary (MEDIUM confidence)
- Drizzle documentation: Migration generation with `drizzle-kit generate`

### Tertiary (LOW confidence)
- None - all patterns verified in existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - using only existing dependencies
- Architecture: HIGH - patterns already exist in codebase
- Pitfalls: HIGH - based on direct code analysis

**Research date:** 2026-01-29
**Valid until:** 2026-02-28 (30 days - stable codebase patterns)
