import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as users from "./schema/users";
import * as sessions from "./schema/sessions";
import * as apiKeys from "./schema/api-keys";
import * as agents from "./schema/agents";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);

export const db = drizzle(client, {
  schema: { ...users, ...sessions, ...apiKeys, ...agents },
});

export * from "./schema/users";
export * from "./schema/sessions";
export * from "./schema/api-keys";
export * from "./schema/agents";
