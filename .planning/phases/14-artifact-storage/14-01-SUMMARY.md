---
phase: 14-artifact-storage
plan: 01
subsystem: database
tags: [drizzle, jsonb, artifacts, pipeline-runs, pricing]

# Dependency graph
requires:
  - phase: 05-execution-engine
    provides: pipeline_runs schema and executor
  - phase: 11-provider-abstraction
    provides: multi-provider support
provides:
  - ArtifactOutput type for structured step data
  - artifact_data JSONB column in pipeline_runs
  - model, tokens, cost metadata storage
  - OpenAI model pricing in MODEL_PRICING
affects: [14-02 artifact display, run history views, cost analytics]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Store metadata at run completion time (not calculated on read)"
    - "Keep legacy columns (finalOutput) for backward compat"

key-files:
  created: []
  modified:
    - app/db/schema/pipeline-runs.ts
    - app/lib/pricing.ts
    - app/services/pipeline-executor.server.ts

key-decisions:
  - "JSONB for artifactData enables flexible queries"
  - "Cost stored as string for precision (numeric type)"
  - "Backward compat: finalOutput still populated"

patterns-established:
  - "Artifact structure: { steps: [...], finalOutput }"
  - "Metadata stored at completion, not calculated on read"

# Metrics
duration: 4min
completed: 2026-01-29
---

# Phase 14 Plan 01: Artifact Storage Summary

**Extended pipeline_runs schema with JSONB artifact storage and metadata columns (model, tokens, cost), executor stores structured step data on completion**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-29T06:34:00Z
- **Completed:** 2026-01-29T06:38:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added ArtifactOutput interface with steps array and finalOutput
- Extended pipeline_runs with artifactData JSONB, model, inputTokens, outputTokens, cost columns
- Updated executor to build and store structured artifacts on completion
- Added OpenAI models (gpt-4o, gpt-4o-mini) to pricing lookup

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend pipeline_runs schema with artifact columns** - `8c169dc` (feat)
2. **Task 2: Update executor to store artifact data on completion** - `46d7f8b` (feat)

## Files Created/Modified

- `app/db/schema/pipeline-runs.ts` - ArtifactOutput type, new columns (artifactData, model, inputTokens, outputTokens, cost)
- `app/lib/pricing.ts` - Added OpenAI models to MODEL_PRICING
- `app/services/pipeline-executor.server.ts` - Track step outputs, build artifact data, store metadata on completion

## Decisions Made

- **JSONB for artifactData:** Enables flexible querying and future schema evolution without migrations
- **Cost as string:** Stored as numeric(10,6) converted to string for precision preservation
- **Backward compatibility:** Keep finalOutput populated alongside artifactData for existing code that reads it
- **Metadata at completion:** Store model/tokens/cost when run completes (not calculated on each read) for accuracy

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- npm run db:push script doesn't exist - used `npx drizzle-kit push` directly instead

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Artifact data is now persisted for completed runs
- Ready for 14-02: Artifact display UI to show step-by-step outputs
- All existing functionality maintained (backward compat)

---
*Phase: 14-artifact-storage*
*Completed: 2026-01-29*
