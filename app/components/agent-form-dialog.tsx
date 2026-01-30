import { useState, type ReactNode, type FormEvent } from "react";
import type { Agent } from "~/db";
import { Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "~/components/ui/tooltip";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { ModelSelector } from "~/components/model-selector";
import { useCreateAgent, useUpdateAgent } from "~/hooks/queries/useAgents";

interface AgentFormDialogProps {
  agent?: Pick<Agent, "id" | "name" | "instructions"> & {
    model?: string | null;
  };
  configuredProviders: string[];
  trigger: ReactNode;
}

interface MutationError extends Error {
  data?: {
    errors?: {
      name?: string[];
      instructions?: string[];
    };
  };
}

export function AgentFormDialog({ agent, configuredProviders, trigger }: AgentFormDialogProps) {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateAgent();
  const updateMutation = useUpdateAgent();

  const isEditing = !!agent;
  const mutation = isEditing ? updateMutation : createMutation;
  const isSubmitting = mutation.isPending;

  // Extract validation errors from mutation error
  const mutationError = mutation.error as MutationError | null;
  const errors = mutationError?.data?.errors;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const name = formData.get("name") as string;
    const instructions = formData.get("instructions") as string;
    const model = formData.get("model") as string | undefined;

    if (isEditing) {
      updateMutation.mutate(
        {
          agentId: agent.id,
          name,
          instructions,
          model,
        },
        {
          onSuccess: () => {
            setOpen(false);
            mutation.reset();
          },
        }
      );
    } else {
      createMutation.mutate(
        {
          name,
          instructions,
          model,
        },
        {
          onSuccess: () => {
            setOpen(false);
            mutation.reset();
          },
        }
      );
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      mutation.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Agent" : "Create Agent"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your agent's name and DNA."
              : "Create a new agent with a name and DNA that define its behavior."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={agent?.name ?? ""}
              placeholder="My Assistant"
              maxLength={100}
              required
              aria-invalid={!!errors?.name}
              aria-describedby={errors?.name ? "name-error" : undefined}
            />
            {errors?.name && (
              <p id="name-error" className="text-sm text-destructive">
                {errors.name[0]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="instructions">DNA</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="inline-flex">
                    <Info className="size-4 text-muted-foreground" />
                    <span className="sr-only">What is DNA?</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[240px]">
                  Your agent's DNA defines its core personality and behavior -
                  the fundamental instructions that shape how it thinks and responds.
                </TooltipContent>
              </Tooltip>
            </div>
            <Textarea
              id="instructions"
              name="instructions"
              defaultValue={agent?.instructions ?? ""}
              placeholder="You are a helpful assistant that..."
              maxLength={10000}
              required
              rows={6}
              aria-invalid={!!errors?.instructions}
              aria-describedby={errors?.instructions ? "instructions-error" : undefined}
            />
            {errors?.instructions && (
              <p id="instructions-error" className="text-sm text-destructive">
                {errors.instructions[0]}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Define the core personality and behavior of your agent.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <ModelSelector
              name="model"
              defaultValue={agent?.model ?? "__default__"}
              configuredProviders={configuredProviders}
            />
            <p className="text-xs text-muted-foreground">
              Override the default model for this agent.
            </p>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Create Agent"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
