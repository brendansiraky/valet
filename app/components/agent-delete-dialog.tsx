import { useState, type ReactNode } from "react";
import type { Agent } from "~/db";
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
import { useDeleteAgent } from "~/hooks/queries/useAgents";

interface AgentDeleteDialogProps {
  agent: Pick<Agent, "id" | "name">;
  trigger: ReactNode;
}

export function AgentDeleteDialog({ agent, trigger }: AgentDeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const deleteMutation = useDeleteAgent();

  const handleDelete = () => {
    // Close immediately - optimistic update handles the UI
    setOpen(false);
    deleteMutation.mutate({ agentId: agent.id });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete agent?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete "{agent.name}". This action cannot be undone.
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
