import type { LoaderFunctionArgs } from "react-router";
import { Link, redirect, useLoaderData } from "react-router";
import { db, pipelineRuns, pipelines } from "~/db";
import { eq, and } from "drizzle-orm";
import { getSession } from "~/services/session.server";
import { Button } from "~/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { OutputViewer } from "~/components/output-viewer/output-viewer";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) {
    return redirect("/login");
  }

  const { id } = params;
  if (!id) {
    throw new Response("Not Found", { status: 404 });
  }

  // Get artifact with pipeline name
  const [result] = await db
    .select({
      id: pipelineRuns.id,
      pipelineId: pipelineRuns.pipelineId,
      status: pipelineRuns.status,
      input: pipelineRuns.input,
      finalOutput: pipelineRuns.finalOutput,
      artifactData: pipelineRuns.artifactData,
      model: pipelineRuns.model,
      inputTokens: pipelineRuns.inputTokens,
      outputTokens: pipelineRuns.outputTokens,
      cost: pipelineRuns.cost,
      completedAt: pipelineRuns.completedAt,
      pipelineName: pipelines.name,
    })
    .from(pipelineRuns)
    .innerJoin(pipelines, eq(pipelineRuns.pipelineId, pipelines.id))
    .where(
      and(
        eq(pipelineRuns.id, id),
        eq(pipelineRuns.userId, userId)
      )
    )
    .limit(1);

  if (!result) {
    throw new Response("Not Found", { status: 404 });
  }

  return { artifact: result };
}

function formatDate(date: Date | null): string {
  if (!date) return "Unknown date";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}

export default function ArtifactDetailPage() {
  const { artifact } = useLoaderData<typeof loader>();

  // Transform artifactData to OutputViewer format
  // Compute input for each step: step 0 input = run input, step N input = step N-1 output
  const artifactSteps = artifact.artifactData?.steps ?? [];
  const steps = artifactSteps.map((s, index) => ({
    agentName: s.agentName,
    output: s.output,
    input: index === 0
      ? (artifact.input ?? "")
      : (artifactSteps[index - 1]?.output ?? ""),
  }));
  const finalOutput = artifact.artifactData?.finalOutput ?? artifact.finalOutput ?? "";

  const usage =
    artifact.inputTokens !== null && artifact.outputTokens !== null
      ? { inputTokens: artifact.inputTokens, outputTokens: artifact.outputTokens }
      : null;

  return (
    <div className="container mx-auto py-8">
      {/* Back navigation */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/artifacts">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Artifacts
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{artifact.pipelineName}</h1>
        <p className="text-muted-foreground">
          Completed {formatDate(artifact.completedAt)}
        </p>
      </div>

      {/* Output viewer */}
      <OutputViewer
        steps={steps}
        finalOutput={finalOutput}
        pipelineName={artifact.pipelineName}
        usage={usage}
        model={artifact.model}
      />
    </div>
  );
}
