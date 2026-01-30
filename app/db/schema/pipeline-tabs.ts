import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { pipelines } from "./pipelines";

export const pipelineTabs = pgTable(
  "pipeline_tabs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    pipelineId: text("pipeline_id")
      .notNull()
      .references(() => pipelines.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    pinned: boolean("pinned").notNull().default(false),
    isActive: boolean("is_active").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("pipeline_tabs_user_id_idx").on(table.userId),
    index("pipeline_tabs_pipeline_id_idx").on(table.pipelineId),
    // Each user can only have one tab per pipeline
    unique("pipeline_tabs_user_pipeline_unique").on(
      table.userId,
      table.pipelineId
    ),
  ]
);

// Define relations for easier querying with joins
export const pipelineTabsRelations = relations(pipelineTabs, ({ one }) => ({
  user: one(users, {
    fields: [pipelineTabs.userId],
    references: [users.id],
  }),
  pipeline: one(pipelines, {
    fields: [pipelineTabs.pipelineId],
    references: [pipelines.id],
  }),
}));

export type PipelineTab = typeof pipelineTabs.$inferSelect;
export type NewPipelineTab = typeof pipelineTabs.$inferInsert;

// API response shape - name comes from pipeline join
export interface TabData {
  id: string;
  pipelineId: string;
  name: string; // Joined from pipelines table
  pinned: boolean;
  position: number;
  isActive: boolean;
}
