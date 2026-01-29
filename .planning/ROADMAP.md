# Roadmap: v1.2 Multi-Provider & Artifacts

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
**Status**: Not started

**Scope:**
- OpenAI provider implementing abstraction interface
- Map OpenAI tool format to/from internal format
- Handle capability differences gracefully (best effort)
- Research OpenAI SDK patterns via docs

**Research needed:**
- OpenAI SDK streaming patterns
- Tool use format differences
- Model naming conventions

### Phase 13: Model Selection UX

**Goal**: Unified model selection across providers with clean UX
**Depends on**: Phase 12 (both providers available)
**Status**: Not started

**Scope:**
- Per-provider API key storage in settings
- Flat model dropdown with provider grouping
- Only show models for providers with configured keys
- Allow mixing providers freely in pipelines
- Update agent form with new model selector
- Orphan indicator in pipeline builder (deferred from Phase 11)

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

---

## Progress

| Phase | Plans | Status |
|-------|-------|--------|
| 11 - Provider Abstraction | 3 plans | Complete ✓ |
| 12 - OpenAI Integration | TBD | Not started |
| 13 - Model Selection UX | TBD | Not started |
| 14 - Artifact Storage | TBD | Not started |

---
*Created: 2026-01-29*
