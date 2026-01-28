---
phase: 05-execution-engine
plan: 02
subsystem: api
tags: [pg-boss, remix-utils, sse, job-queue, streaming, real-time]

# Dependency graph
requires:
  - phase: 05-01
    provides: Pipeline runs schema, run emitter, pipeline executor
provides:
  - pg-boss job queue singleton with pipeline worker
  - POST /api/pipeline/:pipelineId/run to start executions
  - GET /api/pipeline/run/:runId/stream for SSE updates
affects: [05-03 (run status), 05-04 (UI integration)]

# Tech tracking
tech-stack:
  added: [pg-boss, remix-utils]
  patterns:
    - Job queue singleton with idempotent worker registration
    - SSE endpoint with eventStream from remix-utils
    - Kahn's algorithm for topological sort of pipeline flow

key-files:
  created:
    - app/services/job-queue.server.ts
    - app/routes/api.pipeline.$pipelineId.run.ts
    - app/routes/api.pipeline.run.$runId.stream.ts
  modified:
    - app/routes.ts
    - package.json

key-decisions:
  - "pg-boss job queue for reliable background processing"
  - "Kahn's algorithm for topological sort of flow graph nodes"
  - "remix-utils eventStream for SSE response handling"

patterns-established:
  - "Job queue singleton with getJobQueue() and registerPipelineWorker()"
  - "SSE endpoint pattern with runEmitter.on/off for cleanup"

# Metrics
duration: 5min
completed: 2026-01-28
---

# Phase 05 Plan 02: Run API Summary

**pg-boss job queue with pipeline worker, run initiation API, and SSE streaming endpoint for real-time execution updates**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-28T11:53:22Z
- **Completed:** 2026-01-28T11:58:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- pg-boss job queue singleton with automatic schema creation
- Pipeline worker with topological sort (Kahn's algorithm) for step ordering
- POST endpoint to create runs and queue jobs with retry logic
- SSE endpoint streaming real-time execution events via runEmitter

## Task Commits

Each task was committed atomically:

1. **Task 1: Install pg-boss and create job queue service** - `e4ebcf9` (feat)
2. **Task 2: Create pipeline run API endpoint** - `456307c` (feat)
3. **Task 3: Create SSE streaming endpoint** - `aa96883` (feat)

## Files Created/Modified
- `app/services/job-queue.server.ts` - pg-boss singleton with pipeline worker and topological sort
- `app/routes/api.pipeline.$pipelineId.run.ts` - POST endpoint for starting pipeline runs
- `app/routes/api.pipeline.run.$runId.stream.ts` - SSE endpoint for streaming execution events
- `app/routes.ts` - Route registrations for both new API endpoints
- `package.json` - Added pg-boss and remix-utils dependencies

## Decisions Made
- Used pg-boss for reliable job processing (automatically creates schema tables)
- Kahn's algorithm for topological sort ensures correct agent execution order
- remix-utils eventStream provides clean SSE response handling
- Retry configuration: 2 retries with 5s delay for transient failures

## Deviations from Plan

None - plan executed exactly as written. Task 1 was already committed from a previous session.

## Issues Encountered
None

## User Setup Required
None - pg-boss creates its schema automatically on first start.

## Next Phase Readiness
- Job queue ready to process pipeline runs
- API endpoints ready for client integration
- SSE streaming ready for real-time UI updates
- Next: 05-03 will add run status/history endpoints

---
*Phase: 05-execution-engine*
*Completed: 2026-01-28*
