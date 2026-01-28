import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { pipelines } from "./pipelines";
import { users } from "./users";

// Status types for runs and steps
export type RunStatus = "pending" | "running" | "completed" | "failed";
export type StepStatus = "pending" | "running" | "completed" | "failed";

export const pipelineRuns = pgTable(
  "pipeline_runs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    pipelineId: text("pipeline_id")
      .notNull()
      .references(() => pipelines.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().$type<RunStatus>().default("pending"),
    input: text("input").notNull(),
    variables: jsonb("variables").$type<Record<string, string>>(),
    finalOutput: text("final_output"),
    error: text("error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    index("pipeline_runs_user_id_idx").on(table.userId),
    index("pipeline_runs_pipeline_id_idx").on(table.pipelineId),
  ]
);

export const pipelineRunSteps = pgTable(
  "pipeline_run_steps",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    runId: text("run_id")
      .notNull()
      .references(() => pipelineRuns.id, { onDelete: "cascade" }),
    agentId: text("agent_id").notNull(),
    stepOrder: integer("step_order").notNull(),
    status: text("status").notNull().$type<StepStatus>().default("pending"),
    input: text("input"),
    output: text("output"),
    error: text("error"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
  },
  (table) => [index("pipeline_run_steps_run_id_idx").on(table.runId)]
);

export type PipelineRun = typeof pipelineRuns.$inferSelect;
export type NewPipelineRun = typeof pipelineRuns.$inferInsert;
export type PipelineRunStep = typeof pipelineRunSteps.$inferSelect;
export type NewPipelineRunStep = typeof pipelineRunSteps.$inferInsert;
