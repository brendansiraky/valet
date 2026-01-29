# Roadmap: Valet

## Overview

Valet delivers a visual AI agent pipeline builder. Milestone v1.0 (Phases 1-6) established the core: auth, agent management, capabilities, pipeline builder, execution engine, and output export. Milestone v1.1 (Phases 7-10) enhances agents with traits (reusable context snippets), full capability configuration, pipeline capability parity, cost visibility, and improved test UX.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

### v1.0 (Complete)

- [x] **Phase 1: Foundation** - Project setup, auth, secure API key management
- [x] **Phase 2: Agent Management** - Create, edit, save, and organize agents
- [x] **Phase 3: Agent Capabilities** - LLM responses, web search, URL fetching
- [x] **Phase 4: Pipeline Builder** - Visual canvas for wiring agents into sequences
- [x] **Phase 5: Execution Engine** - Run pipelines with streaming progress and error handling
- [x] **Phase 6: Output & Export** - View agent outputs and download documents

### v1.1 (Current)

- [x] **Phase 7: Navigation & Traits** - Sidebar navigation and reusable context snippets
- [x] **Phase 8: Agent Configuration** - Capability, model, and trait settings per agent
- [x] **Phase 9: Pipeline & Cost** - Capabilities in pipeline execution, cost visibility
- [ ] **Phase 10: Agent UX** - Dead code cleanup and UX polish

## Phase Details

### Phase 1: Foundation
**Goal**: Users can securely authenticate and configure their Anthropic API access
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. User can create an account with email and password
  2. User can log in and remain authenticated across browser sessions
  3. User can save their Anthropic API key (stored encrypted server-side)
  4. User can select which Claude model to use for their agents
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md - Project bootstrap and database schema
- [x] 01-02-PLAN.md - Auth services (session, password, encryption, authenticator)
- [x] 01-03-PLAN.md - Auth routes and settings UI

### Phase 2: Agent Management
**Goal**: Users can create and organize a personal library of reusable agents
**Depends on**: Phase 1
**Requirements**: AGNT-01, AGNT-02, AGNT-03, AGNT-04, AGNT-05
**Success Criteria** (what must be TRUE):
  1. User can create a new agent by writing natural language instructions
  2. User can edit an existing agent's instructions
  3. User can delete agents they no longer need
  4. User can view their saved agents and select one for use
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md - Database schema and UI components
- [x] 02-02-PLAN.md - Agent CRUD route and dashboard integration

### Phase 3: Agent Capabilities
**Goal**: Agents can perform useful work via LLM, web search, and URL reading
**Depends on**: Phase 2
**Requirements**: CAPS-01, CAPS-02, CAPS-03
**Success Criteria** (what must be TRUE):
  1. Agent can generate text responses by calling the Anthropic API
  2. Agent can perform web searches and incorporate results
  3. Agent can fetch and read content from provided URLs
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md - Agent runner and text generation capability
- [x] 03-02-PLAN.md - Web search and URL fetch capabilities
- [x] 03-03-PLAN.md - Agent execution API and testing UI

### Phase 4: Pipeline Builder
**Goal**: Users can visually construct pipelines by arranging and connecting agents
**Depends on**: Phase 2
**Requirements**: PIPE-01, PIPE-02, PIPE-03, PIPE-04, PIPE-05, PIPE-06, PIPE-07, PIPE-08, PIPE-09
**Success Criteria** (what must be TRUE):
  1. User can create a pipeline on a visual canvas
  2. User can drag agents from their library onto the canvas
  3. User can connect agents in sequence and reorder them
  4. User can save pipeline definitions and load them later
  5. User can save a pipeline as a reusable template with input variables
**Plans**: 5 plans

Plans:
- [x] 04-01-PLAN.md - Pipeline infrastructure (dependencies, schema, store)
- [x] 04-02-PLAN.md - Visual canvas UI and drag-drop agent placement
- [x] 04-03-PLAN.md - Pipeline persistence (save, load, delete)
- [x] 04-04-PLAN.md - Templates and input variables
- [x] 04-05-PLAN.md - Gap closure: TemplateDialog loads saved variables

### Phase 5: Execution Engine
**Goal**: Users can run pipelines and observe progress in real-time
**Depends on**: Phase 3, Phase 4
**Requirements**: EXEC-01, EXEC-02, EXEC-03, EXEC-04, EXEC-05, EXEC-06
**Success Criteria** (what must be TRUE):
  1. Pipeline executes agents sequentially, passing output from one to the next
  2. User sees which agent is currently running
  3. User sees streaming output as each agent responds
  4. User sees clear error messages when an agent fails
  5. Pipeline stops on error and provides failure context
**Plans**: 3 plans

Plans:
- [x] 05-01-PLAN.md - Execution infrastructure (schema, emitter, executor)
- [x] 05-02-PLAN.md - Run API and SSE streaming endpoints
- [x] 05-03-PLAN.md - Progress UI and pipeline integration

### Phase 6: Output & Export
**Goal**: Users can view and download the documents their pipelines produce
**Depends on**: Phase 5
**Requirements**: OUTP-01, OUTP-02, OUTP-03
**Success Criteria** (what must be TRUE):
  1. User can view the output from each agent in the pipeline
  2. User can download the final output as a text file
  3. User can download the final output as a markdown file
**Plans**: 2 plans

Plans:
- [x] 06-01-PLAN.md - Dependencies, download utilities, and MarkdownViewer component
- [x] 06-02-PLAN.md - OutputViewer component and pipeline page integration

### Phase 7: Navigation & Traits
**Goal**: App has persistent navigation and users can create reusable context snippets
**Depends on**: Phase 1 (user authentication)
**Requirements**: NAV-01, NAV-02, TRAIT-01, TRAIT-02, TRAIT-03, TRAIT-04
**Success Criteria** (what must be TRUE):
  1. Authenticated pages have persistent sidebar navigation
  2. Sidebar can be collapsed/expanded
  3. User can create a new trait with a name and context text
  4. User can edit an existing trait's name and context
  5. User can delete traits they no longer need
  6. User can view their trait library and browse available traits
**Plans**: 2 plans

Plans:
- [x] 07-01-PLAN.md - Sidebar navigation and authenticated layout
- [x] 07-02-PLAN.md - Traits database schema and CRUD UI

### Phase 8: Agent Configuration
**Goal**: Users can configure agents with model and trait settings
**Depends on**: Phase 7 (traits must exist before assignment)
**Requirements**: AGNT-08, AGNT-09, AGNT-10
**Success Criteria** (what must be TRUE):
  1. User can set model per agent (defaults to global setting)
  2. User can assign traits to agents
  3. Agent execution includes assigned trait context in the prompt
  4. All agents have access to web search and URL fetch (model infers from context)
**Plans**: 3 plans

Plans:
- [x] 08-01-PLAN.md - Schema extension (model column, agent-traits junction table)
- [x] 08-02-PLAN.md - Agent form UI (model/traits configuration)
- [x] 08-03-PLAN.md - Data integration (loader/action, trait context in execution)

### Phase 9: Pipeline & Cost
**Goal**: Pipeline execution uses unified tools and shows cost information
**Depends on**: Phase 5 (execution engine), Phase 8 (agent configuration)
**Requirements**: COST-01, COST-02
**Success Criteria** (what must be TRUE):
  1. Pipeline execution uses the unified runWithTools (web search + URL fetch available)
  2. User sees token count after pipeline completes
  3. User sees estimated cost after pipeline completes
**Plans**: 2 plans

Plans:
- [x] 09-01-PLAN.md - Pricing module and unified tools executor
- [x] 09-02-PLAN.md - Cost display in pipeline completion UI

### Phase 10: Polish & Cleanup
**Goal**: Clean codebase with unused capability files removed and no debug artifacts
**Depends on**: Phase 9
**Requirements**: None (polish phase)
**Success Criteria** (what must be TRUE):
  1. Remove unused capability-related code paths
  2. Clean up old separate capability service files if no longer needed
  3. Final review of agent/pipeline UX
**Plans**: 1 plan

Plans:
- [ ] 10-01-PLAN.md - Delete unused capability files and remove dead code

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10

### v1.0 Progress (Complete)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete | 2026-01-28 |
| 2. Agent Management | 2/2 | Complete | 2026-01-28 |
| 3. Agent Capabilities | 3/3 | Complete | 2026-01-28 |
| 4. Pipeline Builder | 5/5 | Complete | 2026-01-28 |
| 5. Execution Engine | 3/3 | Complete | 2026-01-28 |
| 6. Output & Export | 2/2 | Complete | 2026-01-28 |

### v1.1 Progress (Current)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 7. Navigation & Traits | 2/2 | Complete | 2026-01-29 |
| 8. Agent Configuration | 3/3 | Complete | 2026-01-29 |
| 9. Pipeline & Cost | 2/2 | Complete | 2026-01-29 |
| 10. Polish & Cleanup | 0/1 | Planned | - |

---
*Roadmap created: 2026-01-28*
*v1.1 phases added: 2026-01-29*
*Phase 10 planned: 2026-01-29*
*Depth: standard (5-8 phases per milestone)*
*Coverage: v1.0 30/30, v1.1 17/17 requirements mapped*
