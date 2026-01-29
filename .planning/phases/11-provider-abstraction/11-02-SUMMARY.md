---
phase: 11-provider-abstraction
plan: 02
subsystem: api
tags: [anthropic, provider-abstraction, multi-provider, refactor]

# Dependency graph
requires:
  - phase: 11-provider-abstraction
    provides: AIProvider interface, registry, AnthropicProvider
provides:
  - Agent execution via provider interface
  - Pipeline execution via provider interface
  - Simplified anthropic.server.ts (validateApiKey only)
affects: [12-openai-provider]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Provider usage pattern in services (getProviderForModel + getProvider)
    - ChatMessage[] + ToolConfig[] for provider.chat()

key-files:
  created: []
  modified:
    - app/services/agent-runner.server.ts
    - app/services/pipeline-executor.server.ts
    - app/services/anthropic.server.ts

key-decisions:
  - "Reuse single provider instance across all pipeline steps (same API key)"
  - "Keep run-with-tools.server.ts for now (not breaking, can clean up later)"

patterns-established:
  - "Service provider usage: import anthropic module, then getProviderForModel + getProvider"
  - "Message format: ChatMessage[] with system + user roles"

# Metrics
duration: 2min
completed: 2026-01-29
---

# Phase 11 Plan 02: Service Layer Migration Summary

**Agent runner and pipeline executor refactored to use provider abstraction; anthropic.server.ts simplified to validateApiKey only**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-29T03:43:42Z
- **Completed:** 2026-01-29T03:45:20Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Refactored agent-runner.server.ts to use provider.chat() instead of runWithTools
- Refactored pipeline-executor.server.ts to use provider abstraction layer
- Simplified anthropic.server.ts to contain only validateApiKey function
- Maintained all existing functionality (web search, fetch, citations, usage tracking)

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor agent-runner.server.ts** - `2cfcd9c` (feat)
2. **Task 2: Refactor pipeline-executor.server.ts and simplify anthropic.server.ts** - `57832aa` (feat)

## Files Created/Modified
- `app/services/agent-runner.server.ts` - Uses getProvider/getProviderForModel, ChatMessage[], ToolConfig[]
- `app/services/pipeline-executor.server.ts` - Uses provider abstraction, decrypts key once, reuses provider
- `app/services/anthropic.server.ts` - Simplified to validateApiKey only (removed createAnthropicClient, re-exports)

## Decisions Made
1. **Reuse provider instance across pipeline steps** - Same API key for entire pipeline, no need to create provider per step
2. **Keep run-with-tools.server.ts** - Legacy code that's no longer imported, but removal can be deferred

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed without issues.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for:
- Phase 11-03: Service cleanup (remove unused files if desired)
- Phase 12: OpenAI provider implementation - services already use provider abstraction, no service changes needed

Service layer migration complete. Agent runner and pipeline executor now interact with AI through the provider abstraction layer. Adding OpenAI support in Phase 12 will only require implementing the AIProvider interface - no service changes required.

---
*Phase: 11-provider-abstraction*
*Completed: 2026-01-29*
