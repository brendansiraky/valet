import { useState, useEffect, useCallback } from "react";
import { useEventSource } from "remix-utils/sse/react";

/**
 * Event types matching RunEvent from server (run-emitter.server.ts)
 */
export type StreamEvent =
  | { type: "step_start"; stepIndex: number; agentName: string }
  | { type: "text_delta"; stepIndex: number; text: string }
  | { type: "step_complete"; stepIndex: number; output: string; input: string; model?: string }
  | {
      type: "pipeline_complete";
      finalOutput: string;
      usage?: { inputTokens: number; outputTokens: number };
      model?: string;
    }
  | { type: "error"; stepIndex?: number; message: string }
  | { type: "status"; status: string };

export interface RunStreamState {
  status: "idle" | "connecting" | "running" | "completed" | "failed";
  currentStep: number;
  currentAgentName: string;
  streamingText: string;
  stepOutputs: Map<number, string>;
  stepInputs: Map<number, string>;
  stepModels: Map<number, string>;
  finalOutput: string | null;
  error: string | null;
  usage: { inputTokens: number; outputTokens: number } | null;
  model: string | null;
}

const initialState: RunStreamState = {
  status: "idle",
  currentStep: -1,
  currentAgentName: "",
  streamingText: "",
  stepOutputs: new Map(),
  stepInputs: new Map(),
  stepModels: new Map(),
  finalOutput: null,
  error: null,
  usage: null,
  model: null,
};

/**
 * Custom hook for consuming SSE events from pipeline execution.
 * Provides real-time state updates for UI rendering.
 *
 * @param runId The pipeline run ID to subscribe to, or null to stay idle
 * @returns Current stream state and reset function
 */
export function useRunStream(runId: string | null) {
  const [state, setState] = useState<RunStreamState>(initialState);

  const lastEvent = useEventSource(
    runId ? `/api/pipeline/run/${runId}/stream` : "/api/pipeline/run/placeholder/stream",
    { event: "update", enabled: !!runId }
  );

  // Transition from idle to connecting when runId is provided
  useEffect(() => {
    if (runId && state.status === "idle") {
      setState((prev) => ({ ...prev, status: "connecting" }));
    }
  }, [runId, state.status]);

  // Process incoming SSE events
  useEffect(() => {
    if (!lastEvent) return;

    try {
      const event: StreamEvent = JSON.parse(lastEvent);

      setState((prev) => {
        switch (event.type) {
          case "step_start":
            return {
              ...prev,
              status: "running",
              currentStep: event.stepIndex,
              currentAgentName: event.agentName,
              streamingText: "",
            };
          case "text_delta":
            return {
              ...prev,
              streamingText: prev.streamingText + event.text,
            };
          case "step_complete": {
            const newOutputs = new Map(prev.stepOutputs);
            newOutputs.set(event.stepIndex, event.output);
            const newInputs = new Map(prev.stepInputs);
            newInputs.set(event.stepIndex, event.input);
            const newModels = new Map(prev.stepModels);
            if (event.model) {
              newModels.set(event.stepIndex, event.model);
            }
            return {
              ...prev,
              stepOutputs: newOutputs,
              stepInputs: newInputs,
              stepModels: newModels,
              streamingText: "",
            };
          }
          case "pipeline_complete":
            return {
              ...prev,
              status: "completed",
              finalOutput: event.finalOutput,
              currentStep: -1,
              usage: event.usage ?? null,
              model: event.model ?? null,
            };
          case "error":
            return {
              ...prev,
              status: "failed",
              error: event.message,
            };
          case "status":
            return {
              ...prev,
              status: event.status as RunStreamState["status"],
            };
          default:
            return prev;
        }
      });
    } catch (e) {
      console.error("Failed to parse SSE event:", e);
    }
  }, [lastEvent]);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return { ...state, reset };
}
