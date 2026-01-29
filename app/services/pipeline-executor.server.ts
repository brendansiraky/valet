import { and, eq } from "drizzle-orm";
import { db, pipelineRuns, pipelineRunSteps } from "~/db";
import type { ArtifactOutput } from "~/db/schema/pipeline-runs";
import { calculateCost } from "~/lib/pricing";
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
}

/**
 * Build the system prompt with agent DNA first, then trait modifiers.
 * DNA is the core purpose/identity; traits modify behavior.
 */
function buildSystemPrompt(instructions: string, traitContext?: string): string {
  if (!traitContext) return instructions;

  // DNA (core purpose) first, then trait modifiers
  return `## Agent DNA\n\n${instructions}\n\n---\n\n## Trait Modifiers\n\n${traitContext}`;
}

/**
 * Execute a pipeline by running agents sequentially, passing output forward.
 * Uses unified tools (web_search + web_fetch) and tracks token usage.
 * Emits events via runEmitter for real-time updates.
 */
export async function executePipeline(
  params: ExecutePipelineParams
): Promise<void> {
  const { runId, steps, initialInput, encryptedApiKey, model } = params;

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

  // Track step outputs for artifact storage
  const stepOutputs = new Map<number, { agentId: string; agentName: string; output: string }>();

  try {
    // Update run status to running
    await db
      .update(pipelineRuns)
      .set({ status: "running" })
      .where(eq(pipelineRuns.id, runId));

    for (const step of steps) {
      // Build user message: use previous output, or generic prompt for first agent
      let userMessage: string;
      if (currentInput.trim()) {
        userMessage = currentInput;
      } else {
        userMessage = "Please proceed with your instructions.";
      }

      // Build system prompt (instructions + traits)
      const systemPrompt = buildSystemPrompt(step.instructions, step.traitContext);

      // Format full input as sent to LLM (for display in output viewer)
      const fullInput = `## System Prompt\n\n${systemPrompt}\n\n---\n\n## User Input\n\n${userMessage}`;

      // Update step status to running with full input
      await db
        .update(pipelineRunSteps)
        .set({
          status: "running",
          input: fullInput,
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

      // Build messages for provider chat
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

      // Track step output for artifact storage
      stepOutputs.set(step.order, {
        agentId: step.agentId,
        agentName: step.agentName,
        output: result.content,
      });

      // Emit step complete event
      runEmitter.emitRunEvent(runId, {
        type: "step_complete",
        stepIndex: step.order,
        output: result.content,
        input: fullInput,
      });

      // Pass output as input to next step
      currentInput = result.content;
    }

    // Build artifact data from collected step outputs
    const artifactData: ArtifactOutput = {
      steps: Array.from(stepOutputs.entries())
        .sort(([a], [b]) => a - b)
        .map(([stepOrder, data]) => ({
          ...data,
          stepOrder,
        })),
      finalOutput: currentInput,
    };

    // Calculate cost for this run
    const cost = calculateCost(model, usage.totalInputTokens, usage.totalOutputTokens);

    // All steps complete - update run with artifact data and metadata
    await db
      .update(pipelineRuns)
      .set({
        status: "completed",
        finalOutput: currentInput, // Keep for backward compat
        artifactData,
        model,
        inputTokens: usage.totalInputTokens,
        outputTokens: usage.totalOutputTokens,
        cost: cost.toString(),
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
