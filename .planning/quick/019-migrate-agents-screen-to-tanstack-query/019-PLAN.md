---
task: 019
type: quick
description: Migrate Agents screen to TanStack Query
files_modified:
  - app/routes/api.agents.ts
  - app/hooks/queries/useAgents.ts
  - app/routes/agents.tsx
  - app/components/agent-form-dialog.tsx
  - app/components/agent-delete-dialog.tsx
---

<objective>
Migrate the Agents screen from Remix loader/action pattern to TanStack Query.

Purpose: Consistent data fetching patterns across the app - all server state via TanStack Query
Output: Query hooks for agents with automatic cache invalidation on mutations
</objective>

<context>
@app/routes/agents.tsx (current implementation with loader/action)
@app/routes/api.pipelines.ts (reference pattern for API route)
@app/hooks/queries/use-pipelines.ts (reference pattern for query hooks)
@app/components/agent-form-dialog.tsx (uses useFetcher, needs mutation)
@app/components/agent-delete-dialog.tsx (uses Form, needs mutation)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create API route and query hooks</name>
  <files>
    - app/routes/api.agents.ts
    - app/hooks/queries/useAgents.ts
  </files>
  <action>
Create `api.agents.ts` following the `api.pipelines.ts` pattern:
- Loader: Return `{ agents, traits, configuredProviders }` - same data as current agents.tsx loader
- Action with intents: create, update, delete (extract from current agents.tsx action)
- Use `jsonResponse` helper for consistent JSON responses
- Keep the AgentSchema validation from current action

Create `useAgents.ts` with query and mutation hooks:
- `useAgents()` - fetches agents list with traits and configuredProviders
- `useCreateAgent()` - POST with cache invalidation on success
- `useUpdateAgent()` - POST with cache invalidation on success
- `useDeleteAgent()` - POST with cache invalidation on success

Follow React Query skill patterns exactly:
- Type the queryFn return, not the hook generic
- Use query key `["agents"]` for the list
- Mutations invalidate `["agents"]` on success
- Hook-level onSuccess for cache, call-level for UI (toast/close dialog)
  </action>
  <verify>TypeScript compiles: `npx tsc --noEmit`</verify>
  <done>API route serves agent data, query hooks export all 4 functions</done>
</task>

<task type="auto">
  <name>Task 2: Migrate components to mutations</name>
  <files>
    - app/components/agent-form-dialog.tsx
    - app/components/agent-delete-dialog.tsx
  </files>
  <action>
Update `agent-form-dialog.tsx`:
- Replace `useFetcher` with `useCreateAgent` / `useUpdateAgent` mutations
- Call `mutation.mutate()` on form submit instead of fetcher.Form
- Use `mutation.isPending` for loading state
- Close dialog on success via call-level `onSuccess` callback
- Keep validation error display using mutation.error or response errors

Update `agent-delete-dialog.tsx`:
- Replace `Form` with `useDeleteAgent` mutation
- Call `mutation.mutate({ agentId })` on confirm click
- Add `isPending` state to disable button during delete
- Close dialog on success

Both components should handle the dialog close via a callback prop or by using Dialog's controlled state with mutation success.
  </action>
  <verify>TypeScript compiles: `npx tsc --noEmit`</verify>
  <done>Both dialogs use TanStack Query mutations, no useFetcher/Form imports</done>
</task>

<task type="auto">
  <name>Task 3: Migrate agents page to useAgents query</name>
  <files>
    - app/routes/agents.tsx
  </files>
  <action>
Update `agents.tsx`:
- Remove the loader function entirely (data now comes from API route)
- Remove the action function entirely (mutations handled by components)
- Replace `useLoaderData` with `useAgents()` hook
- Handle loading state: show skeleton or spinner while `agentsQuery.isPending`
- Handle error state: show error message if `agentsQuery.isError`
- Use `agentsQuery.data` for rendering (with proper type narrowing - don't destructure)
- Keep the rest of the component unchanged (AgentCard, AgentTestDialog, etc.)

The page should still work exactly the same but now uses client-side data fetching.
  </action>
  <verify>
    1. `npx tsc --noEmit` - TypeScript compiles
    2. Manual test: Navigate to /agents, verify agents load
    3. Manual test: Create agent, verify it appears in list
    4. Manual test: Edit agent, verify changes persist
    5. Manual test: Delete agent, verify it disappears
    6. Manual test: Test agent still works
  </verify>
  <done>Agents page loads data via useAgents, all CRUD operations work with automatic cache updates</done>
</task>

</tasks>

<success_criteria>
- No useFetcher or useLoaderData in agents-related files
- All agent CRUD operations use TanStack Query mutations
- Cache invalidates automatically after create/update/delete
- TypeScript compiles without errors
- Agents page functionally identical to before migration
</success_criteria>
