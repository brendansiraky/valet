CREATE TABLE "agent_traits" (
	"agent_id" text NOT NULL,
	"trait_id" text NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_traits_agent_id_trait_id_pk" PRIMARY KEY("agent_id","trait_id")
);
--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "capability" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "model" text;--> statement-breakpoint
ALTER TABLE "agent_traits" ADD CONSTRAINT "agent_traits_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_traits" ADD CONSTRAINT "agent_traits_trait_id_traits_id_fk" FOREIGN KEY ("trait_id") REFERENCES "public"."traits"("id") ON DELETE cascade ON UPDATE no action;