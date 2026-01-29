---
phase: quick
plan: 013
subsystem: ui
tags: [layout, scroll, pipeline-editor, css]

dependency-graph:
  requires: []
  provides:
    - "Fixed viewport layout for pipeline editor"
    - "Independent sidebar scrolling"
  affects: []

tech-stack:
  added: []
  patterns:
    - "Flexbox min-h-0 pattern for proper overflow containment"

key-files:
  created: []
  modified:
    - "app/routes/pipelines.$id.tsx"
    - "app/components/pipeline-builder/agent-sidebar.tsx"

decisions: []

metrics:
  duration: "1 min"
  completed: "2026-01-29"
---

# Quick Task 013: Fix Pipeline Editor Scroll - Sidebar Only

**One-liner:** Fixed viewport layout with overflow-hidden and min-h-0 so only sidebar scrolls while header stays sticky.

## What Was Done

### Task 1: Fix page layout to prevent scrolling

Added proper CSS constraints to the pipeline editor page layout:
- Added `overflow-hidden` to root container to prevent page-level scrolling
- Added `min-h-0` to flex content area to enable proper flex shrinking (required for child overflow to work in flexbox)

**Files modified:** `app/routes/pipelines.$id.tsx`

### Task 2: Ensure sidebar has proper height constraints

Updated AgentSidebar to fill available height:
- Added `h-full` to sidebar root div so it takes full height of parent flex container
- Combined with parent's `min-h-0`, this enables `overflow-y-auto` to work correctly

**Files modified:** `app/components/pipeline-builder/agent-sidebar.tsx`

## Technical Details

The fix uses a standard flexbox pattern for scroll containment:

1. Root: `h-[calc(100vh-4rem)] flex flex-col overflow-hidden` - fixed height, prevents overflow
2. Content row: `flex-1 flex min-h-0` - allows shrinking below content size
3. Sidebar: `h-full overflow-y-auto` - fills height, scrolls independently

The key insight is that `min-h-0` is required on flex containers to allow children to be smaller than their content. Without it, the default `min-height: auto` causes the container to grow to fit all content, preventing overflow scrolling.

## Commits

| Hash | Message |
|------|---------|
| 95f06ec | fix(quick-013): prevent page scroll on pipeline editor |
| 865474e | fix(quick-013): add height constraint to sidebar for independent scroll |

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- Page does not scroll vertically at any viewport size
- Header with pipeline name and action buttons always visible
- Sidebar scrolls independently when agents/traits list is long
- Canvas (React Flow) area fills remaining horizontal/vertical space
