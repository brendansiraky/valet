import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Agent } from "~/db/schema/agents";

// Types for API responses
interface AgentWithTraitIds extends Agent {
  traitIds: string[];
}

interface Trait {
  id: string;
  name: string;
}

interface AgentsData {
  agents: AgentWithTraitIds[];
  traits: Trait[];
  configuredProviders: string[];
}

interface MutationError {
  errors?: {
    name?: string[];
    instructions?: string[];
  };
  error?: string;
}

// Fetch function with typed return
async function fetchAgents(): Promise<AgentsData> {
  const response = await fetch("/api/agents");
  if (!response.ok) {
    throw new Error("Failed to fetch agents");
  }
  const data = await response.json();
  return data;
}

// Query hook for agents list
export function useAgents() {
  return useQuery({
    queryKey: ["agents"],
    queryFn: fetchAgents,
  });
}

// Create agent mutation
interface CreateAgentData {
  name: string;
  instructions: string;
  model?: string;
  traitIds?: string[];
}

export function useCreateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAgentData) => {
      const formData = new FormData();
      formData.append("intent", "create");
      formData.append("name", data.name);
      formData.append("instructions", data.instructions);
      if (data.model) {
        formData.append("model", data.model);
      }
      if (data.traitIds) {
        data.traitIds.forEach((id) => formData.append("traitIds", id));
      }

      const response = await fetch("/api/agents", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        const error = new Error("Failed to create agent") as Error & { data: MutationError };
        error.data = result;
        throw error;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });
}

// Update agent mutation
interface UpdateAgentData {
  agentId: string;
  name: string;
  instructions: string;
  model?: string;
  traitIds?: string[];
  traitsUpdated?: boolean;
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateAgentData) => {
      const formData = new FormData();
      formData.append("intent", "update");
      formData.append("agentId", data.agentId);
      formData.append("name", data.name);
      formData.append("instructions", data.instructions);
      if (data.model) {
        formData.append("model", data.model);
      }
      if (data.traitsUpdated) {
        formData.append("traitsUpdated", "true");
        if (data.traitIds) {
          data.traitIds.forEach((id) => formData.append("traitIds", id));
        }
      }

      const response = await fetch("/api/agents", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        const error = new Error("Failed to update agent") as Error & { data: MutationError };
        error.data = result;
        throw error;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });
}

// Delete agent mutation
interface DeleteAgentData {
  agentId: string;
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: DeleteAgentData) => {
      const formData = new FormData();
      formData.append("intent", "delete");
      formData.append("agentId", data.agentId);

      const response = await fetch("/api/agents", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        const error = new Error("Failed to delete agent") as Error & { data: MutationError };
        error.data = result;
        throw error;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });
}
