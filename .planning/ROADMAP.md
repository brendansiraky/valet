# Roadmap: Valet

Current milestone roadmaps. Phases continue across milestones.

---

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-01-28)
- ✅ **v1.1 Enhanced Agents** — Phases 7-10 (shipped 2026-01-29)
- ✅ **v1.2 Multi-Provider & Artifacts** — Phases 11-14 (shipped 2026-01-29)
- ✅ **v1.3 Agent DNA & Dynamic Traits** — Phases 15-18 (shipped 2026-01-30)
- ✅ **v1.4 State Architecture Cleanup** — Phase 19 (shipped 2026-01-30)

---

# v1.3 Agent DNA & Dynamic Traits

**Status:** Complete
**Phases:** 15-18
**Depends on:** v1.2 (complete)
**Shipped:** 2026-01-30

## Overview

Milestone v1.3 improves UX for non-technical users through human-centric naming ("DNA" instead of "Instructions"), moves trait assignment from agent-level to pipeline-level for more flexibility, adds visual trait customization with colors, and introduces conditional routing with decision agents for dynamic pipeline flows.

## Phases

### Phase 15: Agent DNA & Simplification

**Goal:** Rename "Instructions" to "DNA", add test trait picker, remove template variable system
**Depends on:** v1.2 complete
**Status:** Complete
**Plans:** 4 plans

Plans:
- [x] 15-01-PLAN.md — DNA rename + tooltip, trait picker in test dialog
- [x] 15-02-PLAN.md — Remove variables from database schema
- [x] 15-03-PLAN.md — Remove variable system from executor and pipeline routes
- [x] 15-04-PLAN.md — Delete variable dialog components and template API

**Scope:**
- Rename "Instructions" field to "DNA" in agent create/edit forms
- Add (i) tooltip explaining DNA in human terms
- Remove trait selector from agent create/edit screen (traits move to pipelines)
- Add temporary trait picker in agent test modal
- Test runs apply selected traits without persisting
- **Remove template variable system entirely:**
  - Delete VariableFillDialog component
  - Remove substituteVariables function from executor
  - Remove variable UI from template creation
  - Remove variables columns from DB (pipeline_templates, pipeline_runs)

**Requirements:** AGUX-01, AGUX-02, AGUX-03, TEST-01, TEST-02, CLEN-01, CLEN-02, CLEN-03, DATA-03, DATA-04

**Success Criteria:**
1. User sees "DNA" label with explanatory tooltip on agent form
2. Agent form has no trait selector
3. User can select traits temporarily when testing an agent
4. Test uses DNA + selected traits, then clears trait selection on close
5. No `{{placeholder}}` variable system exists — pipelines run without variable dialog
6. Pipeline execution relies on DNA + traits + output flow only

### Phase 16: Trait Colors

**Goal:** Add color customization to traits with warm preset palette
**Depends on:** Phase 15
**Status:** Complete
**Plans:** 1 plan

Plans:
- [x] 16-01-PLAN.md — Add color field, swatch picker, and card display

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
**Status:** Complete
**Plans:** 3 plans

Plans:
- [x] 17-01-PLAN.md — Store extension and sidebar traits section
- [x] 17-02-PLAN.md — Node drop handling and trait chip display
- [x] 17-03-PLAN.md — Execution integration with pipeline-level traits

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

### Phase 18: Pipeline Tabs

**Goal:** Enable multi-pipeline editing with browser-style tabs
**Depends on:** Phase 17
**Status:** Complete
**Plans:** 4 plans

Plans:
- [x] 18-01-PLAN.md — Tab store + multi-pipeline store refactor (foundation)
- [x] 18-02-PLAN.md — Tab bar component + tab panels with CSS hiding
- [x] 18-03-PLAN.md — Autosave hook + route refactor to tab container
- [x] 18-04-PLAN.md — Running pipeline warning + pipelines list integration

**Scope:**
- Add tab bar below app nav, spanning content area width
- Browser-style tabs with rounded top corners, active tab connected to content
- Each tab shows pipeline name (truncated) with close button on hover
- Tabs keep PipelineEditor mounted but CSS-hidden when inactive (preserves state)
- Maximum 8 open tabs (prevents memory issues)
- Prevent duplicate tabs — opening already-open pipeline focuses existing tab
- Autosave: immediate save on every canvas change (node add/move/delete, edge changes)
- AgentSidebar shared across all tabs (outside tab content area)
- Pipeline header and canvas are per-tab
- Route: /pipelines/{id} with localStorage for tab set
- New tab (+) creates "Untitled Pipeline" in DB immediately
- Browser refresh restores all tabs from localStorage, active from URL
- Warn before closing tab with active run

**Requirements:** TABS-01, TABS-02, TABS-03, TABS-04, TABS-05, TABS-06, TABS-07, TABS-08, TABS-09, TABS-10

**Success Criteria:**
1. User can open multiple pipelines as tabs from /pipelines list
2. Switching tabs preserves all state (nodes, edges, run state)
3. Running pipelines continue when switching to another tab
4. Canvas changes trigger immediate autosave
5. Tab bar shows pipeline names with close buttons
6. Opening same pipeline focuses existing tab instead of creating duplicate
7. Maximum 8 tabs enforced with user-friendly message
8. Browser refresh restores previously open tabs
9. Closing tab with active run shows confirmation warning
10. New tab button creates and opens "Untitled Pipeline" immediately

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
| Remove template variables | Over-engineered; DNA + traits + flow is sufficient, simplifies UX |
| CSS-hidden inactive tabs | Keep editors mounted for state preservation, simpler than state refactoring |
| Immediate autosave | Maximum durability, no unsaved changes to track |
| Shared AgentSidebar | Agents/traits are global resources, no need for per-tab sidebar |
| localStorage for tab set | Decouples tab memory from URL, enables future server-side run reconnection |
| 8 tab limit | Balances flexibility with memory constraints from multiple React Flow canvases |

---

## Progress

| Phase | Requirements | Status |
|-------|--------------|--------|
| 15 - Agent DNA & Simplification | 10 | Complete |
| 16 - Trait Colors | 4 | Complete |
| 17 - Dynamic Pipeline Traits | 7 | Complete |
| 18 - Pipeline Tabs | 10 | Complete |

---
*v1.3 created: 2026-01-29*
*v1.3 shipped: 2026-01-30*

---

# v1.4 State Architecture Cleanup

**Status:** Complete
**Phases:** 19
**Depends on:** v1.3 (complete)
**Shipped:** 2026-01-30

## Overview

The pipeline builder screen incorrectly uses Zustand to manage server state that should be handled by React Query. This creates a problematic dual-store pattern where backend data is duplicated into Zustand, causing decoupling and potential sync issues. This milestone removes the pipeline-store entirely and moves all pipeline data management to React Query with proper optimistic updates.

## Phases

### Phase 19: Remove Zustand from Pipeline Builder

**Goal:** Eliminate pipeline-store.ts and manage all pipeline data through React Query
**Depends on:** v1.3 complete
**Status:** Complete
**Plans:** 4 plans

Plans:
- [x] 19-01-PLAN.md — Create usePipelineFlow hook (foundation)
- [x] 19-02-PLAN.md — Migrate PipelineTabPanel and PipelineCanvas
- [x] 19-03-PLAN.md — Migrate AgentNode, route file, delete pipeline-store
- [x] 19-04-PLAN.md — Update tests for new mocking approach

**Scope:**
- Delete `app/stores/pipeline-store.ts` entirely
- React Flow nodes/edges stored in React Query cache as `flowData`
- React Flow callbacks update cache directly via optimistic mutations
- Pipeline name/description edits use mutations with optimistic updates
- Node add/remove operations use mutations
- Trait assignment to nodes uses mutations
- Tab state (which pipelines are open) remains in Zustand (this is UI state, not server state)
- Multi-pipeline editing uses React Query's cache keyed by `["pipelines", id]`

**Key Insight:** The Zustand store was introduced as an intermediary between React Query and React Flow, but this is unnecessary. React Query can directly hold the `flowData` and components can read/write it via queries and mutations.

**Requirements:**
- ARCH-01: All pipeline data flows through React Query, not Zustand
- ARCH-02: React Flow state (nodes/edges) stored in query cache
- ARCH-03: Mutations with optimistic updates for instant UI feedback
- ARCH-04: Tab store (UI state) remains separate from pipeline data
- ARCH-05: No regression in autosave behavior
- ARCH-06: No regression in multi-tab editing

**Success Criteria:**
1. `app/stores/pipeline-store.ts` is deleted
2. All pipeline data reads use `usePipeline(id)` query
3. All pipeline data writes use mutations with optimistic updates
4. React Flow nodes/edges come from query cache `data.flowData`
5. Tab switching uses React Query cache (no Zustand state transfer)
6. Existing tests pass with updated mocking approach
7. TypeScript compiles with zero errors

---

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Delete pipeline-store entirely | Clean break — intermediate refactors create technical debt |
| React Query holds flowData directly | Single source of truth for server state |
| Optimistic mutations for edits | Maintains instant UI feedback without Zustand intermediary |
| Keep tab-store for UI state | Tabs are UI concern, not server state |

---

## Progress

| Phase | Requirements | Status |
|-------|--------------|--------|
| 19 - Remove Zustand from Pipeline Builder | 6 | Complete |

---
*v1.4 created: 2026-01-30*
*v1.4 shipped: 2026-01-30*
