import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, Link, redirect, useLoaderData } from "react-router";
import {
  authenticator,
  isAuthenticated,
  createUserSession,
} from "~/services/auth.server";
import { getSession, commitSession } from "~/services/session.server";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export async function loader({ request }: LoaderFunctionArgs) {
  // Redirect to dashboard if already authenticated
  await isAuthenticated(request, {
    successRedirect: "/dashboard",
  });

  // Get flash error if exists
  const session = await getSession(request.headers.get("Cookie"));
  const error = session.get("error") as string | undefined;

  return { error };
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const user = await authenticator.authenticate("user-pass", request);
    return createUserSession(request, user, "/dashboard");
  } catch (error) {
    // Handle authentication errors
    if (error instanceof Response) throw error;

    const session = await getSession(request.headers.get("Cookie"));
    session.flash("error", "Invalid email or password");

    return redirect("/login", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  }
}

export default function Login() {
  const loaderData = useLoaderData<typeof loader>();

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <Form method="post">
          <CardContent className="space-y-4">
            {loaderData?.error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {loaderData.error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Your password"
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full">
              Sign in
            </Button>
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/register" className="text-primary hover:underline">
                Create one
              </Link>
            </p>
          </CardFooter>
        </Form>
      </Card>
    </div>
  );
}
