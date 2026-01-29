-- Remove template variables from database schema
-- Part of Phase 15: Agent DNA Simplification

ALTER TABLE "pipeline_templates" DROP COLUMN IF EXISTS "variables";
ALTER TABLE "pipeline_runs" DROP COLUMN IF EXISTS "variables";
