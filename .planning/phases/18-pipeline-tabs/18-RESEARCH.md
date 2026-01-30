# Phase 18: Pipeline Tabs - Research

**Researched:** 2026-01-30
**Domain:** Multi-tab editor state management with React Flow, browser-style tabs, autosave
**Confidence:** HIGH

## Summary

This phase implements a browser-style tabbed interface for editing multiple pipelines simultaneously. The core challenge is managing multiple React Flow instances while preserving state during tab switching, implementing immediate autosave, and maintaining running pipelines across tab changes.

The recommended approach uses CSS visibility (not conditional rendering) to keep inactive tab content mounted, a new Zustand store for tab management with localStorage persistence, and the existing pipeline store refactored to support multi-pipeline state. This avoids complex state extraction/restoration while maintaining React Flow's internal state (viewport, selection, undo history).

**Primary recommendation:** Use CSS `display: none` or `visibility: hidden` for inactive tabs rather than unmounting, keeping each pipeline editor mounted to preserve React Flow state without complex serialization.

## Standard Stack

### Core (Already in Project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @xyflow/react | ^12.10.0 | Flow-based canvas for pipeline editing | Already used; each tab gets own ReactFlowProvider instance |
| zustand | ^5.0.10 | State management for tab and pipeline state | Already used; supports multiple stores and persist middleware |
| @radix-ui/react-tabs | ^1.1.13 | Accessible tab primitives | Already installed; provides TabsList, TabsTrigger, TabsContent |
| react-router | 7.12.0 | URL routing for active tab | Already used; /pipelines/{id} route exists |

### Supporting (Already Available)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand/middleware persist | built-in | localStorage persistence for tab set | Persist open tab IDs across browser refresh |
| remix-utils/sse/react | ^9.0.0 | SSE for pipeline run progress | Continue monitoring runs on inactive tabs |

### No New Dependencies Required

This phase can be implemented entirely with existing dependencies. The key libraries (React Flow, Zustand, Radix Tabs) are already installed and provide all necessary functionality.

## Architecture Patterns

### Recommended Project Structure

```
app/
├── stores/
│   ├── pipeline-store.ts        # REFACTOR: Multi-pipeline state (keyed by pipeline ID)
│   └── tab-store.ts             # NEW: Tab management with localStorage
├── components/
│   └── pipeline-builder/
│       ├── pipeline-tabs.tsx    # NEW: Tab bar component
│       ├── pipeline-tab-panel.tsx # NEW: Single tab content (canvas + header)
│       └── pipeline-canvas.tsx  # EXISTING: React Flow canvas (no changes)
└── routes/
    └── pipelines.$id.tsx        # REFACTOR: Tab container instead of single editor
```

### Pattern 1: CSS Hidden Tab Panels (State Preservation)

**What:** Keep all open pipeline editors mounted in the DOM, using CSS to hide inactive ones.

**When to use:** When tab content has expensive internal state (React Flow viewport, undo history, selection).

**Why this over conditional rendering:** React Flow maintains significant internal state (zoom level, pan position, selected nodes, undo/redo stack). Unmounting destroys this state. Restoring it requires serializing everything, which is complex and lossy.

**Example:**
```typescript
// Source: shadcn Tabs pattern + react-stateful-tabs approach
interface TabPanelsProps {
  openTabs: Tab[];
  activeTabId: string;
}

function TabPanels({ openTabs, activeTabId }: TabPanelsProps) {
  return (
    <>
      {openTabs.map((tab) => (
        <div
          key={tab.pipelineId}
          style={{ display: tab.pipelineId === activeTabId ? 'flex' : 'none' }}
          className="flex-1 h-full"
        >
          <ReactFlowProvider>
            <PipelineTabPanel pipelineId={tab.pipelineId} />
          </ReactFlowProvider>
        </div>
      ))}
    </>
  );
}
```

**Critical:** Each tab MUST have its own `<ReactFlowProvider>` to isolate store instances. Without this, multiple React Flow instances share state and behave incorrectly (dragging one canvas moves nodes in another).

### Pattern 2: Multi-Pipeline Zustand Store

**What:** Refactor pipeline-store to hold state for multiple pipelines, keyed by pipeline ID.

**When to use:** When the same type of state (pipeline nodes/edges) must exist for multiple instances simultaneously.

**Example:**
```typescript
// Source: Zustand slices pattern + existing pipeline-store structure
interface PipelineData {
  pipelineId: string;
  pipelineName: string;
  pipelineDescription: string;
  nodes: Node<PipelineNodeData>[];
  edges: Edge[];
  isDirty: boolean; // Track unsaved changes for autosave
}

interface MultiPipelineState {
  pipelines: Map<string, PipelineData>;

  // Actions
  loadPipeline: (id: string, data: PipelineData) => void;
  updatePipeline: (id: string, updates: Partial<PipelineData>) => void;
  removePipeline: (id: string) => void;
  getPipeline: (id: string) => PipelineData | undefined;

  // Per-pipeline React Flow callbacks (curried by pipeline ID)
  onNodesChange: (pipelineId: string) => OnNodesChange;
  onEdgesChange: (pipelineId: string) => OnEdgesChange;
  onConnect: (pipelineId: string) => OnConnect;
}

export const useMultiPipelineStore = create<MultiPipelineState>((set, get) => ({
  pipelines: new Map(),

  onNodesChange: (pipelineId) => (changes) => {
    const pipeline = get().pipelines.get(pipelineId);
    if (!pipeline) return;

    set({
      pipelines: new Map(get().pipelines).set(pipelineId, {
        ...pipeline,
        nodes: applyNodeChanges(changes, pipeline.nodes),
        isDirty: true,
      }),
    });
  },
  // ... other actions
}));
```

### Pattern 3: Tab Store with localStorage Persistence

**What:** Separate store for tab management, persisted to localStorage.

**When to use:** Tab state (which pipelines are open, which is active) should survive browser refresh.

**Example:**
```typescript
// Source: Zustand persist middleware docs
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface Tab {
  pipelineId: string;
  name: string;
}

interface TabState {
  tabs: Tab[];
  activeTabId: string | null;

  openTab: (pipelineId: string, name: string) => void;
  closeTab: (pipelineId: string) => void;
  setActiveTab: (pipelineId: string) => void;
  focusOrOpenTab: (pipelineId: string, name: string) => void;
}

export const useTabStore = create<TabState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,

      openTab: (pipelineId, name) => {
        const { tabs } = get();
        if (tabs.length >= 8) {
          // Tab limit reached - handled by UI
          return;
        }
        if (tabs.some(t => t.pipelineId === pipelineId)) {
          // Already open - focus instead
          set({ activeTabId: pipelineId });
          return;
        }
        set({
          tabs: [...tabs, { pipelineId, name }],
          activeTabId: pipelineId,
        });
      },

      focusOrOpenTab: (pipelineId, name) => {
        const { tabs } = get();
        const existing = tabs.find(t => t.pipelineId === pipelineId);
        if (existing) {
          set({ activeTabId: pipelineId });
        } else {
          get().openTab(pipelineId, name);
        }
      },

      closeTab: (pipelineId) => {
        const { tabs, activeTabId } = get();
        const newTabs = tabs.filter(t => t.pipelineId !== pipelineId);
        const newActiveId = activeTabId === pipelineId
          ? newTabs[newTabs.length - 1]?.pipelineId ?? null
          : activeTabId;
        set({ tabs: newTabs, activeTabId: newActiveId });
      },

      setActiveTab: (pipelineId) => set({ activeTabId: pipelineId }),
    }),
    {
      name: 'valet-pipeline-tabs',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
      }),
    }
  )
);
```

### Pattern 4: Immediate Autosave with Debounce

**What:** Save pipeline changes immediately when user makes edits (node add/move/delete, edge changes).

**When to use:** To maximize data durability and eliminate "unsaved changes" UX complexity.

**Implementation approach:**
1. Mark pipeline as dirty on any change (in store)
2. Debounced save function (500-1000ms) triggers API call
3. Clear dirty flag on successful save
4. No explicit "Save" button needed (but keep for user confidence)

**Example:**
```typescript
// Source: React autosave patterns with debounce
import { useDebouncedCallback } from 'use-debounce'; // Or implement with useEffect+setTimeout

function usePipelineAutosave(pipelineId: string) {
  const { pipelines, updatePipeline } = useMultiPipelineStore();
  const pipeline = pipelines.get(pipelineId);

  const save = useDebouncedCallback(async () => {
    if (!pipeline || !pipeline.isDirty) return;

    const formData = new FormData();
    formData.set('intent', 'update');
    formData.set('id', pipelineId);
    formData.set('name', pipeline.pipelineName);
    formData.set('flowData', JSON.stringify({
      nodes: pipeline.nodes,
      edges: pipeline.edges,
    }));

    const response = await fetch('/api/pipelines', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      updatePipeline(pipelineId, { isDirty: false });
    }
  }, 1000); // 1 second debounce

  // Trigger save when pipeline changes
  useEffect(() => {
    if (pipeline?.isDirty) {
      save();
    }
  }, [pipeline?.nodes, pipeline?.edges, pipeline?.isDirty]);
}
```

**Note:** The `use-debounce` library is NOT currently installed. Either install it or implement debounce manually with `useEffect` + `setTimeout`.

### Anti-Patterns to Avoid

- **Conditional rendering for tabs:** Unmounting React Flow destroys internal state (viewport, selection, undo). Use CSS hiding instead.
- **Single pipeline store for multi-tab:** Current `usePipelineStore` assumes one active pipeline. Refactor to map by ID.
- **Polling for autosave:** Debounce on change is more efficient than periodic polling.
- **Storing React Flow internal state:** Don't try to serialize viewport/selection. Keep components mounted.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tab state persistence | Custom localStorage sync | Zustand persist middleware | Handles serialization, rehydration, versioning |
| Debounced autosave | Raw setTimeout chains | `useDebouncedCallback` or custom hook | Proper cleanup, memoization, edge cases handled |
| Tab keyboard navigation | Custom key handlers | Radix Tabs (already installed) | Accessibility, focus management built-in |
| React Flow store isolation | Manual context management | ReactFlowProvider per tab | Official pattern, handles store scoping |

**Key insight:** The complexity in this phase is state orchestration, not new libraries. Leverage existing tools' built-in patterns.

## Common Pitfalls

### Pitfall 1: React Flow Store Bleeding Between Tabs

**What goes wrong:** Multiple React Flow canvases share state - dragging in one moves nodes in another.

**Why it happens:** React Flow uses internal Zustand store. Without explicit isolation, all instances share the same store.

**How to avoid:** Wrap EACH tab's content in its own `<ReactFlowProvider>`. This creates isolated store instances.

**Warning signs:** Nodes moving in wrong canvas, selection appearing in multiple canvases, viewport sync issues.

### Pitfall 2: Tab State Not Restored After Refresh

**What goes wrong:** Browser refresh loses open tabs, user returns to empty state.

**Why it happens:** Tab state only in React state, not persisted.

**How to avoid:** Use Zustand persist middleware with localStorage. Test refresh behavior explicitly.

**Warning signs:** Refresh loses tabs but URL still shows pipeline ID.

### Pitfall 3: Memory Growth with Many Tabs

**What goes wrong:** Opening 8 tabs causes performance degradation, memory pressure.

**Why it happens:** Each React Flow instance has overhead (DOM, internal state, event listeners).

**How to avoid:** Enforce 8 tab limit. Consider lazy loading pipeline data (don't fetch until tab first activated). Profile memory in development.

**Warning signs:** Increasing GC pauses, sluggish interactions, high memory in DevTools.

### Pitfall 4: Autosave Race Conditions

**What goes wrong:** Rapid edits cause multiple concurrent save requests, data inconsistency.

**Why it happens:** Debounce not properly implemented, or save not awaiting previous save.

**How to avoid:** Debounce properly (single trailing call). Consider abort controller for inflight requests. Use optimistic UI but handle failures.

**Warning signs:** Network panel shows many concurrent /api/pipelines requests, inconsistent state after rapid edits.

### Pitfall 5: Running Pipeline Lost on Tab Close

**What goes wrong:** User closes tab with running pipeline, loses progress.

**Why it happens:** No confirmation dialog, pipeline execution is in-memory.

**How to avoid:** Track running state per tab. Show confirmation dialog before closing tab with active run. Consider if run should continue in background (current architecture: SSE subscription is per-component, so closing tab loses subscription).

**Warning signs:** User reports losing pipeline run progress unexpectedly.

### Pitfall 6: URL/Tab State Desync

**What goes wrong:** URL shows /pipelines/123 but different tab is active, or vice versa.

**Why it happens:** URL and tab store updated independently, race conditions.

**How to avoid:** URL is source of truth for active tab. On URL change, sync tab store. On tab click, navigate to URL first.

**Warning signs:** Back button doesn't switch tabs correctly, direct URL access shows wrong tab.

## Code Examples

### Tab Bar Component

```typescript
// Source: Custom implementation using Radix Tabs primitives
import { X, Plus } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useTabStore } from '~/stores/tab-store';

export function PipelineTabs() {
  const navigate = useNavigate();
  const { tabs, activeTabId, closeTab, setActiveTab } = useTabStore();

  const handleTabClick = (pipelineId: string) => {
    navigate(`/pipelines/${pipelineId}`);
  };

  const handleClose = (e: React.MouseEvent, pipelineId: string) => {
    e.stopPropagation();
    // TODO: Check for active run and show confirmation
    closeTab(pipelineId);
    // Navigate to remaining tab or pipelines list
    const remaining = tabs.filter(t => t.pipelineId !== pipelineId);
    if (remaining.length > 0) {
      navigate(`/pipelines/${remaining[remaining.length - 1].pipelineId}`);
    } else {
      navigate('/pipelines');
    }
  };

  const handleNewTab = async () => {
    if (tabs.length >= 8) {
      // Show toast: "Maximum 8 tabs allowed"
      return;
    }
    // Create new pipeline in DB immediately
    const formData = new FormData();
    formData.set('intent', 'create');
    formData.set('name', 'Untitled Pipeline');
    formData.set('flowData', JSON.stringify({ nodes: [], edges: [] }));

    const response = await fetch('/api/pipelines', {
      method: 'POST',
      body: formData,
    });

    const { pipeline } = await response.json();
    navigate(`/pipelines/${pipeline.id}`);
  };

  return (
    <div className="flex items-center border-b bg-muted/30 px-2 h-10">
      {tabs.map((tab) => (
        <button
          key={tab.pipelineId}
          onClick={() => handleTabClick(tab.pipelineId)}
          className={cn(
            "group flex items-center gap-2 px-3 py-1.5 text-sm rounded-t-md border-b-2",
            "hover:bg-background/50 transition-colors",
            activeTabId === tab.pipelineId
              ? "border-primary bg-background"
              : "border-transparent"
          )}
        >
          <span className="max-w-32 truncate">{tab.name}</span>
          <button
            onClick={(e) => handleClose(e, tab.pipelineId)}
            className="opacity-0 group-hover:opacity-100 hover:bg-muted rounded p-0.5"
          >
            <X className="size-3" />
          </button>
        </button>
      ))}
      <button
        onClick={handleNewTab}
        className="p-2 hover:bg-muted rounded-md ml-1"
        disabled={tabs.length >= 8}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
```

### URL Sync Effect

```typescript
// Source: React Router + Zustand pattern
// In pipelines.$id.tsx loader/component

import { useEffect } from 'react';
import { useParams } from 'react-router';
import { useTabStore } from '~/stores/tab-store';

export default function PipelineEditorPage() {
  const { id } = useParams();
  const { tabs, activeTabId, setActiveTab, openTab } = useTabStore();

  // Sync URL to tab store
  useEffect(() => {
    if (!id) return;

    const existingTab = tabs.find(t => t.pipelineId === id);
    if (existingTab) {
      if (activeTabId !== id) {
        setActiveTab(id);
      }
    } else {
      // Tab not open - need to open it
      // Pipeline name comes from loader data
      // This handles direct URL access and browser refresh
    }
  }, [id, tabs, activeTabId]);

  // ... rest of component
}
```

### Running Pipeline Detection

```typescript
// Source: Existing use-run-stream pattern
interface TabWithRunState extends Tab {
  runId: string | null;
  runStatus: 'idle' | 'running' | 'completed' | 'failed';
}

function useTabRunState(pipelineId: string) {
  const [runId, setRunId] = useState<string | null>(null);
  const { status } = useRunStream(runId);

  const isRunning = status === 'connecting' || status === 'running';

  return { runId, setRunId, isRunning };
}

// In close tab handler:
const handleClose = (e: React.MouseEvent, pipelineId: string) => {
  e.stopPropagation();

  if (tabRunStates[pipelineId]?.isRunning) {
    setConfirmCloseTabId(pipelineId);
    return;
  }

  closeTab(pipelineId);
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Unmount/remount tabs | CSS-hidden tabs | Always been better practice | State preservation without serialization |
| Redux single store | Zustand multiple stores | Zustand v4+ (2022+) | Cleaner multi-instance patterns |
| Manual localStorage | Zustand persist middleware | Zustand v4+ (2022+) | Built-in serialization, versioning |

**Current in React 19 / React Router 7:**
- `useSyncExternalStore` for localStorage cross-tab sync (if needed)
- Concurrent features work well with Zustand
- No special considerations needed for React 19

## Open Questions

### 1. Run State When Tab is Hidden

**What we know:** Current `useRunStream` uses SSE subscription. If component unmounts, subscription closes.

**What's unclear:** With CSS-hidden tabs (component stays mounted), does SSE subscription continue? Need to verify.

**Recommendation:** Test this explicitly. If SSE continues, runs will complete in background. If not, may need to lift run state to tab store level.

### 2. Memory Profile for 8 React Flow Instances

**What we know:** Each React Flow has DOM overhead, internal state, event listeners. 8 is the chosen limit.

**What's unclear:** Actual memory footprint with real pipeline complexity (many nodes).

**Recommendation:** Profile with realistic pipelines in development. Consider reducing limit if issues found.

### 3. Browser Tab vs Application Tab Sync

**What we know:** localStorage persists across browser sessions. Multiple browser tabs will share the same localStorage.

**What's unclear:** Should opening app in two browser tabs share the same application tab state?

**Recommendation:** For MVP, accept that localStorage is shared. If users report issues with multiple browser tabs, investigate `sessionStorage` or unique session identifiers.

## Sources

### Primary (HIGH confidence)

- [React Flow Provider Documentation](https://reactflow.dev/examples/misc/provider) - Multi-instance isolation pattern
- [React Flow Performance Guide](https://reactflow.dev/learn/advanced-use/performance) - Memory and rendering optimization
- [Zustand Persist Middleware](https://zustand.docs.pmnd.rs/integrations/persisting-store-data) - localStorage integration
- [Zustand Slices Pattern](https://zustand.docs.pmnd.rs/guides/slices-pattern) - Multi-store architecture
- Existing codebase: `app/stores/pipeline-store.ts`, `app/routes/pipelines.$id.tsx`

### Secondary (MEDIUM confidence)

- [react-stateful-tabs](https://github.com/erictooth/react-stateful-tabs) - CSS-hidden tab pattern
- [Zustand GitHub Discussion #2496](https://github.com/pmndrs/zustand/discussions/2496) - Multiple stores guidance
- [Josh Comeau: Persisting React State](https://www.joshwcomeau.com/react/persisting-react-state-in-localstorage/) - localStorage patterns
- [useSyncExternalStore for localStorage](https://oakhtar147.medium.com/sync-local-storage-state-across-tabs-in-react-using-usesyncexternalstore-613d2c22819e) - Cross-tab sync

### Tertiary (LOW confidence)

- [React Router Discussion #11040](https://github.com/remix-run/react-router/discussions/11040) - Dynamic tabs with routing (pattern reference only)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and proven in codebase
- Architecture: HIGH - Patterns well-documented, verified with official sources
- Pitfalls: MEDIUM - Based on common patterns and React Flow docs; some need runtime verification

**Research date:** 2026-01-30
**Valid until:** 2026-03-01 (60 days - stable domain, libraries not expected to change significantly)
