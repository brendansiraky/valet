import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import type { Agent } from "~/db/schema/agents";

interface AgentSidebarProps {
  agents: Agent[];
}

export function AgentSidebar({ agents }: AgentSidebarProps) {
  const onDragStart = (event: React.DragEvent, agent: Agent) => {
    event.dataTransfer.setData("application/agent-id", agent.id);
    event.dataTransfer.setData("application/agent-name", agent.name);
    event.dataTransfer.setData(
      "application/agent-instructions",
      agent.instructions || ""
    );
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="w-64 border-r bg-background p-4 overflow-y-auto">
      <h2 className="font-semibold mb-4">Your Agents</h2>
      {agents.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No agents yet. Create agents first.
        </p>
      ) : (
        <div className="space-y-2">
          {agents.map((agent) => (
            <Card
              key={agent.id}
              draggable
              onDragStart={(e) => onDragStart(e, agent)}
              className="cursor-grab active:cursor-grabbing hover:border-primary transition-colors py-0"
            >
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-sm">{agent.name}</CardTitle>
              </CardHeader>
              <CardContent className="py-1 px-3 pb-2">
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {agent.instructions}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
