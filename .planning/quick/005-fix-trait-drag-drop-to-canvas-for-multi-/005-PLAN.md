---
quick: 005
type: execute
files_modified:
  - app/stores/pipeline-store.ts
  - app/components/pipeline-builder/trait-node.tsx
  - app/components/pipeline-builder/pipeline-canvas.tsx
  - app/routes/pipelines.$id.tsx
autonomous: true

must_haves:
  truths:
    - "User can drag a trait from sidebar and drop it onto the canvas (not just onto agents)"
    - "Trait becomes a standalone node on the canvas when dropped"
    - "Trait node can be connected to multiple agent nodes via edges"
    - "Trait-to-agent connections persist when pipeline is saved and reloaded"
  artifacts:
    - path: "app/components/pipeline-builder/trait-node.tsx"
      provides: "TraitNode component for canvas rendering"
    - path: "app/stores/pipeline-store.ts"
      provides: "TraitNodeData type and addTraitNode action"
    - path: "app/components/pipeline-builder/pipeline-canvas.tsx"
      provides: "Trait drop handling and nodeTypes registration"
  key_links:
    - from: "app/components/pipeline-builder/pipeline-canvas.tsx"
      to: "app/stores/pipeline-store.ts"
      via: "addTraitNode action call on drop"
    - from: "app/components/pipeline-builder/trait-node.tsx"
      to: "@xyflow/react Handle"
      via: "source handles for multi-connection"
---

<objective>
Enable traits to be dropped directly onto the pipeline canvas as standalone nodes that can connect to multiple agents via edges.

Purpose: Currently traits can only be dragged onto individual agent nodes, creating a 1:1 relationship. The desired behavior is traits as independent canvas nodes that can connect to multiple agents via React Flow edges.

Output: TraitNode component, updated store with TraitNodeData type, canvas trait drop handling.
</objective>

<context>
@app/stores/pipeline-store.ts (has AgentNodeData, need to add TraitNodeData)
@app/components/pipeline-builder/pipeline-canvas.tsx (handles agent drops, need to add trait drops)
@app/components/pipeline-builder/agent-node.tsx (reference for node component pattern)
@app/components/pipeline-builder/agent-sidebar.tsx (trait drag data: application/trait-id, application/trait-name, application/trait-color)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add TraitNodeData type and addTraitNode action to store</name>
  <files>app/stores/pipeline-store.ts</files>
  <action>
Add TraitNodeData type alongside AgentNodeData:

```typescript
export type TraitNodeData = {
  traitId: string;
  traitName: string;
  traitColor: string;
  [key: string]: unknown;
};
```

Update PipelineState interface to add:
- `addTraitNode: (trait: { id: string; name: string; color: string }, position: { x: number; y: number }) => void;`

Implement addTraitNode in the store:
```typescript
addTraitNode: (trait, position) => {
  const newNode: Node<TraitNodeData> = {
    id: crypto.randomUUID(),
    type: "trait",
    position,
    data: {
      traitId: trait.id,
      traitName: trait.name,
      traitColor: trait.color,
    },
  };
  set({ nodes: [...get().nodes, newNode] });
},
```

Note: The `nodes` array will now contain both AgentNodeData and TraitNodeData nodes. Update the type to `Node<AgentNodeData | TraitNodeData>[]` for the nodes array and related handlers.
  </action>
  <verify>TypeScript compiles without errors: `npx tsc --noEmit`</verify>
  <done>Store has TraitNodeData type and addTraitNode action</done>
</task>

<task type="auto">
  <name>Task 2: Create TraitNode component and update canvas to handle trait drops</name>
  <files>app/components/pipeline-builder/trait-node.tsx, app/components/pipeline-builder/pipeline-canvas.tsx</files>
  <action>
Create `app/components/pipeline-builder/trait-node.tsx`:

```tsx
import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Card, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import type { TraitNodeData } from "~/stores/pipeline-store";

type TraitNodeType = Node<TraitNodeData, "trait">;

export const TraitNode = memo(
  ({ data, selected }: NodeProps<TraitNodeType>) => {
    return (
      <Card
        className={cn(
          "w-[180px] py-0",
          selected && "ring-2 ring-primary"
        )}
        style={{ borderLeftWidth: "4px", borderLeftColor: data.traitColor }}
      >
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium">{data.traitName}</CardTitle>
        </CardHeader>
        {/* Source handle on the right - allows connecting to multiple agents */}
        <Handle
          type="source"
          position={Position.Right}
          className="!bg-muted-foreground !w-3 !h-3"
          isConnectable={true}
        />
      </Card>
    );
  }
);

TraitNode.displayName = "TraitNode";
```

Key: Only a source handle (no target) - traits connect TO agents, not the other way around.

Update `app/components/pipeline-builder/pipeline-canvas.tsx`:

1. Import TraitNode and addTraitNode:
   ```tsx
   import { TraitNode } from "./trait-node";
   ```

2. Update nodeTypes to include trait:
   ```tsx
   const nodeTypes = {
     agent: AgentNode,
     trait: TraitNode,
   };
   ```

3. Add onDropTrait prop to PipelineCanvasProps:
   ```tsx
   interface PipelineCanvasProps {
     onDropAgent: (...) => void;
     onDropTrait: (
       traitId: string,
       traitName: string,
       traitColor: string,
       position: { x: number; y: number }
     ) => void;
   }
   ```

4. Update onDragOver to accept both agent and trait drops:
   ```tsx
   const onDragOver = useCallback((event: React.DragEvent) => {
     if (
       event.dataTransfer.types.includes("application/agent-id") ||
       event.dataTransfer.types.includes("application/trait-id")
     ) {
       event.preventDefault();
       event.dataTransfer.dropEffect = "move";
     }
   }, []);
   ```

5. Update onDrop to handle trait drops:
   ```tsx
   const onDrop = useCallback(
     (event: React.DragEvent) => {
       event.preventDefault();

       const reactFlowBounds = event.currentTarget.getBoundingClientRect();
       const position = {
         x: event.clientX - reactFlowBounds.left,
         y: event.clientY - reactFlowBounds.top,
       };

       // Handle agent drops
       const agentId = event.dataTransfer.getData("application/agent-id");
       if (agentId) {
         const agentName = event.dataTransfer.getData("application/agent-name");
         const agentInstructions = event.dataTransfer.getData("application/agent-instructions");
         onDropAgent(agentId, agentName, agentInstructions || undefined, position);
         return;
       }

       // Handle trait drops
       const traitId = event.dataTransfer.getData("application/trait-id");
       if (traitId) {
         const traitName = event.dataTransfer.getData("application/trait-name");
         const traitColor = event.dataTransfer.getData("application/trait-color");
         onDropTrait(traitId, traitName, traitColor, position);
       }
     },
     [onDropAgent, onDropTrait]
   );
   ```
  </action>
  <verify>
1. Start dev server: `npm run dev`
2. Navigate to a pipeline
3. Drag a trait from sidebar to canvas (not onto an agent)
4. Trait should appear as a node with colored left border
  </verify>
  <done>TraitNode renders on canvas when trait is dropped</done>
</task>

<task type="auto">
  <name>Task 3: Wire up handleDropTrait in pipeline page and add target handle to agent nodes</name>
  <files>app/routes/pipelines.$id.tsx, app/components/pipeline-builder/agent-node.tsx</files>
  <action>
Update `app/routes/pipelines.$id.tsx`:

1. Add addTraitNode to store destructure:
   ```tsx
   const { ..., addTraitNode } = usePipelineStore();
   ```

2. Add handleDropTrait function:
   ```tsx
   const handleDropTrait = (
     traitId: string,
     traitName: string,
     traitColor: string,
     position: { x: number; y: number }
   ) => {
     addTraitNode({ id: traitId, name: traitName, color: traitColor }, position);
   };
   ```

3. Pass to PipelineCanvas:
   ```tsx
   <PipelineCanvas onDropAgent={handleDropAgent} onDropTrait={handleDropTrait} />
   ```

Update `app/components/pipeline-builder/agent-node.tsx`:

Add a target handle on the LEFT side specifically for trait connections. The existing left handle is already there for agent-to-agent connections, so trait-to-agent connections will work automatically via the existing Handle:

The existing `<Handle type="target" position={Position.Left} ... />` already allows connections FROM trait nodes TO agent nodes. No changes needed to agent-node.tsx - React Flow allows multiple edges to the same target handle by default.

Verify the connection flow works:
- TraitNode has source handle on right
- AgentNode has target handle on left
- User can draw edge from TraitNode source to AgentNode target
- Same trait can connect to multiple agents
  </action>
  <verify>
1. Run dev server
2. Create a pipeline with 2+ agents
3. Drag a trait to the canvas
4. Draw edge from trait node to first agent (drag from trait's right handle to agent's left handle)
5. Draw edge from same trait node to second agent
6. Save pipeline, reload page
7. Trait node and both edges should persist
  </verify>
  <done>Trait nodes can connect to multiple agents and connections persist</done>
</task>

</tasks>

<verification>
1. Drag trait from sidebar to empty canvas area - trait becomes a node
2. Trait node displays with colored left border and name
3. Trait node has only a right-side (source) handle
4. Can draw edge from trait node to an agent node
5. Can draw multiple edges from same trait to different agents
6. Save pipeline, reload - trait node and edges persist
7. Existing agent-to-agent drag/drop still works
8. Existing trait-onto-agent drag still works (assigns trait to agent's traitIds)
</verification>

<success_criteria>
- Traits can be dropped onto the canvas as standalone nodes
- Trait nodes display with trait color and name
- Trait nodes can connect to multiple agent nodes via edges
- Connections persist through save/reload cycle
- Existing functionality (agent drops, trait-onto-agent drops) unaffected
</success_criteria>

<output>
After completion, create `.planning/quick/005-fix-trait-drag-drop-to-canvas-for-multi-/005-SUMMARY.md`
</output>
