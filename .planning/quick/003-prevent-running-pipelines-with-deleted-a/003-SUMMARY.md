# Quick Task 003: Prevent Running Pipelines with Deleted Agents

**Completed:** 2026-01-29
**Duration:** ~3 min

## One-liner

Disabled Run button and added visual indicators when pipeline contains orphaned (deleted) agent tiles.

## What Was Done

### Task 1: Detect orphaned agents and disable Run button
- Added orphan detection in `useEffect` when initializing pipeline nodes from flowData
- Enriched node data with `isOrphaned` flag based on comparison with `userAgents`
- Added `hasOrphanedAgents` useMemo for reactive detection during editing
- Disabled Run button when orphaned agents detected
- Changed button text to "Remove Deleted Agents" with AlertTriangle icon when disabled due to orphans

### Task 2: Add visual indicator to deleted agent tiles
- Added `isOrphaned?: boolean` field to `AgentNodeData` type
- Updated AgentNode component with conditional styling:
  - Muted opacity (70%)
  - Destructive-tinted border and background
  - Unplug icon next to agent name
- Tiles remain fully interactive (draggable, selectable, deletable)

## Files Modified

| File | Changes |
|------|---------|
| `app/routes/pipelines.$id.tsx` | Orphan detection logic, enriched nodes, disabled Run button |
| `app/stores/pipeline-store.ts` | Added `isOrphaned` field to AgentNodeData type |
| `app/components/pipeline-builder/agent-node.tsx` | Visual styling for orphaned agents |

## Commits

| Hash | Message |
|------|---------|
| 430375e | feat(003): disable run button when pipeline contains deleted agents |
| 19af045 | feat(003): add visual indicator for deleted agent tiles |

## Deviations from Plan

None - plan executed exactly as written.

## Testing Notes

To verify:
1. Create an agent and add it to a pipeline
2. Save the pipeline
3. Delete the agent from agents list
4. Return to pipeline editor
5. Observe: Deleted agent tile shows unplug icon and muted styling
6. Observe: Run button is disabled with "Remove Deleted Agents" text
7. Drag the orphaned tile to confirm it's still movable
8. Delete the orphaned tile from the pipeline
9. Observe: Run button returns to normal enabled state
