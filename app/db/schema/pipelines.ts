import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

// Type for React Flow state stored in database
export interface FlowData {
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: unknown;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
  }>;
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
}

// Type for template variables
export interface TemplateVariable {
  name: string;
  description?: string;
  defaultValue?: string;
}

export const pipelines = pgTable(
  "pipelines",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    flowData: jsonb("flow_data").notNull().$type<FlowData>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [index("pipelines_user_id_idx").on(table.userId)]
);

export const pipelineTemplates = pgTable(
  "pipeline_templates",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    pipelineId: text("pipeline_id")
      .notNull()
      .references(() => pipelines.id, { onDelete: "cascade" }),
    variables: jsonb("variables").notNull().$type<TemplateVariable[]>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("pipeline_templates_pipeline_id_idx").on(table.pipelineId)]
);

export type Pipeline = typeof pipelines.$inferSelect;
export type NewPipeline = typeof pipelines.$inferInsert;
export type PipelineTemplate = typeof pipelineTemplates.$inferSelect;
export type NewPipelineTemplate = typeof pipelineTemplates.$inferInsert;
