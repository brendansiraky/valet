---
phase: quick
plan: 015
subsystem: ui
tags: [react-flow, tabs, navigation, dropdown-menu]

requires:
  - phase: 18-pipeline-tabs
    provides: Tab store and multi-tab pipeline editor

provides:
  - Pinned home tab always visible
  - Pipeline dropdown selector for opening tabs
  - /pipelines redirect to /pipelines/home

affects: [pipeline-ux, navigation]

tech-stack:
  added: [shadcn/dropdown-menu]
  patterns: [pinned-tab, dropdown-selector]

key-files:
  created: [app/components/ui/dropdown-menu.tsx]
  modified: [app/stores/tab-store.ts, app/components/pipeline-builder/pipeline-tabs.tsx, app/routes/pipelines.$id.tsx, app/routes/pipelines.tsx, app/components/nav-main.tsx]

key-decisions:
  - "HOME_TAB_ID constant exported for consistent reference"
  - "Home tab excluded from MAX_TABS limit"
  - "Dropdown shows available pipelines not already open"

patterns-established:
  - "Pinned tabs: uncloseable tabs with special ID handling"

duration: 6min
completed: 2026-01-30
---

# Quick Task 015: Replace Pipelines Page with Pinned Home Summary

**Pinned home tab with locked canvas, dropdown pipeline selector replacing the plus button**

## Performance

- **Duration:** 6 min
- **Started:** 2026-01-30T11:36:00Z
- **Completed:** 2026-01-30T11:42:00Z
- **Tasks:** 4
- **Files modified:** 6

## Accomplishments

- Added permanent pinned home tab as leftmost icon-only tab
- Converted plus button to dropdown showing pipeline list + "New Pipeline" option
- Home tab displays locked empty ReactFlow canvas with instructional text
- /pipelines now redirects to /pipelines/home

## Task Commits

Each task was committed atomically:

1. **Task 1: Add dropdown-menu component and update tab store** - `f6f33b0` (feat)
2. **Task 2: Update PipelineTabs with pinned home and dropdown selector** - `d2a5c31` (feat)
3. **Task 3: Handle home tab in pipelines.$id route** - `21c0821` (feat)
4. **Task 4: Redirect /pipelines to /pipelines/home and update nav** - `1c978e6` (feat)

## Files Created/Modified

- `app/components/ui/dropdown-menu.tsx` - Shadcn dropdown menu component
- `app/stores/tab-store.ts` - HOME_TAB_ID constant, pinned tab logic
- `app/components/pipeline-builder/pipeline-tabs.tsx` - Pinned home tab + dropdown selector
- `app/routes/pipelines.$id.tsx` - Home tab panel with locked canvas
- `app/routes/pipelines.tsx` - Redirect to /pipelines/home
- `app/components/nav-main.tsx` - Updated Pipelines link

## Decisions Made

- Used useState/useEffect for pipeline list fetch instead of TanStack Query (not installed)
- Home tab excluded from MAX_TABS count so users can have 8 pipelines + home
- Dropdown filters out already-open pipelines to avoid duplicates
- Locked canvas uses ReactFlow with all interactions disabled

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used useState/useEffect instead of TanStack Query**
- **Found during:** Task 2 (PipelineTabs dropdown implementation)
- **Issue:** Plan specified TanStack Query but it's not installed in project
- **Fix:** Used simple useState + useEffect pattern for fetching pipelines
- **Files modified:** app/components/pipeline-builder/pipeline-tabs.tsx
- **Verification:** TypeScript compiles, dropdown populates correctly
- **Committed in:** d2a5c31 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (blocking - dependency not available)
**Impact on plan:** Functionally equivalent approach, no scope change.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Home tab provides consistent landing experience for pipeline editor
- Dropdown pattern can be reused for other entity selection UIs
- Navigation flow simplified with single entry point

---
*Phase: quick*
*Completed: 2026-01-30*
