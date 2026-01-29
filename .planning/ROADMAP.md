# Roadmap: Valet

Current milestone roadmaps. Phases continue across milestones.

---

# v1.2 Multi-Provider & Artifacts

**Status:** In Progress
**Phases:** 11-14
**Depends on:** v1.1 (complete)

## Overview

Milestone v1.2 adds multi-provider support (Anthropic + OpenAI), improved model selection UX, live agent-pipeline relationships, and persistent artifact storage.

## Phases

### Phase 11: Provider Abstraction Layer

**Goal**: Create abstraction layer for AI providers with Anthropic as first implementation
**Depends on**: v1.1 complete
**Status**: Complete ✓
**Completed**: 2026-01-29
**Plans:** 3 plans

Plans:
- [x] 11-01-PLAN.md — Provider types, registry, and Anthropic implementation
- [x] 11-02-PLAN.md — Refactor services to use provider abstraction
- [x] 11-03-PLAN.md — Orphan detection for deleted agents (backend only)

**Scope:**
- Provider interface defining common operations (chat, tools, streaming)
- Anthropic provider implementing the interface
- Refactor existing code to use abstraction layer
- Orphan detection: fail-fast when pipelines reference deleted agents (backend)
- Orphan UI indicator deferred to Phase 13

**Key files to modify:**
- New: `app/lib/providers/` directory structure
- Modify: `app/services/pipeline-executor.server.ts`
- Modify: `app/services/job-queue.server.ts`

### Phase 12: OpenAI Integration

**Goal**: Add OpenAI as second provider with feature parity where possible
**Depends on**: Phase 11 (abstraction layer)
**Status**: Complete ✓
**Completed**: 2026-01-29
**Plans:** 2 plans

Plans:
- [x] 12-01-PLAN.md — Install SDK, create OpenAI provider, update registry
- [x] 12-02-PLAN.md — Wire into pipeline executor, verify integration

**Scope:**
- OpenAI provider implementing abstraction interface
- Map OpenAI message format to/from internal format
- Handle capability differences gracefully (skip unsupported tools with warning)
- Registry detection for gpt-*/o3-*/o4-* models

**Key files:**
- New: `app/lib/providers/openai.ts`
- Modify: `app/lib/models.ts`, `app/lib/providers/registry.ts`
- Modify: `app/services/pipeline-executor.server.ts`

### Phase 13: Model Selection UX

**Goal**: Unified model selection across providers with clean UX
**Depends on**: Phase 12 (both providers available)
**Status**: Complete ✓
**Completed**: 2026-01-29
**Plans:** 2 plans

Plans:
- [x] 13-01-PLAN.md — Create ModelSelector component, integrate into agent form
- [x] 13-02-PLAN.md — Update settings page model selector with provider grouping

**Scope:**
- ~~Per-provider API key storage in settings~~ (done in Phase 12)
- Flat model dropdown with provider grouping
- Only show models for providers with configured keys
- Allow mixing providers freely in pipelines
- Update agent form with new model selector
- ~~Orphan indicator in pipeline builder~~ (done in Quick 003)

### Phase 14: Artifact Storage

**Goal**: Persist pipeline outputs for later viewing
**Depends on**: Phase 11 (can run in parallel with 12-13)
**Status**: Not started

**Scope:**
- Database schema for artifacts (JSONB storage)
- Store outputs with metadata (date, pipeline, cost, model used)
- Artifact viewer UI (view-only for v1.2, edit/branch deferred)
- Link artifacts to pipeline runs

**Deferred to v1.3+:**
- Edit artifacts
- Branch from artifacts
- Compare artifact versions

---

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Abstraction layer first | Clean separation before adding providers |
| Live agent-pipeline link | Users expect edits to agents to reflect in pipelines |
| Orphan handler backend-first | Fail fast at execution; UI indicator with pipeline builder work |
| One key per provider | Simple settings UX, no complex key management |
| Flat dropdown with grouping | Easier to scan than nested menus |
| Best effort feature parity | Don't block on edge cases, handle gracefully |
| JSONB for artifacts | Structured storage, queryable, extensible |
| View-only artifacts | Start simple, add editing later |
| Chat Completions API (not Responses) | Simpler, matches message-based interface |
| Skip unsupported tools with warning | Don't crash on web_fetch/web_search for OpenAI |

---

## Progress

| Phase | Plans | Status |
|-------|-------|--------|
| 11 - Provider Abstraction | 3 plans | Complete ✓ |
| 12 - OpenAI Integration | 2 plans | Complete ✓ |
| 13 - Model Selection UX | 2 plans | Complete ✓ |
| 14 - Artifact Storage | TBD | Not started |

---
*v1.2 created: 2026-01-29*

---

# v1.3 Agent DNA & Dynamic Traits

**Status:** Planned
**Phases:** 15-17
**Depends on:** v1.2 (in progress)

## Overview

Milestone v1.3 improves UX for non-technical users through human-centric naming ("DNA" instead of "Instructions"), moves trait assignment from agent-level to pipeline-level for more flexibility, and adds visual trait customization with colors.

## Phases

### Phase 15: Agent DNA & Testing UX

**Goal:** Rename "Instructions" to "DNA" with layman-friendly tooltip, add temporary trait picker for agent testing
**Depends on:** v1.2 complete
**Status:** Not started

**Scope:**
- Rename "Instructions" field to "DNA" in agent create/edit forms
- Add (i) tooltip explaining DNA in human terms
- Remove trait selector from agent create/edit screen (traits move to pipelines)
- Add temporary trait picker in agent test modal
- Test runs apply selected traits without persisting

**Requirements:** AGUX-01, AGUX-02, AGUX-03, TEST-01, TEST-02

**Success Criteria:**
1. User sees "DNA" label with explanatory tooltip on agent form
2. Agent form has no trait selector
3. User can select traits temporarily when testing an agent
4. Test uses DNA + selected traits, then clears trait selection on close

### Phase 16: Trait Colors

**Goal:** Add color customization to traits with warm preset palette
**Depends on:** Phase 15
**Status:** Not started

**Scope:**
- Add color field to traits database table
- Add preset color swatch picker (8-12 warm colors) in trait create/edit
- Display trait color on trait cards in Traits screen
- Migration: existing traits get default color

**Requirements:** TCOL-01, TCOL-02, TCOL-03, DATA-02

**Success Criteria:**
1. User can select a color when creating/editing a trait
2. Color swatches are warm/pleasant (not harsh primary colors)
3. Trait cards visually display their assigned color
4. Existing traits have a default color after migration

### Phase 17: Dynamic Pipeline Traits

**Goal:** Enable drag-and-drop trait assignment per pipeline step
**Depends on:** Phase 16
**Status:** Not started

**Scope:**
- Add "Traits" section to pipeline builder sidebar (below Agents)
- Make traits draggable from sidebar
- Traits attach to agent node edges (top/bottom) as visual chips
- Trait chips display their assigned color
- Same trait can attach to multiple agents
- Set deduplication prevents duplicate traits on same agent
- Pipeline step data model stores trait IDs
- Remove/migrate any agent-level trait associations

**Requirements:** PIPE-01, PIPE-02, PIPE-03, PIPE-04, PIPE-05, PIPE-06, DATA-01

**Success Criteria:**
1. Pipeline builder sidebar shows Agents section and Traits section
2. User can drag a trait from sidebar to any agent node
3. Trait appears as colored chip attached to agent node
4. Same trait can be on multiple agents in the pipeline
5. Dropping duplicate trait on same agent is silently ignored
6. Pipeline execution uses traits attached to each step

---

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| "DNA" naming | Human metaphor for agent's core identity — accessible to non-technical users |
| Traits at pipeline-level | More flexible — same agent can have different traits in different pipelines |
| Temporary trait picker for testing | Allows testing trait combos without polluting agent config |
| Preset swatches only | Simpler UX, ensures consistent warm aesthetic |
| Set deduplication | Simplest approach — drop succeeds, duplicates naturally ignored |
| Traits attach to node edges | Clear visual association without cluttering the flow diagram |

---

## Progress

| Phase | Requirements | Status |
|-------|--------------|--------|
| 15 - Agent DNA & Testing | 5 | Not started |
| 16 - Trait Colors | 4 | Not started |
| 17 - Dynamic Pipeline Traits | 8 | Not started |

---
*v1.3 created: 2026-01-29*
