---
phase: 09-pipeline-cost
plan: 01
subsystem: api
tags: [anthropic, pricing, token-usage, unified-tools, pipeline]

# Dependency graph
requires:
  - phase: 08-agent-configuration
    provides: Agent model selection and trait context
  - phase: 05-execution-engine
    provides: Pipeline executor and job queue
provides:
  - Pricing utilities (calculateCost, formatCost, formatTokens)
  - Pipeline execution with unified tools (web_search + web_fetch)
  - Token usage accumulation across pipeline steps
  - Model included in pipeline_complete event
affects: [09-02, cost-display, usage-tracking]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Usage accumulator pattern for multi-step token tracking
    - Pricing module with per-model rates

key-files:
  created:
    - app/lib/pricing.ts
  modified:
    - app/services/run-emitter.server.ts
    - app/services/pipeline-executor.server.ts
    - app/services/job-queue.server.ts

key-decisions:
  - "Pricing fallback to Sonnet if model unknown"
  - "Pipeline uses single model for all steps (first agent's preference or user default)"
  - "Removed per-step streaming in exchange for unified tools (acceptable tradeoff)"

patterns-established:
  - "Pricing module: MODEL_PRICING constant with per-million rates"
  - "formatCost: <$0.01 for small costs, $X.XX otherwise"
  - "formatTokens: M/K/raw number based on magnitude"

# Metrics
duration: 2min
completed: 2026-01-29
---

# Phase 9 Plan 01: Pipeline Unified Tools & Usage Summary

**Pipeline executor refactored to use runWithTools with usage tracking and trait context injection**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-29T01:35:51Z
- **Completed:** 2026-01-29T01:37:54Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created pricing utilities module with MODEL_PRICING, calculateCost, formatCost, formatTokens
- Refactored pipeline-executor to use runWithTools (unified web_search + web_fetch)
- Added usage accumulator to track input/output tokens across all pipeline steps
- Updated RunEvent type to include usage and model in pipeline_complete event
- Added trait context loading in job-queue for each agent step

## Task Commits

Each task was committed atomically:

1. **Task 1: Create pricing module** - `6da0615` (feat)
2. **Task 2: Update RunEvent type and executor to use unified tools** - `e032245` (feat)

## Files Created/Modified
- `app/lib/pricing.ts` - Model pricing constants and cost calculation utilities
- `app/services/run-emitter.server.ts` - Updated RunEvent type with usage and model
- `app/services/pipeline-executor.server.ts` - Refactored to use runWithTools with usage tracking
- `app/services/job-queue.server.ts` - Added trait context loading for each agent step

## Decisions Made
- Pricing fallback to Sonnet if model unknown (reasonable default)
- Pipeline uses single model for all steps (first agent's preference or user default) - simplifies execution
- Removed per-step streaming in exchange for unified tools (acceptable tradeoff per research)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Pricing utilities ready for UI consumption in 09-02
- Usage data now emitted in pipeline_complete events
- Ready to display cost and usage in pipeline run UI

---
*Phase: 09-pipeline-cost*
*Completed: 2026-01-29*
