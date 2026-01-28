import { EventEmitter } from "events";

/**
 * Events emitted during pipeline execution for real-time streaming.
 * Events are namespaced by runId: `run:${runId}`
 */
export type RunEvent =
  | { type: "step_start"; stepIndex: number; agentName: string }
  | { type: "text_delta"; stepIndex: number; text: string }
  | { type: "step_complete"; stepIndex: number; output: string }
  | { type: "pipeline_complete"; finalOutput: string }
  | { type: "error"; stepIndex?: number; message: string };

/**
 * Singleton EventEmitter that bridges pipeline execution events to SSE endpoints.
 * This emitter survives across requests, allowing the SSE endpoint to listen for
 * events from the executor running in background.
 */
class RunEmitterSingleton extends EventEmitter {
  private static instance: RunEmitterSingleton;

  private constructor() {
    super();
    // Allow many concurrent runs (each run listens on `run:${runId}`)
    this.setMaxListeners(100);
  }

  static getInstance(): RunEmitterSingleton {
    if (!RunEmitterSingleton.instance) {
      RunEmitterSingleton.instance = new RunEmitterSingleton();
    }
    return RunEmitterSingleton.instance;
  }

  /**
   * Emit an event for a specific run.
   * @param runId The pipeline run ID
   * @param event The event to emit
   */
  emitRunEvent(runId: string, event: RunEvent): void {
    this.emit(`run:${runId}`, event);
  }

  /**
   * Subscribe to events for a specific run.
   * @param runId The pipeline run ID
   * @param handler The event handler
   */
  onRunEvent(runId: string, handler: (event: RunEvent) => void): void {
    this.on(`run:${runId}`, handler);
  }

  /**
   * Unsubscribe from events for a specific run.
   * @param runId The pipeline run ID
   * @param handler The event handler to remove
   */
  offRunEvent(runId: string, handler: (event: RunEvent) => void): void {
    this.off(`run:${runId}`, handler);
  }
}

export const runEmitter = RunEmitterSingleton.getInstance();
