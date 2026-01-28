import { createSessionStorage } from "react-router";
import { db } from "~/db";
import { sessions } from "~/db/schema/sessions";
import { eq } from "drizzle-orm";

// Support secret rotation by splitting on comma
const getSecrets = () => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is required");
  }
  return secret.split(",").map((s) => s.trim());
};

export const sessionStorage = createSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: getSecrets(),
    secure: process.env.NODE_ENV === "production",
  },
  async createData(data, expires) {
    const [session] = await db
      .insert(sessions)
      .values({
        data: JSON.stringify(data),
        expiresAt: expires,
      })
      .returning({ id: sessions.id });
    return session.id;
  },
  async readData(id) {
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, id),
    });
    if (!session) return null;
    return JSON.parse(session.data);
  },
  async updateData(id, data, expires) {
    await db
      .update(sessions)
      .set({ data: JSON.stringify(data), expiresAt: expires })
      .where(eq(sessions.id, id));
  },
  async deleteData(id) {
    await db.delete(sessions).where(eq(sessions.id, id));
  },
});

export const { getSession, commitSession, destroySession } = sessionStorage;
