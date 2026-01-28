import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import type { AgentNodeData } from "~/stores/pipeline-store";

// Define the full node type for React Flow
type AgentNodeType = Node<AgentNodeData, "agent">;

// Custom React Flow node for displaying agents in the pipeline canvas
export const AgentNode = memo(
  ({ data, selected }: NodeProps<AgentNodeType>) => {
    return (
      <Card
        className={`w-[250px] py-0 ${selected ? "ring-2 ring-primary" : ""}`}
      >
        <Handle
          type="target"
          position={Position.Left}
          className="!bg-muted-foreground !w-3 !h-3"
        />
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium">
            {data.agentName}
          </CardTitle>
        </CardHeader>
        {data.agentInstructions && (
          <CardContent className="py-2 px-4 pt-0">
            <p className="text-xs text-muted-foreground line-clamp-2">
              {data.agentInstructions}
            </p>
          </CardContent>
        )}
        <Handle
          type="source"
          position={Position.Right}
          className="!bg-muted-foreground !w-3 !h-3"
        />
      </Card>
    );
  }
);

AgentNode.displayName = "AgentNode";
