import { useEffect, useState, type ReactNode } from "react";
import { useFetcher } from "react-router";
import type { Agent } from "~/db";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Checkbox } from "~/components/ui/checkbox";
import { AVAILABLE_MODELS } from "~/lib/models";

interface AgentFormDialogProps {
  agent?: Pick<Agent, "id" | "name" | "instructions"> & {
    model?: string | null;
    traitIds?: string[];
  };
  traits?: Array<{ id: string; name: string }>;
  trigger: ReactNode;
}

interface ActionData {
  success?: boolean;
  errors?: {
    name?: string[];
    instructions?: string[];
  };
}

export function AgentFormDialog({ agent, traits, trigger }: AgentFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedTraitIds, setSelectedTraitIds] = useState<string[]>([]);
  const fetcher = useFetcher<ActionData>();
  const isEditing = !!agent;
  const isSubmitting = fetcher.state !== "idle";

  // Close dialog on successful submission
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      setOpen(false);
    }
  }, [fetcher.state, fetcher.data]);

  // Initialize selectedTraitIds from agent when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedTraitIds(agent?.traitIds ?? []);
    }
  }, [open, agent?.traitIds]);

  // Reset form when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Agent" : "Create Agent"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your agent's name and instructions."
              : "Create a new agent with a name and instructions that define its behavior."}
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
            <Label htmlFor="instructions">Instructions</Label>
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
              Define how this agent should behave. Be specific about its role, tone, and any constraints.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select name="model" defaultValue={agent?.model ?? "__default__"}>
              <SelectTrigger id="model" className="w-full">
                <SelectValue placeholder="Use default from settings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__default__">Use default from settings</SelectItem>
                {AVAILABLE_MODELS.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Override the default model for this agent.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Traits</Label>
            <div className="max-h-40 overflow-y-auto space-y-2 border rounded-md p-3">
              {(!traits || traits.length === 0) ? (
                <p className="text-sm text-muted-foreground">
                  No traits available. Create traits in the Traits library.
                </p>
              ) : (
                traits.map((trait) => (
                  <div key={trait.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`trait-${trait.id}`}
                      checked={selectedTraitIds.includes(trait.id)}
                      onCheckedChange={(checked) => {
                        setSelectedTraitIds((prev) =>
                          checked
                            ? [...prev, trait.id]
                            : prev.filter((id) => id !== trait.id)
                        );
                      }}
                    />
                    <label
                      htmlFor={`trait-${trait.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {trait.name}
                    </label>
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Assign traits to include their context in the agent's prompt.
            </p>
          </div>

          <input type="hidden" name="traitsUpdated" value="true" />
          {selectedTraitIds.map((id) => (
            <input key={id} type="hidden" name="traitIds" value={id} />
          ))}

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
