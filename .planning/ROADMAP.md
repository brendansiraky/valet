# Roadmap: Valet

## Overview

Valet delivers a visual AI agent pipeline builder in six phases: establishing secure foundation (auth, API keys), enabling agent creation and management, adding agent capabilities (LLM, search, URL fetching), building the visual pipeline canvas, implementing sequential execution with streaming progress, and finally enabling output viewing and document export. Each phase delivers a complete, testable capability that builds toward the core value of non-technical users automating document workflows.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Project setup, auth, secure API key management
- [x] **Phase 2: Agent Management** - Create, edit, save, and organize agents
- [x] **Phase 3: Agent Capabilities** - LLM responses, web search, URL fetching
- [ ] **Phase 4: Pipeline Builder** - Visual canvas for wiring agents into sequences
- [ ] **Phase 5: Execution Engine** - Run pipelines with streaming progress and error handling
- [ ] **Phase 6: Output & Export** - View agent outputs and download documents

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
- [x] 01-01-PLAN.md — Project bootstrap and database schema
- [x] 01-02-PLAN.md — Auth services (session, password, encryption, authenticator)
- [x] 01-03-PLAN.md — Auth routes and settings UI

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
- [x] 02-01-PLAN.md — Database schema and UI components
- [x] 02-02-PLAN.md — Agent CRUD route and dashboard integration

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
- [x] 03-01-PLAN.md — Agent runner and text generation capability
- [x] 03-02-PLAN.md — Web search and URL fetch capabilities
- [x] 03-03-PLAN.md — Agent execution API and testing UI

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
**Plans**: 4 plans

Plans:
- [ ] 04-01-PLAN.md — Pipeline infrastructure (dependencies, schema, store)
- [ ] 04-02-PLAN.md — Visual canvas UI and drag-drop agent placement
- [ ] 04-03-PLAN.md — Pipeline persistence (save, load, delete)
- [ ] 04-04-PLAN.md — Templates and input variables

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
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD
- [ ] 05-03: TBD

### Phase 6: Output & Export
**Goal**: Users can view and download the documents their pipelines produce
**Depends on**: Phase 5
**Requirements**: OUTP-01, OUTP-02, OUTP-03
**Success Criteria** (what must be TRUE):
  1. User can view the output from each agent in the pipeline
  2. User can download the final output as a text file
  3. User can download the final output as a markdown file
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete | 2026-01-28 |
| 2. Agent Management | 2/2 | Complete | 2026-01-28 |
| 3. Agent Capabilities | 3/3 | Complete | 2026-01-28 |
| 4. Pipeline Builder | 0/4 | Not started | - |
| 5. Execution Engine | 0/3 | Not started | - |
| 6. Output & Export | 0/2 | Not started | - |

---
*Roadmap created: 2026-01-28*
*Depth: standard (5-8 phases)*
*Coverage: 30/30 v1 requirements mapped*
