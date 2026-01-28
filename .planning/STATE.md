# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-28)

**Core value:** Non-technical users can automate repetitive multi-stage document workflows by building and running AI agent pipelines through a visual interface.
**Current focus:** Phase 4 - Pipeline Builder

## Current Position

Phase: 4 of 6 (Pipeline Builder)
Plan: 1 of 3 complete
Status: In progress
Last activity: 2026-01-28 - Completed 04-01-PLAN.md (Pipeline Infrastructure)

Progress: [███████░░░] 60%

## Performance Metrics

**Velocity:**
- Total plans completed: 9
- Average duration: 12 min
- Total execution time: 1.9 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3 | 78 min | 26 min |
| 02-agent-management | 2 | 16 min | 8 min |
| 03-agent-capabilities | 3 | 11 min | 4 min |
| 04-pipeline-builder | 1 | 6 min | 6 min |

**Recent Trend:**
- Last 5 plans: 03-01 (1 min), 03-02 (2 min), 03-03 (8 min), 04-01 (6 min)

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- React Router v7 instead of Remix v2 (Remix upstreamed to React Router)
- Tailwind v4 with @tailwindcss/vite plugin (CSS-first configuration)
- UUID text primary keys for all tables
- Session secrets support rotation via comma-separated env var
- Argon2id with 64MB memory, 3 iterations, 4 threads
- Same error message for user-not-found and wrong-password (prevents enumeration)
- AVAILABLE_MODELS in shared app/lib/models.ts for client/server access
- API key validation uses claude-3-haiku-20240307 (cheapest for test calls)
- Index on user_id for agents table query performance
- Cascade delete for agents when user deleted
- Intent-based form actions for multiple forms on same page
- Capability service pattern: each capability in separate module under capabilities/
- Default maxTokens 4096 for text generation
- Type casting for beta API features not yet in SDK types (web_fetch_20250910)
- Citations enabled by default on URL fetch
- Capabilities mutually exclusive for now (combined in Phase 5)
- Default max_uses 5 for both web_search and web_fetch
- Default max_content_tokens 25000 for URL fetch
- Select component for capability selection (cleaner UI than RadioGroup)
- Cmd+Enter keyboard shortcut for running agents
- Index signature on AgentNodeData for React Flow Node<T> compatibility
- JSONB columns for flowData and variables (flexible structured storage)

### Pending Todos

None yet.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-01-28T10:21:00Z
Stopped at: Completed 04-01-PLAN.md
Resume file: None

---
*Next: Continue Phase 4 - Plan 04-02 (Canvas UI)*
