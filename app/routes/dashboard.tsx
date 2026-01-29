import type { LoaderFunctionArgs } from "react-router";
import { redirect, useLoaderData } from "react-router";
import { getSession } from "~/services/session.server";
import { db, users } from "~/db";
import { eq } from "drizzle-orm";

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
