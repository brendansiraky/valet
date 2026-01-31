import { useState } from "react";
import { useFetcher } from "react-router";
import type { Agent } from "~/db/schema/agents";
import type { AgentRunResult } from "~/services/agent-runner.server";
import { ALL_MODELS } from "~/lib/models";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { Loader2, ExternalLink } from "lucide-react";

interface AgentTestDialogProps {
  agent: Pick<Agent, "id" | "name">;
  traits: Array<{ id: string; name: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgentTestDialog({
  agent,
  traits,
  open,
  onOpenChange,
}: AgentTestDialogProps) {
  const [input, setInput] = useState("");
  const [selectedTraitIds, setSelectedTraitIds] = useState<string[]>([]);
  const fetcher = useFetcher<AgentRunResult>();

  const isLoading = fetcher.state === "submitting";
  const result = fetcher.data;

  function handleSubmit() {
    if (!input.trim() || isLoading) return;

    fetcher.submit(
      { input: input.trim(), traitIds: selectedTraitIds },
      {
        method: "POST",
        action: `/api/agent/${agent.id}/run`,
        encType: "application/json",
      }
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Test Agent: {agent.name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          {/* Input Section */}
          <div className="space-y-2">
            <Label htmlFor="input">Test input</Label>
            <Textarea
              id="input"
              placeholder="Enter your test input..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[100px] resize-none"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Press Cmd+Enter to run. The agent can search the web or fetch URLs based on your input.
            </p>
          </div>

          {/* Trait Picker */}
          {traits.length > 0 && (
            <div className="space-y-2">
              <Label>Test with traits (optional)</Label>
              <div className="max-h-32 overflow-y-auto space-y-2 border rounded-md p-3">
                {traits.map((trait) => (
                  <div key={trait.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`test-trait-${trait.id}`}
                      checked={selectedTraitIds.includes(trait.id)}
                      disabled={isLoading}
                      onCheckedChange={(checked) => {
                        setSelectedTraitIds((prev) =>
                          checked ? [...prev, trait.id] : prev.filter((id) => id !== trait.id)
                        );
                      }}
                    />
                    <label
                      htmlFor={`test-trait-${trait.id}`}
                      className={`text-sm select-none ${isLoading ? "text-muted-foreground" : "cursor-pointer"}`}
                    >
                      {trait.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              "Run Agent"
            )}
          </Button>

          {/* Results Section */}
          {result && (
            <div className="flex-1 overflow-auto border rounded-lg p-4 space-y-4">
              {result.success ? (
                <>
                  {/* Content */}
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap">{result.content}</div>
                  </div>

                  {/* Citations */}
                  {result.citations && result.citations.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium mb-2">Citations</h4>
                      <ul className="space-y-1">
                        {result.citations.map((citation, idx) => (
                          <li key={idx}>
                            <a
                              href={citation.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                            >
                              {citation.title || citation.url}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Model & Token Usage */}
                  {(result.model || result.usage) && (
                    <div className="border-t pt-3 space-y-1">
                      {result.model && (
                        <p className="text-xs text-muted-foreground">
                          Model: {ALL_MODELS.find((m) => m.id === result.model)?.name ?? result.model}
                        </p>
                      )}
                      {result.usage && (
                        <p className="text-xs text-muted-foreground">
                          Tokens: {result.usage.inputTokens} input /{" "}
                          {result.usage.outputTokens} output
                        </p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-destructive">
                  <p className="font-medium">Error</p>
                  <p className="text-sm">{result.error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
