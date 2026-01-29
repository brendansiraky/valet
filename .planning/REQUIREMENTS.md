# Requirements: Valet

**Defined:** 2025-01-28
**Core Value:** Non-technical users can automate repetitive multi-stage document workflows by building and running AI agent pipelines through a visual interface.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication & API

- [x] **AUTH-01**: User can create account with email/password
- [x] **AUTH-02**: User can log in and maintain session
- [x] **AUTH-03**: User can save Anthropic API key (encrypted, server-side)
- [x] **AUTH-04**: User can select Claude model for agents

### Agent Management

- [x] **AGNT-01**: User can create agent with natural language instructions
- [x] **AGNT-02**: User can edit agent instructions
- [x] **AGNT-03**: User can delete agents
- [x] **AGNT-04**: User can save agents to personal library
- [x] **AGNT-05**: User can view and select from saved agents

### Agent Capabilities

- [x] **CAPS-01**: Agent can generate text responses via Anthropic API
- [x] **CAPS-02**: Agent can perform web searches
- [x] **CAPS-03**: Agent can fetch and read provided URLs

### Pipeline Builder

- [x] **PIPE-01**: User can create pipeline on visual canvas
- [x] **PIPE-02**: User can add agents to pipeline by dragging from library
- [x] **PIPE-03**: User can connect agents in sequence
- [x] **PIPE-04**: User can reorder agents in pipeline
- [x] **PIPE-05**: User can save pipeline definitions
- [x] **PIPE-06**: User can load saved pipelines
- [x] **PIPE-07**: User can save pipeline as reusable template
- [x] **PIPE-08**: User can define input variables for template
- [x] **PIPE-09**: User can fill variables when running template

### Execution

- [x] **EXEC-01**: Pipeline executes agents sequentially
- [x] **EXEC-02**: Output from agent N passes as input to agent N+1
- [x] **EXEC-03**: User sees which agent is currently running
- [x] **EXEC-04**: User sees streaming output as agent responds
- [x] **EXEC-05**: User sees clear error when agent fails
- [x] **EXEC-06**: Pipeline stops on error with failure context

### Output & Export

- [x] **OUTP-01**: User can view output from each agent
- [x] **OUTP-02**: User can download final output as text
- [x] **OUTP-03**: User can download final output as markdown

## v1.1 Requirements

Requirements for milestone v1.1 (Enhanced Agents). Each maps to roadmap phases.

### App Navigation

- [x] **NAV-01**: App has persistent sidebar navigation on authenticated pages
- [x] **NAV-02**: Sidebar can be collapsed/expanded

### Traits System

- [x] **TRAIT-01**: User can create a trait (name + context text)
- [x] **TRAIT-02**: User can edit an existing trait
- [x] **TRAIT-03**: User can delete a trait
- [x] **TRAIT-04**: User can view their trait library

### Agent Configuration

- [x] **AGNT-08**: Agent has model setting (Claude models, defaults to user's global)
- [x] **AGNT-09**: Agent can have traits assigned
- [x] **AGNT-10**: Assigned trait context is included when agent executes

Note: AGNT-07 (capability dropdown) was removed. All agents now have unified tools (web search + URL fetch) — model infers from context.

### Pipeline Capabilities

- [x] **PCAP-01**: Pipeline execution supports web search capability
- [x] **PCAP-02**: Pipeline execution supports URL fetch capability

Note: Implemented via unified runWithTools — all pipeline agents have web search + URL fetch available.

### Cost Visibility

- [x] **COST-01**: User sees token count after pipeline run
- [x] **COST-02**: User sees estimated cost after pipeline run

### Agent UX

- [ ] **AGUX-01**: Test dialog input is labeled "Test input" (not "Your prompt")
- [ ] **AGUX-02**: Test dialog uses agent's capability (no dropdown)
- [ ] **AGUX-03**: Test dialog clearly indicates purpose (testing before pipeline use)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Output

- **OUTP-04**: User can download output as DOCX (Word document)
- **OUTP-05**: User can view run history with past outputs

### Agent Enhancements

- **CAPS-04**: Agent can access attached context files (style guides, reference docs)

### Execution Enhancements

- **EXEC-07**: User can pause pipeline at designated checkpoints
- **EXEC-08**: User can edit agent output before continuing to next agent

### Multi-Provider Support

- **PROV-01**: User can store multiple API keys (Anthropic, OpenAI)
- **PROV-02**: Agent model selection includes OpenAI models

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| PDF export | High complexity, defer until DOCX proves valuable |
| Full RAG/vector database | Massive complexity; "dumb RAG" kills quality - start simple |
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

### v1.0 (Complete)

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
| CAPS-01 | Phase 3 | Complete |
| CAPS-02 | Phase 3 | Complete |
| CAPS-03 | Phase 3 | Complete |
| PIPE-01 | Phase 4 | Complete |
| PIPE-02 | Phase 4 | Complete |
| PIPE-03 | Phase 4 | Complete |
| PIPE-04 | Phase 4 | Complete |
| PIPE-05 | Phase 4 | Complete |
| PIPE-06 | Phase 4 | Complete |
| PIPE-07 | Phase 4 | Complete |
| PIPE-08 | Phase 4 | Complete |
| PIPE-09 | Phase 4 | Complete |
| EXEC-01 | Phase 5 | Complete |
| EXEC-02 | Phase 5 | Complete |
| EXEC-03 | Phase 5 | Complete |
| EXEC-04 | Phase 5 | Complete |
| EXEC-05 | Phase 5 | Complete |
| EXEC-06 | Phase 5 | Complete |
| OUTP-01 | Phase 6 | Complete |
| OUTP-02 | Phase 6 | Complete |
| OUTP-03 | Phase 6 | Complete |

### v1.1 (Current)

| Requirement | Phase | Status |
|-------------|-------|--------|
| NAV-01 | Phase 7 | Complete |
| NAV-02 | Phase 7 | Complete |
| TRAIT-01 | Phase 7 | Complete |
| TRAIT-02 | Phase 7 | Complete |
| TRAIT-03 | Phase 7 | Complete |
| TRAIT-04 | Phase 7 | Complete |
| AGNT-08 | Phase 8 | Complete |
| AGNT-09 | Phase 8 | Complete |
| AGNT-10 | Phase 8 | Complete |
| PCAP-01 | Phase 9 | Complete |
| PCAP-02 | Phase 9 | Complete |
| COST-01 | Phase 9 | Complete |
| COST-02 | Phase 9 | Complete |
| AGUX-01 | Phase 10 | Pending |
| AGUX-02 | Phase 10 | Pending |
| AGUX-03 | Phase 10 | Pending |

**Coverage:**
- v1.0 requirements: 30/30 complete
- v1.1 requirements: 16/16 mapped (13 complete, AGNT-07 removed)

---
*Requirements defined: 2025-01-28*
*v1.1 requirements added: 2026-01-29*
*v1.1 traceability updated: 2026-01-29*
