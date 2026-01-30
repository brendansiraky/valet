# Phase 19: Remove Zustand from Pipeline Builder - Research

**Researched:** 2026-01-30
**Domain:** React Query + React Flow state management migration
**Confidence:** HIGH

## Summary

This phase eliminates the problematic dual-store pattern where React Query fetches pipeline data, copies it to Zustand, and components read from Zustand. The solution is straightforward: React Flow reads nodes/edges directly from React Query cache, and all modifications use `queryClient.setQueryData()` for instant UI updates with debounced autosave mutations.

The key insight is that React Query's cache IS a store. When we call `setQueryData()`, all components subscribed to that query key re-render immediately. This is exactly how Zustand works, but with built-in server state synchronization. React Flow's `applyNodeChanges()` and `applyEdgeChanges()` utilities work perfectly with the immutable update pattern required by `setQueryData()`.

The tab store (tab-store.ts) remains in Zustand because it IS legitimate UI-only state (which tabs are open, which is active). This separation is correct per industry best practices: React Query for server state, Zustand for client-only state.

**Primary recommendation:** Replace Zustand reads with React Query cache reads, replace Zustand writes with `setQueryData()` calls, and debounce saves to the server.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | ^5.90.20 | Server state management, cache | Already in project, designed for this use case |
| @xyflow/react | ^12.10.0 | Node-based canvas with controlled state | Already in project, provides change utilities |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| immer | (install if needed) | Immutable nested updates | Complex nested state updates in setQueryData |
| lodash-es | (already installed) | Debounce for autosave | Prevent excessive server requests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Immer for nested updates | Manual spread operators | Immer is cleaner for deeply nested updates but adds dependency; spread operators are fine for this case since flowData is only 2 levels deep |

**Installation:**
```bash
# Immer is optional - spread operators work fine for this use case
npm install immer  # Only if deeply nested updates become unwieldy
```

## Architecture Patterns

### Recommended Project Structure

No new files needed. Modifications to existing:
```
app/hooks/queries/
└── use-pipelines.ts     # Add setQueryData helpers and optimistic patterns

app/components/pipeline-builder/
├── pipeline-tab-panel.tsx    # Read from React Query, not Zustand
├── pipeline-canvas.tsx       # Read from React Query, callbacks use setQueryData
└── agent-node.tsx           # Read from React Query for trait changes

app/stores/
├── pipeline-store.ts        # DELETE THIS FILE
└── tab-store.ts            # KEEP - legitimate UI state
```

### Pattern 1: React Query as State Store for React Flow

**What:** Use `queryClient.setQueryData()` with React Flow's `applyNodeChanges()`/`applyEdgeChanges()` utilities to update the cache directly on user interactions.

**When to use:** Every node drag, edge connection, node deletion, name change.

**Example:**
```typescript
// Source: Verified pattern combining React Flow utils with React Query
import { useQueryClient } from "@tanstack/react-query";
import { applyNodeChanges, applyEdgeChanges, addEdge } from "@xyflow/react";
import type { NodeChange, EdgeChange, Connection } from "@xyflow/react";

function usePipelineFlowCallbacks(pipelineId: string) {
  const queryClient = useQueryClient();

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    queryClient.setQueryData(
      ["pipelines", pipelineId],
      (old: Pipeline | undefined) => {
        if (!old) return old;
        const flowData = old.flowData as { nodes: Node[]; edges: Edge[] };
        return {
          ...old,
          flowData: {
            ...flowData,
            nodes: applyNodeChanges(changes, flowData.nodes),
          },
        };
      }
    );
  }, [queryClient, pipelineId]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    queryClient.setQueryData(
      ["pipelines", pipelineId],
      (old: Pipeline | undefined) => {
        if (!old) return old;
        const flowData = old.flowData as { nodes: Node[]; edges: Edge[] };
        return {
          ...old,
          flowData: {
            ...flowData,
            edges: applyEdgeChanges(changes, flowData.edges),
          },
        };
      }
    );
  }, [queryClient, pipelineId]);

  const onConnect = useCallback((connection: Connection) => {
    queryClient.setQueryData(
      ["pipelines", pipelineId],
      (old: Pipeline | undefined) => {
        if (!old) return old;
        const flowData = old.flowData as { nodes: Node[]; edges: Edge[] };
        return {
          ...old,
          flowData: {
            ...flowData,
            edges: addEdge(connection, flowData.edges),
          },
        };
      }
    );
  }, [queryClient, pipelineId]);

  return { onNodesChange, onEdgesChange, onConnect };
}
```

### Pattern 2: Debounced Autosave with Cache as Source of Truth

**What:** Cache changes happen instantly via setQueryData. Saving to server is debounced and uses current cache state.

**When to use:** Every canvas modification.

**Example:**
```typescript
// Source: Project-specific pattern combining React Query with debounce
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useCallback, useRef } from "react";
import debounce from "lodash-es/debounce";

function useDebouncedSave(pipelineId: string) {
  const queryClient = useQueryClient();
  const saveMutation = useSavePipeline();

  // Create stable debounced function
  const debouncedSave = useMemo(
    () =>
      debounce(() => {
        const pipeline = queryClient.getQueryData<Pipeline>(["pipelines", pipelineId]);
        if (!pipeline) return;

        const flowData = pipeline.flowData as { nodes: Node[]; edges: Edge[] };
        saveMutation.mutate({
          id: pipelineId,
          name: pipeline.name,
          description: pipeline.description || "",
          nodes: flowData.nodes,
          edges: flowData.edges,
          isNew: false,
        });
      }, 1000),
    [queryClient, pipelineId, saveMutation]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => debouncedSave.cancel();
  }, [debouncedSave]);

  return debouncedSave;
}
```

### Pattern 3: Reading Pipeline Data from Cache

**What:** Components read pipeline data directly from `usePipeline()` query, not from a separate store.

**When to use:** All components that display pipeline nodes/edges/metadata.

**Example:**
```typescript
// Source: TanStack Query docs - using query data directly
function PipelineCanvas({ pipelineId }: { pipelineId: string }) {
  const pipelineQuery = usePipeline(pipelineId);
  const { onNodesChange, onEdgesChange, onConnect } = usePipelineFlowCallbacks(pipelineId);
  const debouncedSave = useDebouncedSave(pipelineId);

  // Wrap callbacks to trigger save
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
    debouncedSave();
  }, [onNodesChange, debouncedSave]);

  if (!pipelineQuery.data) {
    return <div>Loading...</div>;
  }

  const flowData = pipelineQuery.data.flowData as { nodes: Node[]; edges: Edge[] };

  return (
    <ReactFlow
      nodes={flowData.nodes}
      edges={flowData.edges}
      onNodesChange={handleNodesChange}
      onEdgesChange={handleEdgesChange}
      onConnect={handleConnect}
    />
  );
}
```

### Pattern 4: Custom Hook for Pipeline Flow State

**What:** Encapsulate all React Query + React Flow wiring in a single hook.

**When to use:** To clean up component code and make the pattern reusable.

**Example:**
```typescript
// Source: Recommended architecture pattern for this migration
interface UsePipelineFlowReturn {
  nodes: Node[];
  edges: Edge[];
  pipelineName: string;
  pipelineDescription: string;
  isLoading: boolean;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  updateName: (name: string) => void;
  addAgentNode: (agent: AgentData, position: Position) => void;
  addTraitNode: (trait: TraitData, position: Position) => void;
  removeNode: (nodeId: string) => void;
  addTraitToNode: (nodeId: string, traitId: string) => void;
  removeTraitFromNode: (nodeId: string, traitId: string) => void;
}

function usePipelineFlow(pipelineId: string): UsePipelineFlowReturn {
  const queryClient = useQueryClient();
  const pipelineQuery = usePipeline(pipelineId);
  const debouncedSave = useDebouncedSave(pipelineId);

  // ... all the callbacks using setQueryData ...

  return {
    nodes: flowData?.nodes ?? [],
    edges: flowData?.edges ?? [],
    pipelineName: pipelineQuery.data?.name ?? "Untitled Pipeline",
    pipelineDescription: pipelineQuery.data?.description ?? "",
    isLoading: pipelineQuery.isLoading,
    onNodesChange: handleNodesChange,
    onEdgesChange: handleEdgesChange,
    onConnect: handleConnect,
    updateName,
    addAgentNode,
    addTraitNode,
    removeNode,
    addTraitToNode,
    removeTraitFromNode,
  };
}
```

### Anti-Patterns to Avoid

- **Dual-store pattern:** Never copy server data into Zustand. The current codebase has this problem.
- **useEffect for state sync:** Never use useEffect to copy React Query data elsewhere. Compute during render.
- **Mutating cache directly:** Always use immutable updates with `setQueryData()`. Return new objects, don't modify old.
- **Optimistic updates without rollback:** If using optimistic updates, always implement error rollback.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Applying node position changes | Custom change handler | `applyNodeChanges()` from @xyflow/react | Handles selection, dragging, resizing, deletion properly |
| Applying edge changes | Custom edge handler | `applyEdgeChanges()` from @xyflow/react | Handles selection, deletion, reconnection |
| Adding new edges | Custom edge creation | `addEdge()` from @xyflow/react | Handles duplicate prevention and proper ID generation |
| Debouncing saves | Custom setTimeout logic | `lodash-es/debounce` | Handles cancellation, leading/trailing edge, max wait |
| State synchronization | useEffect sync loops | React Query's `setQueryData()` | Components automatically re-render on cache changes |

**Key insight:** React Flow provides battle-tested utilities for applying changes. React Query's cache IS a global store. Combining them correctly eliminates the need for Zustand in this context.

## Common Pitfalls

### Pitfall 1: Creating New Callback References on Every Render
**What goes wrong:** React Flow re-renders all nodes when callback references change
**Why it happens:** Inline arrow functions in useCallback dependencies
**How to avoid:** Memoize callbacks with stable dependencies. Extract helpers.
**Warning signs:** All nodes flash/re-render when dragging a single node

### Pitfall 2: Query Key Mismatch
**What goes wrong:** `setQueryData` doesn't update the UI because key doesn't match
**Why it happens:** Query key is `["pipelines", "123"]` but setQueryData uses `["pipelines", 123]` (string vs number)
**How to avoid:** Always use the same key type. Define key factories.
**Warning signs:** `setQueryData` called but UI doesn't update, no errors

### Pitfall 3: Mutating Cache Data Directly
**What goes wrong:** Subtle bugs, stale closures, structural sharing breaks
**Why it happens:** Modifying the object returned by `getQueryData()` or the `old` parameter in `setQueryData()`
**How to avoid:** Always return new objects/arrays. Use spread operators or Immer.
**Warning signs:** Changes don't persist, or persist inconsistently

### Pitfall 4: Missing Debounce Cleanup
**What goes wrong:** Saves fire after component unmounts, errors or stale data
**Why it happens:** Debounced function not cancelled on unmount
**How to avoid:** Call `debouncedFn.cancel()` in useEffect cleanup
**Warning signs:** Console errors about unmounted components, unexpected API calls

### Pitfall 5: Race Condition with Background Refetch
**What goes wrong:** User edits get overwritten by background refetch
**Why it happens:** React Query's default `refetchOnWindowFocus` fires while user is editing
**How to avoid:** Use `staleTime: Infinity` for pipelines being edited, or cancel queries before optimistic updates
**Warning signs:** User's recent changes disappear after alt-tabbing

### Pitfall 6: Tab Switching Without Cache Priming
**What goes wrong:** Switching tabs shows stale data or loading state
**Why it happens:** Each tab has its own pipeline, but only active one is fetched
**How to avoid:** Pipeline data is fetched when tab opens (existing behavior). Cache persists across tab switches.
**Warning signs:** Tab content flickers or shows loading when switching between tabs

## Code Examples

### Complete Hook Implementation

```typescript
// Source: Synthesized from React Flow docs + TanStack Query docs + project patterns
// app/hooks/queries/use-pipeline-flow.ts

import { useCallback, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from "@xyflow/react";
import debounce from "lodash-es/debounce";
import { usePipeline, useSavePipeline, type Pipeline } from "./use-pipelines";

interface FlowData {
  nodes: Node[];
  edges: Edge[];
}

export function usePipelineFlow(pipelineId: string) {
  const queryClient = useQueryClient();
  const pipelineQuery = usePipeline(pipelineId);
  const saveMutation = useSavePipeline();

  // Extract flow data with type safety
  const flowData = useMemo((): FlowData => {
    const raw = pipelineQuery.data?.flowData;
    if (!raw || typeof raw !== "object") return { nodes: [], edges: [] };
    return raw as FlowData;
  }, [pipelineQuery.data?.flowData]);

  // Helper to update cache
  const updateCache = useCallback(
    (updater: (old: Pipeline) => Pipeline) => {
      queryClient.setQueryData<Pipeline>(
        ["pipelines", pipelineId],
        (old) => {
          if (!old) return old;
          return updater(old);
        }
      );
    },
    [queryClient, pipelineId]
  );

  // Debounced save - reads current cache state
  const debouncedSave = useMemo(
    () =>
      debounce(() => {
        const pipeline = queryClient.getQueryData<Pipeline>(["pipelines", pipelineId]);
        if (!pipeline) return;
        const fd = pipeline.flowData as FlowData;
        saveMutation.mutate({
          id: pipelineId,
          name: pipeline.name,
          description: pipeline.description || "",
          nodes: fd.nodes,
          edges: fd.edges,
          isNew: false,
        });
      }, 1000),
    [queryClient, pipelineId, saveMutation]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => debouncedSave.cancel();
  }, [debouncedSave]);

  // React Flow callbacks
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      updateCache((old) => ({
        ...old,
        flowData: {
          ...(old.flowData as FlowData),
          nodes: applyNodeChanges(changes, (old.flowData as FlowData).nodes),
        },
      }));
      debouncedSave();
    },
    [updateCache, debouncedSave]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      updateCache((old) => ({
        ...old,
        flowData: {
          ...(old.flowData as FlowData),
          edges: applyEdgeChanges(changes, (old.flowData as FlowData).edges),
        },
      }));
      debouncedSave();
    },
    [updateCache, debouncedSave]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      updateCache((old) => ({
        ...old,
        flowData: {
          ...(old.flowData as FlowData),
          edges: addEdge(connection, (old.flowData as FlowData).edges),
        },
      }));
      debouncedSave();
    },
    [updateCache, debouncedSave]
  );

  // Node manipulation
  const addAgentNode = useCallback(
    (agent: { id: string; name: string; instructions?: string }, position: { x: number; y: number }) => {
      const newNode: Node = {
        id: crypto.randomUUID(),
        type: "agent",
        position,
        data: {
          agentId: agent.id,
          agentName: agent.name,
          agentInstructions: agent.instructions,
          traitIds: [],
        },
      };
      updateCache((old) => ({
        ...old,
        flowData: {
          ...(old.flowData as FlowData),
          nodes: [...(old.flowData as FlowData).nodes, newNode],
        },
      }));
      debouncedSave();
    },
    [updateCache, debouncedSave]
  );

  const updateName = useCallback(
    (name: string) => {
      updateCache((old) => ({ ...old, name }));
      debouncedSave();
    },
    [updateCache, debouncedSave]
  );

  return {
    // Data
    nodes: flowData.nodes,
    edges: flowData.edges,
    pipelineName: pipelineQuery.data?.name ?? "Untitled Pipeline",
    pipelineDescription: pipelineQuery.data?.description ?? "",
    isLoading: pipelineQuery.isLoading,

    // React Flow callbacks
    onNodesChange,
    onEdgesChange,
    onConnect,

    // Actions
    updateName,
    addAgentNode,
    // ... other actions
  };
}
```

### Simplified Component Usage

```typescript
// Source: How components should look after migration
function PipelineCanvas({ pipelineId }: { pipelineId: string }) {
  const {
    nodes,
    edges,
    isLoading,
    onNodesChange,
    onEdgesChange,
    onConnect,
  } = usePipelineFlow(pipelineId);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      fitView
    />
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Copy server state to Zustand | Use React Query cache directly | ~2022-2023 | Eliminates sync bugs, reduces code |
| useEffect for data sync | Compute during render | React 18+ | Avoids race conditions, cleaner code |
| Optimistic updates for all mutations | Optimistic only when needed | TkDodo's 2023 guidance | Simpler code, less bugs |
| Full invalidation on every save | Debounced saves, no invalidation | Industry pattern | Fewer network requests, no flicker |

**Deprecated/outdated:**
- `useNodesState`/`useEdgesState` hooks: React Flow docs state these are "for prototyping" and production apps should use external state management
- Dual-store patterns: Copying server state to client store is now widely considered an anti-pattern
- useEffect for state synchronization: React team and community recommend against this pattern

## Open Questions

1. **Orphaned Agent Detection**
   - What we know: Current implementation enriches nodes with `isOrphaned` flag when loading
   - What's unclear: Should this be done in the query hook or in the component?
   - Recommendation: Do it in a `useMemo` in the component or create a selector on the query hook

2. **Multi-Tab Race Conditions**
   - What we know: Each tab is a different pipeline ID with its own query key
   - What's unclear: What happens if user rapidly switches tabs during a save?
   - Recommendation: Each pipeline has independent query/mutation state, so this should be fine. Monitor during testing.

3. **Error Recovery UX**
   - What we know: Current implementation logs errors to console
   - What's unclear: Should we show toast on save failure? Retry automatically?
   - Recommendation: Keep current behavior for now, add toast for persistent failures later

## Sources

### Primary (HIGH confidence)
- [TanStack Query v5 Documentation](https://tanstack.com/query/latest) - setQueryData, cache management
- [React Flow v12 Documentation](https://reactflow.dev) - applyNodeChanges, applyEdgeChanges, controlled flow
- [TkDodo's Blog: Mastering Mutations](https://tkdodo.eu/blog/mastering-mutations-in-react-query) - Optimistic updates guidance
- [TkDodo's Blog: Concurrent Optimistic Updates](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query) - Advanced patterns

### Secondary (MEDIUM confidence)
- [Synergy Codes: State Management in React Flow](https://www.synergycodes.com/blog/state-management-in-react-flow) - External state patterns
- [TanStack Query: Does it replace Redux/Zustand?](https://tanstack.com/query/v4/docs/react/guides/does-this-replace-client-state) - Server vs client state

### Tertiary (LOW confidence)
- WebSearch results for "React Flow TanStack Query integration" - No direct examples found; pattern synthesized from first principles

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project, APIs verified in docs
- Architecture: HIGH - Pattern follows official TanStack Query guidance + React Flow docs
- Pitfalls: MEDIUM - Based on known patterns and TkDodo's blog, not project-specific testing

**Research date:** 2026-01-30
**Valid until:** 60 days (stable libraries, well-documented patterns)
