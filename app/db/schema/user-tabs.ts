import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export interface TabData {
  pipelineId: string;
  name: string;
  pinned?: boolean;
}

export const userTabs = pgTable(
  "user_tabs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    tabs: jsonb("tabs").notNull().$type<TabData[]>(),
    activeTabId: text("active_tab_id"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [index("user_tabs_user_id_idx").on(table.userId)]
);

export type UserTabs = typeof userTabs.$inferSelect;
export type NewUserTabs = typeof userTabs.$inferInsert;
