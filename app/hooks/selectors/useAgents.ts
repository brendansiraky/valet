import { useAgents as useAgentsQuery } from "../queries/useAgents";

/**
 * Returns all agents for the current user.
 *
 * Wraps useAgents query and extracts just the agents array.
 */
export function useAgents() {
  const query = useAgentsQuery();

  return {
    ...query,
    data: query.data?.agents,
  };
}
