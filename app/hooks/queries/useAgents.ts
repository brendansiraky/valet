import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Agent } from "~/db/schema/agents";
import { queries } from "./keys";

// Types for API responses
interface AgentWithTraitIds extends Agent {
  traitIds: string[];
}

interface Trait {
  id: string;
  name: string;
  color: string;
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
    queryKey: queries.agents.all.queryKey,
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

interface CreateAgentResult {
  agent: AgentWithTraitIds;
}

export function useCreateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAgentData): Promise<CreateAgentResult> => {
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
    onMutate: async (data) => {
      // Cancel in-flight queries to prevent race conditions
      await queryClient.cancelQueries({ queryKey: queries.agents._def });

      // Snapshot current state for rollback
      const previous = queryClient.getQueryData<AgentsData>(queries.agents.all.queryKey);

      // Create optimistic agent with temporary ID
      const optimisticAgent: AgentWithTraitIds = {
        id: `temp-${Date.now()}`,
        userId: "temp-user",
        name: data.name,
        instructions: data.instructions,
        model: data.model ?? null,
        capability: "none",
        traitIds: data.traitIds ?? [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Optimistically add the agent to the cache
      queryClient.setQueryData<AgentsData>(queries.agents.all.queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          agents: [optimisticAgent, ...old.agents],
        };
      });

      return { previous };
    },
    onError: (_err, _data, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(queries.agents.all.queryKey, context.previous);
      }
    },
    onSettled: () => {
      // Always refetch to ensure server state
      queryClient.invalidateQueries({ queryKey: queries.agents._def });
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
    onMutate: async (data) => {
      // Cancel in-flight queries to prevent race conditions
      await queryClient.cancelQueries({ queryKey: queries.agents._def });

      // Snapshot current state for rollback
      const previous = queryClient.getQueryData<AgentsData>(queries.agents.all.queryKey);

      // Optimistically update the agent in the cache
      queryClient.setQueryData<AgentsData>(queries.agents.all.queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          agents: old.agents.map((agent) =>
            agent.id === data.agentId
              ? {
                  ...agent,
                  name: data.name,
                  instructions: data.instructions,
                  model: data.model ?? agent.model,
                  traitIds: data.traitsUpdated ? (data.traitIds ?? []) : agent.traitIds,
                  updatedAt: new Date(),
                }
              : agent
          ),
        };
      });

      return { previous };
    },
    onError: (_err, _data, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(queries.agents.all.queryKey, context.previous);
      }
    },
    onSettled: () => {
      // Always refetch to ensure server state
      queryClient.invalidateQueries({ queryKey: queries.agents._def });
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
    onMutate: async (data) => {
      // Cancel in-flight queries to prevent race conditions
      await queryClient.cancelQueries({ queryKey: queries.agents._def });

      // Snapshot current state for rollback
      const previous = queryClient.getQueryData<AgentsData>(queries.agents.all.queryKey);

      // Optimistically remove the agent from the cache
      queryClient.setQueryData<AgentsData>(queries.agents.all.queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          agents: old.agents.filter((agent) => agent.id !== data.agentId),
        };
      });

      return { previous };
    },
    onError: (_err, _data, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(queries.agents.all.queryKey, context.previous);
      }
    },
    onSettled: () => {
      // Always refetch to ensure server state
      queryClient.invalidateQueries({ queryKey: queries.agents._def });
    },
  });
}
