# Roadmap: Valet

Current milestone roadmaps. Phases continue across milestones.

---

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-01-28)
- ✅ **v1.1 Enhanced Agents** — Phases 7-10 (shipped 2026-01-29)
- ✅ **v1.2 Multi-Provider & Artifacts** — Phases 11-14 (shipped 2026-01-29)
- 📋 **v1.3 Agent DNA & Dynamic Traits** — Phases 15-17 (planned)

---

# v1.3 Agent DNA & Dynamic Traits

**Status:** Planned
**Phases:** 15-17
**Depends on:** v1.2 (complete)

## Overview

Milestone v1.3 improves UX for non-technical users through human-centric naming ("DNA" instead of "Instructions"), moves trait assignment from agent-level to pipeline-level for more flexibility, and adds visual trait customization with colors.

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
| Remove template variables | Over-engineered; DNA + traits + flow is sufficient, simplifies UX |

---

## Progress

| Phase | Requirements | Status |
|-------|--------------|--------|
| 15 - Agent DNA & Simplification | 10 | Complete |
| 16 - Trait Colors | 4 | Not started |
| 17 - Dynamic Pipeline Traits | 7 | Not started |

---
*v1.3 created: 2026-01-29*
