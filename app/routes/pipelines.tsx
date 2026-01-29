import type { LoaderFunctionArgs } from "react-router";
import { Link, redirect, useLoaderData } from "react-router";
import { db, pipelines } from "~/db";
import { eq, asc } from "drizzle-orm";
import { getSession } from "~/services/session.server";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui/card";
import { Plus } from "lucide-react";

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
            <Link
              key={pipeline.id}
              to={`/pipelines/${pipeline.id}`}
              className="block"
            >
              <Card className="hover:border-primary transition-colors h-full">
                <CardHeader>
                  <CardTitle>{pipeline.name}</CardTitle>
                  {pipeline.description && (
                    <CardDescription>{pipeline.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Updated {new Date(pipeline.updatedAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
