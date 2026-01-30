import { redirect } from "react-router";
import { Authenticator } from "remix-auth";
import { FormStrategy } from "remix-auth-form";
import { getSession, commitSession, destroySession } from "./session.server";
import { verifyPassword } from "./password.server";
import { db } from "~/db";
import { users } from "~/db/schema/users";
import { eq } from "drizzle-orm";

export type AuthUser = {
  id: string;
  email: string;
};

// Session key for storing user
const USER_SESSION_KEY = "user";

// Authenticator for form-based login
export const authenticator = new Authenticator<AuthUser>();

authenticator.use(
  new FormStrategy(async ({ form }) => {
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new Error("Invalid credentials");
    }

    return { id: user.id, email: user.email };
  }),
  "user-pass"
);

/**
 * Check if user is authenticated. Returns user or null.
 * Optionally redirects based on auth state.
 */
export async function isAuthenticated(
  request: Request,
  options?: {
    successRedirect?: string;
    failureRedirect?: string;
  }
): Promise<AuthUser | null> {
  const session = await getSession(request.headers.get("Cookie"));
  const user = session.get(USER_SESSION_KEY) as AuthUser | undefined;

  if (user) {
    if (options?.successRedirect) {
      throw redirect(options.successRedirect);
    }
    return user;
  }

  if (options?.failureRedirect) {
    throw redirect(options.failureRedirect);
  }
  return null;
}

/**
 * Create a session for a user and redirect.
 */
export async function createUserSession(
  request: Request,
  user: AuthUser,
  redirectTo: string
): Promise<Response> {
  const session = await getSession(request.headers.get("Cookie"));
  session.set(USER_SESSION_KEY, user);

  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await commitSession(session, {
        maxAge: 60 * 60 * 24 * 7, // 7 days
      }),
    },
  });
}

/**
 * Destroy session and redirect.
 */
export async function logout(
  request: Request,
  redirectTo: string
): Promise<Response> {
  const session = await getSession(request.headers.get("Cookie"));

  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await destroySession(session),
    },
  });
}

/**
 * Get user ID from session. For use in API routes.
 * Returns null if not authenticated.
 */
export async function getUserId(request: Request): Promise<string | null> {
  const session = await getSession(request.headers.get("Cookie"));
  const user = session.get(USER_SESSION_KEY) as AuthUser | undefined;
  return user?.id ?? null;
}
