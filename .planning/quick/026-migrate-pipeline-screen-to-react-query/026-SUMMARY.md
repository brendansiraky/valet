---
phase: quick
plan: 026
completed: 2026-01-30
duration: 6 min
status: complete
---

# Quick Task 026: Migrate Pipeline Screen to React Query

Migrated the pipeline editor screen from Remix loader patterns to TanStack Query, completing the React Query migration across all main screens.

## What Was Done

### Task 1: Extended Pipeline Hooks
- Created `app/routes/api.pipelines.$id.ts` for single pipeline fetch
- Added `usePipeline(id)` hook with enabled guard for home/new routes
- Added `useRunPipeline()` mutation for running pipelines
- Commit: `1ce6ee4`

### Task 2: Migrated Pipeline Screen
- Removed loader function and `useLoaderData` pattern
- Added React Query hooks: `useAgents()`, `useTraits()`, `usePipeline()`
- Replaced manual fetch in `handleRunSubmit` with `useRunPipeline()` mutation
- Updated `TraitsContext` to use minimal `TraitContextValue` interface
- Updated component prop types (`AgentSidebar`, `PipelineTabPanel`) for flexibility
- Commit: `f8dbeb9`

## Files Modified

| File | Change |
|------|--------|
| `app/routes/api.pipelines.$id.ts` | Created - single pipeline GET endpoint |
| `app/hooks/queries/use-pipelines.ts` | Extended - added usePipeline, useRunPipeline |
| `app/routes/pipelines.$id.tsx` | Migrated - React Query hooks instead of loader |
| `app/components/pipeline-builder/traits-context.tsx` | Updated - minimal interface, renamed hook |
| `app/components/pipeline-builder/agent-sidebar.tsx` | Updated - local prop interfaces |
| `app/components/pipeline-builder/pipeline-tab-panel.tsx` | Updated - TraitContextValue type |
| `app/components/pipeline-builder/agent-node.tsx` | Updated - useTraitsContext import |

## Deviations from Plan

### [Rule 3 - Blocking] Fixed type mismatch between Trait types
- **Found during:** Task 2
- **Issue:** `use-traits.ts` exports a Trait interface with fewer fields than `db/schema/traits.ts`
- **Fix:** Updated `TraitsContext` and components to use minimal `TraitContextValue` interface that matches what the API actually returns
- **Files modified:** traits-context.tsx, agent-sidebar.tsx, pipeline-tab-panel.tsx, agent-node.tsx, pipelines.$id.tsx

## Verification

- TypeScript compiles without errors
- Pipeline editor structure unchanged (tabs, sidebar, canvas)
- Run pipeline mutation matches original fetch behavior

## Migration Status

All main screens now use React Query:
- [x] Agents screen (quick-019)
- [x] Traits screen (quick-020)
- [x] Settings screen (quick-021)
- [x] Pipeline editor (quick-026)
