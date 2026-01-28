# Requirements: Valet

**Defined:** 2025-01-28
**Core Value:** Non-technical users can automate repetitive multi-stage document workflows by building and running AI agent pipelines through a visual interface.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication & API

- [ ] **AUTH-01**: User can create account with email/password
- [ ] **AUTH-02**: User can log in and maintain session
- [ ] **AUTH-03**: User can save Anthropic API key (encrypted, server-side)
- [ ] **AUTH-04**: User can select Claude model for agents

### Agent Management

- [ ] **AGNT-01**: User can create agent with natural language instructions
- [ ] **AGNT-02**: User can edit agent instructions
- [ ] **AGNT-03**: User can delete agents
- [ ] **AGNT-04**: User can save agents to personal library
- [ ] **AGNT-05**: User can view and select from saved agents

### Agent Capabilities

- [ ] **CAPS-01**: Agent can generate text responses via Anthropic API
- [ ] **CAPS-02**: Agent can perform web searches
- [ ] **CAPS-03**: Agent can fetch and read provided URLs

### Pipeline Builder

- [ ] **PIPE-01**: User can create pipeline on visual canvas
- [ ] **PIPE-02**: User can add agents to pipeline by dragging from library
- [ ] **PIPE-03**: User can connect agents in sequence
- [ ] **PIPE-04**: User can reorder agents in pipeline
- [ ] **PIPE-05**: User can save pipeline definitions
- [ ] **PIPE-06**: User can load saved pipelines
- [ ] **PIPE-07**: User can save pipeline as reusable template
- [ ] **PIPE-08**: User can define input variables for template
- [ ] **PIPE-09**: User can fill variables when running template

### Execution

- [ ] **EXEC-01**: Pipeline executes agents sequentially
- [ ] **EXEC-02**: Output from agent N passes as input to agent N+1
- [ ] **EXEC-03**: User sees which agent is currently running
- [ ] **EXEC-04**: User sees streaming output as agent responds
- [ ] **EXEC-05**: User sees clear error when agent fails
- [ ] **EXEC-06**: Pipeline stops on error with failure context

### Output & Export

- [ ] **OUTP-01**: User can view output from each agent
- [ ] **OUTP-02**: User can download final output as text
- [ ] **OUTP-03**: User can download final output as markdown

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Output

- **OUTP-04**: User can download output as DOCX (Word document)
- **OUTP-05**: User can view run history with past outputs

### Cost & Analytics

- **COST-01**: User sees token count per agent run
- **COST-02**: User sees estimated cost per pipeline run

### Agent Enhancements

- **AGNT-06**: User can apply preset traits to agents (visual toggles)
- **CAPS-04**: Agent can access attached context files (style guides, reference docs)

### Execution Enhancements

- **EXEC-07**: User can pause pipeline at designated checkpoints
- **EXEC-08**: User can edit agent output before continuing to next agent

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| PDF export | High complexity, defer until DOCX proves valuable |
| Full RAG/vector database | Massive complexity; "dumb RAG" kills quality — start simple |
| Multi-model orchestration | Complexity explosion; Anthropic-only for v1 |
| Real-time collaboration | Massive engineering overhead; single-user focus for v1 |
| Agent-to-agent communication | Error cascading; debugging becomes impossible |
| Custom code blocks | Security nightmare; non-technical users don't need this |
| Branching/conditional logic | Dramatically increases complexity; sequential is sufficient |
| Auto-scheduling/cron | Requires job infrastructure; manual trigger for v1 |
| External integrations | Maintenance burden; export-focused approach instead |
| OAuth/social login | Email/password sufficient for v1 |
| Mobile app | Web-first |

## Constraints

| Type | Constraint | Rationale |
|------|------------|-----------|
| Framework | Remix | Full-stack React, SSR, native streaming support |
| Database | PostgreSQL | Robust, handles TEXT columns for artifacts |
| ORM | Drizzle | Type-safe, lightweight, SQL-like syntax |
| Auth | remix-auth + @oslojs/* | Lucia is deprecated; this is the recommended replacement |
| AI SDK | @anthropic-ai/sdk | Official TypeScript SDK, streaming support |
| Data Fetching | TanStack Query | Caching, mutations, optimistic updates, SSE integration |
| Styling | Tailwind CSS | Fast iteration, utility-first |
| UI Components | shadcn/ui + shadcn MCP server | Accessible, customizable, Tailwind-based; MCP server for AI-assisted UI development |
| Visual Builder | @xyflow/react (React Flow v12) | Industry standard for workflow builders |
| Job Queue | pg-boss | PostgreSQL-native, no Redis required |
| Local Dev | Docker Compose | PostgreSQL in container |
| API Model | BYOK | Users provide their own Anthropic API keys |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AGNT-01 | Phase 2 | Complete |
| AGNT-02 | Phase 2 | Complete |
| AGNT-03 | Phase 2 | Complete |
| AGNT-04 | Phase 2 | Complete |
| AGNT-05 | Phase 2 | Complete |
| CAPS-01 | Phase 3 | Pending |
| CAPS-02 | Phase 3 | Pending |
| CAPS-03 | Phase 3 | Pending |
| PIPE-01 | Phase 4 | Pending |
| PIPE-02 | Phase 4 | Pending |
| PIPE-03 | Phase 4 | Pending |
| PIPE-04 | Phase 4 | Pending |
| PIPE-05 | Phase 4 | Pending |
| PIPE-06 | Phase 4 | Pending |
| PIPE-07 | Phase 4 | Pending |
| PIPE-08 | Phase 4 | Pending |
| PIPE-09 | Phase 4 | Pending |
| EXEC-01 | Phase 5 | Pending |
| EXEC-02 | Phase 5 | Pending |
| EXEC-03 | Phase 5 | Pending |
| EXEC-04 | Phase 5 | Pending |
| EXEC-05 | Phase 5 | Pending |
| EXEC-06 | Phase 5 | Pending |
| OUTP-01 | Phase 6 | Pending |
| OUTP-02 | Phase 6 | Pending |
| OUTP-03 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 30 total
- Mapped to phases: 30
- Unmapped: 0

---
*Requirements defined: 2025-01-28*
*Last updated: 2026-01-28 after roadmap creation*
