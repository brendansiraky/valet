import { useState, type ReactNode, type FormEvent } from "react";
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
import { ColorSwatchPicker } from "./color-swatch-picker";
import { TRAIT_COLORS, DEFAULT_TRAIT_COLOR } from "~/lib/trait-colors";
import { useCreateTrait, useUpdateTrait } from "~/hooks/queries/use-traits";

interface TraitFormDialogProps {
  trait?: Pick<Trait, "id" | "name" | "context" | "color">;
  trigger: ReactNode;
}

export function TraitFormDialog({ trait, trigger }: TraitFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState(trait?.color ?? DEFAULT_TRAIT_COLOR);

  const createMutation = useCreateTrait();
  const updateMutation = useUpdateTrait();

  const isEditing = !!trait;
  const mutation = isEditing ? updateMutation : createMutation;

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset color to trait's color (or default) when dialog closes
      setColor(trait?.color ?? DEFAULT_TRAIT_COLOR);
      mutation.reset();
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const context = formData.get("context") as string;

    if (isEditing) {
      updateMutation.mutate({ traitId: trait.id, name, context, color });
    } else {
      createMutation.mutate({ name, context, color });
    }

    setOpen(false);
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={trait?.name ?? ""}
              placeholder="Expert Writer"
              maxLength={100}
              required
            />
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
            />
            <p className="text-xs text-muted-foreground">
              Define reusable context like expertise, tone, or constraints that can be applied to multiple agents.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <ColorSwatchPicker
              value={color}
              onChange={setColor}
              colors={TRAIT_COLORS}
            />
          </div>

          <DialogFooter>
            <Button type="submit">
              {isEditing ? "Save Changes" : "Create Trait"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
