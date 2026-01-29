# Requirements: Valet

Requirements by milestone. Each maps to roadmap phases.

---

# v1.3 Agent DNA & Dynamic Traits

## Agent UX (AGUX)

- [ ] **AGUX-01**: "Instructions" field renamed to "DNA" in agent create/edit
- [ ] **AGUX-02**: Info tooltip on DNA field explains concept in layman terms
- [ ] **AGUX-03**: Trait selector removed from agent create/edit screen

## Agent Testing (TEST)

- [ ] **TEST-01**: Temporary trait picker in agent test modal
- [ ] **TEST-02**: Selected traits apply only to current test run (no persistence)

## Trait Colors (TCOL)

- [ ] **TCOL-01**: Color field added to traits
- [ ] **TCOL-02**: Preset warm color swatch picker (8-12 colors) in trait create/edit
- [ ] **TCOL-03**: Trait cards in Traits screen display assigned color

## Pipeline Builder (PIPE)

- [ ] **PIPE-01**: Left sidebar has "Agents" section and "Traits" section
- [ ] **PIPE-02**: Traits are draggable from sidebar to canvas
- [ ] **PIPE-03**: Traits attach to agent nodes (top/bottom edges)
- [ ] **PIPE-04**: Trait chips display their assigned color on agent nodes
- [ ] **PIPE-05**: Same trait can attach to multiple agents in pipeline
- [ ] **PIPE-06**: Duplicate traits on same agent handled via Set deduplication

## Data Model (DATA)

- [ ] **DATA-01**: Pipeline steps store trait IDs (not agent-level traits)
- [ ] **DATA-02**: Color field added to traits table
- [ ] **DATA-03**: Remove template variables from pipeline_templates table
- [ ] **DATA-04**: Remove variables from pipeline_runs table

## Cleanup (CLEN)

- [ ] **CLEN-01**: Remove VariableFillDialog component
- [ ] **CLEN-02**: Remove substituteVariables function from executor
- [ ] **CLEN-03**: Remove variable-related UI from template creation

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AGUX-01 | Phase 15 | Pending |
| AGUX-02 | Phase 15 | Pending |
| AGUX-03 | Phase 15 | Pending |
| TEST-01 | Phase 15 | Pending |
| TEST-02 | Phase 15 | Pending |
| CLEN-01 | Phase 15 | Pending |
| CLEN-02 | Phase 15 | Pending |
| CLEN-03 | Phase 15 | Pending |
| DATA-03 | Phase 15 | Pending |
| DATA-04 | Phase 15 | Pending |
| TCOL-01 | Phase 16 | Pending |
| TCOL-02 | Phase 16 | Pending |
| TCOL-03 | Phase 16 | Pending |
| DATA-02 | Phase 16 | Pending |
| PIPE-01 | Phase 17 | Pending |
| PIPE-02 | Phase 17 | Pending |
| PIPE-03 | Phase 17 | Pending |
| PIPE-04 | Phase 17 | Pending |
| PIPE-05 | Phase 17 | Pending |
| PIPE-06 | Phase 17 | Pending |
| DATA-01 | Phase 17 | Pending |

---
*v1.3 created: 2026-01-29*
