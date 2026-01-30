---
phase: 18-pipeline-tabs
plan: 01
completed: 2026-01-30
duration: 3 min

subsystem: state-management
tags: [zustand, multi-pipeline, localStorage, tabs]

dependency-graph:
  requires: []
  provides:
    - Tab store with localStorage persistence
    - Multi-pipeline state management
    - Backward-compatible legacy API
  affects:
    - "18-02: Tab UI components will use useTabStore"
    - "18-03: Route integration will connect URL to tab state"

tech-stack:
  added: []
  patterns:
    - Zustand persist middleware for browser storage
    - Map-based multi-instance state management
    - Compatibility layer pattern for migration

key-files:
  created:
    - app/stores/tab-store.ts
  modified:
    - app/stores/pipeline-store.ts

decisions:
  - id: backward-compat-api
    choice: Maintain legacy API alongside new multi-pipeline API
    rationale: Allows Plan 01 to compile without modifying consumers; Plan 02 will migrate consumers

metrics:
  duration: 3 min
  tasks: 2/2
  deviations: 1
---

# Phase 18 Plan 01: Foundational Stores Summary

Tab and pipeline stores enabling multi-tab pipeline editing with localStorage persistence and backward-compatible API.

## What Was Built

### Task 1: Tab Store (app/stores/tab-store.ts)

Created a new Zustand store for managing pipeline tabs with localStorage persistence.

**Key features:**
- `tabs: Tab[]` and `activeTabId: string | null` persisted to localStorage
- `openTab(pipelineId, name)` - adds tab if under 8 limit, focuses if already open
- `closeTab(pipelineId)` - removes tab, activates next tab intelligently
- `focusOrOpenTab(pipelineId, name)` - prevents duplicate tabs
- `updateTabName(pipelineId, name)` - syncs name changes from autosave
- `canOpenNewTab()` - returns false when at 8 tab limit

**Persistence:**
```typescript
persist(
  (set, get) => ({ ... }),
  {
    name: 'valet-pipeline-tabs',
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({ tabs: state.tabs, activeTabId: state.activeTabId }),
  }
)
```

### Task 2: Pipeline Store Refactoring (app/stores/pipeline-store.ts)

Refactored from single-pipeline to multi-pipeline state while maintaining full backward compatibility.

**New data structure:**
```typescript
interface PipelineData {
  pipelineId: string;
  pipelineName: string;
  pipelineDescription: string;
  nodes: Node<PipelineNodeData>[];
  edges: Edge[];
  isDirty: boolean; // For autosave tracking
}

// Store holds multiple pipelines
pipelines: Map<string, PipelineData>
```

**New multi-pipeline API (for Plan 02):**
- `loadPipeline(data)` - load pipeline into store
- `updatePipeline(id, updates)` - update pipeline state
- `removePipeline(id)` - remove from store
- `getPipeline(id)` - get pipeline by ID
- `markDirty(id)` / `markClean(id)` - autosave state tracking
- `createOnNodesChange(pipelineId)` - factory for React Flow callback
- `createOnEdgesChange(pipelineId)` - factory for React Flow callback
- `createOnConnect(pipelineId)` - factory for React Flow callback
- `addAgentNodeTo(pipelineId, agent, position)` - add agent to specific pipeline
- `addTraitNodeTo(pipelineId, trait, position)` - add trait to specific pipeline
- etc.

**Legacy API preserved (for existing consumers):**
- `nodes`, `edges`, `pipelineId`, `pipelineName` - read from compat pipeline
- `onNodesChange`, `onEdgesChange`, `onConnect` - operate on compat pipeline
- `setNodes`, `setEdges`, `setPipelineMetadata`, `reset` - operate on compat pipeline
- `addAgentNode(agent, position)` - legacy 2-arg signature
- `addTraitNode(trait, position)` - legacy 2-arg signature
- `addTraitToNode(nodeId, traitId)` - legacy 2-arg signature
- `removeTraitFromNode(nodeId, traitId)` - legacy 2-arg signature

## Deviations from Plan

### [Rule 3 - Blocking] Added backward-compatible API layer

- **Found during:** Task 2
- **Issue:** Refactoring pipeline store to new multi-pipeline API broke existing consumers (pipelines.$id.tsx, pipeline-canvas.tsx, agent-node.tsx) causing TypeScript compilation failure
- **Fix:** Added compatibility layer using special COMPAT_PIPELINE_ID key. Legacy API functions now operate on this compat pipeline, allowing existing code to compile unchanged.
- **Files modified:** app/stores/pipeline-store.ts
- **Commit:** 464e408

This deviation was necessary to maintain a compilable codebase between Plan 01 and Plan 02. Plan 02 will migrate consumers to the new API and remove the legacy layer.

## Commits

| Hash | Message |
|------|---------|
| 72f4198 | feat(18-01): create tab store with localStorage persistence |
| 464e408 | feat(18-01): refactor pipeline store to multi-pipeline state |

## Verification Results

1. **TypeScript compilation:** PASSED
2. **Tab store exports:** useTabStore, Tab type
3. **Pipeline store exports:** usePipelineStore, PipelineData interface, existing type exports
4. **Backward compatibility:** All existing consumers compile without changes

## Next Phase Readiness

**For Plan 02 (Tab UI Components):**
- Tab store ready with all required actions
- Pipeline store ready with multi-pipeline API
- Need to migrate consumers from legacy API to new API in Plan 02

**Migration path for consumers:**
1. PipelineCanvas: Use `getPipeline(pipelineId)` and `createOnNodesChange(pipelineId)` etc.
2. AgentNode: Use `addTraitToNodeIn(pipelineId, nodeId, traitId)` etc.
3. pipelines.$id.tsx: Will be replaced by tab-based container

**No blockers for Plan 02.**
