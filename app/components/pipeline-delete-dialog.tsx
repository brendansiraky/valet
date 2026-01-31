import { useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { useDeletePipeline } from "~/hooks/queries/use-pipelines";

interface PipelineDeleteDialogProps {
  pipeline: { id: string; name: string };
  trigger: ReactNode;
  onDeleted?: () => void;
}

export function PipelineDeleteDialog({ pipeline, trigger, onDeleted }: PipelineDeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const deleteMutation = useDeletePipeline();

  const handleDelete = () => {
    setOpen(false);
    deleteMutation.mutate(
      { id: pipeline.id },
      {
        onSuccess: () => {
          onDeleted?.();
        },
      }
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete pipeline?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete "{pipeline.name}". This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
