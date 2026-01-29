import { Pencil, Play, Trash2 } from "lucide-react";
import type { Agent } from "~/db";
import { Button } from "~/components/ui/button";
import { ResourceCard } from "./resource-card";
import { AgentFormDialog } from "./agent-form-dialog";
import { AgentDeleteDialog } from "./agent-delete-dialog";

interface AgentCardProps {
  agent: Pick<Agent, "id" | "name" | "instructions" | "updatedAt"> & {
    model?: string | null;
  };
  configuredProviders: string[];
  onTest?: () => void;
}

export function AgentCard({ agent, configuredProviders, onTest }: AgentCardProps) {
  return (
    <ResourceCard
      title={agent.name}
      updatedAt={agent.updatedAt}
      description={agent.instructions}
      actions={
        <>
          {onTest && (
            <Button variant="outline" size="sm" onClick={onTest}>
              <Play className="mr-2 size-4" />
              Test
            </Button>
          )}
          <AgentFormDialog
            agent={agent}
            configuredProviders={configuredProviders}
            trigger={
              <Button variant="outline" size="sm">
                <Pencil className="mr-2 size-4" />
                Edit
              </Button>
            }
          />
          <AgentDeleteDialog
            agent={agent}
            trigger={
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="mr-2 size-4" />
                Delete
              </Button>
            }
          />
        </>
      }
    />
  );
}
