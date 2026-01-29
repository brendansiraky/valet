---
phase: 15-agent-dna-simplification
plan: 01
subsystem: ui
tags: [react, tooltip, agent-form, trait-picker, api]

# Dependency graph
requires:
  - phase: 07-navigation-traits
    provides: traits table and CRUD
  - phase: 08-agent-configuration
    provides: agent form dialog, agent traits
provides:
  - DNA label with tooltip replacing Instructions
  - Trait picker in test dialog for temporary trait selection
  - API endpoint accepting traitIds in request body
affects: [16-dynamic-traits, 17-pipeline-agent-dna]

# Tech tracking
tech-stack:
  added: []
  patterns: ["temporary state for test-only selections"]

key-files:
  created: []
  modified:
    - app/components/agent-form-dialog.tsx
    - app/components/agent-test-dialog.tsx
    - app/components/agent-card.tsx
    - app/routes/api.agent.$agentId.run.ts
    - app/routes/agents.tsx

key-decisions:
  - "DNA label uses tooltip for explanation (non-intrusive)"
  - "Keep name='instructions' in form for backward compatibility"
  - "Trait selection in test dialog is temporary (resets on close)"
  - "API falls back to agent traits when no traitIds provided"

patterns-established:
  - "DNA metaphor: agent instructions = DNA"
  - "Test-time trait selection: selectedTraitIds state in dialog"

# Metrics
duration: 3min
completed: 2026-01-29
---

# Phase 15 Plan 01: DNA Label and Test Trait Picker Summary

**Replaced Instructions with DNA label + tooltip, removed trait selector from agent form, added temporary trait picker to test dialog**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-29T07:26:32Z
- **Completed:** 2026-01-29T07:29:50Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Renamed "Instructions" to "DNA" with info tooltip explaining the metaphor
- Removed traits section from agent form dialog (simplification)
- Added trait picker UI in agent test dialog for temporary trait selection
- Updated API endpoint to accept optional traitIds array and use them for context

## Task Commits

Each task was committed atomically:

1. **Task 1: Rename Instructions to DNA with tooltip, remove trait selector** - `817644b` (feat)
2. **Task 2: Add temporary trait picker to agent test dialog** - `2b08162` (feat)
3. **Task 3: Update API endpoint to accept and use trait IDs** - `14aff3a` (feat)

## Files Created/Modified
- `app/components/agent-form-dialog.tsx` - DNA label with tooltip, removed traits section and state
- `app/components/agent-test-dialog.tsx` - Added traits prop, selectedTraitIds state, trait picker UI
- `app/components/agent-card.tsx` - Removed traits prop from interface and usage
- `app/routes/api.agent.$agentId.run.ts` - Added traitIds schema, conditional trait loading
- `app/routes/agents.tsx` - Updated AgentFormDialog and AgentTestDialog props

## Decisions Made
- Used uncontrolled Dialog with key prop reset pattern for simpler form state
- Tooltip uses side="right" for better UX next to label
- Kept backward compatibility: name="instructions" on textarea, API falls back to agent traits
- Trait picker scrolls with max-h-32 to prevent dialog from growing too tall

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- DNA terminology in place for user-facing agent configuration
- Test dialog supports temporary trait selection
- Ready for Phase 16 (dynamic traits) and Phase 17 (pipeline agent DNA)
- Trait assignment still persisted at agent level for pipeline backward compatibility

---
*Phase: 15-agent-dna-simplification*
*Completed: 2026-01-29*
