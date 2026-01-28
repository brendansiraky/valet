# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-29)

**Core value:** Non-technical users can automate repetitive multi-stage document workflows by building and running AI agent pipelines through a visual interface.
**Current focus:** Milestone v1.1 - Enhanced Agents

## Current Position

Phase: 7 - Traits System
Plan: 02 of 3 (complete)
Status: In progress
Last activity: 2026-01-29 - Completed 07-02-PLAN.md (Traits CRUD)

Progress: [███░░░░░░░] 17% (Milestone v1.1: 1/4 phases started, 2/12 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 20
- Average duration: 9 min
- Total execution time: 2.97 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3 | 78 min | 26 min |
| 02-agent-management | 2 | 16 min | 8 min |
| 03-agent-capabilities | 3 | 11 min | 4 min |
| 04-pipeline-builder | 5 | 27 min | 5 min |
| 05-execution-engine | 3 | 24 min | 8 min |
| 06-output-export | 2 | 13 min | 7 min |
| 07-navigation-traits | 2 | 9 min | 5 min |

**Recent Trend:**
- Last 5 plans: 06-01 (5 min), 06-02 (8 min), 07-01 (5 min), 07-02 (4 min)

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
- Intent-based API actions for pipeline CRUD (consistent with agents pattern)
- Dagre LR layout as default direction for pipeline flow
- NodeProps generic takes Node type not data type in React Flow 12
- nodeTypes object defined outside component to prevent re-render loops
- Custom MIME types for drag data transfer (application/agent-*)
- Import TemplateVariable type from schema for consistency across components
- Template variables stored in separate pipelineTemplates table
- useEffect for dialog state initialization on open (cleaner than manual reset)
- Drizzle and() for compound WHERE clauses in updates
- RunEmitter singleton pattern with max 100 listeners
- Template variable pattern {{varName}} with regex replacement
- pg-boss for reliable background job processing
- Kahn's algorithm for topological sort of pipeline flow
- remix-utils eventStream for SSE response handling
- Explicit createQueue() for pg-boss v10+ compatibility
- Default user message for first agent when no initial input
- Typography via @plugin directive (Tailwind v4 CSS-first config)
- Client-side Blob API for downloads (no server round-trip)
- prose-sm for compact output display
- Modal overlay for output display (dismissible with Close button)
- stepOutputs Map passed from RunProgress to parent for output assembly
- Final Output tab defaults as active when steps exist
- shadcn sidebar with collapsible=icon for collapse behavior
- Trait context max 50000 chars (larger than agent instructions for reusable blocks)
- layout() wrapper in routes.ts for auth centralization
- Cookie-based sidebar state persistence (shadcn default)

### Pending Todos

None yet.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-01-29
Stopped at: Completed 07-02-PLAN.md (Traits CRUD)
Resume file: None

---
*Milestone v1.1 in progress. 07-02 complete, 07-03 (Traits Settings) next.*
