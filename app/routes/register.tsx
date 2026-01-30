import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, Link, useActionData } from "react-router";
import { z } from "zod";
import { isAuthenticated, createUserSession } from "~/services/auth.server";
import { hashPassword } from "~/services/password.server";
import { db, users } from "~/db";
import { eq } from "drizzle-orm";
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

const registerSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function loader({ request }: LoaderFunctionArgs) {
  // Redirect to dashboard if already authenticated
  await isAuthenticated(request, {
    successRedirect: "/dashboard",
  });

  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  // Validate input
  const result = registerSchema.safeParse({ email, password, confirmPassword });
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  // Normalize email to lowercase
  const normalizedEmail = email.toLowerCase();

  // Check if user already exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
  });

  if (existingUser) {
    return { errors: { email: ["An account with this email already exists"] } };
  }

  // Hash password and create user
  const passwordHash = await hashPassword(password);
  const [newUser] = await db
    .insert(users)
    .values({
      email: normalizedEmail,
      passwordHash,
    })
    .returning({ id: users.id, email: users.email });

  // Create session and redirect
  return createUserSession(
    request,
    { id: newUser.id, email: newUser.email },
    "/dashboard"
  );
}

export default function Register() {
  const actionData = useActionData<typeof action>();

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>
            Enter your details below to create your account
          </CardDescription>
        </CardHeader>
        <Form method="post">
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                aria-invalid={actionData?.errors?.email ? true : undefined}
              />
              {actionData?.errors?.email && (
                <p className="text-sm text-destructive">
                  {actionData.errors.email[0]}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="At least 8 characters"
                required
                minLength={8}
                aria-invalid={actionData?.errors?.password ? true : undefined}
              />
              {actionData?.errors?.password && (
                <p className="text-sm text-destructive">
                  {actionData.errors.password[0]}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                required
                minLength={8}
                aria-invalid={
                  actionData?.errors?.confirmPassword ? true : undefined
                }
              />
              {actionData?.errors?.confirmPassword && (
                <p className="text-sm text-destructive">
                  {actionData.errors.confirmPassword[0]}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full">
              Create account
            </Button>
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Form>
      </Card>
    </div>
  );
}
