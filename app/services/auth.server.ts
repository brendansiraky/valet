import { Authenticator } from "remix-auth";
import { FormStrategy } from "remix-auth-form";
import { verifyPassword } from "./password.server";
import { db } from "~/db";
import { users } from "~/db/schema/users";
import { eq } from "drizzle-orm";

export type AuthUser = {
  id: string;
  email: string;
};

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
