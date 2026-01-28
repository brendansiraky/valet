import { useEffect, useState, type ReactNode } from "react";
import { useFetcher } from "react-router";
import type { Trait } from "~/db";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

interface TraitFormDialogProps {
  trait?: Pick<Trait, "id" | "name" | "context">;
  trigger: ReactNode;
}

interface ActionData {
  success?: boolean;
  errors?: {
    name?: string[];
    context?: string[];
  };
}

export function TraitFormDialog({ trait, trigger }: TraitFormDialogProps) {
  const [open, setOpen] = useState(false);
  const fetcher = useFetcher<ActionData>();
  const isEditing = !!trait;
  const isSubmitting = fetcher.state !== "idle";

  // Close dialog on successful submission
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      setOpen(false);
    }
  }, [fetcher.state, fetcher.data]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Trait" : "Create Trait"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your trait's name and context."
              : "Create a reusable context snippet that can be attached to agents."}
          </DialogDescription>
        </DialogHeader>
        <fetcher.Form method="post" className="space-y-4">
          <input type="hidden" name="intent" value={isEditing ? "update" : "create"} />
          {isEditing && <input type="hidden" name="traitId" value={trait.id} />}

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={trait?.name ?? ""}
              placeholder="Expert Writer"
              maxLength={100}
              required
              aria-invalid={!!fetcher.data?.errors?.name}
              aria-describedby={fetcher.data?.errors?.name ? "name-error" : undefined}
            />
            {fetcher.data?.errors?.name && (
              <p id="name-error" className="text-sm text-destructive">
                {fetcher.data.errors.name[0]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">Context</Label>
            <Textarea
              id="context"
              name="context"
              defaultValue={trait?.context ?? ""}
              placeholder="Enter reusable context that can be attached to agents..."
              maxLength={50000}
              required
              rows={6}
              aria-invalid={!!fetcher.data?.errors?.context}
              aria-describedby={fetcher.data?.errors?.context ? "context-error" : undefined}
            />
            {fetcher.data?.errors?.context && (
              <p id="context-error" className="text-sm text-destructive">
                {fetcher.data.errors.context[0]}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Define reusable context like expertise, tone, or constraints that can be applied to multiple agents.
            </p>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Create Trait"}
            </Button>
          </DialogFooter>
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}
