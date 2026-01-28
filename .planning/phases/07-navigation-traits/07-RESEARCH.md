# Phase 7: Navigation & Traits - Research

**Researched:** 2026-01-29
**Domain:** Application layout, sidebar navigation, CRUD database operations
**Confidence:** HIGH

## Summary

This phase adds persistent sidebar navigation to authenticated pages and introduces a traits system for reusable context snippets. The research covers two main areas: (1) implementing a collapsible sidebar using shadcn/ui's sidebar component with React Router v7 layout routes, and (2) creating a traits CRUD system following the existing agents pattern.

The project already has shadcn/ui sidebar CSS variables defined in `app.css`, indicating the foundation is prepared. The existing authentication pattern (checking session in loaders, redirecting to `/login`) should be centralized in a layout route loader rather than duplicated in every authenticated page.

**Primary recommendation:** Use shadcn/ui's sidebar component with React Router v7's `layout()` function to create an authenticated layout that handles auth checking once for all nested routes.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn/ui sidebar | latest | Collapsible sidebar component | Official shadcn component, already has CSS vars in project |
| @radix-ui/react-collapsible | ^1.1.x | Collapsible sections | Underlies shadcn sidebar, needed for expandable menu groups |
| @radix-ui/react-tooltip | ^1.1.x | Tooltips for collapsed icons | Required when sidebar collapses to icons |
| React Router v7 layout() | 7.12.0 | Layout routes | Already in project, enables shared auth layout |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^0.563.0 | Navigation icons | Already in project, use for sidebar nav items |
| zustand | ^5.0.10 | Sidebar state persistence | Already in project, use for collapse state |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn sidebar | Custom sidebar | shadcn provides mobile handling, keyboard shortcuts, state persistence out of box |
| zustand | Cookies | shadcn sidebar uses cookies by default; zustand only if needing global state |

**Installation:**
```bash
npx shadcn@latest add sidebar tooltip collapsible sheet
```

Note: `sheet` is required for mobile sidebar drawer behavior.

## Architecture Patterns

### Recommended Project Structure
```
app/
├── routes.ts                      # Add layout() wrapper for authenticated routes
├── layouts/
│   └── authenticated.tsx          # SidebarProvider + AppSidebar + Outlet
├── components/
│   ├── app-sidebar.tsx            # Main sidebar component
│   ├── nav-main.tsx               # Primary navigation items
│   ├── nav-user.tsx               # User menu at sidebar footer
│   └── ui/
│       ├── sidebar.tsx            # shadcn sidebar (installed)
│       ├── tooltip.tsx            # shadcn tooltip (installed)
│       ├── collapsible.tsx        # shadcn collapsible (installed)
│       └── sheet.tsx              # shadcn sheet (installed)
├── db/
│   └── schema/
│       └── traits.ts              # Traits table schema
└── routes/
    └── traits.tsx                 # Traits library page (CRUD)
```

### Pattern 1: Layout Route with Auth Check
**What:** Centralize authentication in a layout route loader
**When to use:** All authenticated pages
**Example:**
```typescript
// app/routes.ts
import { type RouteConfig, route, layout, index } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("register", "routes/register.tsx"),
  route("login", "routes/login.tsx"),
  route("logout", "routes/logout.tsx"),

  // Authenticated layout - all children share sidebar and auth check
  layout("layouts/authenticated.tsx", [
    route("dashboard", "routes/dashboard.tsx"),
    route("agents", "routes/agents.tsx"),
    route("pipelines", "routes/pipelines.tsx"),
    route("pipelines/:id", "routes/pipelines.$id.tsx"),
    route("traits", "routes/traits.tsx"),
    route("settings", "routes/settings.tsx"),
  ]),

  // API routes remain outside layout
  route("api/agent/:agentId/run", "routes/api.agent.$agentId.run.ts"),
  route("api/pipelines", "routes/api.pipelines.ts"),
  route("api/pipeline/:pipelineId/run", "routes/api.pipeline.$pipelineId.run.ts"),
  route("api/pipeline/run/:runId/stream", "routes/api.pipeline.run.$runId.stream.ts"),
] satisfies RouteConfig;
```

### Pattern 2: Authenticated Layout Component
**What:** Layout component with sidebar that wraps all authenticated content
**When to use:** The authenticated layout route
**Example:**
```typescript
// app/layouts/authenticated.tsx
import type { LoaderFunctionArgs } from "react-router";
import { Outlet, redirect, useLoaderData } from "react-router";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "~/components/ui/sidebar";
import { AppSidebar } from "~/components/app-sidebar";
import { getSession } from "~/services/session.server";
import { db, users } from "~/db";
import { eq } from "drizzle-orm";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) {
    return redirect("/login");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return redirect("/login");
  }

  return { user: { id: user.id, email: user.email } };
}

export default function AuthenticatedLayout() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

### Pattern 3: Traits Schema (Following Agents Pattern)
**What:** Database schema for traits following existing patterns
**When to use:** The traits table
**Example:**
```typescript
// app/db/schema/traits.ts
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const traits = pgTable(
  "traits",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    context: text("context").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [index("traits_user_id_idx").on(table.userId)]
);

export type Trait = typeof traits.$inferSelect;
export type NewTrait = typeof traits.$inferInsert;
```

### Anti-Patterns to Avoid
- **Duplicating auth checks in every route:** Use layout loader instead
- **Custom sidebar implementation:** Use shadcn sidebar - it handles mobile, keyboard shortcuts, persistence
- **Putting sidebar state in URL:** Use cookies or zustand for collapse state
- **Nested layouts without ID:** If reusing a layout file, provide custom `id` in route config

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Collapsible sidebar | CSS transitions + state | shadcn sidebar | Mobile drawer, keyboard shortcuts, icon mode, persistence |
| Sidebar collapse persistence | localStorage code | Cookie-based (shadcn default) | SSR-compatible, no flash |
| Mobile sidebar | Responsive CSS | shadcn Sheet integration | Drawer behavior, proper touch handling |
| Tooltip on collapsed icons | Title attribute | @radix-ui/react-tooltip | Proper positioning, accessibility |
| Auth redirect logic | Middleware | Layout loader with redirect | React Router pattern, runs per-navigation |

**Key insight:** The shadcn sidebar component handles many edge cases including mobile responsiveness, keyboard shortcuts (Cmd+B), state persistence via cookies, and proper accessibility. Building custom would miss these.

## Common Pitfalls

### Pitfall 1: Auth Check Not Running for Direct Navigation
**What goes wrong:** User can bypass auth by directly navigating to a protected route URL
**Why it happens:** Auth check only in component, not loader
**How to avoid:** Always check auth in loader, redirect if not authenticated
**Warning signs:** Protected pages briefly flash before redirect

### Pitfall 2: Sidebar State Flash on Refresh
**What goes wrong:** Sidebar briefly shows expanded then collapses, or vice versa
**Why it happens:** Client state doesn't match server render
**How to avoid:** Use cookie-based persistence (shadcn default) so server knows state
**Warning signs:** Layout shift on page load

### Pitfall 3: Duplicate Loaders Running
**What goes wrong:** Parent layout loader and child route loader both make same auth query
**Why it happens:** Not using `useRouteLoaderData` to access parent data
**How to avoid:** Child routes can access layout data via `useRouteLoaderData("routes/layouts/authenticated")`
**Warning signs:** Extra database queries, slower page loads

### Pitfall 4: Mobile Sidebar Not Closing on Navigation
**What goes wrong:** User taps a nav link but sidebar stays open
**Why it happens:** Need to close sidebar on navigation in mobile mode
**How to avoid:** Use `useSidebar().setOpenMobile(false)` in nav link handler
**Warning signs:** User has to manually close sidebar after each navigation

### Pitfall 5: Traits Table Missing Index
**What goes wrong:** Slow queries as trait library grows
**Why it happens:** No index on userId column
**How to avoid:** Add index on userId (following agents pattern)
**Warning signs:** Query time increasing with more traits

## Code Examples

Verified patterns from official sources:

### Sidebar Navigation Item
```typescript
// Source: shadcn/ui docs
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "~/components/ui/sidebar";
import { Home, Bot, GitBranch, Sparkles, Settings } from "lucide-react";
import { Link, useLocation } from "react-router";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Agents", url: "/agents", icon: Bot },
  { title: "Pipelines", url: "/pipelines", icon: GitBranch },
  { title: "Traits", url: "/traits", icon: Sparkles },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function NavMain() {
  const location = useLocation();

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton
            asChild
            isActive={location.pathname === item.url}
          >
            <Link to={item.url}>
              <item.icon />
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
```

### Trait Form Dialog (Following Agent Pattern)
```typescript
// Following existing agent-form-dialog.tsx pattern
import { Form, useActionData } from "react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";

interface TraitFormDialogProps {
  trigger: React.ReactNode;
  trait?: { id: string; name: string; context: string };
}

export function TraitFormDialog({ trigger, trait }: TraitFormDialogProps) {
  const isEditing = !!trait;

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Trait" : "Create Trait"}</DialogTitle>
        </DialogHeader>
        <Form method="post" className="space-y-4">
          <input type="hidden" name="intent" value={isEditing ? "update" : "create"} />
          {isEditing && <input type="hidden" name="traitId" value={trait.id} />}

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={trait?.name} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">Context</Label>
            <Textarea
              id="context"
              name="context"
              defaultValue={trait?.context}
              rows={6}
              placeholder="Enter reusable context that can be attached to agents..."
              required
            />
          </div>

          <Button type="submit" className="w-full">
            {isEditing ? "Save Changes" : "Create Trait"}
          </Button>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

### Sidebar Collapse to Icons
```typescript
// Source: shadcn/ui sidebar-07 block
// The sidebar component handles this via collapsible="icon" prop
<Sidebar collapsible="icon">
  {/* Content automatically hides text, shows only icons when collapsed */}
</Sidebar>

// To conditionally hide elements in icon mode:
<span className="group-data-[collapsible=icon]:hidden">
  Text to hide when collapsed
</span>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom CSS sidebar | shadcn/ui sidebar component | 2024 | Standardized, accessible, mobile-ready |
| Auth in every loader | Auth in layout loader | React Router v7 | DRY, single check point |
| localStorage for state | Cookie persistence | shadcn sidebar | SSR-compatible, no flash |
| Remix v2 nested routes | React Router v7 layout() | 2025 | Same concept, new API |

**Deprecated/outdated:**
- `remix-auth` strategies alone: Still works, but layout loaders are simpler for basic auth
- Custom responsive sidebars: shadcn handles this better

## Open Questions

Things that couldn't be fully resolved:

1. **Sidebar state persistence method**
   - What we know: shadcn uses cookies by default, zustand already in project
   - What's unclear: Whether to use shadcn's cookie approach or integrate with zustand
   - Recommendation: Use shadcn's cookie approach (simpler, SSR-compatible)

2. **Child route data loading**
   - What we know: React Router runs all loaders in parallel
   - What's unclear: Whether child routes should re-verify auth or trust layout
   - Recommendation: Trust layout loader, use `useRouteLoaderData` if needed

## Sources

### Primary (HIGH confidence)
- shadcn/ui sidebar docs (https://ui.shadcn.com/docs/components/sidebar) - Component API, installation
- shadcn/ui blocks sidebar examples (https://ui.shadcn.com/blocks/sidebar) - 16 implementation patterns
- React Router v7 routing docs (https://reactrouter.com/start/framework/routing) - layout() function

### Secondary (MEDIUM confidence)
- React Router v7 tutorial (https://www.robinwieruch.de/react-router/) - Layout patterns, January 2026
- React Router auth discussions (GitHub) - Auth in layout loaders pattern

### Tertiary (LOW confidence)
- Community blog posts on shadcn sidebar implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - shadcn/ui is documented, already has CSS vars in project
- Architecture: HIGH - React Router v7 layout routes are well documented
- Pitfalls: MEDIUM - Based on community patterns and official docs

**Research date:** 2026-01-29
**Valid until:** 2026-02-28 (stable libraries, 30 days)
