import { type ReactNode } from "react";
import { Form } from "react-router";
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

interface TraitDeleteDialogProps {
  trait: Pick<Trait, "id" | "name">;
  trigger: ReactNode;
}

export function TraitDeleteDialog({ trait, trigger }: TraitDeleteDialogProps) {
  return (
    <AlertDialog>
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
          <Form method="post">
            <input type="hidden" name="intent" value="delete" />
            <input type="hidden" name="traitId" value={trait.id} />
            <AlertDialogAction type="submit" variant="destructive">
              Delete
            </AlertDialogAction>
          </Form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
