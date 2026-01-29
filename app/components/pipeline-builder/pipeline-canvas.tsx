import { useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import { usePipelineStore } from "~/stores/pipeline-store";
import { AgentNode } from "./agent-node";
import { TraitNode } from "./trait-node";

// CRITICAL: Define nodeTypes OUTSIDE component to prevent infinite re-renders
const nodeTypes = {
  agent: AgentNode,
  trait: TraitNode,
};

interface PipelineCanvasProps {
  onDropAgent: (
    agentId: string,
    agentName: string,
    instructions: string | undefined,
    position: { x: number; y: number }
  ) => void;
  onDropTrait: (
    traitId: string,
    traitName: string,
    traitColor: string,
    position: { x: number; y: number }
  ) => void;
}

function PipelineCanvasInner({ onDropAgent, onDropTrait }: PipelineCanvasProps) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } =
    usePipelineStore();
  const { screenToFlowPosition } = useReactFlow();

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      // Use React Flow's screenToFlowPosition to get correct coordinates
      // accounting for zoom and pan
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Handle agent drops
      const agentId = event.dataTransfer.getData("application/agent-id");
      if (agentId) {
        const agentName = event.dataTransfer.getData("application/agent-name");
        const agentInstructions = event.dataTransfer.getData(
          "application/agent-instructions"
        );
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
    [screenToFlowPosition, onDropAgent, onDropTrait]
  );

  return (
    <div className="h-full w-full">
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
        className="bg-muted/30"
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}

// Wrap with provider for hooks to work
export function PipelineCanvas(props: PipelineCanvasProps) {
  return (
    <ReactFlowProvider>
      <PipelineCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
