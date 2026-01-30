import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { eq } from "drizzle-orm";
import { getUserId } from "~/services/auth.server";
import { db, userTabs, pipelines } from "~/db";
import type { TabData } from "~/db/schema/user-tabs";

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

  // Fetch user's tab state
  const [tabState] = await db
    .select()
    .from(userTabs)
    .where(eq(userTabs.userId, userId));

  if (!tabState) {
    // No tab state yet - return empty
    return jsonResponse({ tabs: [], activeTabId: null });
  }

  // Filter out tabs for deleted pipelines
  const existingPipelines = await db
    .select({ id: pipelines.id })
    .from(pipelines)
    .where(eq(pipelines.userId, userId));

  const validIds = new Set(existingPipelines.map((p) => p.id));
  const validTabs = tabState.tabs.filter(
    (t) => t.pipelineId === "home" || validIds.has(t.pipelineId)
  );

  // Persist cleanup if tabs were filtered
  if (validTabs.length !== tabState.tabs.length) {
    await db
      .update(userTabs)
      .set({ tabs: validTabs })
      .where(eq(userTabs.id, tabState.id));
  }

  return jsonResponse({
    tabs: validTabs,
    activeTabId: tabState.activeTabId,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await getUserId(request);

  if (!userId) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  const body = await request.json();
  const tabs = body.tabs as TabData[];
  const activeTabId = body.activeTabId as string | null;

  if (!Array.isArray(tabs)) {
    return jsonResponse({ error: "tabs must be an array" }, 400);
  }

  // Check if user already has tab state
  const [existing] = await db
    .select({ id: userTabs.id })
    .from(userTabs)
    .where(eq(userTabs.userId, userId));

  if (existing) {
    await db
      .update(userTabs)
      .set({ tabs, activeTabId })
      .where(eq(userTabs.id, existing.id));
  } else {
    await db.insert(userTabs).values({ userId, tabs, activeTabId });
  }

  return jsonResponse({ tabs, activeTabId });
}
