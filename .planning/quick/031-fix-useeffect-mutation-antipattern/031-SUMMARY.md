---
phase: quick-031
plan: 01
subsystem: ui
tags: [react, zustand, tanstack-query, anti-pattern, auto-save]

# Dependency graph
requires:
  - phase: quick-028
    provides: Auto-save functionality (being refactored)
provides:
  - Event-driven save architecture for pipeline builder
  - Clean separation between state updates and server mutations
affects: [pipeline-builder, future auto-save features]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Event-driven saves: call mutation directly from handlers, not useEffect watching state"
    - "onPipelineChange callback pattern for propagating canvas changes to parent"

key-files:
  created: []
  modified:
    - app/components/pipeline-builder/pipeline-tab-panel.tsx
    - app/components/pipeline-builder/pipeline-canvas.tsx
    - app/stores/pipeline-store.ts
  deleted:
    - app/hooks/use-autosave.ts

key-decisions:
  - "Remove isDirty flag entirely rather than leaving unused"
  - "Delete use-autosave.ts hook rather than keeping dead code"
  - "Use callback prop pattern to propagate canvas changes to parent for saving"

patterns-established:
  - "Mutations from event handlers: Call savePipeline() directly from handleNameChange, handleDropAgent, etc."
  - "Callback prop for child-to-parent communication: onPipelineChange prop triggers save from canvas events"

# Metrics
duration: 4min
completed: 2026-01-30
---

# Quick Task 031: Fix useEffect Mutation Anti-pattern Summary

**Event-driven saves replacing useEffect isDirty watcher - handlers call savePipeline directly**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-30T04:10:16Z
- **Completed:** 2026-01-30T04:13:58Z
- **Tasks:** 3
- **Files modified:** 4 (1 deleted)

## Accomplishments
- Replaced useEffect-based auto-save with direct handler calls
- Removed isDirty flag from store and all consumers
- Canvas changes now trigger saves via onPipelineChange callback prop
- Deleted unused use-autosave.ts hook and PipelineTabPanelWithAutosave wrapper

## Task Commits

Each task was committed atomically:

1. **Task 1 + 3: Event-driven saves and isDirty cleanup** - `05dbaf3` (refactor)
2. **Task 2: Wire canvas changes to onPipelineChange** - `d704585` (feat)

_Note: Tasks 1 and 3 were combined as Task 3 was required to make Task 1 compile (type dependency)_

## Files Created/Modified
- `app/components/pipeline-builder/pipeline-tab-panel.tsx` - savePipeline callback, handler wiring
- `app/components/pipeline-builder/pipeline-canvas.tsx` - onPipelineChange prop, wrapped callbacks
- `app/stores/pipeline-store.ts` - Removed isDirty from interface and all methods
- `app/routes/pipelines.$id.tsx` - Removed autosave wrapper, direct PipelineTabPanel usage
- `app/hooks/use-autosave.ts` - DELETED (no longer needed)

## Decisions Made
- Combined Tasks 1 and 3 into single commit - isDirty removal was blocking Task 1 compilation
- Deleted use-autosave.ts entirely rather than leaving unused code
- Removed PipelineTabPanelWithAutosave wrapper - autosave now built into PipelineTabPanel

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] use-autosave.ts hook still referenced isDirty**
- **Found during:** Task 1/3 (after isDirty removal)
- **Issue:** TypeScript errors in use-autosave.ts after removing isDirty from PipelineData
- **Fix:** Deleted use-autosave.ts and removed its usage from pipelines.$id.tsx
- **Files modified:** app/hooks/use-autosave.ts (deleted), app/routes/pipelines.$id.tsx
- **Verification:** `npx tsc --noEmit` passes
- **Committed in:** 05dbaf3 (Task 1+3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix was necessary cleanup - the old autosave hook was obsolete.

## Issues Encountered
None - execution proceeded smoothly after identifying the blocking dependency.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Pipeline auto-save now follows React best practices (event-driven, not effect-driven)
- Clean architecture ready for future enhancements
- No blockers

---
*Phase: quick-031*
*Completed: 2026-01-30*
