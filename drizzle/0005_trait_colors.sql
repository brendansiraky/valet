ALTER TABLE "pipeline_runs" ADD COLUMN "artifact_data" jsonb;--> statement-breakpoint
ALTER TABLE "pipeline_runs" ADD COLUMN "model" text;--> statement-breakpoint
ALTER TABLE "pipeline_runs" ADD COLUMN "input_tokens" integer;--> statement-breakpoint
ALTER TABLE "pipeline_runs" ADD COLUMN "output_tokens" integer;--> statement-breakpoint
ALTER TABLE "pipeline_runs" ADD COLUMN "cost" numeric(10, 6);--> statement-breakpoint
ALTER TABLE "traits" ADD COLUMN "color" text DEFAULT '#f59e0b' NOT NULL;