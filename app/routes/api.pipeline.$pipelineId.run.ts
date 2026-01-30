import type { ActionFunctionArgs } from "react-router";
import { and, eq } from "drizzle-orm";
import { getUserId } from "~/services/auth.server";
import { db, pipelineRuns, pipelines } from "~/db";
import { getJobQueue, registerPipelineWorker } from "~/services/job-queue.server";

function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * POST /api/pipeline/:pipelineId/run
 * Starts a pipeline execution by creating a run record and queueing a job.
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await getUserId(request);

  if (!userId) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const pipelineId = params.pipelineId;
  if (!pipelineId) {
    return jsonResponse({ error: "Pipeline ID required" }, 400);
  }

  // Verify pipeline exists and belongs to user
  const [pipeline] = await db
    .select()
    .from(pipelines)
    .where(and(eq(pipelines.id, pipelineId), eq(pipelines.userId, userId)));

  if (!pipeline) {
    return jsonResponse({ error: "Pipeline not found" }, 404);
  }

  // Parse request body
  const formData = await request.formData();
  const input = (formData.get("input") as string) || "";

  // Create run record
  const [run] = await db
    .insert(pipelineRuns)
    .values({
      pipelineId,
      userId,
      input,
      status: "pending",
    })
    .returning();

  // Ensure worker is registered and queue job
  await registerPipelineWorker();
  const queue = await getJobQueue();

  await queue.send(
    "pipeline-run",
    {
      runId: run.id,
      pipelineId,
      userId,
      input,
    },
    {
      retryLimit: 2,
      retryDelay: 5000,
    }
  );

  return jsonResponse({ runId: run.id });
}
