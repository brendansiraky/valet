import { useAgents as useAgentsQuery } from "../queries/useAgents";

/**
 * Returns all traits for the current user.
 *
 * Wraps useAgents query and extracts just the traits array.
 */
export function useTraits() {
  const query = useAgentsQuery();

  return {
    ...query,
    data: query.data?.traits,
  };
}
