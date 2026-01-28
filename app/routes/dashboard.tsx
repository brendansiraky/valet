import type { LoaderFunctionArgs } from "react-router";
import { Form, Link, redirect, useLoaderData } from "react-router";
import { getSession } from "~/services/session.server";
import { db, users } from "~/db";
import { eq } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) {
    return redirect("/login");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    // User was deleted but session still exists
    return redirect("/login");
  }

  return { user: { id: user.id, email: user.email } };
}

export default function Dashboard() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome back!</CardTitle>
          <CardDescription>
            You are signed in as {user.email}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Link to="/agents">
            <Button className="w-full">
              My Agents
            </Button>
          </Link>
          <Link to="/settings">
            <Button variant="outline" className="w-full">
              Settings
            </Button>
          </Link>
          <Form method="post" action="/logout">
            <Button variant="destructive" className="w-full">
              Sign out
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
