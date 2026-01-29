import type { ReactNode } from "react";
import { useFetcher } from "react-router";
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

interface AgentFormDialogProps {
  agent?: Pick<Agent, "id" | "name" | "instructions"> & {
    model?: string | null;
  };
  configuredProviders: string[];
  trigger: ReactNode;
}

interface ActionData {
  success?: boolean;
  errors?: {
    name?: string[];
    instructions?: string[];
  };
}

export function AgentFormDialog({ agent, configuredProviders, trigger }: AgentFormDialogProps) {
  const fetcher = useFetcher<ActionData>();
  const isEditing = !!agent;
  const isSubmitting = fetcher.state !== "idle";
  const isSuccess = fetcher.state === "idle" && fetcher.data?.success;

  return (
    <Dialog key={isSuccess ? "closed" : "open"}>
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
        <fetcher.Form method="post" className="space-y-4">
          <input type="hidden" name="intent" value={isEditing ? "update" : "create"} />
          {isEditing && <input type="hidden" name="agentId" value={agent.id} />}

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={agent?.name ?? ""}
              placeholder="My Assistant"
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
              aria-invalid={!!fetcher.data?.errors?.instructions}
              aria-describedby={fetcher.data?.errors?.instructions ? "instructions-error" : undefined}
            />
            {fetcher.data?.errors?.instructions && (
              <p id="instructions-error" className="text-sm text-destructive">
                {fetcher.data.errors.instructions[0]}
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
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}
