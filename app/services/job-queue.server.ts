import { PgBoss, type Job } from "pg-boss";
import { eq } from "drizzle-orm";
import { db, pipelineRuns, pipelineRunSteps, agents, pipelines, apiKeys } from "~/db";
import { executePipeline, type PipelineStep } from "./pipeline-executor.server";

/**
 * Job data for pipeline execution.
 */
interface PipelineRunJob {
  runId: string;
  pipelineId: string;
  userId: string;
  input: string;
  variables?: Record<string, string>;
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
    const { runId, pipelineId, userId, input, variables } = job.data;

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

    // Get user's API key and model
    const [apiKey] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.userId, userId));

    if (!apiKey) {
      await db
        .update(pipelineRuns)
        .set({ status: "failed", error: "API key not configured" })
        .where(eq(pipelineRuns.id, runId));
      return;
    }

    // Extract steps from flow data (nodes in topological order by edges)
    const flowData = pipeline.flowData as { nodes: any[]; edges: any[] };
    const steps = await buildStepsFromFlow(flowData);

    // Create step records
    for (const step of steps) {
      await db.insert(pipelineRunSteps).values({
        runId,
        agentId: step.agentId,
        stepOrder: step.order,
        status: "pending",
      });
    }

    // Execute pipeline
    await executePipeline({
      runId,
      steps,
      initialInput: input,
      encryptedApiKey: apiKey.encryptedKey,
      model: apiKey.modelPreference || "claude-sonnet-4-5-20250929",
      variables,
    });
  });

  isWorkerRegistered = true;
}

/**
 * Build PipelineStep array from React Flow graph using topological sort.
 * Uses Kahn's algorithm to ensure steps are ordered by dependencies.
 */
async function buildStepsFromFlow(flowData: {
  nodes: any[];
  edges: any[];
}): Promise<PipelineStep[]> {
  const { nodes, edges } = flowData;

  // Build adjacency list and in-degree map
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  nodes.forEach((node) => {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  });

  edges.forEach((edge) => {
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

  // Map to PipelineStep with agent details
  const steps: PipelineStep[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const node = nodes.find((n) => n.id === sorted[i]);
    if (!node || node.type !== "agent") continue;

    const agentId = node.data.agentId;
    const [agent] = await db.select().from(agents).where(eq(agents.id, agentId));

    if (agent) {
      steps.push({
        agentId: agent.id,
        agentName: agent.name,
        instructions: agent.instructions,
        order: steps.length,
      });
    }
  }

  return steps;
}
