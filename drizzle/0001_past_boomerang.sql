CREATE TABLE "pipeline_run_steps" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"agent_id" text NOT NULL,
	"step_order" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"input" text,
	"output" text,
	"error" text,
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "pipeline_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"pipeline_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"input" text NOT NULL,
	"variables" jsonb,
	"final_output" text,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "pipeline_run_steps" ADD CONSTRAINT "pipeline_run_steps_run_id_pipeline_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."pipeline_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_runs" ADD CONSTRAINT "pipeline_runs_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_runs" ADD CONSTRAINT "pipeline_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pipeline_run_steps_run_id_idx" ON "pipeline_run_steps" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "pipeline_runs_user_id_idx" ON "pipeline_runs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pipeline_runs_pipeline_id_idx" ON "pipeline_runs" USING btree ("pipeline_id");