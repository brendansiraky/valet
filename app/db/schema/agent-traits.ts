import { pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { agents } from "./agents";
import { traits } from "./traits";

export const agentTraits = pgTable(
  "agent_traits",
  {
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    traitId: text("trait_id")
      .notNull()
      .references(() => traits.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.agentId, table.traitId] })]
);

export const agentTraitsRelations = relations(agentTraits, ({ one }) => ({
  agent: one(agents, {
    fields: [agentTraits.agentId],
    references: [agents.id],
  }),
  trait: one(traits, {
    fields: [agentTraits.traitId],
    references: [traits.id],
  }),
}));

export const agentsRelations = relations(agents, ({ many }) => ({
  agentTraits: many(agentTraits),
}));

export const traitsRelations = relations(traits, ({ many }) => ({
  agentTraits: many(agentTraits),
}));

export type AgentTrait = typeof agentTraits.$inferSelect;
export type NewAgentTrait = typeof agentTraits.$inferInsert;
