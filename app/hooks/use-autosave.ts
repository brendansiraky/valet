import { useEffect, useRef, useCallback } from "react";
import { usePipelineStore } from "~/stores/pipeline-store";

const AUTOSAVE_DELAY = 1000; // 1 second debounce

/**
 * Hook that watches a pipeline's isDirty flag and saves automatically when dirty.
 * Uses manual debounce (no external dependencies) to delay saves by 1 second.
 * Handles race conditions by aborting in-flight requests when new changes come in.
 *
 * @param pipelineId - The pipeline ID to watch and autosave
 * @returns { saveNow } - Function to bypass debounce and save immediately
 */
export function useAutosave(pipelineId: string) {
  const { getPipeline, updatePipeline } = usePipelineStore();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isSavingRef = useRef(false);

  const save = useCallback(async () => {
    const pipeline = getPipeline(pipelineId);
    if (!pipeline || !pipeline.isDirty || isSavingRef.current) return;

    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    isSavingRef.current = true;

    try {
      const formData = new FormData();
      formData.set("intent", "update");
      formData.set("id", pipelineId);
      formData.set("name", pipeline.pipelineName);
      formData.set("description", pipeline.pipelineDescription);
      formData.set(
        "flowData",
        JSON.stringify({
          nodes: pipeline.nodes,
          edges: pipeline.edges,
        })
      );

      const response = await fetch("/api/pipelines", {
        method: "POST",
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      if (response.ok) {
        // Only mark clean if still the same pipeline and was dirty
        const currentPipeline = getPipeline(pipelineId);
        if (currentPipeline?.isDirty) {
          updatePipeline(pipelineId, { isDirty: false });
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // Request was cancelled, new one will be made
        return;
      }
      console.error("Autosave failed:", error);
    } finally {
      isSavingRef.current = false;
    }
  }, [pipelineId, getPipeline, updatePipeline]);

  // Subscribe to store changes and trigger debounced save when isDirty
  useEffect(() => {
    const unsubscribe = usePipelineStore.subscribe((state) => {
      const pipeline = state.getPipeline(pipelineId);
      if (pipeline?.isDirty) {
        // Clear existing timeout and set new one
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(save, AUTOSAVE_DELAY);
      }
    });

    return () => {
      unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [pipelineId, save]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Return manual save for Save button (bypasses debounce)
  const saveNow = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    await save();
  }, [save]);

  return { saveNow };
}
