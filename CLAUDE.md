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
| Styling           | `.claude/skills/styling/SKILL.md`           | CVA patterns, Tailwind organization, variant definitions                                                  |
| Vitest Testing    | `.claude/skills/vitest-testing/SKILL.md`    | Writing tests, test patterns, mocking                                                                     |

**Important**: Skills have `references/` subdirectories with additional detail. Read those when the main SKILL.md indicates they're relevant.

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
