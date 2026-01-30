import { useState } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { getSession } from "~/services/session.server";
import { db, users } from "~/db";
import type { Agent } from "~/db/schema/agents";
import { eq } from "drizzle-orm";
import { Plus, Loader2, AlertCircle } from "lucide-react";
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
import { useAgents } from "~/hooks/queries/useAgents";

// Minimal loader for authentication only - data fetched via TanStack Query
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

  return null;
}

type TestableAgent = Pick<Agent, "id" | "name">;

export default function Agents() {
  const agentsQuery = useAgents();
  const [testingAgent, setTestingAgent] = useState<TestableAgent | null>(null);

  // Loading state
  if (agentsQuery.isPending) {
    return (
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">My Agents</h1>
            <p className="text-muted-foreground">
              Create and manage your AI agents
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Error state
  if (agentsQuery.isError) {
    return (
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">My Agents</h1>
            <p className="text-muted-foreground">
              Create and manage your AI agents
            </p>
          </div>
        </div>
        <Card className="mx-auto max-w-md border-destructive">
          <CardHeader className="text-center">
            <AlertCircle className="mx-auto size-10 text-destructive" />
            <CardTitle>Failed to load agents</CardTitle>
            <CardDescription>
              {agentsQuery.error.message}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => agentsQuery.refetch()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state - data is guaranteed to exist after isSuccess check
  const { agents: userAgents, traits: userTraits, configuredProviders } = agentsQuery.data;

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
