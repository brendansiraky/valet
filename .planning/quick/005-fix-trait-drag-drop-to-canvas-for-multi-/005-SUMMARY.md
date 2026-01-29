---
quick: 005
type: execute
completed: 2026-01-29
duration: 5 min
tags: [react-flow, drag-drop, traits, pipeline-builder]

files:
  created:
    - app/components/pipeline-builder/trait-node.tsx
  modified:
    - app/stores/pipeline-store.ts
    - app/components/pipeline-builder/pipeline-canvas.tsx
    - app/routes/pipelines.$id.tsx

commits:
  - 87b20dc: "feat(quick-005): add TraitNodeData type and addTraitNode action to store"
  - 5ea898f: "feat(quick-005): create TraitNode component and update canvas for trait drops"
  - a46a3a6: "feat(quick-005): wire up handleDropTrait in pipeline page"
---

# Quick Task 005: Fix Trait Drag-Drop to Canvas for Multi-Agent Connection

**One-liner:** TraitNode standalone canvas component with source handle for multi-agent edge connections.

## Summary

Enabled traits to be dropped directly onto the pipeline canvas as standalone nodes that can connect to multiple agents via React Flow edges. Previously traits could only be dragged onto individual agent nodes creating a 1:1 relationship.

## What Was Done

### Task 1: Add TraitNodeData type and addTraitNode action to store
- Added `TraitNodeData` type with traitId, traitName, traitColor
- Added `PipelineNodeData` union type for agent and trait nodes
- Added `addTraitNode` store action to create trait nodes
- Updated `addTraitToNode`/`removeTraitFromNode` with type guards for union type
- Fixed pipelines route to handle union node types properly

### Task 2: Create TraitNode component and update canvas
- Created `TraitNode` component with:
  - Colored left border (borderLeftColor from trait)
  - Source handle on right side for outgoing edges
  - Selection ring when selected
- Registered "trait" in nodeTypes object
- Added `onDropTrait` prop to PipelineCanvasProps
- Updated `onDragOver` to accept both agent and trait drops
- Updated `onDrop` to handle trait drops alongside agent drops

### Task 3: Wire up handleDropTrait in pipeline page
- Added `addTraitNode` to store destructure
- Created `handleDropTrait` function
- Passed `onDropTrait` prop to PipelineCanvas

## Key Implementation Details

**Connection Flow:**
- TraitNode has `source` handle on right (Position.Right)
- AgentNode has `target` handle on left (Position.Left)
- React Flow allows edges from TraitNode source to AgentNode target
- Same trait can connect to multiple agents via multiple edges

**Type Safety:**
- `PipelineNodeData = AgentNodeData | TraitNodeData` union type
- Type guards in store methods to handle union
- Filter for agent-only nodes in pipelineSteps calculation

## Deviations from Plan

None - plan executed exactly as written.

## Verification Status

- [x] TypeScript compiles without errors
- [x] TraitNode component created with source handle
- [x] Canvas handles trait drops alongside agent drops
- [x] Store has TraitNodeData type and addTraitNode action
- [x] Pipeline route wired to use new trait drop handling

## What This Enables

Users can now:
1. Drag a trait from sidebar to empty canvas area
2. Trait appears as standalone node with colored border
3. Draw edges from trait node to multiple agent nodes
4. Edges persist when pipeline is saved and reloaded
5. Existing trait-onto-agent drops still work (direct assignment)
