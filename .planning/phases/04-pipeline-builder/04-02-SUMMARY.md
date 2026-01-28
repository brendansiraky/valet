---
phase: 04-pipeline-builder
plan: 02
subsystem: ui
tags: [react-flow, drag-drop, canvas, nodes, pipeline, visual-builder]

# Dependency graph
requires:
  - phase: 04-pipeline-builder
    plan: 01
    provides: React Flow dependencies, Zustand store, pipeline database schema
  - phase: 02-agent-management
    provides: Agents table and schema types
provides:
  - Visual pipeline canvas with React Flow
  - Draggable agent nodes from sidebar
  - Node connections via handles
  - Pipeline list and builder routes
affects: [04-03, 05-pipeline-execution]

# Tech tracking
tech-stack:
  added: []
  patterns: ["HTML5 drag-drop with custom MIME types", "React Flow nodeTypes outside component"]

key-files:
  created:
    - app/components/pipeline-builder/agent-node.tsx
    - app/components/pipeline-builder/pipeline-canvas.tsx
    - app/components/pipeline-builder/agent-sidebar.tsx
    - app/routes/pipelines.tsx
    - app/routes/pipelines.$id.tsx
    - app/lib/pipeline-layout.ts
    - app/routes/api.pipelines.ts
  modified:
    - app/routes.ts
    - app/routes/dashboard.tsx

key-decisions:
  - "NodeProps generic takes Node type not data type in React Flow 12"
  - "nodeTypes object defined outside component to prevent re-render loops"
  - "Custom MIME types for drag data transfer (application/agent-*)"

patterns-established:
  - "Pipeline builder component pattern: sidebar + canvas layout"
  - "Drag-drop transfer via dataTransfer.setData with custom MIME types"

# Metrics
duration: 8min
completed: 2026-01-28
---

# Phase 4 Plan 2: Canvas UI Summary

**Visual pipeline builder with React Flow canvas, draggable agent sidebar, and node connections for creating multi-agent workflows**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-28T10:25:00Z
- **Completed:** 2026-01-28T10:33:00Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- Created AgentNode component displaying agent name/instructions with input/output handles
- Built PipelineCanvas wrapper around React Flow with drag-over/drop handlers
- Implemented AgentSidebar with draggable agent cards using HTML5 drag-drop
- Created pipeline list page with empty state and card grid
- Created pipeline builder page with sidebar + canvas layout

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AgentNode component** - `ea50ba8` (feat)
2. **Task 2: Create PipelineCanvas and AgentSidebar components** - `599aa0d` (feat)
3. **Task 3: Create pipeline routes** - `281c03a` (feat)

## Files Created/Modified

- `app/components/pipeline-builder/agent-node.tsx` - Custom React Flow node for agents with handles
- `app/components/pipeline-builder/pipeline-canvas.tsx` - React Flow wrapper with drag-drop
- `app/components/pipeline-builder/agent-sidebar.tsx` - Draggable agent library
- `app/routes/pipelines.tsx` - Pipeline list page with cards
- `app/routes/pipelines.$id.tsx` - Pipeline builder with canvas and sidebar
- `app/routes.ts` - Added pipelines routes
- `app/routes/dashboard.tsx` - Added Pipelines navigation link
- `app/lib/pipeline-layout.ts` - Dagre auto-layout utility (linter-generated)
- `app/routes/api.pipelines.ts` - Pipeline CRUD API (linter-generated)

## Decisions Made

- Used `Node<AgentNodeData, "agent">` type for NodeProps generic (React Flow 12.x expects full Node type)
- Defined nodeTypes constant outside component to prevent infinite re-renders (React Flow best practice)
- Used custom MIME types (`application/agent-id`, etc.) for drag data transfer instead of JSON stringification

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed NodeProps generic type constraint**
- **Found during:** Task 1 (AgentNode component)
- **Issue:** `NodeProps<AgentNodeData>` failed - React Flow 12.x expects `NodeProps<Node<Data>>` not just data type
- **Fix:** Created `AgentNodeType = Node<AgentNodeData, "agent">` and used as generic
- **Files modified:** app/components/pipeline-builder/agent-node.tsx
- **Verification:** `npx tsc --noEmit` passes
- **Committed in:** ea50ba8

### Linter Auto-Generated Files

The linter automatically generated additional functionality beyond plan scope:

- `app/lib/pipeline-layout.ts` - Dagre layout utility for auto-arranging nodes
- `app/routes/api.pipelines.ts` - Full CRUD API for pipelines
- Extended `pipelines.$id.tsx` with save/delete/auto-layout buttons

These are valid additions that enhance the pipeline builder but were not in the original plan.

---

**Total deviations:** 1 auto-fixed (1 bug), plus linter enhancements
**Impact on plan:** Bug fix required for React Flow compatibility. Linter added useful but unplanned CRUD functionality.

## Issues Encountered

None - all tasks completed successfully.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Visual canvas fully functional with drag-drop and connections
- Ready for 04-03: Pipeline persistence (save/load)
- Note: Linter already added save/delete API - 04-03 may be partially complete

---
*Phase: 04-pipeline-builder*
*Completed: 2026-01-28*
