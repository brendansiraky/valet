import { and, eq } from "drizzle-orm";
import { db, pipelineRuns, pipelineRunSteps } from "~/db";
import { createAnthropicClient } from "./anthropic.server";
import { runWithTools } from "./capabilities/run-with-tools.server";
import { runEmitter } from "./run-emitter.server";

/**
 * Represents a single step in a pipeline execution.
 */
export interface PipelineStep {
  agentId: string;
  agentName: string;
  instructions: string;
  order: number;
  traitContext?: string;
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
 * Build the system prompt by prepending trait context to agent instructions.
 */
function buildSystemPrompt(instructions: string, traitContext?: string): string {
  if (!traitContext) return instructions;

  // Prepend trait context to instructions with separator
  return `${traitContext}\n\n---\n\n${instructions}`;
}

/**
 * Execute a pipeline by running agents sequentially, passing output forward.
 * Uses unified tools (web_search + web_fetch) and tracks token usage.
 * Emits events via runEmitter for real-time updates.
 */
export async function executePipeline(
  params: ExecutePipelineParams
): Promise<void> {
  const { runId, steps, initialInput, encryptedApiKey, model, variables } =
    params;

  const client = createAnthropicClient(encryptedApiKey);
  let currentInput = initialInput;
  const usage = { totalInputTokens: 0, totalOutputTokens: 0 };

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

      // Use default prompt if no input (first agent case)
      const userMessage = currentInput.trim() || "Please proceed with your instructions.";

      // Run with unified tools (web_search + web_fetch available)
      const result = await runWithTools({
        client,
        model,
        systemPrompt: buildSystemPrompt(substitutedInstructions, step.traitContext),
        userInput: userMessage,
      });

      // Accumulate usage
      usage.totalInputTokens += result.usage.inputTokens;
      usage.totalOutputTokens += result.usage.outputTokens;

      // Update step with output
      await db
        .update(pipelineRunSteps)
        .set({
          status: "completed",
          output: result.content,
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
        output: result.content,
      });

      // Pass output as input to next step
      currentInput = result.content;
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

    // Emit pipeline complete event with usage data
    runEmitter.emitRunEvent(runId, {
      type: "pipeline_complete",
      finalOutput: currentInput,
      usage: {
        inputTokens: usage.totalInputTokens,
        outputTokens: usage.totalOutputTokens,
      },
      model,
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
