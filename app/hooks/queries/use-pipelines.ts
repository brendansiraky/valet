import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Pipeline {
  id: string;
  name: string;
  description: string | null;
  flowData: unknown;
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
    queryKey: ["pipelines"],
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
    queryKey: ["pipelines", id],
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
  description: string;
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
  formData.set("description", data.description);
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
    onSuccess: () => {
      // Invalidate pipelines list to refresh dropdown
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
    },
  });
}
