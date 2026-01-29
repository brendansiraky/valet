# Valet

## What This Is

A GUI application that wraps the Anthropic and OpenAI APIs, enabling non-technical users to create, configure, and run sequential AI agent pipelines. Users like content writers can define agents with traits (reusable context snippets), wire them into reusable templates, and execute pipelines that produce downloadable documents with cost visibility — all without writing code.

## Core Value

Non-technical users can automate repetitive multi-stage document workflows by building and running AI agent pipelines through a visual interface.

## Current State (v1.2 shipped)

**v1.2 shipped:** 2026-01-29

**What's working:**
- User authentication with encrypted API key storage (Anthropic + OpenAI)
- Agent management with natural language instructions
- Traits system — reusable context snippets assignable to agents
- Per-agent model selection with multi-provider support
- Unified tools — all agents have web search + URL fetch available
- Visual pipeline builder — drag-drop agents, connect in sequence, save templates
- Pipeline execution with streaming progress and cost visibility
- Orphan detection — fail-fast when pipelines reference deleted agents
- Artifact storage — pipeline outputs stored with metadata, viewable at /artifacts
- Output viewing and download (text/markdown)

**v1.3 focus:** Agent DNA (human-centric naming), dynamic pipeline traits, trait colors

**Codebase:**
- ~8,500 lines of TypeScript
- Tech stack: Remix (React Router v7), PostgreSQL, Drizzle, Tailwind, shadcn/ui
- 14 phases complete (6 in v1.0, 4 in v1.1, 4 in v1.2)

## Requirements

### Validated

<!-- Shipped and confirmed valuable -->

- ✓ User can create account and log in — v1.0
- ✓ User can save and manage their Anthropic API key — v1.0
- ✓ User can create agents with natural language instructions — v1.0
- ✓ Agents can perform web searches — v1.0 (testing), v1.1 (pipeline)
- ✓ Agents can browse provided URLs — v1.0 (testing), v1.1 (pipeline)
- ✓ User can create pipeline templates by wiring agents in sequence — v1.0
- ✓ User can save and reuse agents across different pipelines — v1.0
- ✓ User can save and reuse pipeline templates — v1.0
- ✓ User can execute a pipeline and see meaningful progress updates — v1.0
- ✓ Pipeline runs sequentially, passing output from each agent to the next — v1.0
- ✓ User can download the final output document — v1.0
- ✓ User can view output from each agent in the pipeline — v1.0
- ✓ App has persistent sidebar navigation on authenticated pages — v1.1
- ✓ User can create and manage reusable traits — v1.1
- ✓ User can assign traits to agents — v1.1
- ✓ User can set model per agent — v1.1
- ✓ User sees token count per pipeline run — v1.1
- ✓ User sees estimated cost per pipeline run — v1.1
- ✓ User can add API keys for multiple providers (Anthropic, OpenAI) — v1.2
- ✓ User can select models from any configured provider — v1.2
- ✓ Agents can use models from different providers in same pipeline — v1.2
- ✓ Pipeline outputs are stored and viewable later — v1.2
- ✓ Deleted agents are handled gracefully in existing pipelines — v1.2

### Active

<!-- v1.3 scope -->

**v1.3 Agent DNA & Dynamic Traits:**
- [ ] Agent instructions renamed to "DNA" with explanatory tooltip
- [ ] Traits assigned per-pipeline-step (not per-agent)
- [ ] Traits draggable in pipeline builder, attach to agent nodes
- [ ] Traits have assignable colors (warm preset palette)
- [ ] Agent testing includes temporary trait picker
- [ ] Trait context formatted with named headers ("Your assigned traits: **Trait Name**: content")
- [ ] Pipeline runs require initial prompt input (kickoff command to first agent)
- [ ] Remove redundant "Save Template" modal (existing Save button sufficient)

### Out of Scope

- Intervention during pipeline execution — defer to future version
- Context file attachments (upload docs) — text-based traits first, files later
- OAuth/social login — email/password sufficient
- Real-time collaboration — single-user focus
- Mobile app — web-first
- DOCX/PDF export — text/markdown sufficient for now

## Context

**Primary user (Luke):** Content writer who receives briefs, needs to research topics, write content, check compliance, and fact-check. Currently does this manually. Wants to set up agents once, then run automated pipelines that produce review-ready content.

**Agent model:** Each agent is a configured prompt with optional traits. Users write natural language instructions; the system shapes them into effective prompts. All agents have web search and URL fetch available — the model decides when to use them based on context.

**Pipeline model:** Templates wire agents together in sequence. Output from one agent feeds as input to the next. The same agent can be used in multiple pipelines.

**Execution model:** Pipelines run start-to-finish without intervention. User sees progress through stages. Final outputs are downloadable documents with cost information.

## Constraints

- **Tech stack**: Remix (React Router v7), PostgreSQL, Drizzle, @anthropic-ai/sdk, openai, TanStack Query, Tailwind CSS, shadcn/ui, Docker Compose — already decided
- **API model**: BYOK (bring your own key) — users provide their own API keys
- **AI providers**: Anthropic and OpenAI APIs for v1.2+

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Remix for full-stack | SSR, native streaming support, good DX | ✓ Good |
| PostgreSQL + Drizzle | Robust storage, type-safe ORM | ✓ Good |
| BYOK model | Avoids billing complexity, users control costs | ✓ Good |
| Sequential pipelines only | Simpler execution model for v1 | ✓ Good |
| Unified tools (no capability dropdown) | Model infers from context, simpler UX | ✓ Good |
| Traits as text (not files) | Start simple, file attachments later | — Pending |
| Provider abstraction layer | Clean separation enables multi-provider | ✓ Good |
| Factory pattern for providers | Need API key at construction | ✓ Good |
| JSONB for artifacts | Structured storage, queryable, extensible | ✓ Good |
| View-only artifacts | Start simple, add editing later | — Pending |

---
*Last updated: 2026-01-29 after v1.2 milestone*
