---
phase: quick-030
plan: 01
completed: 2026-01-30
duration: 2 min
subsystem: pipeline-builder
tags: [react-query, mutations, cache-invalidation]

dependency-graph:
  requires: [quick-018, quick-026]
  provides: [useDeletePipeline-mutation, backend-synced-dropdown]
  affects: []

tech-stack:
  patterns: [mutation-with-cache-invalidation]

key-files:
  created: []
  modified:
    - app/hooks/queries/use-pipelines.ts
    - app/components/pipeline-builder/pipeline-tabs.tsx
    - app/components/pipeline-builder/pipeline-tab-panel.tsx

decisions:
  - id: delete-mutation-invalidates-list
    choice: "Invalidate ['pipelines'] queryKey on delete success"
    rationale: "Dropdown reads from same cache, immediate UI update"
---

# Quick Task 030: Fix Pipeline Delete and Dropdown Backend

useDeletePipeline mutation with cache invalidation; dropdown uses usePipelines() React Query hook

## Changes Made

### Task 1: Add useDeletePipeline mutation to hooks
- Added `DeletePipelineInput` interface
- Added `deletePipeline` async function calling `/api/pipelines` with intent=delete
- Added `useDeletePipeline()` hook that calls `queryClient.invalidateQueries({ queryKey: ["pipelines"] })` on success
- Imported `useQueryClient` from @tanstack/react-query

### Task 2: Use usePipelines hook in dropdown
- Removed local `useState<Pipeline[]>` and `useEffect` fetch from pipeline-tabs.tsx
- Replaced with `const { data: pipelines = [] } = usePipelines()`
- Removed local `Pipeline` interface (already exported from hook)

### Task 3: Use useDeletePipeline in tab panel
- Imported `useDeletePipeline` from hooks
- Replaced manual fetch delete with `deletePipelineMutation.mutate()`
- Delete success calls `onDelete()` callback
- Error handling via `onError` callback

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| 10b0fc4 | feat | Add useDeletePipeline mutation with cache invalidation |
| 42aea2d | refactor | Use usePipelines hook in dropdown |
| 351c577 | refactor | Use useDeletePipeline mutation in tab panel |

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- TypeScript compiles successfully (`npx tsc --noEmit`)
- Dropdown reads from React Query cache
- Delete mutation invalidates cache
- Dropdown updates immediately after deletion
