import type { ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { getSession } from "~/services/session.server";
import { db, agents, apiKeys, agentTraits } from "~/db";
import { eq, and } from "drizzle-orm";
import { runAgent, type AgentRunResult } from "~/services/agent-runner.server";
import type { ModelId } from "~/lib/models";

const RunAgentSchema = z.object({
  input: z.string().min(1, "Input is required"),
});

function jsonResponse(data: AgentRunResult, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function action({
  request,
  params,
}: ActionFunctionArgs): Promise<Response> {
  // Require authentication
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) {
    return jsonResponse(
      { success: false, error: "Authentication required" },
      401
    );
  }

  // Parse agentId from params
  const agentId = params.agentId;
  if (!agentId) {
    return jsonResponse({ success: false, error: "Agent ID required" }, 400);
  }

  // Fetch agent and verify ownership
  const agent = await db.query.agents.findFirst({
    where: and(eq(agents.id, agentId), eq(agents.userId, userId)),
  });

  if (!agent) {
    return jsonResponse({ success: false, error: "Agent not found" }, 404);
  }

  // Fetch user's API key
  const apiKey = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.userId, userId),
  });

  if (!apiKey) {
    return jsonResponse(
      { success: false, error: "Please configure your API key in settings" },
      400
    );
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
  }

  const result = RunAgentSchema.safeParse(body);
  if (!result.success) {
    return jsonResponse(
      {
        success: false,
        error: result.error.issues[0]?.message || "Invalid input",
      },
      400
    );
  }

  const { input } = result.data;

  // Load trait context for this agent
  const assignments = await db.query.agentTraits.findMany({
    where: eq(agentTraits.agentId, agentId),
    with: {
      trait: {
        columns: { name: true, context: true },
      },
    },
  });

  const traitContext = assignments.length > 0
    ? assignments
        .map((a) => `## ${a.trait.name}\n\n${a.trait.context}`)
        .join("\n\n---\n\n")
    : undefined;

  // Use agent's model if set, otherwise user's default from API key
  const modelToUse = (agent.model ?? apiKey.modelPreference ??
    "claude-sonnet-4-5-20250929") as ModelId;

  // Run the agent (all agents have access to web_search and web_fetch)
  const runResult = await runAgent({
    agent,
    userInput: input,
    encryptedApiKey: apiKey.encryptedKey,
    model: modelToUse,
    traitContext,
  });

  return jsonResponse(runResult, runResult.success ? 200 : 500);
}
