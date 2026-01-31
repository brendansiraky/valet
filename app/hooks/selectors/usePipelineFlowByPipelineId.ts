import { usePipelineFlow } from "../queries/use-pipeline-flow";

/**
 * Returns the pipeline flow for a specific pipeline ID.
 *
 * Wraps usePipelineFlow to provide consistent access through selectors.
 */
export function usePipelineFlowByPipelineId(pipelineId: string) {
  return usePipelineFlow(pipelineId);
}
