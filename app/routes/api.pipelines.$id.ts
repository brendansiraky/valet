import type { LoaderFunctionArgs } from "react-router";
import { getSession } from "~/services/session.server";
import { db, pipelines } from "~/db";
import { eq, and } from "drizzle-orm";

function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  const { id } = params;

  if (!id) {
    return jsonResponse({ error: "Pipeline ID required" }, 400);
  }

  const [pipeline] = await db
    .select()
    .from(pipelines)
    .where(and(eq(pipelines.id, id), eq(pipelines.userId, userId)));

  if (!pipeline) {
    return jsonResponse({ error: "Pipeline not found" }, 404);
  }

  return jsonResponse({ pipeline });
}
