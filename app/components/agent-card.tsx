import { Pencil, Play, Trash2 } from "lucide-react";
import type { Agent } from "~/db";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { AgentFormDialog } from "./agent-form-dialog";
import { AgentDeleteDialog } from "./agent-delete-dialog";

interface AgentCardProps {
  agent: Pick<Agent, "id" | "name" | "instructions"> & {
    model?: string | null;
  };
  configuredProviders: string[];
  onTest?: () => void;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

export function AgentCard({ agent, configuredProviders, onTest }: AgentCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">{agent.name}</CardTitle>
        <div className="flex gap-1">
          {onTest && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onTest}>
              <Play className="size-4" />
              <span className="sr-only">Test {agent.name}</span>
            </Button>
          )}
          <AgentFormDialog
            agent={agent}
            configuredProviders={configuredProviders}
            trigger={
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Pencil className="size-4" />
                <span className="sr-only">Edit {agent.name}</span>
              </Button>
            }
          />
          <AgentDeleteDialog
            agent={agent}
            trigger={
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                <Trash2 className="size-4" />
                <span className="sr-only">Delete {agent.name}</span>
              </Button>
            }
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="text-sm text-muted-foreground">
          {truncateText(agent.instructions, 100)}
        </p>
      </CardContent>
    </Card>
  );
}
