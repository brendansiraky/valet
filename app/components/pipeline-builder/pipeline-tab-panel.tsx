import { useMemo, useCallback } from "react";
import type { Node, Edge } from "@xyflow/react";
import { ReactFlowProvider } from "@xyflow/react";
import { usePipelineStore } from "~/stores/pipeline-store";
import { useTabStore } from "~/stores/tab-store";
import { useSavePipeline, useDeletePipeline } from "~/hooks/queries/use-pipelines";
import { PipelineCanvas } from "./pipeline-canvas";
import { TraitsContext, type TraitContextValue } from "./traits-context";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import {
  LayoutGrid,
  Trash2,
  Play,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { getLayoutedElements } from "~/lib/pipeline-layout";
import type { AgentNodeData, PipelineNodeData } from "~/stores/pipeline-store";

interface PipelineTabPanelProps {
  pipelineId: string;
  initialData: {
    id: string;
    name: string;
    description: string | null;
    flowData: unknown; // Comes from DB as JSON, cast internally
  } | null; // null for new pipeline
  agents: Array<{ id: string; name: string; instructions: string | null }>;
  traits: Array<{ id: string; name: string; color: string }>;
  traitsMap: Map<string, TraitContextValue>;
  runState: { runId: string | null; isStarting: boolean };
  onOpenRunDialog: () => void;
  onDelete: () => void;
}

export function PipelineTabPanel({
  pipelineId,
  initialData,
  agents,
  traits,
  traitsMap,
  runState,
  onOpenRunDialog,
  onDelete,
}: PipelineTabPanelProps) {
  const savePipelineMutation = useSavePipeline();
  const deletePipelineMutation = useDeletePipeline();

  const {
    getPipeline,
    loadPipeline,
    updatePipeline,
    addAgentNodeTo,
    addTraitNodeTo,
  } = usePipelineStore();

  const { updateTabName } = useTabStore();

  // Lazy initialization: load pipeline into store on first access if not present
  // This replaces the useEffect-based initialization pattern
  let pipeline = getPipeline(pipelineId);
  if (!pipeline) {
    const validAgentIds = new Set(agents.map((a) => a.id));
    const flowData = (initialData?.flowData || { nodes: [], edges: [] }) as {
      nodes: Node<PipelineNodeData>[];
      edges: Edge[];
    };

    // Enrich nodes with orphan status
    const enrichedNodes = flowData.nodes.map((node) => {
      if (node.type === "agent") {
        const agentData = node.data as AgentNodeData;
        return {
          ...node,
          data: { ...agentData, isOrphaned: !validAgentIds.has(agentData.agentId) },
        };
      }
      return node;
    });

    // Load immediately - this is synchronous and deterministic
    loadPipeline({
      pipelineId,
      pipelineName: initialData?.name || "Untitled Pipeline",
      pipelineDescription: initialData?.description || "",
      nodes: enrichedNodes,
      edges: flowData.edges,
    });

    // Re-fetch after loading
    pipeline = getPipeline(pipelineId);
  }

  // Detect orphaned agents
  const hasOrphanedAgents = useMemo(() => {
    if (!pipeline) return false;
    const validAgentIds = new Set(agents.map((a) => a.id));
    return pipeline.nodes.some((n) => {
      if (n.type !== "agent") return false;
      const agentData = n.data as AgentNodeData;
      return agentData.agentId && !validAgentIds.has(agentData.agentId);
    });
  }, [pipeline, agents]);

  // Event-driven save callback - called directly from handlers, not from useEffect
  // Note: Pipeline is always created by handleNewTab() before this component mounts,
  // so we always use isNew: false (update intent) for saves.
  const savePipeline = useCallback(() => {
    const currentPipeline = getPipeline(pipelineId);
    if (!currentPipeline) return;

    savePipelineMutation.mutate(
      {
        id: pipelineId,
        name: currentPipeline.pipelineName,
        description: currentPipeline.pipelineDescription,
        nodes: currentPipeline.nodes,
        edges: currentPipeline.edges,
        isNew: false,
      },
      {
        onError: (error) => {
          console.error("Failed to auto-save pipeline:", error);
        },
      }
    );
  }, [pipelineId, getPipeline, savePipelineMutation]);

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updatePipeline(pipelineId, { pipelineName: e.target.value });
      updateTabName(pipelineId, e.target.value);
      savePipeline();
    },
    [pipelineId, updatePipeline, updateTabName, savePipeline]
  );

  const handleDropAgent = useCallback(
    (
      agentId: string,
      agentName: string,
      instructions: string | undefined,
      position: { x: number; y: number }
    ) => {
      addAgentNodeTo(pipelineId, { id: agentId, name: agentName, instructions }, position);
      savePipeline();
    },
    [pipelineId, addAgentNodeTo, savePipeline]
  );

  const handleDropTrait = useCallback(
    (
      traitId: string,
      traitName: string,
      traitColor: string,
      position: { x: number; y: number }
    ) => {
      addTraitNodeTo(pipelineId, { id: traitId, name: traitName, color: traitColor }, position);
      savePipeline();
    },
    [pipelineId, addTraitNodeTo, savePipeline]
  );

  const handleAutoLayout = useCallback(() => {
    if (!pipeline) return;
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      pipeline.nodes,
      pipeline.edges
    );
    updatePipeline(pipelineId, { nodes: layoutedNodes, edges: layoutedEdges });
    savePipeline();
  }, [pipelineId, pipeline, updatePipeline, savePipeline]);

  const handleDelete = () => {
    if (!confirm("Delete this pipeline?")) return;

    deletePipelineMutation.mutate(
      { id: pipelineId },
      {
        onSuccess: () => {
          onDelete();
        },
        onError: (error) => {
          console.error("Failed to delete pipeline:", error);
        },
      }
    );
  };

  if (!pipeline) {
    return <div className="flex-1 flex items-center justify-center">Loading...</div>;
  }

  const isLocked = runState.isStarting || !!runState.runId;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-[78px] z-10 border-b bg-background p-4 flex items-center gap-4">
        <Input
          value={pipeline.pipelineName}
          onChange={handleNameChange}
          placeholder="Pipeline name"
          className="max-w-xs font-semibold"
        />
        <div className="flex-1" />
        <Button variant="outline" onClick={handleAutoLayout}>
          <LayoutGrid className="size-4 mr-2" />
          Auto Layout
        </Button>
        <Button
          onClick={onOpenRunDialog}
          disabled={isLocked || hasOrphanedAgents}
          variant={hasOrphanedAgents ? "outline" : "default"}
        >
          {runState.isStarting ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Starting...
            </>
          ) : runState.runId ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Running...
            </>
          ) : hasOrphanedAgents ? (
            <>
              <AlertTriangle className="size-4 mr-2" />
              Remove Deleted Agents
            </>
          ) : (
            <>
              <Play className="size-4 mr-2" />
              Run
            </>
          )}
        </Button>
        <Button variant="destructive" onClick={handleDelete}>
          <Trash2 className="size-4 mr-2" />
          Delete
        </Button>
      </div>

      {/* Canvas with isolated ReactFlowProvider */}
      <div className="flex-1 min-h-0">
        <TraitsContext.Provider value={traitsMap}>
          <ReactFlowProvider>
            <PipelineCanvas
              pipelineId={pipelineId}
              onDropAgent={handleDropAgent}
              onDropTrait={handleDropTrait}
              onPipelineChange={savePipeline}
              isLocked={isLocked}
            />
          </ReactFlowProvider>
        </TraitsContext.Provider>
      </div>
    </div>
  );
}
