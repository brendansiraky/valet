import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { getUserId } from "~/services/auth.server";
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
  const userId = await getUserId(request);

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
  const userId = await getUserId(request);

  if (!userId) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  switch (intent) {
    case "create": {
      const id = formData.get("id") as string | null;
      const name = formData.get("name") as string;
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
          id: id ?? undefined, // Use client ID if provided, else let Drizzle generate
          userId,
          name,
          flowData,
        })
        .returning();

      return jsonResponse({ pipeline: newPipeline });
    }

    case "update": {
      const id = formData.get("id") as string;
      const name = formData.get("name") as string;
      const flowDataStr = formData.get("flowData") as string;

      if (!id || !name) {
        return jsonResponse({ error: "ID and name are required" }, 400);
      }

      const flowData: FlowData = JSON.parse(flowDataStr);

      const [updated] = await db
        .update(pipelines)
        .set({
          name,
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

    case "updateName": {
      const id = formData.get("id") as string;
      const name = formData.get("name") as string;

      if (!id || !name) {
        return jsonResponse({ error: "ID and name are required" }, 400);
      }

      const [updated] = await db
        .update(pipelines)
        .set({
          name,
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
