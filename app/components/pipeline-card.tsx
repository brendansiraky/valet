import { Trash2 } from "lucide-react";
import { Link } from "react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { PipelineDeleteDialog } from "./pipeline-delete-dialog";

interface PipelineCardProps {
  pipeline: {
    id: string;
    name: string;
    description: string | null;
  };
}

export function PipelineCard({ pipeline }: PipelineCardProps) {
  return (
    <Card className="hover:border-primary transition-colors h-full flex flex-col">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <Link to={`/pipelines/${pipeline.id}`} className="flex-1 min-w-0">
          <CardTitle className="text-base font-semibold">{pipeline.name}</CardTitle>
          {pipeline.description && (
            <CardDescription className="mt-1">{pipeline.description}</CardDescription>
          )}
        </Link>
        <PipelineDeleteDialog
          pipeline={pipeline}
          trigger={
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
              onClick={(e) => e.preventDefault()}
            >
              <Trash2 className="size-4" />
              <span className="sr-only">Delete {pipeline.name}</span>
            </Button>
          }
        />
      </CardHeader>
      <CardContent className="flex-1">
        <Link to={`/pipelines/${pipeline.id}`} className="block h-full" />
      </CardContent>
    </Card>
  );
}
