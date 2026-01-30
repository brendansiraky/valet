import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Node,
} from "@xyflow/react";
import type { PipelineNodeData } from "~/stores/pipeline-store";
import { usePipelineStore } from "~/stores/pipeline-store";
import { AgentNode } from "./agent-node";
import { TraitNode } from "./trait-node";

// CRITICAL: Define nodeTypes OUTSIDE component to prevent infinite re-renders
const nodeTypes = {
  agent: AgentNode,
  trait: TraitNode,
};

interface PipelineCanvasProps {
  pipelineId: string;
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
  /** Callback when pipeline canvas is modified (node drag, edge connect, etc.) */
  onPipelineChange?: () => void;
  /** Lock canvas to prevent editing during pipeline execution */
  isLocked?: boolean;
}

export function PipelineCanvas({
  pipelineId,
  onDropAgent,
  onDropTrait,
  onPipelineChange,
  isLocked,
}: PipelineCanvasProps) {
  const {
    getPipeline,
    createOnNodesChange,
    createOnEdgesChange,
    createOnConnect,
  } = usePipelineStore();

  const pipeline = getPipeline(pipelineId);
  const { screenToFlowPosition } = useReactFlow();

  // Get base store callbacks
  const onNodesChangeBase = useMemo(
    () => createOnNodesChange(pipelineId),
    [pipelineId, createOnNodesChange]
  );
  const onEdgesChangeBase = useMemo(
    () => createOnEdgesChange(pipelineId),
    [pipelineId, createOnEdgesChange]
  );
  const onConnectBase = useMemo(
    () => createOnConnect(pipelineId),
    [pipelineId, createOnConnect]
  );

  // Wrap store callbacks to also trigger save
  const onNodesChange = useCallback(
    (changes: NodeChange<Node<PipelineNodeData>>[]) => {
      onNodesChangeBase(changes);
      onPipelineChange?.();
    },
    [onNodesChangeBase, onPipelineChange]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChangeBase(changes);
      onPipelineChange?.();
    },
    [onEdgesChangeBase, onPipelineChange]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      onConnectBase(connection);
      onPipelineChange?.();
    },
    [onConnectBase, onPipelineChange]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    if (isLocked) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, [isLocked]);

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

  // Handle case where pipeline is not yet loaded
  if (!pipeline) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={pipeline.nodes}
        edges={pipeline.edges}
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
