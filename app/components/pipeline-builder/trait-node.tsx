import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Card, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import type { TraitNodeData } from "~/hooks/queries/use-pipelines";

type TraitNodeType = Node<TraitNodeData, "trait">;

export const TraitNode = memo(
  ({ data, selected }: NodeProps<TraitNodeType>) => {
    return (
      <Card
        className={cn(
          "w-[180px] py-0",
          selected && "ring-2 ring-primary"
        )}
        style={{ borderLeftWidth: "4px", borderLeftColor: data.traitColor }}
      >
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium">{data.traitName}</CardTitle>
        </CardHeader>
        {/* Source handle on the right - allows connecting to multiple agents */}
        <Handle
          type="source"
          position={Position.Right}
          className="!bg-muted-foreground !w-3 !h-3"
          isConnectable={true}
        />
      </Card>
    );
  }
);

TraitNode.displayName = "TraitNode";
