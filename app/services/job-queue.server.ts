import { PgBoss, type Job } from "pg-boss";
import { and, eq, inArray } from "drizzle-orm";
import { db, pipelineRuns, pipelineRunSteps, agents, pipelines, apiKeys, traits } from "~/db";
import { executePipeline, type PipelineStep } from "./pipeline-executor.server";
import { getProviderForModel } from "~/lib/providers/registry";
import { runEmitter } from "./run-emitter.server";

/**
 * Job data for pipeline execution.
 */
interface PipelineRunJob {
  runId: string;
  pipelineId: string;
  userId: string;
  input: string;
}

let boss: PgBoss | null = null;
let isWorkerRegistered = false;

/**
 * Get the pg-boss job queue singleton.
 * Initializes on first call.
 */
export async function getJobQueue(): Promise<PgBoss> {
  if (boss) return boss;

  boss = new PgBoss(process.env.DATABASE_URL!);
  boss.on("error", (err: Error) => console.error("pg-boss error:", err));

  await boss.start();

  // Ensure pipeline-run queue exists (required in pg-boss v10+)
  await boss.createQueue("pipeline-run");

  return boss;
}

/**
 * Register the pipeline execution worker.
 * Should be called once at application startup.
 */
export async function registerPipelineWorker() {
  if (isWorkerRegistered) return;

  const queue = await getJobQueue();

  await queue.work<PipelineRunJob>("pipeline-run", async ([job]: Job<PipelineRunJob>[]) => {
    const { runId, pipelineId, userId, input } = job.data;

    try {
      // Update run status to 'running'
      await db
        .update(pipelineRuns)
        .set({ status: "running" })
        .where(eq(pipelineRuns.id, runId));

      // Load pipeline flow data to get steps
      const [pipeline] = await db
        .select()
        .from(pipelines)
        .where(eq(pipelines.id, pipelineId));

      if (!pipeline) {
        await db
          .update(pipelineRuns)
          .set({ status: "failed", error: "Pipeline not found" })
          .where(eq(pipelineRuns.id, runId));
        return;
      }

      // Get user's default API key for model preference lookup
      const [defaultApiKey] = await db
        .select()
        .from(apiKeys)
        .where(and(eq(apiKeys.userId, userId), eq(apiKeys.provider, "anthropic")));

      // Extract steps from flow data (nodes in topological order by edges)
      const flowData = pipeline.flowData as { nodes: any[]; edges: any[] };
      const steps = await buildStepsFromFlow(flowData, defaultApiKey?.modelPreference);

      // Create step records
      for (const step of steps) {
        await db.insert(pipelineRunSteps).values({
          runId,
          agentId: step.agentId,
          stepOrder: step.order,
          status: "pending",
        });
      }

      // Determine model: use first agent's model if set, otherwise fallback to user preference or default
      // Note: For simplicity, pipeline uses a single model for all steps (the first agent's preference)
      const pipelineModel = steps[0]?.model ?? defaultApiKey?.modelPreference ?? "claude-sonnet-4-5-20250929";

      // Get the correct API key for the model's provider
      const providerId = getProviderForModel(pipelineModel);
      const [apiKey] = await db
        .select()
        .from(apiKeys)
        .where(and(eq(apiKeys.userId, userId), eq(apiKeys.provider, providerId)));

      if (!apiKey) {
        await db
          .update(pipelineRuns)
          .set({ status: "failed", error: `${providerId} API key not configured. Please add your API key in Settings.` })
          .where(eq(pipelineRuns.id, runId));
        return;
      }

      // Execute pipeline
      await executePipeline({
        runId,
        steps,
        initialInput: input,
        encryptedApiKey: apiKey.encryptedKey,
        model: pipelineModel,
      });
    } catch (error) {
      // Handle errors (including orphaned agent detection) by marking run as failed
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      await db
        .update(pipelineRuns)
        .set({ status: "failed", error: errorMessage })
        .where(eq(pipelineRuns.id, runId));

      // Emit error event so SSE stream notifies the client
      runEmitter.emitRunEvent(runId, { type: "error", message: errorMessage });
    }
  });

  isWorkerRegistered = true;
}

/**
 * Build PipelineStep array from React Flow graph using topological sort.
 * Uses Kahn's algorithm to ensure steps are ordered by dependencies.
 *
 * Trait Loading (v1.3+):
 * - Traits loaded from BOTH node.data.traitIds (drop-onto-agent) AND edges (trait-node connections)
 * - Same agent can have different traits in different pipelines
 * - Deleted traits are gracefully skipped (no error, just excluded)
 */
async function buildStepsFromFlow(
  flowData: { nodes: any[]; edges: any[] },
  defaultModel?: string | null
): Promise<(PipelineStep & { model?: string | null })[]> {
  const { nodes, edges } = flowData;

  // Build map of trait nodes: nodeId -> traitId
  const traitNodeMap = new Map<string, string>();
  nodes.forEach((node) => {
    if (node.type === "trait" && node.data?.traitId) {
      traitNodeMap.set(node.id, node.data.traitId);
    }
  });

  // Build map of trait assignments from edges: agentNodeId -> traitIds[]
  const edgeTraitMap = new Map<string, string[]>();
  edges.forEach((edge) => {
    const traitId = traitNodeMap.get(edge.source);
    if (traitId) {
      // This edge connects a trait node to another node (presumably an agent)
      const existing = edgeTraitMap.get(edge.target) || [];
      edgeTraitMap.set(edge.target, [...existing, traitId]);
    }
  });

  // Build adjacency list and in-degree map (only for agent-to-agent edges)
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  nodes.forEach((node) => {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  });

  edges.forEach((edge) => {
    // Skip trait-to-agent edges for topological sort (they don't affect execution order)
    if (traitNodeMap.has(edge.source)) return;

    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    adjacency.get(edge.source)?.push(edge.target);
  });

  // Kahn's algorithm for topological sort
  const queue = nodes.filter((n) => inDegree.get(n.id) === 0).map((n) => n.id);
  const sorted: string[] = [];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    sorted.push(nodeId);

    for (const neighbor of adjacency.get(nodeId) || []) {
      inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    }
  }

  // Map to PipelineStep with agent details and trait context
  // Track orphaned agents (deleted but still referenced in pipeline)
  const orphanedAgents: string[] = [];
  const steps: (PipelineStep & { model?: string | null })[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const node = nodes.find((n) => n.id === sorted[i]);
    if (!node || node.type !== "agent") continue;

    const agentId = node.data.agentId;
    const [agent] = await db.select().from(agents).where(eq(agents.id, agentId));

    if (!agent) {
      // Agent was deleted - use stored name from node data if available
      const agentName = node.data.agentName ?? agentId;
      orphanedAgents.push(agentName);
      continue;
    }

    // Load trait assignments from BOTH sources:
    // 1. node.data.traitIds - traits dropped directly onto agent node
    // 2. edgeTraitMap - traits connected via edges from trait nodes
    const directTraitIds: string[] = node.data.traitIds ?? [];
    const edgeTraitIds: string[] = edgeTraitMap.get(node.id) ?? [];
    const traitIds = [...new Set([...directTraitIds, ...edgeTraitIds])]; // Dedupe
    let traitContext: string | undefined;

    if (traitIds.length > 0) {
      const nodeTraits = await db
        .select({ name: traits.name, context: traits.context })
        .from(traits)
        .where(inArray(traits.id, traitIds));

      // Note: nodeTraits may have fewer items than traitIds if some traits were deleted
      // This gracefully handles deleted traits by simply not including them
      if (nodeTraits.length > 0) {
        traitContext = nodeTraits
          .map((t) => `### ${t.name}\n\n${t.context}`)
          .join("\n\n");
      }
    }

    steps.push({
      agentId: agent.id,
      agentName: agent.name,
      instructions: agent.instructions,
      order: steps.length,
      traitContext,
      model: agent.model,
    });
  }

  // Fail fast if any agents have been deleted
  if (orphanedAgents.length > 0) {
    throw new Error(
      `Pipeline cannot run: ${orphanedAgents.length} agent(s) have been deleted: ${orphanedAgents.join(", ")}. Please update the pipeline.`
    );
  }

  return steps;
}
