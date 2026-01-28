---
phase: 03-agent-capabilities
plan: 02
subsystem: api
tags: [anthropic, web-search, url-fetch, capabilities, citations]

# Dependency graph
requires:
  - phase: 03-01
    provides: Agent runner service, text generation capability, capability service pattern
provides:
  - Web search capability via Anthropic web_search_20250305
  - URL fetch capability via Anthropic web_fetch_20250910
  - Agent runner capability routing
affects: [03-03-capability-ui, 04-conversations, 05-pipelines]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Anthropic built-in tools for web operations"
    - "Beta header pattern for preview API features"
    - "Citation extraction from tool responses"

key-files:
  created:
    - app/services/capabilities/web-search.server.ts
    - app/services/capabilities/url-fetch.server.ts
  modified:
    - app/services/agent-runner.server.ts

key-decisions:
  - "Type casting for beta API features not yet in SDK types"
  - "Citations enabled by default on URL fetch"
  - "Capabilities mutually exclusive for now (combined in Phase 5)"
  - "Default max_uses 5 for both web_search and web_fetch"
  - "Default max_content_tokens 25000 for URL fetch"

patterns-established:
  - "Beta header pattern: pass headers object as second parameter to client.messages.create"
  - "Citation extraction: iterate text blocks checking for citations property"
  - "Capability routing: agent runner conditionally calls capability service based on flags"

# Metrics
duration: 2min
completed: 2026-01-28
---

# Phase 3 Plan 2: Web Search and URL Fetch Capabilities Summary

**Web search and URL fetch capabilities using Anthropic's built-in tools with citation support and capability routing in agent runner**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-28T09:33:31Z
- **Completed:** 2026-01-28T09:35:30Z
- **Tasks:** 3
- **Files created:** 2
- **Files modified:** 1

## Accomplishments
- Web search capability using Anthropic's web_search_20250305 with configurable max_uses
- URL fetch capability using Anthropic's web_fetch_20250910 with beta header and citations
- Agent runner routes to appropriate capability service based on capability flags
- Structured citation extraction from text blocks in API responses

## Task Commits

Each task was committed atomically:

1. **Task 1: Create web search capability** - `00c517c` (feat)
2. **Task 2: Create URL fetch capability** - `a6f55ed` (feat)
3. **Task 3: Update agent runner with capability flags** - `3ddc820` (feat)

## Files Created/Modified

- `app/services/capabilities/web-search.server.ts` - Web search using web_search_20250305 tool with citation extraction
- `app/services/capabilities/url-fetch.server.ts` - URL fetch using web_fetch_20250910 tool with beta header
- `app/services/agent-runner.server.ts` - Added capability flags and routing to capability services

## Decisions Made

- **Type casting for beta features:** web_fetch_20250910 is in beta and SDK types don't include it yet; used type casting to work around
- **Citations enabled by default:** URL fetch has citations enabled to comply with Anthropic's display requirements
- **Default limits:** max_uses=5 for both tools, max_content_tokens=25000 for URL fetch (per RESEARCH.md guidance)
- **Mutually exclusive capabilities:** For this phase, webSearch and urlFetch are mutually exclusive with text-only; combined capabilities will be added in Phase 5 execution engine

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] TypeScript type errors for beta API features**
- **Found during:** Task 2 (URL fetch capability)
- **Issue:** SDK types don't include web_fetch_20250910 tool type or web_fetch_tool_result content block type
- **Fix:** Added WebFetchTool interface and cast to Tool; cast block.type to string for comparison
- **Files modified:** app/services/capabilities/url-fetch.server.ts
- **Verification:** npm run typecheck passes
- **Committed in:** a6f55ed (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary workaround for beta API features not yet in SDK types. No scope creep.

## Issues Encountered

None beyond the type casting noted above.

## User Setup Required

None - no external service configuration required. Web search and URL fetch use Anthropic's built-in tools, which only require the existing Anthropic API key.

## Next Phase Readiness

- Web search and URL fetch capabilities ready for integration
- Agent runner supports capability flags for route handlers to use
- Foundation for Phase 5 combined capabilities established

---
*Phase: 03-agent-capabilities*
*Completed: 2026-01-28*
