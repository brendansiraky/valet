import type { LoaderFunctionArgs } from "react-router";
import { Link, redirect, useLoaderData } from "react-router";
import { db, pipelineRuns, pipelines } from "~/db";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { getSession } from "~/services/session.server";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui/card";
import { FileText } from "lucide-react";
import { formatCost, formatTokens, calculateCost } from "~/lib/pricing";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) {
    return redirect("/login");
  }

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  // Get artifacts (completed pipeline runs) with pipeline name
  const artifacts = await db
    .select({
      id: pipelineRuns.id,
      pipelineName: pipelines.name,
      model: pipelineRuns.model,
      inputTokens: pipelineRuns.inputTokens,
      outputTokens: pipelineRuns.outputTokens,
      cost: pipelineRuns.cost,
      completedAt: pipelineRuns.completedAt,
    })
    .from(pipelineRuns)
    .innerJoin(pipelines, eq(pipelineRuns.pipelineId, pipelines.id))
    .where(
      and(
        eq(pipelineRuns.userId, userId),
        eq(pipelineRuns.status, "completed")
      )
    )
    .orderBy(desc(pipelineRuns.completedAt))
    .limit(pageSize)
    .offset(offset);

  // Get total count for pagination
  const [{ total }] = await db
    .select({ total: count() })
    .from(pipelineRuns)
    .where(
      and(
        eq(pipelineRuns.userId, userId),
        eq(pipelineRuns.status, "completed")
      )
    );

  return { artifacts, page, pageSize, totalCount: total };
}

function formatDate(date: Date | null): string {
  if (!date) return "Unknown date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}

export default function ArtifactsPage() {
  const { artifacts, page, pageSize, totalCount } = useLoaderData<typeof loader>();
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Artifacts</h1>
          <p className="text-muted-foreground">
            View past pipeline outputs
          </p>
        </div>
      </div>

      {artifacts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              No pipeline runs yet. Run a pipeline to see artifacts here.
            </p>
            <Button asChild>
              <Link to="/pipelines">Go to Pipelines</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {artifacts.map((artifact) => {
              const cost = artifact.cost
                ? parseFloat(artifact.cost)
                : artifact.model && artifact.inputTokens && artifact.outputTokens
                  ? calculateCost(artifact.model, artifact.inputTokens, artifact.outputTokens)
                  : null;

              return (
                <Link
                  key={artifact.id}
                  to={`/artifacts/${artifact.id}`}
                  className="block"
                >
                  <Card className="hover:border-primary transition-colors h-full">
                    <CardHeader>
                      <CardTitle>{artifact.pipelineName}</CardTitle>
                      <CardDescription>
                        {formatDate(artifact.completedAt)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {artifact.model && (
                          <p>
                            <span className="font-medium">Model:</span>{" "}
                            {artifact.model}
                          </p>
                        )}
                        {artifact.inputTokens !== null && artifact.outputTokens !== null && (
                          <p>
                            <span className="font-medium">Tokens:</span>{" "}
                            {formatTokens(artifact.inputTokens)} in / {formatTokens(artifact.outputTokens)} out
                          </p>
                        )}
                        {cost !== null && (
                          <p>
                            <span className="font-medium">Cost:</span>{" "}
                            {formatCost(cost)}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <Button
                variant="outline"
                asChild
                disabled={page <= 1}
              >
                <Link
                  to={page > 1 ? `?page=${page - 1}` : "#"}
                  className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                >
                  Previous
                </Link>
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                asChild
                disabled={page >= totalPages}
              >
                <Link
                  to={page < totalPages ? `?page=${page + 1}` : "#"}
                  className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                >
                  Next
                </Link>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
