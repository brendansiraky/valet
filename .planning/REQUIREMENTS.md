# Requirements: Valet

Requirements by milestone. Each maps to roadmap phases.

---

# v1.2 Multi-Provider & Artifacts

## Multi-Provider Support (MPROV)

- [ ] **MPROV-01**: System has abstraction layer for AI providers
- [ ] **MPROV-02**: Anthropic provider implements abstraction layer
- [ ] **MPROV-03**: OpenAI provider implements abstraction layer
- [ ] **MPROV-04**: User can add API key per provider in settings
- [ ] **MPROV-05**: Provider gracefully handles missing capabilities (best effort parity)

## Model Selection (MODL)

- [ ] **MODL-01**: User sees flat model dropdown grouped by provider
- [ ] **MODL-02**: User can mix models from different providers in same pipeline
- [ ] **MODL-03**: Model dropdown shows only providers with configured API keys
- [ ] **MODL-04**: Default model respects user's global preference per provider

## Agent Updates (AGNT)

- [ ] **AGNT-11**: Agent-pipeline relationship is live link (not snapshot)
- [ ] **AGNT-12**: Orphan handler for deleted agents in pipelines
- [ ] **AGNT-13**: Agent can use any available model (cross-provider)

## Artifact Storage (ARTF)

- [ ] **ARTF-01**: Pipeline outputs stored in database with metadata
- [ ] **ARTF-02**: User can view past pipeline run outputs
- [ ] **ARTF-03**: Artifacts stored as structured JSONB (not plain text)
- [ ] **ARTF-04**: Artifact metadata includes run date, pipeline, cost, model

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MPROV-01 | Phase 11 | Complete |
| MPROV-02 | Phase 11 | Complete |
| MPROV-03 | Phase 12 | Pending |
| MPROV-04 | Phase 13 | Pending |
| MPROV-05 | Phase 12 | Pending |
| MODL-01 | Phase 13 | Pending |
| MODL-02 | Phase 13 | Pending |
| MODL-03 | Phase 13 | Pending |
| MODL-04 | Phase 13 | Pending |
| AGNT-11 | Phase 11 | Complete |
| AGNT-12 | Phase 11 | Complete |
| AGNT-13 | Phase 13 | Pending |
| ARTF-01 | Phase 14 | Pending |
| ARTF-02 | Phase 14 | Pending |
| ARTF-03 | Phase 14 | Pending |
| ARTF-04 | Phase 14 | Pending |

---
*v1.2 created: 2026-01-29*

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

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AGUX-01 | Phase 15 | Pending |
| AGUX-02 | Phase 15 | Pending |
| AGUX-03 | Phase 15 | Pending |
| TEST-01 | Phase 15 | Pending |
| TEST-02 | Phase 15 | Pending |
| TCOL-01 | Phase 16 | Pending |
| TCOL-02 | Phase 16 | Pending |
| TCOL-03 | Phase 16 | Pending |
| PIPE-01 | Phase 17 | Pending |
| PIPE-02 | Phase 17 | Pending |
| PIPE-03 | Phase 17 | Pending |
| PIPE-04 | Phase 17 | Pending |
| PIPE-05 | Phase 17 | Pending |
| PIPE-06 | Phase 17 | Pending |
| DATA-01 | Phase 17 | Pending |
| DATA-02 | Phase 16 | Pending |

---
*v1.3 created: 2026-01-29*
