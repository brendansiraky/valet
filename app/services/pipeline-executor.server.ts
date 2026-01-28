import { and, eq } from "drizzle-orm";
import { db, pipelineRuns, pipelineRunSteps } from "~/db";
import { createAnthropicClient } from "./anthropic.server";
import { runEmitter } from "./run-emitter.server";

/**
 * Represents a single step in a pipeline execution.
 */
export interface PipelineStep {
  agentId: string;
  agentName: string;
  instructions: string;
  order: number;
}

/**
 * Parameters for executing a pipeline.
 */
export interface ExecutePipelineParams {
  runId: string;
  steps: PipelineStep[];
  initialInput: string;
  encryptedApiKey: string;
  model: string;
  variables?: Record<string, string>;
}

/**
 * Substitute template variables in text.
 * Replaces {{varName}} with the corresponding value from variables.
 */
function substituteVariables(
  text: string,
  variables?: Record<string, string>
): string {
  if (!variables) return text;

  return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return variables[varName] ?? match;
  });
}

/**
 * Execute a pipeline by running agents sequentially, passing output forward.
 * Streams events via runEmitter for real-time updates.
 */
export async function executePipeline(
  params: ExecutePipelineParams
): Promise<void> {
  const { runId, steps, initialInput, encryptedApiKey, model, variables } =
    params;

  const client = createAnthropicClient(encryptedApiKey);
  let currentInput = initialInput;

  try {
    // Update run status to running
    await db
      .update(pipelineRuns)
      .set({ status: "running" })
      .where(eq(pipelineRuns.id, runId));

    for (const step of steps) {
      // Update step status to running
      await db
        .update(pipelineRunSteps)
        .set({
          status: "running",
          input: currentInput,
          startedAt: new Date(),
        })
        .where(
          and(
            eq(pipelineRunSteps.runId, runId),
            eq(pipelineRunSteps.stepOrder, step.order)
          )
        );

      // Emit step start event
      runEmitter.emitRunEvent(runId, {
        type: "step_start",
        stepIndex: step.order,
        agentName: step.agentName,
      });

      // Substitute variables in instructions
      const substitutedInstructions = substituteVariables(
        step.instructions,
        variables
      );

      // Stream the response
      const stream = client.messages.stream({
        model,
        max_tokens: 4096,
        system: substitutedInstructions,
        messages: [{ role: "user", content: currentInput }],
      });

      let fullOutput = "";

      stream.on("text", (text) => {
        fullOutput += text;
        runEmitter.emitRunEvent(runId, {
          type: "text_delta",
          stepIndex: step.order,
          text,
        });
      });

      // Wait for stream to complete
      await stream.finalMessage();

      // Update step with output
      await db
        .update(pipelineRunSteps)
        .set({
          status: "completed",
          output: fullOutput,
          completedAt: new Date(),
        })
        .where(
          and(
            eq(pipelineRunSteps.runId, runId),
            eq(pipelineRunSteps.stepOrder, step.order)
          )
        );

      // Emit step complete event
      runEmitter.emitRunEvent(runId, {
        type: "step_complete",
        stepIndex: step.order,
        output: fullOutput,
      });

      // Pass output as input to next step
      currentInput = fullOutput;
    }

    // All steps complete - update run
    await db
      .update(pipelineRuns)
      .set({
        status: "completed",
        finalOutput: currentInput,
        completedAt: new Date(),
      })
      .where(eq(pipelineRuns.id, runId));

    // Emit pipeline complete event
    runEmitter.emitRunEvent(runId, {
      type: "pipeline_complete",
      finalOutput: currentInput,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    // Update run with error
    await db
      .update(pipelineRuns)
      .set({
        status: "failed",
        error: errorMessage,
        completedAt: new Date(),
      })
      .where(eq(pipelineRuns.id, runId));

    // Emit error event
    runEmitter.emitRunEvent(runId, {
      type: "error",
      message: errorMessage,
    });
  }
}
