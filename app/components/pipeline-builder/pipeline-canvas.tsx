import { useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
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

  const onDragOver = useCallback((event: React.DragEvent) => {
    // Handle both agent and trait drops at the canvas level
    if (
      event.dataTransfer.types.includes("application/agent-id") ||
      event.dataTransfer.types.includes("application/trait-id")
    ) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    }
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      // Get the ReactFlow container bounds to convert screen coordinates
      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

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
    [onDropAgent, onDropTrait]
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
