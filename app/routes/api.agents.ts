import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { z } from "zod";
import { getUserId } from "~/services/auth.server";
import { db, agents, agentTraits, traits, apiKeys } from "~/db";
import { eq, and, asc, desc } from "drizzle-orm";

function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const AgentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  instructions: z.string().min(1, "Instructions are required").max(10000, "Instructions must be 10,000 characters or less"),
  model: z.string().optional().transform(val => (!val || val === "__default__") ? null : val),
});

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);

  if (!userId) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  // Query agents with their trait assignments, ordered by creation date (newest first)
  const userAgents = await db.query.agents.findMany({
    where: eq(agents.userId, userId),
    orderBy: [desc(agents.createdAt)],
    with: {
      agentTraits: {
        columns: { traitId: true },
      },
    },
  });

  // Transform to include traitIds array
  const agentsWithTraitIds = userAgents.map((agent) => ({
    ...agent,
    traitIds: agent.agentTraits.map((at) => at.traitId),
  }));

  // Query user's traits for form population
  const userTraits = await db.query.traits.findMany({
    where: eq(traits.userId, userId),
    orderBy: [asc(traits.name)],
    columns: {
      id: true,
      name: true,
    },
  });

  // Query user's configured providers
  const userApiKeys = await db.query.apiKeys.findMany({
    where: eq(apiKeys.userId, userId),
    columns: { provider: true },
  });
  const configuredProviders = userApiKeys.map((k) => k.provider);

  return jsonResponse({ agents: agentsWithTraitIds, traits: userTraits, configuredProviders });
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
      const traitIds = formData.getAll("traitIds") as string[];

      const result = AgentSchema.safeParse({
        name: formData.get("name"),
        instructions: formData.get("instructions"),
        model: formData.get("model"),
      });

      if (!result.success) {
        return jsonResponse(
          { errors: result.error.flatten().fieldErrors },
          400
        );
      }

      // Insert agent
      const [newAgent] = await db
        .insert(agents)
        .values({
          userId,
          name: result.data.name,
          instructions: result.data.instructions,
          model: result.data.model,
        })
        .returning({ id: agents.id });

      // Insert trait assignments
      if (traitIds.length > 0) {
        await db.insert(agentTraits).values(
          traitIds.map((traitId) => ({
            agentId: newAgent.id,
            traitId,
          }))
        );
      }

      return jsonResponse({ success: true, agent: newAgent });
    }

    case "update": {
      const agentId = formData.get("agentId") as string;
      const traitsUpdated = formData.has("traitsUpdated");
      const traitIds = formData.getAll("traitIds") as string[];

      const result = AgentSchema.safeParse({
        name: formData.get("name"),
        instructions: formData.get("instructions"),
        model: formData.get("model"),
      });

      if (!result.success) {
        return jsonResponse(
          { errors: result.error.flatten().fieldErrors },
          400
        );
      }

      // Update agent fields
      await db
        .update(agents)
        .set({
          name: result.data.name,
          instructions: result.data.instructions,
          model: result.data.model,
        })
        .where(and(eq(agents.id, agentId), eq(agents.userId, userId)));

      // Update trait assignments if traits section was submitted
      if (traitsUpdated) {
        // Delete existing assignments
        await db.delete(agentTraits).where(eq(agentTraits.agentId, agentId));

        // Insert new assignments
        if (traitIds.length > 0) {
          await db.insert(agentTraits).values(
            traitIds.map((traitId) => ({
              agentId,
              traitId,
            }))
          );
        }
      }

      return jsonResponse({ success: true });
    }

    case "delete": {
      const agentId = formData.get("agentId") as string;

      if (!agentId) {
        return jsonResponse({ error: "Agent ID is required" }, 400);
      }

      // Delete agent with ownership check
      await db
        .delete(agents)
        .where(and(eq(agents.id, agentId), eq(agents.userId, userId)));

      return jsonResponse({ success: true });
    }

    default:
      return jsonResponse({ error: "Invalid intent" }, 400);
  }
}
