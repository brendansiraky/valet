---
phase: 19-remove-zustand-from-pipeline-builder
plan: 01
subsystem: state-management
tags: [react-query, react-flow, zustand, lodash-es, debounce, cache]

# Dependency graph
requires:
  - phase: none
    provides: foundation
provides:
  - usePipelineFlow hook for React Query cache-based state management
  - FlowData, AgentNodeData, TraitNodeData, PipelineNodeData types
  - lodash-es dependency for debounce
affects:
  - 19-02 (pipeline-tab-panel migration)
  - 19-03 (agent-node, agent-sidebar migration)
  - 19-04 (pipeline-store removal)

# Tech tracking
tech-stack:
  added:
    - lodash-es (^4.17.23)
    - "@types/lodash-es" (^4.17.12)
  patterns:
    - React Query cache as source of truth for React Flow state
    - setQueryData for instant UI updates
    - Debounced autosave (1000ms) with cleanup

key-files:
  created:
    - app/hooks/queries/use-pipeline-flow.ts
  modified:
    - app/hooks/queries/use-pipelines.ts
    - package.json

key-decisions:
  - "Use lodash-es debounce (1000ms) for autosave to prevent excessive server requests"
  - "FlowData type added to use-pipelines.ts to centralize pipeline types"
  - "Node data types (AgentNodeData, TraitNodeData) moved from pipeline-store.ts to use-pipelines.ts"

patterns-established:
  - "usePipelineFlow hook pattern: query for fetch, setQueryData for updates, debounced mutation for saves"
  - "Never mutate old parameter in setQueryData - always return new objects"
  - "useEffect cleanup for debounce cancellation is a legitimate use"

# Metrics
duration: 2min
completed: 2026-01-30
---

# Phase 19 Plan 01: React Query Flow Hook Summary

**usePipelineFlow hook replaces Zustand reads/writes with React Query cache via setQueryData and debounced autosave**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-30T08:09:01Z
- **Completed:** 2026-01-30T08:11:30Z
- **Tasks:** 2
- **Files modified:** 3 (use-pipelines.ts, package.json, package-lock.json) + 1 created

## Accomplishments

- Created usePipelineFlow hook that uses React Query cache as single source of truth
- Added proper TypeScript types for pipeline flow data (FlowData, AgentNodeData, TraitNodeData)
- Installed lodash-es for debounce functionality with 1000ms delay
- Implemented all React Flow callbacks (onNodesChange, onEdgesChange, onConnect)
- Added node manipulation actions (addAgentNode, addTraitNode, removeNode)
- Added trait assignment actions (addTraitToNode, removeTraitFromNode)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add FlowData type and update Pipeline interface** - `fa528c5` (feat)
2. **Task 2: Create usePipelineFlow hook** - `92f331a` (feat)

## Files Created/Modified

- `app/hooks/queries/use-pipeline-flow.ts` - New hook that manages pipeline flow state through React Query cache (364 lines)
- `app/hooks/queries/use-pipelines.ts` - Added FlowData, AgentNodeData, TraitNodeData, PipelineNodeData types
- `package.json` - Added lodash-es and @types/lodash-es dependencies

## Decisions Made

- **Debounce delay of 1000ms**: Balances responsive autosave with preventing excessive server requests
- **Types in use-pipelines.ts**: Centralizes all pipeline-related types in one file for easier imports
- **useEffect for debounce cleanup**: This is a legitimate cleanup pattern, not a data sync anti-pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - lodash-es was not pre-installed but the plan correctly anticipated installing it.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- usePipelineFlow hook is ready for component integration in Plan 02
- All types exported and importable from use-pipelines.ts
- Hook provides same interface needed by current Zustand consumers
- Plan 02 can begin migrating pipeline-tab-panel.tsx to use this hook

---
*Phase: 19-remove-zustand-from-pipeline-builder*
*Plan: 01*
*Completed: 2026-01-30*
