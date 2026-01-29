import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect, useLoaderData, data } from "react-router";
import { z } from "zod";
import { getSession } from "~/services/session.server";
import { db, users, agents, agentTraits, traits, apiKeys } from "~/db";
import type { Agent } from "~/db/schema/agents";
import { eq, and, asc } from "drizzle-orm";
import { Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { AgentCard } from "~/components/agent-card";
import { AgentFormDialog } from "~/components/agent-form-dialog";
import { AgentTestDialog } from "~/components/agent-test-dialog";

const AgentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  instructions: z.string().min(1, "Instructions are required").max(10000, "Instructions must be 10,000 characters or less"),
  model: z.string().optional().transform(val => (!val || val === "__default__") ? null : val),
});

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) {
    return redirect("/login");
  }

  // Verify user exists
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return redirect("/login");
  }

  // Query agents with their trait assignments
  const userAgents = await db.query.agents.findMany({
    where: eq(agents.userId, userId),
    orderBy: [asc(agents.name)],
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

  return { agents: agentsWithTraitIds, traits: userTraits, configuredProviders };
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) {
    return redirect("/login");
  }

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "create") {
    const traitIds = formData.getAll("traitIds") as string[];

    const result = AgentSchema.safeParse({
      name: formData.get("name"),
      instructions: formData.get("instructions"),
      model: formData.get("model"),
    });

    if (!result.success) {
      return data(
        { errors: result.error.flatten().fieldErrors },
        { status: 400 }
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

    return { success: true };
  }

  if (intent === "update") {
    const agentId = formData.get("agentId") as string;
    const traitsUpdated = formData.has("traitsUpdated");
    const traitIds = formData.getAll("traitIds") as string[];

    const result = AgentSchema.safeParse({
      name: formData.get("name"),
      instructions: formData.get("instructions"),
      model: formData.get("model"),
    });

    if (!result.success) {
      return data(
        { errors: result.error.flatten().fieldErrors },
        { status: 400 }
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

    return { success: true };
  }

  if (intent === "delete") {
    const agentId = formData.get("agentId") as string;

    // Delete agent with ownership check
    await db
      .delete(agents)
      .where(and(eq(agents.id, agentId), eq(agents.userId, userId)));

    return { success: true };
  }

  return null;
}

type TestableAgent = Pick<Agent, "id" | "name">;

export default function Agents() {
  const { agents: userAgents, traits: userTraits, configuredProviders } = useLoaderData<typeof loader>();
  const [testingAgent, setTestingAgent] = useState<TestableAgent | null>(null);

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">My Agents</h1>
          <p className="text-muted-foreground">
            Create and manage your AI agents
          </p>
        </div>
        <AgentFormDialog
          configuredProviders={configuredProviders}
          trigger={
            <Button>
              <Plus className="mr-2 size-4" />
              Create Agent
            </Button>
          }
        />
      </div>

      {/* Content */}
      {userAgents.length === 0 ? (
        <Card className="mx-auto max-w-md">
          <CardHeader className="text-center">
            <CardTitle>No agents yet</CardTitle>
            <CardDescription>
              Create your first agent to get started. Agents define how your AI assistants behave.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <AgentFormDialog
              configuredProviders={configuredProviders}
              trigger={
                <Button>
                  <Plus className="mr-2 size-4" />
                  Create Your First Agent
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {userAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              configuredProviders={configuredProviders}
              onTest={() => setTestingAgent({ id: agent.id, name: agent.name })}
            />
          ))}
        </div>
      )}

      {/* Test Dialog */}
      {testingAgent && (
        <AgentTestDialog
          agent={testingAgent}
          traits={userTraits}
          open={!!testingAgent}
          onOpenChange={(open) => !open && setTestingAgent(null)}
        />
      )}
    </div>
  );
}
