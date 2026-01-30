import { useCallback, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queries } from "./keys";
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
} from "@xyflow/react";
import debounce from "lodash-es/debounce";
import {
  usePipeline,
  useSavePipeline,
  type Pipeline,
  type FlowData,
  type AgentNodeData,
  type TraitNodeData,
  type PipelineNodeData,
} from "./use-pipelines";

/**
 * Return type for usePipelineFlow hook.
 * Provides everything needed to render and interact with a pipeline canvas.
 */
export interface UsePipelineFlowReturn {
  // Data (from React Query cache)
  nodes: Node<PipelineNodeData>[];
  edges: Edge[];
  pipelineName: string;
  isLoading: boolean;

  // React Flow callbacks
  onNodesChange: OnNodesChange<Node<PipelineNodeData>>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  // Actions
  updateName: (name: string) => void;
  addAgentNode: (
    agent: { id: string; name: string; instructions?: string },
    position: { x: number; y: number }
  ) => void;
  addTraitNode: (
    trait: { id: string; name: string; color: string },
    position: { x: number; y: number }
  ) => void;
  removeNode: (nodeId: string) => void;
  addTraitToNode: (nodeId: string, traitId: string) => void;
  removeTraitFromNode: (nodeId: string, traitId: string) => void;
  setNodesAndEdges: (nodes: Node<PipelineNodeData>[], edges: Edge[]) => void;
}

/**
 * Hook for managing pipeline flow state through React Query cache.
 *
 * This hook provides the same interface as the Zustand store but uses React Query's
 * cache as the single source of truth. All modifications use setQueryData for instant
 * UI updates with debounced autosave to the server.
 *
 * @param pipelineId - The ID of the pipeline to manage
 * @returns Pipeline data and callbacks for React Flow
 */
export function usePipelineFlow(pipelineId: string): UsePipelineFlowReturn {
  const queryClient = useQueryClient();
  const pipelineQuery = usePipeline(pipelineId);
  const saveMutation = useSavePipeline();

  // Extract flow data with type safety and defaults
  const flowData = useMemo((): FlowData => {
    const raw = pipelineQuery.data?.flowData;
    if (!raw || typeof raw !== "object") {
      return { nodes: [], edges: [] };
    }
    return raw as FlowData;
  }, [pipelineQuery.data?.flowData]);

  // Helper to update cache - NEVER mutates the old value
  const updateCache = useCallback(
    (updater: (old: Pipeline) => Pipeline) => {
      queryClient.setQueryData<Pipeline>(
        queries.pipelines.detail(pipelineId).queryKey,
        (old) => {
          if (!old) return old;
          return updater(old);
        }
      );
    },
    [queryClient, pipelineId]
  );

  // Debounced save - reads current cache state when fired
  const debouncedSave = useMemo(
    () =>
      debounce(() => {
        const pipeline = queryClient.getQueryData<Pipeline>([
          "pipelines",
          pipelineId,
        ]);
        if (!pipeline) return;

        const fd = pipeline.flowData as FlowData;
        saveMutation.mutate({
          id: pipelineId,
          name: pipeline.name,
          nodes: fd.nodes,
          edges: fd.edges,
          isNew: false,
        });
      }, 1000),
    [queryClient, pipelineId, saveMutation]
  );

  // Cleanup debounce on unmount - legitimate useEffect for cleanup pattern
  useEffect(() => {
    return () => debouncedSave.cancel();
  }, [debouncedSave]);

  // ============================================================
  // React Flow callbacks
  // ============================================================

  const onNodesChange: OnNodesChange<Node<PipelineNodeData>> = useCallback(
    (changes: NodeChange<Node<PipelineNodeData>>[]) => {
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

  const onEdgesChange: OnEdgesChange = useCallback(
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

  const onConnect: OnConnect = useCallback(
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

  // ============================================================
  // Metadata actions
  // ============================================================

  const updateName = useCallback(
    (name: string) => {
      updateCache((old) => ({ ...old, name }));
      debouncedSave();
    },
    [updateCache, debouncedSave]
  );

  // ============================================================
  // Node manipulation actions
  // ============================================================

  const addAgentNode = useCallback(
    (
      agent: { id: string; name: string; instructions?: string },
      position: { x: number; y: number }
    ) => {
      const newNode: Node<AgentNodeData> = {
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

  const addTraitNode = useCallback(
    (
      trait: { id: string; name: string; color: string },
      position: { x: number; y: number }
    ) => {
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

  const removeNode = useCallback(
    (nodeId: string) => {
      updateCache((old) => {
        const fd = old.flowData as FlowData;
        return {
          ...old,
          flowData: {
            ...fd,
            nodes: fd.nodes.filter((n) => n.id !== nodeId),
            edges: fd.edges.filter(
              (e) => e.source !== nodeId && e.target !== nodeId
            ),
          },
        };
      });
      debouncedSave();
    },
    [updateCache, debouncedSave]
  );

  const addTraitToNode = useCallback(
    (nodeId: string, traitId: string) => {
      updateCache((old) => {
        const fd = old.flowData as FlowData;
        return {
          ...old,
          flowData: {
            ...fd,
            nodes: fd.nodes.map((node) => {
              if (node.id !== nodeId || node.type !== "agent") return node;
              const agentData = node.data as AgentNodeData;
              return {
                ...node,
                data: {
                  ...agentData,
                  traitIds: [
                    ...new Set([...(agentData.traitIds || []), traitId]),
                  ],
                },
              };
            }),
          },
        };
      });
      debouncedSave();
    },
    [updateCache, debouncedSave]
  );

  const removeTraitFromNode = useCallback(
    (nodeId: string, traitId: string) => {
      updateCache((old) => {
        const fd = old.flowData as FlowData;
        return {
          ...old,
          flowData: {
            ...fd,
            nodes: fd.nodes.map((node) => {
              if (node.id !== nodeId || node.type !== "agent") return node;
              const agentData = node.data as AgentNodeData;
              return {
                ...node,
                data: {
                  ...agentData,
                  traitIds: (agentData.traitIds || []).filter(
                    (id) => id !== traitId
                  ),
                },
              };
            }),
          },
        };
      });
      debouncedSave();
    },
    [updateCache, debouncedSave]
  );

  const setNodesAndEdges = useCallback(
    (nodes: Node<PipelineNodeData>[], edges: Edge[]) => {
      updateCache((old) => ({
        ...old,
        flowData: { nodes, edges },
      }));
      debouncedSave();
    },
    [updateCache, debouncedSave]
  );

  return {
    // Data (from cache)
    nodes: flowData.nodes as Node<PipelineNodeData>[],
    edges: flowData.edges,
    pipelineName: pipelineQuery.data?.name ?? "Untitled Pipeline",
    isLoading: pipelineQuery.isLoading,

    // React Flow callbacks
    onNodesChange,
    onEdgesChange,
    onConnect,

    // Actions
    updateName,
    addAgentNode,
    addTraitNode,
    removeNode,
    addTraitToNode,
    removeTraitFromNode,
    setNodesAndEdges,
  };
}
