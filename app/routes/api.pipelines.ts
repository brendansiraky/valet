import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { getSession } from "~/services/session.server";
import { db, pipelines } from "~/db";
import { eq, and, desc } from "drizzle-orm";
import type { FlowData } from "~/db/schema/pipelines";

function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  const userPipelines = await db
    .select({ id: pipelines.id, name: pipelines.name })
    .from(pipelines)
    .where(eq(pipelines.userId, userId))
    .orderBy(desc(pipelines.updatedAt));

  return jsonResponse({ pipelines: userPipelines });
}

export async function action({ request }: ActionFunctionArgs) {
  // Require authentication
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  switch (intent) {
    case "create": {
      const name = formData.get("name") as string;
      const description = formData.get("description") as string | null;
      const flowDataStr = formData.get("flowData") as string;

      if (!name) {
        return jsonResponse({ error: "Name is required" }, 400);
      }

      const flowData: FlowData = flowDataStr
        ? JSON.parse(flowDataStr)
        : { nodes: [], edges: [] };

      const [newPipeline] = await db
        .insert(pipelines)
        .values({
          userId,
          name,
          description,
          flowData,
        })
        .returning();

      return jsonResponse({ pipeline: newPipeline });
    }

    case "update": {
      const id = formData.get("id") as string;
      const name = formData.get("name") as string;
      const description = formData.get("description") as string | null;
      const flowDataStr = formData.get("flowData") as string;

      if (!id || !name) {
        return jsonResponse({ error: "ID and name are required" }, 400);
      }

      const flowData: FlowData = JSON.parse(flowDataStr);

      const [updated] = await db
        .update(pipelines)
        .set({
          name,
          description,
          flowData,
          updatedAt: new Date(),
        })
        .where(and(eq(pipelines.id, id), eq(pipelines.userId, userId)))
        .returning();

      if (!updated) {
        return jsonResponse({ error: "Pipeline not found" }, 404);
      }

      return jsonResponse({ pipeline: updated });
    }

    case "delete": {
      const id = formData.get("id") as string;

      if (!id) {
        return jsonResponse({ error: "ID is required" }, 400);
      }

      const [deleted] = await db
        .delete(pipelines)
        .where(and(eq(pipelines.id, id), eq(pipelines.userId, userId)))
        .returning();

      if (!deleted) {
        return jsonResponse({ error: "Pipeline not found" }, 404);
      }

      return jsonResponse({ success: true });
    }

    default:
      return jsonResponse({ error: "Invalid intent" }, 400);
  }
}
