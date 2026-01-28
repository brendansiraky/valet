import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect, useLoaderData, data } from "react-router";
import { z } from "zod";
import { getSession } from "~/services/session.server";
import { db, users, agents } from "~/db";
import type { Agent } from "~/db/schema/agents";
import { eq, and, desc } from "drizzle-orm";
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

  // Query agents for this user, ordered by updatedAt desc
  const userAgents = await db.query.agents.findMany({
    where: eq(agents.userId, userId),
    orderBy: [desc(agents.updatedAt)],
    columns: {
      id: true,
      name: true,
      instructions: true,
      updatedAt: true,
    },
  });

  return { agents: userAgents };
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
    const result = AgentSchema.safeParse({
      name: formData.get("name"),
      instructions: formData.get("instructions"),
    });

    if (!result.success) {
      return data(
        { errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    await db.insert(agents).values({
      userId,
      name: result.data.name,
      instructions: result.data.instructions,
    });

    return { success: true };
  }

  if (intent === "update") {
    const agentId = formData.get("agentId") as string;
    const result = AgentSchema.safeParse({
      name: formData.get("name"),
      instructions: formData.get("instructions"),
    });

    if (!result.success) {
      return data(
        { errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Update agent with ownership check
    await db
      .update(agents)
      .set({
        name: result.data.name,
        instructions: result.data.instructions,
      })
      .where(and(eq(agents.id, agentId), eq(agents.userId, userId)));

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
  const { agents: userAgents } = useLoaderData<typeof loader>();
  const [testingAgent, setTestingAgent] = useState<TestableAgent | null>(null);

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Agents</h1>
            <p className="text-muted-foreground">
              Create and manage your AI agents
            </p>
          </div>
          <AgentFormDialog
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
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
                trigger={
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
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
                onTest={() => setTestingAgent({ id: agent.id, name: agent.name })}
              />
            ))}
          </div>
        )}

        {/* Test Dialog */}
        {testingAgent && (
          <AgentTestDialog
            agent={testingAgent}
            open={!!testingAgent}
            onOpenChange={(open) => !open && setTestingAgent(null)}
          />
        )}
      </div>
    </div>
  );
}
