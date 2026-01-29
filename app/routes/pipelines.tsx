import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Link, redirect, useLoaderData } from "react-router";
import { db, pipelines } from "~/db";
import { eq, asc, and } from "drizzle-orm";
import { getSession } from "~/services/session.server";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
} from "~/components/ui/card";
import { Plus } from "lucide-react";
import { PipelineCard } from "~/components/pipeline-card";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) {
    return redirect("/login");
  }

  const userPipelines = await db
    .select()
    .from(pipelines)
    .where(eq(pipelines.userId, userId))
    .orderBy(asc(pipelines.name));

  return { pipelines: userPipelines };
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) {
    return redirect("/login");
  }

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    const pipelineId = formData.get("pipelineId") as string;

    await db
      .delete(pipelines)
      .where(and(eq(pipelines.id, pipelineId), eq(pipelines.userId, userId)));

    return { success: true };
  }

  return { success: false };
}

export default function PipelinesPage() {
  const { pipelines: userPipelines } = useLoaderData<typeof loader>();

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Pipelines</h1>
          <p className="text-muted-foreground">
            Create and manage your agent pipelines
          </p>
        </div>
        <Button asChild>
          <Link to="/pipelines/new">
            <Plus className="size-4 mr-2" />
            New Pipeline
          </Link>
        </Button>
      </div>

      {userPipelines.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              You haven't created any pipelines yet.
            </p>
            <Button asChild>
              <Link to="/pipelines/new">Create your first pipeline</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {userPipelines.map((pipeline) => (
            <PipelineCard key={pipeline.id} pipeline={pipeline} />
          ))}
        </div>
      )}
    </div>
  );
}
