import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Node, Edge } from "@xyflow/react";
import { queries } from "./keys";

// Flow data structure for pipeline canvas state
export interface FlowData {
  nodes: Node[];
  edges: Edge[];
}

// Agent node data for React Flow nodes
export interface AgentNodeData {
  agentId: string;
  agentName: string;
  agentInstructions?: string;
  isOrphaned?: boolean;
  traitIds: string[];
  [key: string]: unknown; // Required for React Flow compatibility
}

// Trait node data for standalone trait nodes on canvas
export interface TraitNodeData {
  traitId: string;
  traitName: string;
  traitColor: string;
  [key: string]: unknown; // Required for React Flow compatibility
}

// Union type for all pipeline node data types
export type PipelineNodeData = AgentNodeData | TraitNodeData;

export interface Pipeline {
  id: string;
  name: string;
  flowData: FlowData;
}

interface PipelineListItem {
  id: string;
  name: string;
}

async function fetchPipelines(): Promise<PipelineListItem[]> {
  const response = await fetch("/api/pipelines");
  if (!response.ok) throw new Error("Failed to fetch pipelines");
  const data = await response.json();
  return data.pipelines ?? [];
}

export function usePipelines() {
  return useQuery({
    queryKey: queries.pipelines.all.queryKey,
    queryFn: fetchPipelines,
  });
}

async function fetchPipeline(id: string): Promise<Pipeline> {
  const response = await fetch(`/api/pipelines/${id}`);
  if (!response.ok) throw new Error("Failed to fetch pipeline");
  const data = await response.json();
  return data.pipeline;
}

export function usePipeline(id: string | undefined) {
  return useQuery({
    queryKey: queries.pipelines.detail(id!).queryKey,
    queryFn: () => fetchPipeline(id!),
    enabled: !!id && id !== "home" && id !== "new",
  });
}

interface RunPipelineInput {
  pipelineId: string;
  input: string;
}

interface RunPipelineResponse {
  runId: string;
}

async function runPipeline(data: RunPipelineInput): Promise<RunPipelineResponse> {
  const formData = new FormData();
  formData.set("input", data.input);

  const response = await fetch(`/api/pipeline/${data.pipelineId}/run`, {
    method: "POST",
    body: formData,
  });

  const result = await response.json();

  if (!response.ok || result.error) {
    throw new Error(result.error || "Failed to run pipeline");
  }

  return result;
}

export function useRunPipeline() {
  return useMutation({
    mutationFn: runPipeline,
    // No cache invalidation needed - runs don't affect pipeline list
  });
}

// Save pipeline (auto-save) - no invalidation to avoid refetch flicker
interface SavePipelineInput {
  id: string;
  name: string;
  nodes: unknown[];
  edges: unknown[];
  isNew: boolean;
}

async function savePipeline(data: SavePipelineInput): Promise<Pipeline> {
  const formData = new FormData();
  formData.set("intent", data.isNew ? "create" : "update");
  if (!data.isNew) {
    formData.set("id", data.id);
  }
  formData.set("name", data.name);
  formData.set("flowData", JSON.stringify({ nodes: data.nodes, edges: data.edges }));

  const response = await fetch("/api/pipelines", {
    method: "POST",
    body: formData,
  });

  const result = await response.json();

  if (!response.ok || result.error) {
    throw new Error(result.error || "Failed to save pipeline");
  }

  return result.pipeline;
}

export function useSavePipeline() {
  return useMutation({
    mutationFn: savePipeline,
    // No invalidation - avoid refetch flicker during auto-save
  });
}

// Update just the pipeline name with optimistic update
interface UpdatePipelineNameInput {
  id: string;
  name: string;
}

async function updatePipelineName(data: UpdatePipelineNameInput): Promise<Pipeline> {
  const formData = new FormData();
  formData.set("intent", "updateName");
  formData.set("id", data.id);
  formData.set("name", data.name);

  const response = await fetch("/api/pipelines", {
    method: "POST",
    body: formData,
  });

  const result = await response.json();

  if (!response.ok || result.error) {
    throw new Error(result.error || "Failed to update pipeline name");
  }

  return result.pipeline;
}

export function useUpdatePipelineName() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePipelineName,

    onMutate: async ({ id, name }) => {
      // Cancel in-flight queries
      await queryClient.cancelQueries({ queryKey: queries.pipelines.detail(id).queryKey });
      await queryClient.cancelQueries({ queryKey: queries.pipelines.all.queryKey });

      // Snapshot for rollback
      const previousPipeline = queryClient.getQueryData<Pipeline>(
        queries.pipelines.detail(id).queryKey
      );
      const previousList = queryClient.getQueryData<PipelineListItem[]>(
        queries.pipelines.all.queryKey
      );

      // Optimistically update detail cache
      if (previousPipeline) {
        queryClient.setQueryData<Pipeline>(
          queries.pipelines.detail(id).queryKey,
          { ...previousPipeline, name }
        );
      }

      // Optimistically update list cache
      queryClient.setQueryData<PipelineListItem[]>(
        queries.pipelines.all.queryKey,
        (old) => old?.map((p) => (p.id === id ? { ...p, name } : p))
      );

      return { previousPipeline, previousList };
    },

    onError: (_err, { id }, context) => {
      // Rollback on error
      if (context?.previousPipeline) {
        queryClient.setQueryData(
          queries.pipelines.detail(id).queryKey,
          context.previousPipeline
        );
      }
      if (context?.previousList) {
        queryClient.setQueryData(queries.pipelines.all.queryKey, context.previousList);
      }
    },
  });
}

// Delete pipeline mutation with cache invalidation
interface DeletePipelineInput {
  id: string;
}

async function deletePipeline(data: DeletePipelineInput): Promise<void> {
  const formData = new FormData();
  formData.set("intent", "delete");
  formData.set("id", data.id);

  const response = await fetch("/api/pipelines", {
    method: "POST",
    body: formData,
  });

  const result = await response.json();

  if (!response.ok || result.error) {
    throw new Error(result.error || "Failed to delete pipeline");
  }
}

export function useDeletePipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePipeline,

    onMutate: async (deletedPipeline) => {
      // Cancel in-flight queries to prevent race conditions
      await queryClient.cancelQueries({ queryKey: queries.pipelines.all.queryKey });

      // Snapshot current state for rollback
      const previousPipelines = queryClient.getQueryData<PipelineListItem[]>(
        queries.pipelines.all.queryKey
      );

      // Optimistically remove from cache
      queryClient.setQueryData<PipelineListItem[]>(
        queries.pipelines.all.queryKey,
        (old) => old?.filter((p) => p.id !== deletedPipeline.id)
      );

      return { previousPipelines };
    },

    onError: (_err, _deletedPipeline, context) => {
      // Rollback on error
      if (context?.previousPipelines) {
        queryClient.setQueryData(
          queries.pipelines.all.queryKey,
          context.previousPipelines
        );
      }
    },

    onSettled: () => {
      // Always refetch to ensure consistency with server
      queryClient.invalidateQueries({ queryKey: queries.pipelines._def });
    },
  });
}

// Create new empty pipeline with optimistic update
interface CreatePipelineInput {
  name: string;
  flowData: FlowData;
}

interface CreatePipelineResponse {
  id: string;
  name: string;
  flowData: FlowData;
}

async function createPipeline(data: CreatePipelineInput): Promise<CreatePipelineResponse> {
  const formData = new FormData();
  formData.set("intent", "create");
  formData.set("name", data.name);
  formData.set("flowData", JSON.stringify(data.flowData));

  const response = await fetch("/api/pipelines", {
    method: "POST",
    body: formData,
  });

  const result = await response.json();

  if (!response.ok || result.error) {
    throw new Error(result.error || "Failed to create pipeline");
  }

  return result.pipeline;
}

export function useCreatePipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPipeline,

    onMutate: async (newPipeline) => {
      // Cancel in-flight queries to prevent race conditions
      await queryClient.cancelQueries({ queryKey: queries.pipelines.all.queryKey });

      // Snapshot current state for rollback
      const previousPipelines = queryClient.getQueryData<PipelineListItem[]>(
        queries.pipelines.all.queryKey
      );

      // Generate a temporary ID for optimistic display
      const tempId = `temp-${Date.now()}`;

      // Optimistically add to cache
      queryClient.setQueryData<PipelineListItem[]>(
        queries.pipelines.all.queryKey,
        (old) => [
          ...(old ?? []),
          { id: tempId, name: newPipeline.name },
        ]
      );

      return { previousPipelines, tempId };
    },

    onError: (_err, _newPipeline, context) => {
      // Rollback on error
      if (context?.previousPipelines) {
        queryClient.setQueryData(
          queries.pipelines.all.queryKey,
          context.previousPipelines
        );
      }
    },

    onSuccess: (createdPipeline, _variables, context) => {
      // Replace temp item with real one from server
      queryClient.setQueryData<PipelineListItem[]>(
        queries.pipelines.all.queryKey,
        (old) =>
          old?.map((p) =>
            p.id === context?.tempId
              ? { id: createdPipeline.id, name: createdPipeline.name }
              : p
          )
      );
    },

    onSettled: () => {
      // Always refetch to ensure consistency with server
      queryClient.invalidateQueries({ queryKey: queries.pipelines._def });
    },
  });
}
