import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const traits = pgTable(
  "traits",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    context: text("context").notNull(),
    color: text("color").notNull().default("#f59e0b"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [index("traits_user_id_idx").on(table.userId)]
);

export type Trait = typeof traits.$inferSelect;
export type NewTrait = typeof traits.$inferInsert;
