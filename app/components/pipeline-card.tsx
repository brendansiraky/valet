import { Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router";
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
      actions={
        <>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/pipelines/${pipeline.id}`}>
              <Pencil className="mr-2 size-4" />
              Edit
            </Link>
          </Button>
          <PipelineDeleteDialog
            pipeline={pipeline}
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
