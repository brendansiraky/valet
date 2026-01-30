import { useState } from "react";
import type { Agent } from "~/db/schema/agents";
import { Plus, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { PageLayout } from "~/components/page-layout";
import { AgentCard } from "~/components/agent-card";
import { AgentCardSkeleton } from "~/components/agent-card-skeleton";
import { AgentFormDialog } from "~/components/agent-form-dialog";
import { AgentTestDialog } from "~/components/agent-test-dialog";
import { useAgents } from "~/hooks/queries/useAgents";

type TestableAgent = Pick<Agent, "id" | "name">;

export default function Agents() {
  const agentsQuery = useAgents();
  const [testingAgent, setTestingAgent] = useState<TestableAgent | null>(null);

  // Loading state
  if (agentsQuery.isPending) {
    return (
      <PageLayout
        title="My Agents"
        description="Create and manage your AI agents"
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <AgentCardSkeleton key={i} />
          ))}
        </div>
      </PageLayout>
    );
  }

  // Error state
  if (agentsQuery.isError) {
    return (
      <PageLayout
        title="My Agents"
        description="Create and manage your AI agents"
      >
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
      </PageLayout>
    );
  }

  // Success state - data is guaranteed to exist after isSuccess check
  const { agents: userAgents, traits: userTraits, configuredProviders } = agentsQuery.data;

  return (
    <PageLayout
      title="My Agents"
      description="Create and manage your AI agents"
      headerActions={
        <AgentFormDialog
          configuredProviders={configuredProviders}
          trigger={
            <Button>
              <Plus className="mr-2 size-4" />
              Create Agent
            </Button>
          }
        />
      }
    >
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

      {testingAgent && (
        <AgentTestDialog
          agent={testingAgent}
          traits={userTraits}
          open={!!testingAgent}
          onOpenChange={(open) => !open && setTestingAgent(null)}
        />
      )}
    </PageLayout>
  );
}
