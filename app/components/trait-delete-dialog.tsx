import { useState, type ReactNode } from "react";
import type { Trait } from "~/db";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { useDeleteTrait } from "~/hooks/queries/use-traits";

interface TraitDeleteDialogProps {
  trait: Pick<Trait, "id" | "name">;
  trigger: ReactNode;
}

export function TraitDeleteDialog({ trait, trigger }: TraitDeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const deleteMutation = useDeleteTrait();

  const handleDelete = () => {
    deleteMutation.mutate(
      { traitId: trait.id },
      {
        onSuccess: () => {
          setOpen(false);
        },
      }
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete trait?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete "{trait.name}". This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            variant="destructive"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
