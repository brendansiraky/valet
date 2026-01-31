import { ArrowDown, Play, Flag, Bot } from "lucide-react";
import { cn } from "~/lib/utils";
import {
  useSelectedPipelineAgentTraitRelationships,
  type ConnectedTrait,
} from "~/hooks/selectors/useSelectedPipelineAgentTraitRelationships";

interface AgentStep {
  agentId: string;
  agentName: string;
  agentInstructions?: string;
}

interface FlowPreviewProps {
  steps: AgentStep[];
  className?: string;
}

/**
 * Visual preview of pipeline execution flow.
 * Shows agents in execution order.
 */
export function FlowPreview({ steps, className }: FlowPreviewProps) {
  const agentTraitRelationships = useSelectedPipelineAgentTraitRelationships();

  // Create lookup: agentId -> connected traits
  const traitsByAgentId = new Map(
    agentTraitRelationships.map((r) => [r.agentId, r.connectedTraits])
  );

  if (steps.length === 0) {
    return (
      <div className={cn("text-center py-6 text-muted-foreground", className)}>
        <p className="text-sm">No agents in this pipeline</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-0", className)}>
      {/* Input indicator */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
        <Play className="size-4 text-primary" />
        <span className="text-sm font-medium text-primary">Your Input</span>
      </div>

      {steps.map((step, index) => (
        <div key={step.agentId}>
          {/* Arrow connector */}
          <div className="flex justify-center py-1">
            <ArrowDown className="size-4 text-muted-foreground" />
          </div>

          {/* Agent step card */}
          <AgentStepCard
            step={step}
            stepNumber={index + 1}
            traits={traitsByAgentId.get(step.agentId) ?? []}
          />
        </div>
      ))}

      {/* Arrow to output */}
      <div className="flex justify-center py-1">
        <ArrowDown className="size-4 text-muted-foreground" />
      </div>

      {/* Output indicator */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
        <Flag className="size-4 text-green-600 dark:text-green-400" />
        <span className="text-sm font-medium text-green-600 dark:text-green-400">
          Final Output
        </span>
      </div>
    </div>
  );
}

function AgentStepCard({
  step,
  stepNumber,
  traits,
}: {
  step: AgentStep;
  stepNumber: number;
  traits: ConnectedTrait[];
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-start gap-3">
        {/* Step number badge */}
        <div className="flex-shrink-0 size-6 rounded-full bg-muted flex items-center justify-center">
          <span className="text-xs font-medium">{stepNumber}</span>
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Agent name */}
          <div className="flex items-center gap-2">
            <Bot className="size-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium text-sm truncate">{step.agentName}</span>
          </div>

          {/* Agent instructions (truncated) */}
          {step.agentInstructions && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {step.agentInstructions}
            </p>
          )}

          {/* Connected traits */}
          {traits.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {traits.map((trait) => (
                <span
                  key={trait.traitId}
                  className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                  style={{
                    backgroundColor: `color-mix(in oklch, ${trait.traitColor} 20%, transparent)`,
                    color: trait.traitColor,
                  }}
                >
                  {trait.traitName}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
