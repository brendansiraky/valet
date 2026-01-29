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
  agent: Pick<Agent, "id" | "name" | "instructions" | "updatedAt"> & {
    model?: string | null;
    traitIds?: string[];
  };
  traits?: Array<{ id: string; name: string }>;
  configuredProviders: string[];
  onTest?: () => void;
}

function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 0) {
    return diffDay === 1 ? "1 day ago" : `${diffDay} days ago`;
  }
  if (diffHour > 0) {
    return diffHour === 1 ? "1 hour ago" : `${diffHour} hours ago`;
  }
  if (diffMin > 0) {
    return diffMin === 1 ? "1 minute ago" : `${diffMin} minutes ago`;
  }
  return "just now";
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

export function AgentCard({ agent, traits, configuredProviders, onTest }: AgentCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">{agent.name}</CardTitle>
        <div className="flex gap-1">
          {onTest && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onTest}>
              <Play className="h-4 w-4" />
              <span className="sr-only">Test {agent.name}</span>
            </Button>
          )}
          <AgentFormDialog
            agent={agent}
            traits={traits}
            configuredProviders={configuredProviders}
            trigger={
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit {agent.name}</span>
              </Button>
            }
          />
          <AgentDeleteDialog
            agent={agent}
            trigger={
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
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
      <div className="px-6 pb-4">
        <p className="text-xs text-muted-foreground">
          Updated {formatRelativeTime(agent.updatedAt)}
        </p>
      </div>
    </Card>
  );
}
