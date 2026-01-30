---
phase: quick
plan: 026
type: execute
wave: 1
depends_on: []
files_modified:
  - app/hooks/queries/use-pipelines.ts
  - app/routes/api.pipelines.$id.ts
  - app/routes/pipelines.$id.tsx
autonomous: true

must_haves:
  truths:
    - "Pipeline screen loads agents/traits via React Query hooks"
    - "Single pipeline loads via usePipeline(id) hook"
    - "Running a pipeline uses useRunPipeline mutation"
  artifacts:
    - path: "app/hooks/queries/use-pipelines.ts"
      provides: "React Query hooks for pipelines"
      exports: ["usePipelines", "usePipeline", "useRunPipeline"]
    - path: "app/routes/api.pipelines.$id.ts"
      provides: "Single pipeline GET endpoint"
      exports: ["loader"]
  key_links:
    - from: "app/routes/pipelines.$id.tsx"
      to: "app/hooks/queries/use-pipelines.ts"
      via: "usePipeline hook import"
    - from: "app/routes/pipelines.$id.tsx"
      to: "app/hooks/queries/useAgents.ts"
      via: "useAgents hook import"
    - from: "app/routes/pipelines.$id.tsx"
      to: "app/hooks/queries/use-traits.ts"
      via: "useTraits hook import"
---

<objective>
Migrate the pipeline editor screen from Remix loader patterns to TanStack Query.

Purpose: Complete the React Query migration across all screens, aligning with Agents, Traits, and Settings patterns.
Output: Extended pipeline hooks + migrated component using React Query for all data fetching.
</objective>

<execution_context>
@/Users/brendan/.claude/get-shit-done/workflows/execute-plan.md
@/Users/brendan/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.claude/skills/react-query/SKILL.md
@app/hooks/queries/use-pipelines.ts (existing - needs extension)
@app/hooks/queries/useAgents.ts (pattern reference - already has useAgents)
@app/hooks/queries/use-traits.ts (pattern reference - already has useTraits)
@app/routes/api.pipelines.ts (existing API)
@app/routes/pipelines.$id.tsx (current implementation)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extend pipeline hooks with single fetch and run mutation</name>
  <files>
    app/routes/api.pipelines.$id.ts
    app/hooks/queries/use-pipelines.ts
  </files>
  <action>
Create `app/routes/api.pipelines.$id.ts`:
- Add loader that fetches single pipeline by ID from params
- Check auth via session, return 401 if not logged in
- Query `pipelines` table where id matches AND userId matches
- Return 404 if not found, otherwise return `{ pipeline }` as JSON
- Use the same `jsonResponse` helper pattern as `api.pipelines.ts`

Extend `app/hooks/queries/use-pipelines.ts`:
- Keep existing `usePipelines()` hook unchanged
- Add `Pipeline` interface: `{ id: string; name: string; description: string | null; flowData: unknown }`
- Add `usePipeline(id: string | undefined)` hook:
  - queryKey: `["pipelines", id]`
  - queryFn fetches `/api/pipelines/${id}`
  - enabled: `!!id && id !== "home" && id !== "new"`
  - Returns single pipeline data
- Add `useRunPipeline()` mutation hook:
  - mutationFn takes `{ pipelineId: string; input: string }`
  - POSTs FormData to `/api/pipeline/${pipelineId}/run` (existing endpoint)
  - Returns `{ runId }` response
  - No cache invalidation needed (runs don't affect pipeline list)
  </action>
  <verify>
TypeScript compiles: `npx tsc --noEmit`
API route accessible: `curl http://localhost:5173/api/pipelines/test-id` (should return 401 or 404)
  </verify>
  <done>
Single pipeline API route exists at `app/routes/api.pipelines.$id.ts`.
Hooks exist: usePipeline(id) for single fetch, useRunPipeline() for running.
  </done>
</task>

<task type="auto">
  <name>Task 2: Migrate pipeline screen to React Query</name>
  <files>
    app/routes/pipelines.$id.tsx
  </files>
  <action>
Update `app/routes/pipelines.$id.tsx`:

1. Replace loader data with React Query hooks:
   - Remove the loader function (keep only auth redirect check if needed, or remove entirely)
   - Remove `useLoaderData` import and usage
   - Import `useAgents` from `~/hooks/queries/useAgents`
   - Import `useTraits` from `~/hooks/queries/use-traits`
   - Import `usePipeline, useRunPipeline` from `~/hooks/queries/use-pipelines`

2. Fetch data via hooks:
   - Call `useAgents()` - use `agentsQuery.data?.agents` for userAgents
   - Call `useTraits()` - use `traitsQuery.data` for userTraits
   - Call `usePipeline(urlId)` - use `pipelineQuery.data?.pipeline` for requestedPipeline

3. Handle loading states:
   - Show loading indicator while any query is pending
   - AgentSidebar and TraitsContext should handle empty arrays gracefully

4. Replace manual fetch in `handleRunSubmit`:
   - Use `runPipelineMutation.mutate({ pipelineId, input: runInput })` instead of manual fetch
   - Move the runId state update to mutation's onSuccess callback (call-site)
   - Move error handling to mutation's onError callback (call-site)

5. Update type imports:
   - The `Trait` type can come from use-traits.ts export
   - Keep local types for Agent/Pipeline that match loader return shape

Note: Keep the existing stores (useTabStore, usePipelineStore) and useAutosave - those are for local state, not server state.
  </action>
  <verify>
TypeScript compiles: `npx tsc --noEmit`
Manual test: Navigate to /pipelines/home, then open a pipeline - should load agents in sidebar and pipeline data.
Manual test: Run a pipeline - should work as before using the mutation.
  </verify>
  <done>
Pipeline screen uses useAgents() for agents sidebar data.
Pipeline screen uses useTraits() for traits data.
Pipeline screen uses usePipeline(id) for single pipeline data.
Pipeline screen uses useRunPipeline() mutation for running pipelines.
No Remix useLoaderData pattern remains.
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes
2. Navigate to /pipelines/home - page loads with empty canvas
3. Open a pipeline from list - loads pipeline data, shows in canvas
4. Agent sidebar shows agents (loaded via useAgents)
5. Run a pipeline - dialog works, run starts, progress shows
</verification>

<success_criteria>
- Pipeline screen fully migrated to React Query for data fetching
- Loader removed or reduced to auth-only
- useAgents, useTraits, usePipeline hooks used for server state
- useRunPipeline mutation used for running pipelines
- TypeScript compiles without errors
</success_criteria>

<output>
After completion, create `.planning/quick/026-migrate-pipeline-screen-to-react-query/026-SUMMARY.md`
</output>
