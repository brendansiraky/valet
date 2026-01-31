import { useUser } from "~/contexts/user-context";
import { useSelectedPipeline } from "~/hooks/selectors/useSelectedPipeline";
import { useSelectedPipelineFlow } from "~/hooks/selectors/useSelectedPipelineFlow";
import { useSelectedPipelineAgentTraitRelationships } from "~/hooks/selectors/useSelectedPipelineAgentTraitRelationships";
import { useAgents } from "~/hooks/selectors/useAgents";
import { useTraits } from "~/hooks/selectors/useTraits";

export default function Dashboard() {
  const user = useUser();
  const selectedPipeline = useSelectedPipeline();
  const selectedPipelineFlow = useSelectedPipelineFlow();
  const agentTraitRelationships = useSelectedPipelineAgentTraitRelationships();
  const agents = useAgents();
  const traits = useTraits();

  console.log("selectedPipeline", selectedPipeline.data);
  console.log("selectedPipelineFlow", selectedPipelineFlow);
  console.log("agentTraitRelationships", agentTraitRelationships);
  console.log("agents", agents.data);
  console.log("traits", traits.data);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Welcome back!</h1>
        <p className="text-lg text-muted-foreground">
          You are signed in as {user.email}
        </p>
      </div>
    </div>
  );
}
