---
phase: 15-agent-dna-simplification
plan: 03
subsystem: api, ui
tags: [remix, typescript, pipeline-executor, job-queue]

# Dependency graph
requires:
  - phase: 15-02
    provides: Variables columns removed from database schema
provides:
  - Pipeline executor without variable substitution
  - Job queue without variable handling
  - Run API without variable parsing
  - Pipeline page without template dialogs
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Direct instruction execution without variable templating"
    - "Simplified user message flow (previous output or generic prompt)"

key-files:
  created: []
  modified:
    - app/services/pipeline-executor.server.ts
    - app/services/job-queue.server.ts
    - app/routes/api.pipeline.$pipelineId.run.ts
    - app/routes/pipelines.$id.tsx
    - app/routes/api.pipelines.ts

key-decisions:
  - "User message simplified to previous output or generic prompt (no variable context)"
  - "Template API endpoints removed entirely (no migration path)"

patterns-established:
  - "Pipeline runs immediately without pre-run dialogs"
  - "Agents use instructions directly without variable substitution"

# Metrics
duration: 3min
completed: 2026-01-29
---

# Phase 15 Plan 03: Remove Variable System from Pipeline Routes Summary

**Pipeline executor, job queue, and UI simplified by removing all variable substitution and template dialog code**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-29T07:36:52Z
- **Completed:** 2026-01-29T07:39:56Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Removed substituteVariables function and variables parameter from pipeline executor
- Removed variables from job queue interface and API endpoint
- Removed TemplateDialog and VariableFillDialog from pipeline page
- Removed template API endpoints (create-template, get-template)
- Pipeline Run button now starts execution immediately

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove variable system from pipeline executor** - `b6b88dc` (feat)
2. **Task 2: Remove variables from job queue and run API** - `3e2e964` (feat)
3. **Task 3: Remove variable dialogs and template system from pipelines page** - `3adc78d` (feat)

## Files Created/Modified
- `app/services/pipeline-executor.server.ts` - Removed substituteVariables and variables param
- `app/services/job-queue.server.ts` - Removed variables from job interface
- `app/routes/api.pipeline.$pipelineId.run.ts` - Removed variables parsing
- `app/routes/pipelines.$id.tsx` - Removed template dialogs and state
- `app/routes/api.pipelines.ts` - Removed create-template and get-template intents

## Decisions Made
- User message simplified: either previous agent output or "Please proceed with your instructions"
- Template API endpoints removed entirely rather than deprecated

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed template API endpoints from api.pipelines.ts**
- **Found during:** Task 3 (typecheck after UI cleanup)
- **Issue:** TypeScript errors from template-related code using removed TemplateVariable type
- **Fix:** Removed create-template and get-template case handlers, pipelineTemplates import
- **Files modified:** app/routes/api.pipelines.ts
- **Verification:** npm run typecheck passes
- **Committed in:** 3adc78d (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix necessary to complete typecheck verification. File was logically related to template removal scope.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Variable system completely removed from codebase
- All pipeline execution flows simplified
- Ready for any future phase work

---
*Phase: 15-agent-dna-simplification*
*Completed: 2026-01-29*
