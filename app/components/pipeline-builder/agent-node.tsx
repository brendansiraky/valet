import { memo, useState } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { Unplug } from "lucide-react";
import { cn } from "~/lib/utils";
import type { AgentNodeData } from "~/stores/pipeline-store";
import { usePipelineStore } from "~/stores/pipeline-store";
import { TraitChip } from "./trait-chip";
import { useTraitsContext } from "./traits-context";

// Define the full node type for React Flow
type AgentNodeType = Node<AgentNodeData, "agent">;

// Custom React Flow node for displaying agents in the pipeline canvas
export const AgentNode = memo(
  ({ id, data, selected }: NodeProps<AgentNodeType>) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const traitsMap = useTraitsContext();
    const { addTraitToNode, removeTraitFromNode } = usePipelineStore();

    const handleDragOver = (e: React.DragEvent) => {
      // Only accept trait drops (not agent drops)
      if (e.dataTransfer.types.includes("application/trait-id")) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setIsDragOver(true);
      }
    };

    const handleDragLeave = () => {
      setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const traitId = e.dataTransfer.getData("application/trait-id");
      if (traitId) {
        addTraitToNode(id, traitId);
      }
    };

    const handleRemoveTrait = (traitId: string) => {
      removeTraitFromNode(id, traitId);
    };

    // Get trait data for each traitId
    const assignedTraits = (data.traitIds || [])
      .map((traitId) => traitsMap.get(traitId))
      .filter((trait): trait is NonNullable<typeof trait> => trait != null);

    return (
      <Card
        className={cn(
          "w-[250px] py-0",
          selected && "ring-2 ring-primary",
          isDragOver && "ring-2 ring-primary/50 bg-primary/5",
          data.isOrphaned && "opacity-70 border-destructive/50 bg-destructive/5"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Handle
          type="target"
          position={Position.Left}
          className="!bg-muted-foreground !w-3 !h-3"
        />
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {data.isOrphaned && (
              <Unplug className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
            )}
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
        {assignedTraits.length > 0 && (
          <CardContent className="py-2 px-4 pt-0">
            <div className="flex flex-wrap gap-1">
              {assignedTraits.map((trait) => (
                <TraitChip
                  key={trait.id}
                  id={trait.id}
                  name={trait.name}
                  color={trait.color}
                  onRemove={handleRemoveTrait}
                />
              ))}
            </div>
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
