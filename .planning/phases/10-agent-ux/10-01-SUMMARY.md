---
phase: 10-agent-ux
plan: 01
subsystem: cleanup
tags: [dead-code, capabilities, refactor]

# Dependency graph
requires:
  - phase: 09-pipeline-cost
    provides: unified runWithTools pattern that obsoleted individual capability runners
provides:
  - Cleaner capabilities directory with only active code
  - Removed dead AgentCapability type from schema
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - app/db/schema/agents.ts
    - app/routes/pipelines.$id.tsx

key-decisions:
  - "Keep capability column in database (migration complexity not worth it for harmless column)"
  - "Keep console.error statements (legitimate error logging)"
  - "Defer toast notifications (sonner not installed, separate scope)"

patterns-established: []

# Metrics
duration: 2min
completed: 2026-01-29
---

# Phase 10 Plan 01: Dead Code Cleanup Summary

**Deleted 3 unused capability service files and removed AgentCapability type, leaving only unified runWithTools**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-29T02:44:22Z
- **Completed:** 2026-01-29T02:46:00Z
- **Tasks:** 2
- **Files deleted:** 3
- **Files modified:** 2

## Accomplishments

- Deleted text-generation.server.ts, web-search.server.ts, url-fetch.server.ts (274 lines of dead code)
- Removed unused AgentCapability type export from agents schema
- Removed debug console.log from pipeline page
- Capabilities directory now contains only active code (run-with-tools.server.ts)

## Task Commits

Each task was committed atomically:

1. **Task 1: Delete unused capability service files** - `345f8a4` (chore)
2. **Task 2: Remove unused AgentCapability type and debug console.log** - `7ecf174` (chore)

## Files Created/Modified

**Deleted:**
- `app/services/capabilities/text-generation.server.ts` - Unused generateText export
- `app/services/capabilities/web-search.server.ts` - Unused runWithWebSearch export
- `app/services/capabilities/url-fetch.server.ts` - Unused runWithUrlFetch export

**Modified:**
- `app/db/schema/agents.ts` - Removed AgentCapability type
- `app/routes/pipelines.$id.tsx` - Removed debug console.log

## Decisions Made

- Keep capability column in database - migration adds complexity for a harmless column with default 'none'
- Keep console.error statements - they are legitimate error logging, not debug artifacts
- Leave TODO comments for toast notifications - sonner not installed, adding toast infrastructure is out of scope

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Codebase cleaner with only active code in capabilities directory
- Ready for additional Agent UX improvements
- Three TODO comments remain for toast notifications (future enhancement)

---
*Phase: 10-agent-ux*
*Completed: 2026-01-29*
