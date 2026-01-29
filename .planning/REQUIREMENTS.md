# Requirements: v1.2 Multi-Provider & Artifacts

Requirements for milestone v1.2. Each maps to roadmap phases.

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
*Created: 2026-01-29 for v1.2 milestone*
