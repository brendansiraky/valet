import { useTabsQuery, HOME_TAB_ID } from "../queries/use-tabs";
import { usePipelineFlow } from "../queries/use-pipeline-flow";

/**
 * Returns the pipeline flow for the currently selected tab.
 *
 * Composes useTabsQuery (for active tab ID) with usePipelineFlow (for flow data and actions).
 * Returns empty nodes/edges when on the home tab or no tab is active.
 */
export function useSelectedPipelineFlow() {
  const { data: tabState } = useTabsQuery();
  const activePipelineId =
    tabState?.activeTabId && tabState.activeTabId !== HOME_TAB_ID
      ? tabState.activeTabId
      : undefined;

  return usePipelineFlow(activePipelineId ?? "");
}
