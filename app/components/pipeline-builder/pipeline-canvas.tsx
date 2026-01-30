import { useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
} from "@xyflow/react";
import type { PipelineNodeData } from "~/hooks/queries/use-pipelines";
import { AgentNode } from "./agent-node";
import { TraitNode } from "./trait-node";

// CRITICAL: Define nodeTypes OUTSIDE component to prevent infinite re-renders
const nodeTypes = {
  agent: AgentNode,
  trait: TraitNode,
};

interface PipelineCanvasProps {
  nodes: Node<PipelineNodeData>[];
  edges: Edge[];
  onNodesChange: OnNodesChange<Node<PipelineNodeData>>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
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
  isLocked?: boolean;
}

export function PipelineCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onDropAgent,
  onDropTrait,
  isLocked,
}: PipelineCanvasProps) {
  const { screenToFlowPosition } = useReactFlow();

  const onDragOver = useCallback(
    (event: React.DragEvent) => {
      if (isLocked) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    },
    [isLocked]
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      if (isLocked) return;
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
    [isLocked, screenToFlowPosition, onDropAgent, onDropTrait]
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={isLocked ? undefined : onNodesChange}
        onEdgesChange={isLocked ? undefined : onEdgesChange}
        onConnect={isLocked ? undefined : onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        fitView
        className="bg-muted/30"
        // Lock all interactions during pipeline execution
        nodesDraggable={!isLocked}
        nodesConnectable={!isLocked}
        elementsSelectable={!isLocked}
        deleteKeyCode={isLocked ? null : "Backspace"}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
