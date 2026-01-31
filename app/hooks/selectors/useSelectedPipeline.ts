import { useTabsQuery, HOME_TAB_ID } from "../queries/use-tabs";
import { usePipeline } from "../queries/use-pipelines";

/**
 * Returns the currently selected pipeline based on the active tab.
 *
 * Composes useTabsQuery (for active tab ID) with usePipeline (for pipeline data).
 * Returns undefined data when on the home tab or no tab is active.
 */
export function useSelectedPipeline() {
  const { data: tabState } = useTabsQuery();
  const activePipelineId =
    tabState?.activeTabId && tabState.activeTabId !== HOME_TAB_ID
      ? tabState.activeTabId
      : undefined;

  return usePipeline(activePipelineId);
}
