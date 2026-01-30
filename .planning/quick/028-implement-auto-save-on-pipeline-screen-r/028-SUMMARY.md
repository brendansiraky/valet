---
id: "028"
type: quick
status: complete
created: 2026-01-30
completed: 2026-01-30
duration: 2 min
subsystem: pipeline-builder
tags: [auto-save, react-query, ux]

key-files:
  modified:
    - app/hooks/queries/use-pipelines.ts
    - app/components/pipeline-builder/pipeline-tab-panel.tsx
---

# Quick Task 028: Implement Auto-Save on Pipeline Screen

**One-liner:** Immediate auto-save via isDirty flag and React Query mutation, Save button removed

## What Changed

### useSavePipeline Mutation Hook
Added to `app/hooks/queries/use-pipelines.ts`:
- `SavePipelineInput` interface with id, name, description, nodes, edges, isNew
- `savePipeline` async function using FormData POST to `/api/pipelines`
- `useSavePipeline` mutation hook (no invalidation to avoid refetch flicker)

### Pipeline Tab Panel Auto-Save
Modified `app/components/pipeline-builder/pipeline-tab-panel.tsx`:
- Removed `isSaving` state and `handleSave` function
- Removed Save button from header
- Added `useSavePipeline` hook and `isSavingRef` for concurrent save prevention
- Added auto-save useEffect that triggers when `pipeline.isDirty` becomes true
- Updated `handleNameChange` to set `isDirty: true`
- Updated `handleAutoLayout` to set `isDirty: true`

### State Change Coverage
Verified all pipeline state changes trigger auto-save:
- Canvas node changes (drag, add, remove) - via store's `createOnNodesChange`
- Canvas edge changes (add, remove) - via store's `createOnEdgesChange`
- New connections - via store's `createOnConnect`
- Agent/trait node additions - via store's `addAgentNodeTo`/`addTraitNodeTo`
- Node removals - via store's `removeNodeFrom`
- Trait assignments - via store's `addTraitToNodeIn`/`removeTraitFromNodeIn`
- Name changes - via `handleNameChange` with `isDirty: true`
- Auto layout - via `handleAutoLayout` with `isDirty: true`

## Commits

| Hash | Description |
|------|-------------|
| 7f38221 | feat(quick-028): add useSavePipeline mutation hook |
| 43b7bed | feat(quick-028): add auto-save effect and remove save button |

## Deviations from Plan

None - plan executed exactly as written.

## Notes

- Task 3 was verification/audit that existing store actions already set isDirty (confirmed)
- The auto-save effect uses a ref to prevent concurrent saves during rapid changes
- No debounce was added per requirements - saves fire immediately on state change
