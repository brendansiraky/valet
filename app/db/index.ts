import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as users from "./schema/users";
import * as sessions from "./schema/sessions";
import * as apiKeys from "./schema/api-keys";
import * as agents from "./schema/agents";
import * as pipelines from "./schema/pipelines";
import * as pipelineRuns from "./schema/pipeline-runs";
import * as traits from "./schema/traits";
import * as agentTraits from "./schema/agent-traits";
import * as userTabs from "./schema/user-tabs";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);

export const db = drizzle(client, {
  schema: { ...users, ...sessions, ...apiKeys, ...agents, ...pipelines, ...pipelineRuns, ...traits, ...agentTraits, ...userTabs },
});

export * from "./schema/users";
export * from "./schema/sessions";
export * from "./schema/api-keys";
export * from "./schema/agents";
export * from "./schema/pipelines";
export * from "./schema/pipeline-runs";
export * from "./schema/traits";
export * from "./schema/agent-traits";
export * from "./schema/user-tabs";
