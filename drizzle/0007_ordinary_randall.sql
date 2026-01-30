CREATE TABLE "user_tabs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tabs" jsonb NOT NULL,
	"active_tab_id" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_tabs_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "user_tabs" ADD CONSTRAINT "user_tabs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_tabs_user_id_idx" ON "user_tabs" USING btree ("user_id");