---
phase: quick
plan: 018
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - app/root.tsx
  - app/lib/query-client.ts
  - app/hooks/queries/use-pipelines.ts
  - CLAUDE.md
autonomous: true
must_haves:
  truths:
    - "TanStack Query is installed and provider wraps the app"
    - "Query hooks pattern is established with example"
    - "CLAUDE.md documents mandatory usage for all server state"
  artifacts:
    - path: "app/lib/query-client.ts"
      provides: "QueryClient singleton configuration"
    - path: "app/hooks/queries/use-pipelines.ts"
      provides: "Example query hook for pipelines"
  key_links:
    - from: "app/root.tsx"
      to: "app/lib/query-client.ts"
      via: "QueryClientProvider wrapping app"
      pattern: "QueryClientProvider"
---

<objective>
Install TanStack Query and establish the canonical pattern for all async server state management.

Purpose: TanStack Query is listed in tech stack (CLAUDE.md) but not actually installed. This fixes that discrepancy and establishes clear patterns for all future async data fetching.

Output: Working TanStack Query setup with QueryClientProvider, example query hook, and mandatory usage rules in CLAUDE.md.
</objective>

<execution_context>
@/Users/brendan/.claude/get-shit-done/workflows/execute-plan.md
@/Users/brendan/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@app/root.tsx
@package.json
@app/components/pipeline-builder/pipeline-tabs.tsx (example of current fetch pattern to replace)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install TanStack Query and configure provider</name>
  <files>package.json, app/lib/query-client.ts, app/root.tsx</files>
  <action>
1. Install @tanstack/react-query:
   npm install @tanstack/react-query

2. Create app/lib/query-client.ts:
   - Export a function getQueryClient() that creates/returns singleton QueryClient
   - Configure with sensible defaults:
     - staleTime: 60 * 1000 (1 minute)
     - gcTime: 5 * 60 * 1000 (5 minutes - renamed from cacheTime in v5)
     - refetchOnWindowFocus: false (less aggressive for this app)
     - retry: 1 (single retry on failure)

3. Update app/root.tsx:
   - Import QueryClientProvider from @tanstack/react-query
   - Import getQueryClient from ~/lib/query-client
   - Wrap the ThemeProvider children with QueryClientProvider
   - The provider should be INSIDE ThemeProvider since theme doesn't depend on queries

   Pattern:
   ```tsx
   <ThemeProvider>
     <QueryClientProvider client={getQueryClient()}>
       {children}
     </QueryClientProvider>
   </ThemeProvider>
   ```
  </action>
  <verify>npm run typecheck passes; dev server starts without errors</verify>
  <done>QueryClientProvider wraps app, query-client.ts exports working singleton</done>
</task>

<task type="auto">
  <name>Task 2: Create example query hook and update CLAUDE.md</name>
  <files>app/hooks/queries/use-pipelines.ts, CLAUDE.md</files>
  <action>
1. Create app/hooks/queries/use-pipelines.ts as canonical example:
   ```ts
   import { useQuery } from "@tanstack/react-query";

   interface Pipeline {
     id: string;
     name: string;
   }

   async function fetchPipelines(): Promise<Pipeline[]> {
     const response = await fetch("/api/pipelines");
     if (!response.ok) throw new Error("Failed to fetch pipelines");
     const data = await response.json();
     return data.pipelines ?? [];
   }

   export function usePipelines() {
     return useQuery({
       queryKey: ["pipelines"],
       queryFn: fetchPipelines,
     });
   }
   ```

2. Update CLAUDE.md to add a new section AFTER the tech stack section. Add this:

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
  </action>
  <verify>File exists at app/hooks/queries/use-pipelines.ts; npm run typecheck passes; CLAUDE.md contains "Async Data Fetching Rules" section</verify>
  <done>usePipelines hook exists as canonical example; CLAUDE.md documents mandatory TanStack Query usage for all server state</done>
</task>

</tasks>

<verification>
- npm run typecheck passes
- npm run dev starts without errors
- grep "QueryClientProvider" app/root.tsx returns match
- app/hooks/queries/use-pipelines.ts exists
- grep "TanStack Query" CLAUDE.md returns match in the rules section
</verification>

<success_criteria>
- TanStack Query installed and provider configured in root
- Example query hook demonstrates canonical pattern
- CLAUDE.md explicitly forbids raw fetch() for server data
- Future Claude instances will follow TanStack Query pattern
</success_criteria>

<output>
After completion, create `.planning/quick/018-install-tanstack-query-enforce-pattern/018-SUMMARY.md`
</output>
