import { Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { ResourceCard } from "./resource-card";
import { PipelineDeleteDialog } from "./pipeline-delete-dialog";
import { useTabStore } from "~/stores/tab-store";

interface PipelineCardProps {
  pipeline: {
    id: string;
    name: string;
    description: string | null;
    updatedAt: Date | string;
  };
}

export function PipelineCard({ pipeline }: PipelineCardProps) {
  const navigate = useNavigate();
  const { focusOrOpenTab, canOpenNewTab, tabs } = useTabStore();

  const handleEdit = () => {
    // Check if already open
    const isAlreadyOpen = tabs.some((t) => t.pipelineId === pipeline.id);

    if (!isAlreadyOpen && !canOpenNewTab()) {
      toast.error("Maximum 8 tabs open. Close a tab to open another.");
      return;
    }

    focusOrOpenTab(pipeline.id, pipeline.name);
    navigate(`/pipelines/${pipeline.id}`);
  };

  return (
    <ResourceCard
      title={pipeline.name}
      updatedAt={pipeline.updatedAt}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={handleEdit}>
            <Pencil className="mr-2 size-4" />
            Edit
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
