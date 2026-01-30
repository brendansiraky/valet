---
task: 019
type: quick
status: complete
completed: 2026-01-30

files-created:
  - app/routes/api.agents.ts
  - app/hooks/queries/useAgents.ts

files-modified:
  - app/routes/agents.tsx
  - app/components/agent-form-dialog.tsx
  - app/components/agent-delete-dialog.tsx

commits:
  - hash: 37c052c
    message: "feat(019): add API route and query hooks for agents"
  - hash: 1b25c56
    message: "feat(019): migrate agent dialogs to TanStack Query mutations"
  - hash: cff8138
    message: "feat(019): migrate agents page to useAgents query hook"

duration: 3 min
---

# Quick Task 019: Migrate Agents Screen to TanStack Query

**One-liner:** Agents screen migrated from Remix loader/action to TanStack Query with automatic cache invalidation on CRUD operations.

## What Was Done

### Task 1: Create API route and query hooks

Created `api.agents.ts` following the `api.pipelines.ts` pattern:
- Loader returns `{ agents, traits, configuredProviders }`
- Action handles create/update/delete intents with Zod validation
- Uses `jsonResponse` helper for consistent JSON responses

Created `useAgents.ts` with query and mutation hooks:
- `useAgents()` - fetches agents list with traits and configuredProviders
- `useCreateAgent()` - POST with `["agents"]` cache invalidation
- `useUpdateAgent()` - POST with `["agents"]` cache invalidation
- `useDeleteAgent()` - POST with `["agents"]` cache invalidation

### Task 2: Migrate components to mutations

Updated `agent-form-dialog.tsx`:
- Replaced `useFetcher` with `useCreateAgent` / `useUpdateAgent`
- Added controlled Dialog state with `mutation.reset()` on close
- Handle validation errors from mutation error data

Updated `agent-delete-dialog.tsx`:
- Replaced `Form` action with `useDeleteAgent` mutation
- Added `isPending` state to disable button during delete
- Close dialog on success via call-level onSuccess callback

### Task 3: Migrate agents page to useAgents query

Updated `agents.tsx`:
- Removed action function (mutations now in components)
- Kept minimal loader for authentication redirect only
- Replaced `useLoaderData` with `useAgents()` hook
- Added loading state with spinner
- Added error state with retry button
- Used proper type narrowing via `agentsQuery.data`

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- TypeScript compiles without errors
- No `useFetcher` or `useLoaderData` in agents CRUD files
- All agent CRUD operations use TanStack Query mutations
- Cache invalidates automatically after create/update/delete

## Notes

The `agent-test-dialog.tsx` still uses `useFetcher` for agent test runs - this is intentional as it's a separate API endpoint (`api.agents.$agentId.run.ts`) not covered by this migration. The test dialog is for running/testing agents, not CRUD operations.
