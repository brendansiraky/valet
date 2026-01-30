-- Migration: Normalize tabs from JSONB to proper junction table
-- This migration:
-- 1. Creates new pipeline_tabs table with proper FK constraints
-- 2. Migrates data from user_tabs JSONB to new table
-- 3. Drops the old user_tabs table

-- Step 1: Create new normalized table
CREATE TABLE IF NOT EXISTS "pipeline_tabs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"pipeline_id" text NOT NULL,
	"position" integer NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Step 2: Add indexes
CREATE INDEX IF NOT EXISTS "pipeline_tabs_user_id_idx" ON "pipeline_tabs" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "pipeline_tabs_pipeline_id_idx" ON "pipeline_tabs" USING btree ("pipeline_id");

-- Step 3: Add unique constraint (one tab per pipeline per user)
ALTER TABLE "pipeline_tabs" ADD CONSTRAINT "pipeline_tabs_user_pipeline_unique" UNIQUE("user_id","pipeline_id");

-- Step 4: Add foreign key constraints with CASCADE DELETE
ALTER TABLE "pipeline_tabs" ADD CONSTRAINT "pipeline_tabs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "pipeline_tabs" ADD CONSTRAINT "pipeline_tabs_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE cascade ON UPDATE no action;

-- Step 5: Migrate data from old user_tabs table
-- Extract JSONB array entries into proper rows
INSERT INTO "pipeline_tabs" ("id", "user_id", "pipeline_id", "position", "pinned", "is_active", "created_at")
SELECT
    gen_random_uuid()::text,
    ut.user_id,
    (tab->>'pipelineId')::text,
    (tab_position - 1)::integer,
    COALESCE((tab->>'pinned')::boolean, false),
    (tab->>'pipelineId' = ut.active_tab_id),
    now()
FROM user_tabs ut,
     jsonb_array_elements(ut.tabs) WITH ORDINALITY AS t(tab, tab_position)
WHERE (tab->>'pipelineId') IS NOT NULL
  AND (tab->>'pipelineId') != 'home'
  AND EXISTS (
    SELECT 1 FROM pipelines p
    WHERE p.id = (tab->>'pipelineId')::text
  );

-- Step 6: Drop old table
DROP TABLE IF EXISTS "user_tabs";
