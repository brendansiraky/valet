# Phase 4: Pipeline Builder - Research

**Researched:** 2026-01-28
**Domain:** Visual workflow builder with @xyflow/react (React Flow v12)
**Confidence:** HIGH

## Summary

This phase implements a visual canvas for constructing sequential AI agent pipelines. Users drag agents from their library onto the canvas, connect them in sequence, reorder them, and save pipeline definitions as reusable templates with input variables.

The standard approach uses **@xyflow/react v12** (React Flow), the industry-standard library for node-based UIs. React Flow provides drag-and-drop, zooming, panning, node connections, and extensive customization. For sequential pipelines without branching, a simple layout approach (manual or auto-layout with dagre) is sufficient.

**Primary recommendation:** Use @xyflow/react v12 with Zustand state management, custom AgentNode components, React Flow UI components from shadcn CLI, and database persistence for pipeline definitions.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @xyflow/react | 12.10.0 | Visual canvas, nodes, edges, connections | Industry standard for workflow builders; used by n8n, Buildship, Langflow |
| zustand | latest | Flow state management | React Flow uses it internally; recommended by docs |
| dagre | 0.8.5 | Auto-layout for sequential flows | Simple tree layouts; minimal configuration |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React Flow UI components | via shadcn CLI | Pre-built BaseNode, handles, edges | Faster development; shadcn integration |
| @xyflow/system | (bundled) | Framework-agnostic utilities | Used internally by React Flow |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| dagre | elkjs | ELK more powerful but complex (7.8MB); overkill for sequential flows |
| Zustand | TanStack Query alone | TanStack Query handles server state; Zustand better for local UI state |
| Custom nodes | Built-in nodes | Custom nodes required for agent display; built-in too basic |

**Installation:**
```bash
npm install @xyflow/react zustand dagre
npm install -D @types/dagre
```

**React Flow UI Components (via shadcn CLI):**
```bash
npx shadcn@latest add https://ui.reactflow.dev/base-node
npx shadcn@latest add https://ui.reactflow.dev/labeled-handle
```

## Architecture Patterns

### Recommended Project Structure
```
app/
├── routes/
│   └── pipelines.tsx           # Pipeline list page
│   └── pipelines.$id.tsx       # Pipeline builder canvas
├── components/
│   └── pipeline-builder/
│       ├── pipeline-canvas.tsx      # ReactFlow wrapper with providers
│       ├── agent-node.tsx           # Custom node for agents
│       ├── agent-sidebar.tsx        # Draggable agent library
│       ├── pipeline-edge.tsx        # Custom edge (optional)
│       └── pipeline-controls.tsx    # Save, load, run buttons
├── stores/
│   └── pipeline-store.ts       # Zustand store for flow state
├── db/
│   └── schema/
│       ├── pipelines.ts        # Pipeline definitions table
│       └── pipeline-templates.ts   # Template with variables
```

### Pattern 1: Zustand Store for Flow State
**What:** Centralized state management for nodes, edges, and flow operations
**When to use:** Always with React Flow; enables clean state updates from custom nodes
**Example:**
```typescript
// Source: https://reactflow.dev/learn/advanced-use/state-management
import { create } from 'zustand';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
} from '@xyflow/react';

interface PipelineState {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  addAgentNode: (agentId: string, position: { x: number; y: number }) => void;
}

export const usePipelineStore = create<PipelineState>((set, get) => ({
  nodes: [],
  edges: [],
  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },
  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },
  onConnect: (connection) => {
    set({ edges: addEdge(connection, get().edges) });
  },
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  addAgentNode: (agentId, position) => {
    const newNode = {
      id: crypto.randomUUID(),
      type: 'agent',
      position,
      data: { agentId },
    };
    set({ nodes: [...get().nodes, newNode] });
  },
}));
```

### Pattern 2: Custom Agent Node with BaseNode
**What:** Reusable node component displaying agent info with connection handles
**When to use:** For every agent in the pipeline
**Example:**
```typescript
// Source: https://reactflow.dev/learn/customization/custom-nodes
import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { BaseNode, BaseNodeHeader, BaseNodeHeaderTitle, BaseNodeContent } from '@/components/flow-ui/base-node';

interface AgentNodeData {
  agentId: string;
  agentName: string;
  agentInstructions?: string;
}

export const AgentNode = memo(({ data, selected }: NodeProps<AgentNodeData>) => {
  return (
    <BaseNode selected={selected}>
      <Handle type="target" position={Position.Left} />
      <BaseNodeHeader>
        <BaseNodeHeaderTitle>{data.agentName}</BaseNodeHeaderTitle>
      </BaseNodeHeader>
      <BaseNodeContent>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {data.agentInstructions}
        </p>
      </BaseNodeContent>
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  );
});

AgentNode.displayName = 'AgentNode';
```

### Pattern 3: Drag and Drop from Sidebar
**What:** HTML5 drag/drop or pointer events to add agents to canvas
**When to use:** PIPE-02 requirement - add agents by dragging
**Example:**
```typescript
// Source: https://reactflow.dev/examples/interaction/drag-and-drop
import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';

export function useDropHandler() {
  const { screenToFlowPosition, setNodes, getNodes } = useReactFlow();

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();

    const agentId = event.dataTransfer.getData('application/agent-id');
    const agentName = event.dataTransfer.getData('application/agent-name');

    if (!agentId) return;

    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    const newNode = {
      id: crypto.randomUUID(),
      type: 'agent',
      position,
      data: { agentId, agentName },
    };

    setNodes((nodes) => [...nodes, newNode]);
  }, [screenToFlowPosition, setNodes]);

  return { onDragOver, onDrop };
}
```

### Pattern 4: Save/Restore Flow State
**What:** Serialize flow to JSON, persist to database, restore on load
**When to use:** PIPE-05, PIPE-06 requirements - save/load pipelines
**Example:**
```typescript
// Source: https://reactflow.dev/examples/interaction/save-and-restore
import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';

export function useSaveRestore() {
  const { toObject, setNodes, setEdges, setViewport } = useReactFlow();

  const saveFlow = useCallback(() => {
    const flow = toObject();
    // flow contains: { nodes, edges, viewport }
    return JSON.stringify(flow);
  }, [toObject]);

  const restoreFlow = useCallback((flowJson: string) => {
    const flow = JSON.parse(flowJson);
    const { nodes, edges, viewport } = flow;

    setNodes(nodes || []);
    setEdges(edges || []);

    if (viewport) {
      setViewport(viewport);
    }
  }, [setNodes, setEdges, setViewport]);

  return { saveFlow, restoreFlow };
}
```

### Pattern 5: Sequential Layout with Dagre
**What:** Auto-arrange nodes in left-to-right sequence
**When to use:** After adding nodes or for "auto-layout" button
**Example:**
```typescript
// Source: https://reactflow.dev/examples/layout/dagre
import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';

const NODE_WIDTH = 250;
const NODE_HEIGHT = 80;

export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: 'LR' | 'TB' = 'LR'
) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 100 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
```

### Anti-Patterns to Avoid
- **Defining nodeTypes inside component:** Creates new object every render, causes infinite loops
- **Mutating nodes/edges directly:** Always create new objects with spread syntax
- **Accessing store in callbacks without useCallback:** Causes re-renders and stale closures
- **Using display:none on handles:** Breaks React Flow dimension calculations; use visibility:hidden
- **Missing ReactFlowProvider:** Required when using hooks like useReactFlow outside ReactFlow component

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Node positioning | Manual x/y calculations | dagre.layout() | Graph layout is a solved problem |
| Drag/drop coordinates | Raw clientX/Y | screenToFlowPosition() | Accounts for zoom/pan transforms |
| Flow serialization | Custom JSON structure | toObject() / from props | React Flow handles all state |
| Node internals update | Force re-render | useUpdateNodeInternals() | Proper handle recalculation |
| Connection validation | Manual edge filtering | isValidConnection prop | Built-in connection rules |
| Edge routing | SVG path calculations | Built-in edge types | Bezier, step, smoothstep included |

**Key insight:** React Flow handles the hard parts of canvas interaction. Focus on domain logic (agents, pipelines, templates), not viewport mechanics.

## Common Pitfalls

### Pitfall 1: nodeTypes Recreated Every Render
**What goes wrong:** Infinite re-render loop, frozen UI
**Why it happens:** `nodeTypes={{ agent: AgentNode }}` inside component creates new object each render
**How to avoid:** Define nodeTypes outside component or memoize with useMemo
**Warning signs:** Browser tab freezes, "Maximum update depth exceeded" error

### Pitfall 2: Missing Container Height
**What goes wrong:** Canvas renders but is invisible (0 height)
**Why it happens:** ReactFlow inherits parent dimensions; no height = no canvas
**How to avoid:** Set explicit height on parent: `className="h-[600px]"` or `style={{ height: '100%' }}`
**Warning signs:** "React Flow parent container needs a width and height" console warning

### Pitfall 3: Forgetting ReactFlowProvider
**What goes wrong:** "Seems like you have not used zustand provider as an ancestor" error
**Why it happens:** useReactFlow() and other hooks require context
**How to avoid:** Wrap the canvas page in ReactFlowProvider, or use ReactFlow component (auto-provides)
**Warning signs:** Runtime error on first hook call

### Pitfall 4: Direct State Mutation
**What goes wrong:** UI doesn't update, stale data
**Why it happens:** `node.data.value = newValue` mutates reference React Flow tracks
**How to avoid:** Always spread: `{ ...node, data: { ...node.data, value: newValue } }`
**Warning signs:** Store updates but UI doesn't reflect changes

### Pitfall 5: Styles Not Imported
**What goes wrong:** Nodes render but look broken, edges invisible
**Why it happens:** React Flow requires its CSS for proper rendering
**How to avoid:** Import at app root: `import '@xyflow/react/dist/style.css'`
**Warning signs:** Edges missing, nodes unstyled, handles invisible

### Pitfall 6: Multiple @xyflow/react Versions
**What goes wrong:** Context mismatch, hooks fail
**Why it happens:** Dependency tree installs conflicting versions
**How to avoid:** Check `npm ls @xyflow/react`, dedupe if needed
**Warning signs:** "Could not find a valid context" errors

## Code Examples

Verified patterns from official sources:

### Basic ReactFlow Setup
```typescript
// Source: https://reactflow.dev/learn
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// IMPORTANT: Define outside component to prevent re-render loops
const nodeTypes = {
  agent: AgentNode,
};

export function PipelineCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = usePipelineStore();
  const { onDragOver, onDrop } = useDropHandler();

  return (
    <div className="h-[600px] w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
```

### Database Schema for Pipelines
```typescript
// Based on existing patterns in app/db/schema/agents.ts
import { index, pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users";

export const pipelines = pgTable(
  "pipelines",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    // Store React Flow state as JSON
    flowData: jsonb("flow_data").notNull().$type<{
      nodes: Array<{ id: string; type: string; position: { x: number; y: number }; data: unknown }>;
      edges: Array<{ id: string; source: string; target: string }>;
      viewport?: { x: number; y: number; zoom: number };
    }>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdateFn(() => new Date()),
  },
  (table) => [index("pipelines_user_id_idx").on(table.userId)]
);

// Templates extend pipelines with variable definitions
export const pipelineTemplates = pgTable(
  "pipeline_templates",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    pipelineId: text("pipeline_id").notNull().references(() => pipelines.id, { onDelete: "cascade" }),
    variables: jsonb("variables").notNull().$type<Array<{
      name: string;
      description?: string;
      defaultValue?: string;
    }>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("pipeline_templates_pipeline_id_idx").on(table.pipelineId)]
);
```

### Template Variable Injection
```typescript
// Pattern for PIPE-08, PIPE-09: Define and fill template variables
interface TemplateVariable {
  name: string;
  description?: string;
  defaultValue?: string;
}

function injectVariables(
  agentInstructions: string,
  variables: Record<string, string>
): string {
  let result = agentInstructions;
  for (const [name, value] of Object.entries(variables)) {
    // Replace {{variableName}} with actual value
    result = result.replace(new RegExp(`\\{\\{${name}\\}\\}`, 'g'), value);
  }
  return result;
}

// Usage during pipeline execution (Phase 5)
const processedInstructions = injectVariables(
  agent.instructions,
  { topic: "AI ethics", audience: "general public" }
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `reactflow` package | `@xyflow/react` package | React Flow v12 (2024) | Named import required |
| `node.width/height` for measured | `node.measured.width/height` | React Flow v12 | Layout libs need update |
| `onEdgeUpdate` | `onReconnect` | React Flow v12 | API renamed for clarity |
| Manual SSR workarounds | Built-in SSR support | React Flow v12 | Server-side rendering enabled |

**Deprecated/outdated:**
- `reactflow` package: Renamed to `@xyflow/react`, use new package
- `nodeInternals` store key: Renamed to `nodeLookup`
- `project()` function: Use `screenToFlowPosition()` instead
- Default import: Use named import `{ ReactFlow }` from `@xyflow/react`

## Open Questions

Things that couldn't be fully resolved:

1. **Exact ELK vs dagre performance threshold**
   - What we know: dagre is simpler and faster; ELK more powerful
   - What's unclear: At what node count does ELK's power outweigh dagre's simplicity?
   - Recommendation: Start with dagre; switch to ELK only if layout quality issues arise (unlikely for sequential)

2. **React Flow Pro features needed?**
   - What we know: Workflow Editor template is Pro-only; some advanced features require subscription
   - What's unclear: Which specific Pro features we might need
   - Recommendation: Build with free tier first; evaluate Pro if missing critical features

## Sources

### Primary (HIGH confidence)
- [React Flow Quick Start](https://reactflow.dev/learn) - Core concepts, setup
- [React Flow API Reference](https://reactflow.dev/api-reference/react-flow) - Component props
- [React Flow v12 Migration](https://reactflow.dev/learn/troubleshooting/migrate-to-v12) - Breaking changes
- [Custom Nodes Guide](https://reactflow.dev/learn/customization/custom-nodes) - Node implementation
- [Handles Guide](https://reactflow.dev/learn/customization/handles) - Connection points
- [Drag and Drop Example](https://reactflow.dev/examples/interaction/drag-and-drop) - Sidebar pattern
- [Save and Restore Example](https://reactflow.dev/examples/interaction/save-and-restore) - Persistence
- [State Management with Zustand](https://reactflow.dev/learn/advanced-use/state-management) - Store pattern
- [Dagre Layout Example](https://reactflow.dev/examples/layout/dagre) - Auto-layout
- [Common Errors](https://reactflow.dev/learn/troubleshooting/common-errors) - Pitfalls catalog

### Secondary (MEDIUM confidence)
- [React Flow UI Components](https://reactflow.dev/ui) - shadcn integration
- [Workflow Editor Template](https://reactflow.dev/ui/templates/workflow-editor) - Reference architecture
- [Zustand Persist Middleware](https://zustand.docs.pmnd.rs/integrations/persisting-store-data) - Client persistence

### Tertiary (LOW confidence)
- [Community workflow examples](https://github.com/Azim-Ahmed/Automation-workflow) - Pattern inspiration only

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official docs, npm verification, version confirmed
- Architecture: HIGH - Official examples, patterns from React Flow docs
- Pitfalls: HIGH - Documented in official troubleshooting guide

**Research date:** 2026-01-28
**Valid until:** 2026-02-28 (stable library, 30-day validity)
