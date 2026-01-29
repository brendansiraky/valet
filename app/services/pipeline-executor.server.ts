import { and, eq } from "drizzle-orm";
import { db, pipelineRuns, pipelineRunSteps } from "~/db";
// Import provider abstraction layer - registers providers on import
import "~/lib/providers/anthropic";
import "~/lib/providers/openai";
import { getProvider, getProviderForModel } from "~/lib/providers/registry";
import type { ChatMessage, ToolConfig } from "~/lib/providers/types";
import { decrypt } from "./encryption.server";
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

  // Get provider using abstraction layer
  const providerId = getProviderForModel(model);
  const decryptedKey = decrypt(encryptedApiKey);
  const provider = getProvider(providerId, decryptedKey);

  // Define tools for all steps (web_search + web_fetch available)
  const tools: ToolConfig[] = [
    { type: "web_search", maxUses: 5 },
    { type: "web_fetch", maxUses: 5 },
  ];

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

      // Build user message: use previous output, or for first agent with variables,
      // pass the variable values as context, otherwise use a generic prompt
      let userMessage: string;
      if (currentInput.trim()) {
        // Pass previous agent's output
        userMessage = currentInput;
      } else if (variables && Object.keys(variables).length > 0) {
        // First agent with variables: provide them clearly and instruct to proceed
        const variableContext = Object.entries(variables)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n");
        userMessage = `Here are your input values:\n\n${variableContext}\n\nProceed with your task using these values. Do not ask for clarification - use the values provided above.`;
      } else {
        // No input and no variables
        userMessage = "Please proceed with your instructions.";
      }

      // Build messages for provider chat
      const systemPrompt = buildSystemPrompt(substitutedInstructions, step.traitContext);
      const messages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ];

      // Run with provider chat (web_search + web_fetch available)
      const result = await provider.chat(messages, { model, tools });

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
