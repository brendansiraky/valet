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
  model?: string | null;
}

/**
 * Parameters for executing a pipeline.
 */
export interface ExecutePipelineParams {
  runId: string;
  steps: PipelineStep[];
  initialInput: string;
  apiKeys: Map<string, string>; // Provider ID -> encrypted key
  defaultModel: string;
}

/**
 * Build the system prompt with core purpose first, then trait modifiers.
 * Core purpose is the fundamental identity; traits modify behavior.
 */
function buildSystemPrompt(instructions: string, traitContext?: string): string {
  if (!traitContext) return instructions;

  // Core purpose first, then trait modifiers
  return `## Core Purpose\n\n${instructions}\n\n---\n\n## Trait Modifiers\n\n${traitContext}`;
}

/**
 * Execute a pipeline by running agents sequentially, passing output forward.
 * Uses unified tools (web_search + web_fetch) and tracks token usage.
 * Each step uses its agent's configured model preference if available.
 * Emits events via runEmitter for real-time updates.
 */
export async function executePipeline(
  params: ExecutePipelineParams
): Promise<void> {
  const { runId, steps, initialInput, apiKeys, defaultModel } = params;

  // Cache for provider instances (one per provider type)
  const providerCache = new Map<string, ReturnType<typeof getProvider>>();

  // Helper to get or create provider instance
  function getProviderForStep(stepModel: string) {
    const providerId = getProviderForModel(stepModel);
    let provider = providerCache.get(providerId);
    if (!provider) {
      const encryptedKey = apiKeys.get(providerId);
      if (!encryptedKey) {
        throw new Error(`No API key for provider: ${providerId}`);
      }
      const decryptedKey = decrypt(encryptedKey);
      provider = getProvider(providerId, decryptedKey);
      providerCache.set(providerId, provider);
    }
    return provider;
  }

  // Define tools for all steps (web_search + web_fetch available)
  const tools: ToolConfig[] = [
    { type: "web_search", maxUses: 5 },
    { type: "web_fetch", maxUses: 5 },
  ];

  let currentInput = initialInput;
  const usage = { totalInputTokens: 0, totalOutputTokens: 0 };

  // Track usage per model for accurate cost calculation
  const usageByModel = new Map<string, { input: number; output: number }>();

  // Track step outputs for artifact storage (now includes model)
  const stepOutputs = new Map<number, { agentId: string; agentName: string; output: string; model: string }>();

  try {
    // Update run status to running
    await db
      .update(pipelineRuns)
      .set({ status: "running" })
      .where(eq(pipelineRuns.id, runId));

    for (const step of steps) {
      // Determine model for this step (agent preference or pipeline default)
      const stepModel = step.model ?? defaultModel;
      const provider = getProviderForStep(stepModel);

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
      const result = await provider.chat(messages, { model: stepModel, tools });

      // Accumulate total usage
      usage.totalInputTokens += result.usage.inputTokens;
      usage.totalOutputTokens += result.usage.outputTokens;

      // Track usage per model for accurate cost calculation
      const existing = usageByModel.get(stepModel) ?? { input: 0, output: 0 };
      usageByModel.set(stepModel, {
        input: existing.input + result.usage.inputTokens,
        output: existing.output + result.usage.outputTokens,
      });

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

      // Track step output for artifact storage (includes model)
      stepOutputs.set(step.order, {
        agentId: step.agentId,
        agentName: step.agentName,
        output: result.content,
        model: stepModel,
      });

      // Emit step complete event with model info
      runEmitter.emitRunEvent(runId, {
        type: "step_complete",
        stepIndex: step.order,
        output: result.content,
        input: fullInput,
        model: stepModel,
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

    // Calculate total cost across all models used
    let totalCost = 0;
    for (const [modelId, modelUsage] of usageByModel) {
      totalCost += calculateCost(modelId, modelUsage.input, modelUsage.output);
    }

    // All steps complete - update run with artifact data and metadata
    // Store defaultModel for backward compat (used in pipeline_complete event)
    await db
      .update(pipelineRuns)
      .set({
        status: "completed",
        finalOutput: currentInput, // Keep for backward compat
        artifactData,
        model: defaultModel, // Store default model for reference
        inputTokens: usage.totalInputTokens,
        outputTokens: usage.totalOutputTokens,
        cost: totalCost.toString(),
        completedAt: new Date(),
      })
      .where(eq(pipelineRuns.id, runId));

    // Emit pipeline complete event with usage data
    // Note: model is now per-step (available in step_complete events)
    // This model is kept for backward compat but is just the default
    runEmitter.emitRunEvent(runId, {
      type: "pipeline_complete",
      finalOutput: currentInput,
      usage: {
        inputTokens: usage.totalInputTokens,
        outputTokens: usage.totalOutputTokens,
      },
      model: defaultModel,
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
