import type { ActionFunctionArgs } from "react-router";
import { getSession } from "~/services/session.server";
import { db, pipelines, pipelineTemplates } from "~/db";
import { eq, and } from "drizzle-orm";
import type { FlowData, TemplateVariable } from "~/db/schema/pipelines";

function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
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

    case "create-template": {
      const pipelineId = formData.get("pipelineId") as string;
      const variablesStr = formData.get("variables") as string;

      if (!pipelineId) {
        return jsonResponse({ error: "Pipeline ID required" }, 400);
      }

      // Verify pipeline belongs to user
      const [pipeline] = await db
        .select()
        .from(pipelines)
        .where(and(eq(pipelines.id, pipelineId), eq(pipelines.userId, userId)));

      if (!pipeline) {
        return jsonResponse({ error: "Pipeline not found" }, 404);
      }

      const variables: TemplateVariable[] = JSON.parse(variablesStr || "[]");

      // Check if template already exists
      const [existing] = await db
        .select()
        .from(pipelineTemplates)
        .where(eq(pipelineTemplates.pipelineId, pipelineId));

      if (existing) {
        // Update existing template
        const [updated] = await db
          .update(pipelineTemplates)
          .set({ variables })
          .where(eq(pipelineTemplates.pipelineId, pipelineId))
          .returning();
        return jsonResponse({ template: updated });
      }

      // Create new template
      const [template] = await db
        .insert(pipelineTemplates)
        .values({ pipelineId, variables })
        .returning();

      return jsonResponse({ template });
    }

    case "get-template": {
      const pipelineId = formData.get("pipelineId") as string;

      if (!pipelineId) {
        return jsonResponse({ error: "Pipeline ID required" }, 400);
      }

      // Verify pipeline belongs to user
      const [pipeline] = await db
        .select()
        .from(pipelines)
        .where(and(eq(pipelines.id, pipelineId), eq(pipelines.userId, userId)));

      if (!pipeline) {
        return jsonResponse({ error: "Pipeline not found" }, 404);
      }

      const [template] = await db
        .select()
        .from(pipelineTemplates)
        .where(eq(pipelineTemplates.pipelineId, pipelineId));

      return jsonResponse({ template: template || null });
    }

    default:
      return jsonResponse({ error: "Invalid intent" }, 400);
  }
}
