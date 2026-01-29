import { Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { ResourceCard } from "./resource-card";
import { PipelineDeleteDialog } from "./pipeline-delete-dialog";

interface PipelineCardProps {
  pipeline: {
    id: string;
    name: string;
    description: string | null;
    updatedAt: Date | string;
  };
}

export function PipelineCard({ pipeline }: PipelineCardProps) {
  return (
    <ResourceCard
      title={pipeline.name}
      updatedAt={pipeline.updatedAt}
      description={pipeline.description ?? "No description"}
      titleHref={`/pipelines/${pipeline.id}`}
      actions={
        <PipelineDeleteDialog
          pipeline={pipeline}
          trigger={
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
              <Trash2 className="mr-2 size-4" />
              Delete
            </Button>
          }
        />
      }
    />
  );
}
