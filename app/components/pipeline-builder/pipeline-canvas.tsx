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

// CRITICAL: Define nodeTypes OUTSIDE component to prevent infinite re-renders
const nodeTypes = {
  agent: AgentNode,
};

interface PipelineCanvasProps {
  onDropAgent: (
    agentId: string,
    agentName: string,
    instructions: string | undefined,
    position: { x: number; y: number }
  ) => void;
}

function PipelineCanvasInner({ onDropAgent }: PipelineCanvasProps) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } =
    usePipelineStore();

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const agentId = event.dataTransfer.getData("application/agent-id");
      const agentName = event.dataTransfer.getData("application/agent-name");
      const agentInstructions = event.dataTransfer.getData(
        "application/agent-instructions"
      );

      if (!agentId) return;

      // Get the ReactFlow container bounds to convert screen coordinates
      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      onDropAgent(agentId, agentName, agentInstructions || undefined, position);
    },
    [onDropAgent]
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
