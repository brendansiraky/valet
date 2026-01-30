import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { eq, and, asc } from "drizzle-orm";
import { getUserId } from "~/services/auth.server";
import { db, pipelineTabs, pipelines } from "~/db";

function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Response shape for tabs - name comes from pipeline join
export interface TabResponse {
  id: string;
  pipelineId: string;
  name: string; // From pipelines table
  pinned: boolean;
  position: number;
  isActive: boolean;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);

  if (!userId) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  // Fetch user's tabs with pipeline names via join
  const tabs = await db
    .select({
      id: pipelineTabs.id,
      pipelineId: pipelineTabs.pipelineId,
      name: pipelines.name,
      pinned: pipelineTabs.pinned,
      position: pipelineTabs.position,
      isActive: pipelineTabs.isActive,
    })
    .from(pipelineTabs)
    .innerJoin(pipelines, eq(pipelineTabs.pipelineId, pipelines.id))
    .where(eq(pipelineTabs.userId, userId))
    .orderBy(asc(pipelineTabs.position));

  // Find active tab
  const activeTab = tabs.find((t) => t.isActive);

  return jsonResponse({
    tabs,
    activeTabId: activeTab?.pipelineId ?? null,
  });
}

// Input for creating/updating tabs
interface TabInput {
  pipelineId: string;
  pinned?: boolean;
}

interface TabsUpdatePayload {
  tabs: TabInput[];
  activeTabId: string | null;
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await getUserId(request);

  if (!userId) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  const body = (await request.json()) as TabsUpdatePayload;
  const { tabs: tabInputs, activeTabId } = body;

  if (!Array.isArray(tabInputs)) {
    return jsonResponse({ error: "tabs must be an array" }, 400);
  }

  // Delete all existing tabs for this user
  await db.delete(pipelineTabs).where(eq(pipelineTabs.userId, userId));

  // Insert new tabs with positions
  if (tabInputs.length > 0) {
    const newTabs = tabInputs.map((tab, index) => ({
      userId,
      pipelineId: tab.pipelineId,
      position: index,
      pinned: tab.pinned ?? false,
      isActive: tab.pipelineId === activeTabId,
    }));

    await db.insert(pipelineTabs).values(newTabs);
  }

  // Fetch the newly created tabs with pipeline names
  const tabs = await db
    .select({
      id: pipelineTabs.id,
      pipelineId: pipelineTabs.pipelineId,
      name: pipelines.name,
      pinned: pipelineTabs.pinned,
      position: pipelineTabs.position,
      isActive: pipelineTabs.isActive,
    })
    .from(pipelineTabs)
    .innerJoin(pipelines, eq(pipelineTabs.pipelineId, pipelines.id))
    .where(eq(pipelineTabs.userId, userId))
    .orderBy(asc(pipelineTabs.position));

  return jsonResponse({
    tabs,
    activeTabId,
  });
}
