import { useMemo, useEffect } from "react";
import { useRunStream, type RunStreamState } from "./use-run-stream";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { Badge } from "~/components/ui/badge";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Loader2, CheckCircle2, XCircle, Circle } from "lucide-react";
import { calculateCost, formatCost, formatTokens } from "~/lib/pricing";

interface RunProgressProps {
  runId: string | null;
  steps: Array<{ agentId: string; agentName: string }>;
  onComplete?: (
    finalOutput: string,
    stepOutputs: Map<number, string>,
    usage: { inputTokens: number; outputTokens: number } | null,
    model: string | null
  ) => void;
  onError?: (error: string) => void;
}

/**
 * Real-time pipeline execution progress display.
 * Shows step-by-step status, streaming text output, and error messages.
 */
export function RunProgress({
  runId,
  steps,
  onComplete,
  onError,
}: RunProgressProps) {
  const {
    status,
    currentStep,
    currentAgentName,
    streamingText,
    stepOutputs,
    finalOutput,
    error,
    usage,
    model,
  } = useRunStream(runId);

  // Calculate progress percentage
  const progress = useMemo(() => {
    if (status === "completed") return 100;
    if (status === "idle" || status === "connecting") return 0;
    if (steps.length === 0) return 0;
    return Math.round((stepOutputs.size / steps.length) * 100);
  }, [status, stepOutputs.size, steps.length]);

  // Notify on completion/error
  useEffect(() => {
    if (status === "completed" && finalOutput && onComplete) {
      onComplete(finalOutput, stepOutputs, usage, model);
    }
    if (status === "failed" && error && onError) {
      onError(error);
    }
  }, [status, finalOutput, stepOutputs, usage, model, error, onComplete, onError]);

  if (!runId) return null;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Pipeline Execution</CardTitle>
          <StatusBadge status={status} />
        </div>
        <Progress value={progress} className="mt-2" />
      </CardHeader>
      <CardContent>
        {/* Step list */}
        <div className="space-y-2 mb-4">
          {steps.map((step, index) => (
            <StepRow
              key={step.agentId}
              index={index}
              agentName={step.agentName}
              status={getStepStatus(index, currentStep, stepOutputs, status)}
              isCurrent={index === currentStep}
            />
          ))}
        </div>

        {/* Streaming output */}
        {status === "running" && streamingText && (
          <div className="border rounded-lg p-3 bg-muted/50">
            <p className="text-sm font-medium mb-2">
              {currentAgentName} is responding...
            </p>
            <ScrollArea className="h-48">
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {streamingText}
              </pre>
            </ScrollArea>
          </div>
        )}

        {/* Error display */}
        {status === "failed" && error && (
          <div className="border border-destructive rounded-lg p-3 bg-destructive/10">
            <p className="text-sm font-medium text-destructive">Error</p>
            <p className="text-sm text-destructive/80">{error}</p>
          </div>
        )}

        {/* Completion message and usage summary */}
        {status === "completed" && (
          <div className="space-y-3">
            <div className="border border-green-500 rounded-lg p-3 bg-green-500/10">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                Pipeline completed successfully
              </p>
            </div>
            {usage && model && (
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="text-sm font-medium mb-2">Usage Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Input tokens:</span>
                    <span className="ml-2 font-mono">{formatTokens(usage.inputTokens)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Output tokens:</span>
                    <span className="ml-2 font-mono">{formatTokens(usage.outputTokens)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Estimated cost:</span>
                    <span className="ml-2 font-medium">
                      {formatCost(calculateCost(model, usage.inputTokens, usage.outputTokens))}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper components
function StatusBadge({ status }: { status: RunStreamState["status"] }) {
  const variants: Record<
    string,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
  > = {
    idle: { label: "Idle", variant: "outline" },
    connecting: { label: "Connecting...", variant: "secondary" },
    running: { label: "Running", variant: "default" },
    completed: { label: "Completed", variant: "default" },
    failed: { label: "Failed", variant: "destructive" },
  };
  const { label, variant } = variants[status] || variants.idle;
  return <Badge variant={variant}>{label}</Badge>;
}

function StepRow({
  index,
  agentName,
  status,
  isCurrent,
}: {
  index: number;
  agentName: string;
  status: "pending" | "running" | "completed" | "failed";
  isCurrent: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 p-2 rounded ${isCurrent ? "bg-muted" : ""}`}
    >
      {status === "pending" && (
        <Circle className="w-4 h-4 text-muted-foreground" />
      )}
      {status === "running" && (
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
      )}
      {status === "completed" && (
        <CheckCircle2 className="w-4 h-4 text-green-500" />
      )}
      {status === "failed" && <XCircle className="w-4 h-4 text-destructive" />}
      <span className="text-sm">
        {index + 1}. {agentName}
      </span>
    </div>
  );
}

function getStepStatus(
  index: number,
  currentStep: number,
  stepOutputs: Map<number, string>,
  runStatus: RunStreamState["status"]
): "pending" | "running" | "completed" | "failed" {
  if (stepOutputs.has(index)) return "completed";
  if (index === currentStep) {
    return runStatus === "failed" ? "failed" : "running";
  }
  return "pending";
}
