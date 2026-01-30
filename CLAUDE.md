# Valet - Project Instructions

## Tech Stack

- **Framework**: Remix
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: TanStack Query
- **AI**: Anthropic SDK (@anthropic-ai/sdk)

## Available Skills

Read the relevant skill file when encountering matching work. Do not load all skills - only read what's needed for the current task.

| Skill             | Path                                        | Use When                                                                                                  |
| ----------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Frontend Designer | `.claude/skills/frontend-designer/SKILL.md` | Designing pages, layouts, applying design system, visual consistency, spacing/colors/typography decisions |
| React Components  | `.claude/skills/react-components/SKILL.md`  | Component architecture, prop interfaces, React patterns                                                   |
| React Query       | `.claude/skills/react-query/SKILL.md`       | TanStack Query patterns, query hooks, mutations, caching, invalidation                                    |
| Styling           | `.claude/skills/styling/SKILL.md`           | CVA patterns, Tailwind organization, variant definitions                                                  |
| Vitest Testing    | `.claude/skills/vitest-testing/SKILL.md`    | Writing tests, test patterns, mocking                                                                     |

**Important**: Skills have `references/` subdirectories with additional detail. Read those when the main SKILL.md indicates they're relevant.

## Mandatory Skill Invocation

**ALWAYS invoke these skills before starting related work:**

| Skill | Invoke When | Command |
|-------|-------------|---------|
| **React Query** | Creating/modifying query hooks, adding mutations, working with server data fetching, optimistic updates, cache invalidation | `/react-query` |
| **Frontend Designer** | ANY UI/UX changes - new pages, modifying layouts, adding components, styling updates, visual consistency work | `/frontend-designer` |

These skills contain project-specific patterns and must be loaded to ensure consistency. Do not rely on general knowledge - invoke the skill first.

## Async Data Fetching Rules

**ALL async server state MUST use TanStack Query hooks.**

| Use Case | Pattern | Example |
|----------|---------|---------|
| Server data (GET) | `useQuery` | `usePipelines()`, `useAgents()` |
| Mutations (POST/PUT/DELETE) | `useMutation` | `useCreatePipeline()` |
| Optimistic updates | `useMutation` + `onMutate` | Inline edit with rollback |

**DO NOT use:**
- Raw `fetch()` in components for server data
- `useEffect` + `useState` for data fetching
- `useFetcher` from Remix for read operations (use for forms only)

**Query hook location:** `app/hooks/queries/`

**Naming convention:**
- Queries: `use{Resource}` or `use{Resource}ById`
- Mutations: `use{Action}{Resource}` (e.g., `useCreatePipeline`, `useDeleteAgent`)

**Example pattern:**
```ts
// app/hooks/queries/use-pipelines.ts
import { useQuery } from "@tanstack/react-query";

export function usePipelines() {
  return useQuery({
    queryKey: ["pipelines"],
    queryFn: async () => {
      const res = await fetch("/api/pipelines");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });
}
```

**Zustand is still used for:** Local UI state (sidebar collapsed, selected tab, form state). If it doesn't come from the server, Zustand is fine.
