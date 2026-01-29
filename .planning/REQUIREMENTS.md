# Requirements: Valet

Requirements by milestone. Each maps to roadmap phases.

---

# v1.3 Agent DNA & Dynamic Traits

## Agent UX (AGUX)

- [x] **AGUX-01**: "Instructions" field renamed to "DNA" in agent create/edit
- [x] **AGUX-02**: Info tooltip on DNA field explains concept in layman terms
- [x] **AGUX-03**: Trait selector removed from agent create/edit screen

## Agent Testing (TEST)

- [x] **TEST-01**: Temporary trait picker in agent test modal
- [x] **TEST-02**: Selected traits apply only to current test run (no persistence)

## Trait Colors (TCOL)

- [x] **TCOL-01**: Color field added to traits
- [x] **TCOL-02**: Preset warm color swatch picker (8-12 colors) in trait create/edit
- [x] **TCOL-03**: Trait cards in Traits screen display assigned color

## Pipeline Builder (PIPE)

- [x] **PIPE-01**: Left sidebar has "Agents" section and "Traits" section
- [x] **PIPE-02**: Traits are draggable from sidebar to canvas
- [x] **PIPE-03**: Traits attach to agent nodes (top/bottom edges)
- [x] **PIPE-04**: Trait chips display their assigned color on agent nodes
- [x] **PIPE-05**: Same trait can attach to multiple agents in pipeline
- [x] **PIPE-06**: Duplicate traits on same agent handled via Set deduplication

## Data Model (DATA)

- [x] **DATA-01**: Pipeline steps store trait IDs (not agent-level traits)
- [x] **DATA-02**: Color field added to traits table
- [x] **DATA-03**: Remove template variables from pipeline_templates table
- [x] **DATA-04**: Remove variables from pipeline_runs table

## Cleanup (CLEN)

- [x] **CLEN-01**: Remove VariableFillDialog component
- [x] **CLEN-02**: Remove substituteVariables function from executor
- [x] **CLEN-03**: Remove variable-related UI from template creation

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AGUX-01 | Phase 15 | Complete |
| AGUX-02 | Phase 15 | Complete |
| AGUX-03 | Phase 15 | Complete |
| TEST-01 | Phase 15 | Complete |
| TEST-02 | Phase 15 | Complete |
| CLEN-01 | Phase 15 | Complete |
| CLEN-02 | Phase 15 | Complete |
| CLEN-03 | Phase 15 | Complete |
| DATA-03 | Phase 15 | Complete |
| DATA-04 | Phase 15 | Complete |
| TCOL-01 | Phase 16 | Complete |
| TCOL-02 | Phase 16 | Complete |
| TCOL-03 | Phase 16 | Complete |
| DATA-02 | Phase 16 | Complete |
| PIPE-01 | Phase 17 | Complete |
| PIPE-02 | Phase 17 | Complete |
| PIPE-03 | Phase 17 | Complete |
| PIPE-04 | Phase 17 | Complete |
| PIPE-05 | Phase 17 | Complete |
| PIPE-06 | Phase 17 | Complete |
| DATA-01 | Phase 17 | Complete |

---
*v1.3 created: 2026-01-29*
