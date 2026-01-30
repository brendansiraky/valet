import type { LoaderFunctionArgs } from "react-router";
import { eventStream } from "remix-utils/sse/server";
import { and, eq } from "drizzle-orm";
import { getUserId } from "~/services/auth.server";
import { db, pipelineRuns } from "~/db";
import { runEmitter, type RunEvent } from "~/services/run-emitter.server";

/**
 * GET /api/pipeline/run/:runId/stream
 * Server-Sent Events endpoint for real-time pipeline execution updates.
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await getUserId(request);

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const runId = params.runId;
  if (!runId) {
    return new Response("Run ID required", { status: 400 });
  }

  // Verify run exists and belongs to user
  const [run] = await db
    .select()
    .from(pipelineRuns)
    .where(and(eq(pipelineRuns.id, runId), eq(pipelineRuns.userId, userId)));

  if (!run) {
    return new Response("Run not found", { status: 404 });
  }

  return eventStream(request.signal, function setup(send) {
    function handleEvent(data: RunEvent) {
      send({ event: "update", data: JSON.stringify(data) });
    }

    runEmitter.on(`run:${runId}`, handleEvent);

    // Send initial status if run already started/completed
    if (run.status !== "pending") {
      send({
        event: "update",
        data: JSON.stringify({ type: "status", status: run.status }),
      });
    }

    return function cleanup() {
      runEmitter.off(`run:${runId}`, handleEvent);
    };
  });
}
