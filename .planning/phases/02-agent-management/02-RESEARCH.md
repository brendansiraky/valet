# Phase 2: Agent Management - Research

**Researched:** 2026-01-28
**Domain:** CRUD Operations, Form Patterns, Drizzle Schema, React Router v7
**Confidence:** HIGH

## Summary

This research covers implementing a personal agent library where users can create, edit, delete, and browse reusable AI agents defined by natural language instructions. The phase builds on the established patterns from Phase 1 (authentication, database schema, session management).

Agent Management is a standard CRUD domain with straightforward database schema (agents table with user foreign key), React Router v7 action/loader patterns for data operations, and shadcn/ui components for the interface. The key insight is that React Router v7's built-in Form component with action functions handles all CRUD operations without needing TanStack Query for this phase.

The agents table follows the same patterns as the existing `apiKeys` table: UUID primary key, user foreign key with cascade delete, timestamps with auto-update. The UI requires shadcn/ui Dialog for create/edit forms and AlertDialog for delete confirmations.

**Primary recommendation:** Use React Router v7's native Form/action pattern for all CRUD operations, Drizzle ORM for database access, shadcn/ui Dialog and AlertDialog components for modal interactions, and Zod for server-side validation.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-router | 7.12.0 | Form handling, actions, loaders | Already installed, native CRUD patterns |
| drizzle-orm | 0.45.1 | Database schema, queries | Already installed, type-safe, established patterns |
| zod | 4.3.6 | Server-side validation | Already installed, integrates with Drizzle |
| shadcn/ui | latest | UI components (Dialog, AlertDialog, Textarea) | Established in project, accessible components |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| drizzle-zod | 0.8.3 | Schema validation | Generate Zod schemas from Drizzle tables |
| lucide-react | 0.563.0 | Icons (Plus, Pencil, Trash2) | Already installed, action button icons |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React Router actions | TanStack Query mutations | TQ adds complexity; RR actions sufficient for CRUD |
| Dialog modal | Dedicated routes | Modal keeps context; route adds navigation overhead |
| Server-side validation | Client-side validation | Server is authoritative; client validation optional enhancement |

**Installation:**
```bash
# New shadcn/ui components needed
pnpm dlx shadcn@latest add dialog
pnpm dlx shadcn@latest add alert-dialog
pnpm dlx shadcn@latest add textarea
```

## Architecture Patterns

### Recommended Project Structure

```
app/
├── db/
│   └── schema/
│       └── agents.ts           # NEW: Agent table definition
├── routes/
│   ├── agents.tsx              # NEW: Agent list page (index)
│   ├── agents.$agentId.tsx     # NEW: Edit agent route (optional)
│   └── api.agents.ts           # NEW: API route for actions (optional)
├── components/
│   ├── agent-card.tsx          # NEW: Agent display card
│   ├── agent-form-dialog.tsx   # NEW: Create/edit dialog
│   └── agent-delete-dialog.tsx # NEW: Delete confirmation
└── services/
    └── agents.server.ts        # NEW: Agent CRUD operations
```

### Pattern 1: React Router Form with Actions

**What:** Use native Form component with action functions for CRUD
**When to use:** All create, update, delete operations
**Example:**

```typescript
// Source: https://reactrouter.com/how-to/form-validation
// app/routes/agents.tsx
import { Form, data, redirect, useLoaderData } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { z } from "zod";

const AgentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  instructions: z.string().min(1, "Instructions are required").max(10000),
});

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");
  if (!userId) return redirect("/login");

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "create") {
    const name = formData.get("name") as string;
    const instructions = formData.get("instructions") as string;

    const result = AgentSchema.safeParse({ name, instructions });
    if (!result.success) {
      return data(
        { errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    await db.insert(agents).values({
      userId,
      name: result.data.name,
      instructions: result.data.instructions,
    });

    return redirect("/agents");
  }

  if (intent === "delete") {
    const agentId = formData.get("agentId") as string;
    await db.delete(agents).where(
      and(eq(agents.id, agentId), eq(agents.userId, userId))
    );
    return redirect("/agents");
  }

  return null;
}
```

### Pattern 2: Intent-Based Actions

**What:** Single action function handling multiple intents via hidden input
**When to use:** Multiple forms on same page (list with create, edit, delete)
**Example:**

```typescript
// Source: React Router form patterns
// Multiple forms on agents page
<Form method="post">
  <input type="hidden" name="intent" value="create" />
  {/* create form fields */}
</Form>

<Form method="post">
  <input type="hidden" name="intent" value="delete" />
  <input type="hidden" name="agentId" value={agent.id} />
  <Button type="submit" variant="destructive">Delete</Button>
</Form>
```

### Pattern 3: Modal Dialog for Create/Edit

**What:** shadcn/ui Dialog containing Form for in-place editing
**When to use:** Create and edit operations without navigation
**Example:**

```typescript
// Source: https://ui.shadcn.com/docs/components/dialog
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

export function AgentFormDialog({ agent, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const fetcher = useFetcher();

  // Close dialog on successful submission
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data && !fetcher.data.errors) {
      setOpen(false);
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{agent ? "Edit Agent" : "Create Agent"}</DialogTitle>
          <DialogDescription>
            Define your agent with natural language instructions.
          </DialogDescription>
        </DialogHeader>
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value={agent ? "update" : "create"} />
          {agent && <input type="hidden" name="agentId" value={agent.id} />}
          {/* Form fields */}
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}
```

### Pattern 4: Delete Confirmation with AlertDialog

**What:** AlertDialog requiring explicit confirmation before delete
**When to use:** All destructive operations
**Example:**

```typescript
// Source: https://ui.shadcn.com/docs/components/alert-dialog
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";

export function AgentDeleteDialog({ agent }: { agent: Agent }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="icon">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete agent?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete "{agent.name}". This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Form method="post">
            <input type="hidden" name="intent" value="delete" />
            <input type="hidden" name="agentId" value={agent.id} />
            <AlertDialogAction type="submit" className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </Form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### Pattern 5: Drizzle Schema with Foreign Key

**What:** Agents table with user foreign key and cascade delete
**When to use:** Any user-owned entity
**Example:**

```typescript
// Source: https://orm.drizzle.team/docs/indexes-constraints
// app/db/schema/agents.ts
import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const agents = pgTable("agents", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  instructions: text("instructions").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
}, (table) => [
  index("agents_user_id_idx").on(table.userId),
]);
```

### Anti-Patterns to Avoid

- **Deleting without confirmation:** Always use AlertDialog for destructive actions
- **Client-only validation:** Server validation is authoritative; client is enhancement only
- **Returning full objects from loaders:** Select only needed fields (id, name, instructions)
- **Hardcoding user ownership checks:** Always filter by userId in every query/mutation
- **Mutations in loaders:** CRUD mutations must be in action functions only

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form submission | Manual fetch/axios | React Router Form | Progressive enhancement, handles pending states |
| Modal dialogs | Custom modal component | shadcn/ui Dialog | Accessible, handles focus trap, escape key |
| Delete confirmation | Custom confirm dialog | shadcn/ui AlertDialog | Proper ARIA, accessible, consistent UX |
| Validation | Manual if/else | Zod schemas | Type inference, consistent error format |
| UUID generation | Manual UUID function | crypto.randomUUID() | Built into Node/browser, cryptographically secure |
| Textarea auto-resize | Manual height calculation | CSS or library | Complex edge cases, scrolling issues |

**Key insight:** CRUD operations appear trivial but have many edge cases (loading states, error handling, optimistic updates, race conditions). React Router's Form + action pattern handles these correctly by default.

## Common Pitfalls

### Pitfall 1: Missing User Ownership Checks

**What goes wrong:** User can access/modify other users' agents
**Why it happens:** Forgetting to filter by userId in queries
**How to avoid:** Always include `eq(agents.userId, userId)` in WHERE clauses
**Warning signs:** Queries without user filter, routes missing auth checks

### Pitfall 2: Form State Not Resetting After Submit

**What goes wrong:** Dialog stays open with old data after successful submit
**Why it happens:** Not closing dialog on successful action response
**How to avoid:** Use `useFetcher` and close dialog when `fetcher.state === "idle" && !fetcher.data?.errors`
**Warning signs:** Users clicking submit multiple times, stale form values

### Pitfall 3: Orphaned Dialogs Rendering Multiple Times

**What goes wrong:** Each list item renders its own dialog component
**Why it happens:** Placing dialog inside map loop
**How to avoid:** Single dialog controlled by state, store selected agent ID
**Warning signs:** Slow render, multiple DOM dialogs, state sync issues

### Pitfall 4: Missing Error Display After Validation Failure

**What goes wrong:** Form submits but errors are not shown to user
**Why it happens:** Not accessing fetcher.data?.errors in component
**How to avoid:** Always render error messages from fetcher.data
**Warning signs:** Silent form failures, users resubmitting repeatedly

### Pitfall 5: Instructions Field Too Short

**What goes wrong:** Users can't enter detailed agent instructions
**Why it happens:** Using input instead of textarea, no max-length guidance
**How to avoid:** Use Textarea component with generous maxLength (10000+)
**Warning signs:** Truncated instructions, user complaints

### Pitfall 6: No Loading State During Operations

**What goes wrong:** User doesn't know if action is in progress
**Why it happens:** Not using navigation.state or fetcher.state
**How to avoid:** Disable buttons and show "Saving..." during submission
**Warning signs:** Double submissions, user confusion

## Code Examples

Verified patterns from official sources:

### Agents Schema (Drizzle)

```typescript
// Source: Drizzle ORM docs + existing project patterns
// app/db/schema/agents.ts
import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const agents = pgTable("agents", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  instructions: text("instructions").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
}, (table) => [
  index("agents_user_id_idx").on(table.userId),
]);

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
```

### Complete Agents Route

```typescript
// Source: React Router docs, shadcn/ui patterns
// app/routes/agents.tsx
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, redirect, useLoaderData, useFetcher, data } from "react-router";
import { getSession } from "~/services/session.server";
import { db, agents } from "~/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const AgentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  instructions: z.string().min(1, "Instructions are required").max(10000),
});

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");
  if (!userId) return redirect("/login");

  const userAgents = await db.query.agents.findMany({
    where: eq(agents.userId, userId),
    orderBy: (agents, { desc }) => [desc(agents.updatedAt)],
    columns: {
      id: true,
      name: true,
      instructions: true,
      updatedAt: true,
    },
  });

  return { agents: userAgents };
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");
  if (!userId) return redirect("/login");

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "create") {
    const result = AgentSchema.safeParse({
      name: formData.get("name"),
      instructions: formData.get("instructions"),
    });

    if (!result.success) {
      return data({ errors: result.error.flatten().fieldErrors }, { status: 400 });
    }

    await db.insert(agents).values({
      userId,
      name: result.data.name,
      instructions: result.data.instructions,
    });

    return { success: true };
  }

  if (intent === "update") {
    const agentId = formData.get("agentId") as string;
    const result = AgentSchema.safeParse({
      name: formData.get("name"),
      instructions: formData.get("instructions"),
    });

    if (!result.success) {
      return data({ errors: result.error.flatten().fieldErrors }, { status: 400 });
    }

    await db.update(agents)
      .set({
        name: result.data.name,
        instructions: result.data.instructions,
      })
      .where(and(eq(agents.id, agentId), eq(agents.userId, userId)));

    return { success: true };
  }

  if (intent === "delete") {
    const agentId = formData.get("agentId") as string;
    await db.delete(agents)
      .where(and(eq(agents.id, agentId), eq(agents.userId, userId)));
    return { success: true };
  }

  return null;
}
```

### Validation Error Display

```typescript
// Source: https://reactrouter.com/how-to/form-validation
// Inline error display pattern
function FormField({ name, label, error, children }: Props) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      {children}
      {error && (
        <p className="text-sm text-destructive">{error[0]}</p>
      )}
    </div>
  );
}

// Usage in form
<FormField name="name" label="Agent Name" error={fetcher.data?.errors?.name}>
  <Input
    id="name"
    name="name"
    defaultValue={agent?.name}
    placeholder="My Assistant"
  />
</FormField>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side state + API calls | React Router actions | RR v7 / Remix | Server mutations, automatic revalidation |
| Custom modals | shadcn/ui Dialog/AlertDialog | 2023+ | Accessible, composable |
| Manual form validation | Zod + native validation | 2022+ | Type-safe, declarative |
| Separate edit pages | Modal dialogs | UX evolution | Better context preservation |

**Deprecated/outdated:**
- **Custom fetch wrappers:** React Router Form handles this with progressive enhancement
- **useState for form data:** Uncontrolled forms with FormData are preferred
- **Manual loading states:** useNavigation/useFetcher provide this automatically

## Open Questions

Things that couldn't be fully resolved:

1. **Agent versioning**
   - What we know: Enterprise systems version prompts for rollback
   - What's unclear: Whether v1 needs versioning
   - Recommendation: Skip for v1, add in v2 if needed (YAGNI)

2. **Instructions max length**
   - What we know: System prompts can be 200K+ tokens
   - What's unclear: Practical limit for user-written instructions
   - Recommendation: Use TEXT column (unlimited), set UI limit at 10,000 chars

3. **Agent templates/presets**
   - What we know: Could help onboarding with starter agents
   - What's unclear: Whether to ship with default agents
   - Recommendation: Defer to future phase, keep v1 simple

## Sources

### Primary (HIGH confidence)

- [React Router Form Documentation](https://reactrouter.com/api/components/Form) - Form component API
- [React Router Form Validation](https://reactrouter.com/how-to/form-validation) - Validation patterns
- [Drizzle ORM Indexes & Constraints](https://orm.drizzle.team/docs/indexes-constraints) - Foreign key patterns
- [shadcn/ui Dialog](https://ui.shadcn.com/docs/components/dialog) - Modal component
- [shadcn/ui AlertDialog](https://ui.shadcn.com/docs/components/alert-dialog) - Confirmation dialog
- [shadcn/ui Textarea](https://ui.shadcn.com/docs/components/textarea) - Textarea component

### Secondary (MEDIUM confidence)

- [TanStack Query Discussion](https://github.com/TanStack/query/discussions/4560) - useMutation vs router actions
- [Drizzle Best Practices 2025](https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717) - Schema patterns
- [React Router v7 Patterns](https://github.com/remix-run/react-router/discussions/12492) - Community patterns

### Tertiary (LOW confidence)

- [AI Prompt Management Best Practices](https://www.prompthub.us/blog/prompt-engineering-for-ai-agents) - General guidance

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All libraries already installed, patterns established in Phase 1
- Architecture: HIGH - React Router patterns well-documented, existing codebase as reference
- Pitfalls: HIGH - Common issues documented in official guides and community

**Research date:** 2026-01-28
**Valid until:** 2026-02-28 (30 days - stable CRUD domain)
