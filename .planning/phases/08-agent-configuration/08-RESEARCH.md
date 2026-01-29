# Phase 8: Agent Configuration - Research

**Researched:** 2026-01-29
**Domain:** Database schema extension, form UI patterns, multi-select, API parameter routing
**Confidence:** HIGH

## Summary

This phase extends the agent schema with capability, model, and trait assignment fields. The research covers four main areas: (1) adding capability and model columns to the agents table, (2) creating an agent_traits junction table for many-to-many trait assignment, (3) extending the agent form dialog with new controls, and (4) modifying the agent runner to include trait context in prompts.

The project already has established patterns for agent CRUD (`app/routes/agents.tsx`, `app/components/agent-form-dialog.tsx`), traits storage (`app/db/schema/traits.ts`), capability routing (`app/services/agent-runner.server.ts`), and model selection (`app/lib/models.ts`, `app/routes/settings.tsx`). The implementation follows these patterns closely.

**Primary recommendation:** Extend the agents table with `capability` (enum text) and `model` (nullable text) columns, create an `agent_traits` junction table, and modify the agent form dialog to include capability Select, model Select (with "Use default" option), and a multi-select checkbox list for traits.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Drizzle ORM | ^0.45.1 | Schema migrations, relations | Already in project, well-documented many-to-many pattern |
| React Router v7 | 7.12.0 | Form actions, loaders | Already in project, handles form submission |
| shadcn/ui | latest | Form components (Select, Checkbox) | Already in project, consistent styling |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-select | ^2.x | Select component primitive | Capability and model dropdowns |
| @radix-ui/react-checkbox | ^1.x | Checkbox primitive | Trait multi-select |
| zod | ^3.x | Form validation | Already in project for agent schema |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Checkbox list for traits | Combobox (Command+Popover) | Combobox better for large lists (50+ items), checkbox simpler for small lists |
| Nullable model column | Default value in column | Null allows "use user's default" semantics, cleaner than storing default |

**Installation:**
```bash
# No new packages needed - all dependencies already installed
npx shadcn@latest add checkbox  # Only if not already present
```

## Architecture Patterns

### Recommended Changes Structure
```
app/
├── db/
│   └── schema/
│       ├── agents.ts              # Add capability, model columns
│       └── agent-traits.ts        # NEW: Junction table for agent-trait assignments
├── lib/
│   └── models.ts                  # Already exists, used for model dropdown
├── components/
│   ├── agent-form-dialog.tsx      # Extend with capability, model, traits fields
│   └── ui/
│       └── checkbox.tsx           # May need to add from shadcn
├── services/
│   └── agent-runner.server.ts     # Modify to accept and include trait context
└── routes/
    └── agents.tsx                 # Extend loader/action for traits
```

### Pattern 1: Agent Schema Extension
**What:** Add capability and model columns to agents table
**When to use:** Database migration
**Example:**
```typescript
// app/db/schema/agents.ts
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

// Capability enum: none = text only, search = web search, fetch = URL fetch
export const agents = pgTable(
  "agents",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    instructions: text("instructions").notNull(),
    // NEW: Capability setting - stored as text enum
    capability: text("capability").notNull().default("none"),
    // NEW: Model override - null means use user's default from settings
    model: text("model"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [index("agents_user_id_idx").on(table.userId)]
);

// Type for capability values
export type AgentCapability = "none" | "search" | "fetch";
```

### Pattern 2: Agent-Traits Junction Table
**What:** Many-to-many relationship between agents and traits
**When to use:** Trait assignment storage
**Example:**
```typescript
// app/db/schema/agent-traits.ts
import { pgTable, text, primaryKey, timestamp } from "drizzle-orm/pg-core";
import { agents } from "./agents";
import { traits } from "./traits";

export const agentTraits = pgTable(
  "agent_traits",
  {
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    traitId: text("trait_id")
      .notNull()
      .references(() => traits.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.agentId, t.traitId] })]
);

export type AgentTrait = typeof agentTraits.$inferSelect;
export type NewAgentTrait = typeof agentTraits.$inferInsert;
```

### Pattern 3: Drizzle Relations for Query
**What:** Define relations for easy querying of agent with traits
**When to use:** Relational queries
**Example:**
```typescript
// app/db/schema/agent-traits.ts (continued)
import { relations } from "drizzle-orm";

export const agentTraitsRelations = relations(agentTraits, ({ one }) => ({
  agent: one(agents, {
    fields: [agentTraits.agentId],
    references: [agents.id],
  }),
  trait: one(traits, {
    fields: [agentTraits.traitId],
    references: [traits.id],
  }),
}));

export const agentsRelations = relations(agents, ({ many }) => ({
  agentTraits: many(agentTraits),
}));

export const traitsRelations = relations(traits, ({ many }) => ({
  agentTraits: many(agentTraits),
}));
```

### Pattern 4: Agent Form with Traits Selection
**What:** Multi-select for traits using checkbox list in collapsible section
**When to use:** Agent create/edit form
**Example:**
```typescript
// In agent-form-dialog.tsx
import { Checkbox } from "~/components/ui/checkbox";

// Traits are passed as props, selected as state
const [selectedTraitIds, setSelectedTraitIds] = useState<string[]>(
  agent?.traitIds ?? []
);

// In form JSX:
<div className="space-y-2">
  <Label>Traits</Label>
  <div className="max-h-40 overflow-y-auto space-y-2 border rounded-md p-3">
    {traits.length === 0 ? (
      <p className="text-sm text-muted-foreground">
        No traits available. Create traits in the Traits library.
      </p>
    ) : (
      traits.map((trait) => (
        <div key={trait.id} className="flex items-center space-x-2">
          <Checkbox
            id={`trait-${trait.id}`}
            checked={selectedTraitIds.includes(trait.id)}
            onCheckedChange={(checked) => {
              setSelectedTraitIds((prev) =>
                checked
                  ? [...prev, trait.id]
                  : prev.filter((id) => id !== trait.id)
              );
            }}
          />
          <label
            htmlFor={`trait-${trait.id}`}
            className="text-sm cursor-pointer"
          >
            {trait.name}
          </label>
        </div>
      ))
    )}
  </div>
  {/* Hidden inputs to submit selected trait IDs */}
  {selectedTraitIds.map((id) => (
    <input key={id} type="hidden" name="traitIds" value={id} />
  ))}
</div>
```

### Pattern 5: Include Trait Context in Agent Execution
**What:** Combine agent instructions with trait context for system prompt
**When to use:** Agent runner, pipeline executor
**Example:**
```typescript
// In agent-runner.server.ts
export interface AgentRunParams {
  agent: Agent;
  userInput: string;
  encryptedApiKey: string;
  model: ModelId;
  capabilities?: {
    webSearch?: boolean;
    urlFetch?: boolean;
  };
  traitContext?: string; // NEW: Combined trait context
}

// Build system prompt with trait context
function buildSystemPrompt(instructions: string, traitContext?: string): string {
  if (!traitContext) return instructions;

  // Prepend trait context to instructions
  return `${traitContext}\n\n---\n\n${instructions}`;
}

// Use in generateText/runWithWebSearch/runWithUrlFetch calls:
const systemPrompt = buildSystemPrompt(agent.instructions, traitContext);
```

### Anti-Patterns to Avoid
- **Storing trait IDs as JSON array in agents table:** Use junction table for proper referential integrity
- **Duplicating capability selection in test dialog:** Capability is now on agent definition, test dialog should use it
- **Hardcoding model list in multiple places:** Use AVAILABLE_MODELS from lib/models.ts
- **Fetching full trait context for every agent list:** Only fetch trait IDs, load full context on agent execution

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-select UI | Custom dropdown with checkboxes | Checkbox list in scrollable container | Simpler, works well for <50 items |
| Model list | Hardcoded strings | AVAILABLE_MODELS constant | Single source of truth, easy to update |
| Junction table queries | Manual JOINs everywhere | Drizzle relations | Cleaner syntax, type-safe |
| Form array submission | Custom JSON encoding | Multiple inputs with same name | Native HTML form pattern |

**Key insight:** The codebase already has Select for single selection and checkbox primitives. A checkbox list is the simplest approach for trait assignment since users typically have <20 traits.

## Common Pitfalls

### Pitfall 1: Capability Migration Breaking Existing Agents
**What goes wrong:** Migration fails or existing agents have null capability
**Why it happens:** Column added without default value
**How to avoid:** Add capability column with DEFAULT 'none' - existing agents get text-only behavior
**Warning signs:** Migration error or agent execution failing

### Pitfall 2: Model Null vs Empty String
**What goes wrong:** Empty string stored instead of null, breaks "use default" logic
**Why it happens:** Form submits empty string when no selection made
**How to avoid:** Convert empty string to null in action handler
**Warning signs:** Agent always uses first model instead of user's default

### Pitfall 3: Trait Deletion Orphans Junction Records
**What goes wrong:** Junction table has references to deleted traits
**Why it happens:** Missing ON DELETE CASCADE
**How to avoid:** Junction table foreign key has `onDelete: "cascade"` on both references
**Warning signs:** Query errors when loading agent traits

### Pitfall 4: Form Doesn't Submit Empty Trait Selection
**What goes wrong:** Removing all traits from agent doesn't update database
**Why it happens:** No hidden inputs = no traitIds in form data
**How to avoid:** Always submit a marker field (e.g., `traitsUpdated=true`) so action knows to clear if no traitIds present
**Warning signs:** Can't remove traits once assigned

### Pitfall 5: Trait Context Exceeds Token Limits
**What goes wrong:** Combined trait context + instructions exceeds model context window
**Why it happens:** Multiple large traits assigned to agent
**How to avoid:** Character limit on traits (50000), warn if combined context is large
**Warning signs:** API errors about context length

## Code Examples

### Loading Agent with Traits for Editing
```typescript
// In agents.tsx loader
const userAgents = await db.query.agents.findMany({
  where: eq(agents.userId, userId),
  orderBy: [desc(agents.updatedAt)],
  with: {
    agentTraits: {
      columns: { traitId: true },
    },
  },
});

// Transform for component
const agentsWithTraitIds = userAgents.map((agent) => ({
  ...agent,
  traitIds: agent.agentTraits.map((at) => at.traitId),
}));
```

### Saving Agent with Traits
```typescript
// In agents.tsx action, "create" intent
const traitIds = formData.getAll("traitIds") as string[];

// Insert agent
const [newAgent] = await db
  .insert(agents)
  .values({
    userId,
    name: result.data.name,
    instructions: result.data.instructions,
    capability: result.data.capability,
    model: result.data.model || null,
  })
  .returning({ id: agents.id });

// Insert trait assignments
if (traitIds.length > 0) {
  await db.insert(agentTraits).values(
    traitIds.map((traitId) => ({
      agentId: newAgent.id,
      traitId,
    }))
  );
}
```

### Updating Agent Traits
```typescript
// In agents.tsx action, "update" intent
const traitsUpdated = formData.has("traitsUpdated");
const traitIds = formData.getAll("traitIds") as string[];

// Update agent fields
await db
  .update(agents)
  .set({
    name: result.data.name,
    instructions: result.data.instructions,
    capability: result.data.capability,
    model: result.data.model || null,
  })
  .where(and(eq(agents.id, agentId), eq(agents.userId, userId)));

// Update trait assignments if traits section was submitted
if (traitsUpdated) {
  // Delete existing assignments
  await db
    .delete(agentTraits)
    .where(eq(agentTraits.agentId, agentId));

  // Insert new assignments
  if (traitIds.length > 0) {
    await db.insert(agentTraits).values(
      traitIds.map((traitId) => ({
        agentId,
        traitId,
      }))
    );
  }
}
```

### Loading Trait Context for Execution
```typescript
// In api.agent.$agentId.run.ts or pipeline-executor
async function loadTraitContext(agentId: string): Promise<string | undefined> {
  const assignments = await db.query.agentTraits.findMany({
    where: eq(agentTraits.agentId, agentId),
    with: {
      trait: {
        columns: { name: true, context: true },
      },
    },
  });

  if (assignments.length === 0) return undefined;

  // Combine trait contexts with headers
  return assignments
    .map((a) => `## ${a.trait.name}\n\n${a.trait.context}`)
    .join("\n\n---\n\n");
}
```

### Capability Select in Form
```typescript
// In agent-form-dialog.tsx
<div className="space-y-2">
  <Label htmlFor="capability">Capability</Label>
  <Select
    name="capability"
    defaultValue={agent?.capability ?? "none"}
  >
    <SelectTrigger id="capability" className="w-full">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="none">Text only</SelectItem>
      <SelectItem value="search">Web search</SelectItem>
      <SelectItem value="fetch">URL fetch</SelectItem>
    </SelectContent>
  </Select>
  <p className="text-xs text-muted-foreground">
    Determines what tools the agent can use when executing.
  </p>
</div>
```

### Model Select with Default Option
```typescript
// In agent-form-dialog.tsx
<div className="space-y-2">
  <Label htmlFor="model">Model</Label>
  <Select
    name="model"
    defaultValue={agent?.model ?? ""}
  >
    <SelectTrigger id="model" className="w-full">
      <SelectValue placeholder="Use default from settings" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="">Use default from settings</SelectItem>
      {AVAILABLE_MODELS.map((model) => (
        <SelectItem key={model.id} value={model.id}>
          {model.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
  <p className="text-xs text-muted-foreground">
    Override the default model for this agent.
  </p>
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Capability in test dialog | Capability on agent definition | This phase | Cleaner UX, consistent behavior |
| Global model only | Per-agent model override | This phase | Flexibility for different use cases |
| No trait assignment | Junction table assignment | This phase | Reusable context across agents |

**Deprecated/outdated:**
- Selecting capability at test time: Moved to agent definition in this phase

## Open Questions

None - all requirements are well-defined and implementation patterns are clear.

## Sources

### Primary (HIGH confidence)
- Project codebase: `app/db/schema/agents.ts`, `app/db/schema/traits.ts` - existing patterns
- Project codebase: `app/services/agent-runner.server.ts` - capability routing
- Project codebase: `app/routes/settings.tsx` - model selection UI pattern
- [Drizzle ORM Relations](https://orm.drizzle.team/docs/relations) - many-to-many patterns

### Secondary (MEDIUM confidence)
- [Drizzle ORM Relations v2](https://orm.drizzle.team/docs/relations-v2) - junction table patterns
- shadcn/ui checkbox component documentation

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in project
- Architecture: HIGH - follows existing codebase patterns exactly
- Pitfalls: HIGH - based on common database/form patterns

**Research date:** 2026-01-29
**Valid until:** 2026-02-28 (stable patterns, 30 days)
