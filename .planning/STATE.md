# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-29)

**Core value:** Non-technical users can automate repetitive multi-stage document workflows by building and running AI agent pipelines through a visual interface.
**Current focus:** Milestone v1.1 - Enhanced Agents

## Current Position

Phase: 10 - Agent UX
Plan: 1 of ?
Status: In progress
Last activity: 2026-01-29 - Completed 10-01-PLAN.md (Dead Code Cleanup)

Progress: [█████████░] 90% (Milestone v1.1: 3.5/4 phases)

## Performance Metrics

**Velocity:**
- Total plans completed: 26
- Average duration: 8 min
- Total execution time: 3.18 hours

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
| 08-agent-configuration | 3 | 8 min | 3 min |
| 09-pipeline-cost | 2 | 3 min | 2 min |
| 10-agent-ux | 1 | 2 min | 2 min |

**Recent Trend:**
- Last 5 plans: 08-03 (2 min), 09-01 (2 min), 09-02 (1 min), 10-01 (2 min)

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
- Capability default 'none' for backward compatibility (existing agents work)
- Model nullable means use user's default from settings
- Composite primary key for junction tables (prevents duplicates)
- Optional capability/model props for gradual adoption (route updates in 08-03)
- traitsUpdated hidden marker for detecting empty trait submissions
- Trait context format: ## {name}\n\n{context} with --- separator
- buildSystemPrompt helper centralizes trait context injection
- Model cascade: agent.model -> apiKey.modelPreference -> default
- Unified tools: all agents have web_search + web_fetch, model infers from context (no capability dropdown)
- Pricing fallback to Sonnet if model unknown
- Pipeline uses single model for all steps (first agent's preference or user default)
- Usage accumulator pattern for multi-step token tracking
- Usage summary shows only when both usage and model present (graceful degradation)

### Pending Todos

None yet.

### Blockers/Concerns

None.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | Add Haiku and Sonnet model options | 2026-01-29 | db285b3 | [001-add-haiku-and-sonnet-model-options-to-se](./quick/001-add-haiku-and-sonnet-model-options-to-se/) |
| 002 | Show current model on agent test run | 2026-01-29 | 031fc3e | [002-show-current-model-on-agent-test-run](./quick/002-show-current-model-on-agent-test-run/) |

## Session Continuity

Last session: 2026-01-29
Stopped at: Completed 10-01-PLAN.md (Dead Code Cleanup)
Resume file: None

---
*Phase 10 Plan 01 complete. Deleted 3 unused capability files, removed AgentCapability type, removed debug console.log.*
