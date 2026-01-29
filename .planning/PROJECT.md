# Valet

## What This Is

A GUI application that wraps the Anthropic API, enabling non-technical users to create, configure, and run sequential AI agent pipelines. Users like content writers can define agents with traits (reusable context snippets), wire them into reusable templates, and execute pipelines that produce downloadable documents with cost visibility — all without writing code.

## Core Value

Non-technical users can automate repetitive multi-stage document workflows by building and running AI agent pipelines through a visual interface.

## Current State (v1.1)

**Shipped:** 2026-01-29

**What's working:**
- User authentication with encrypted API key storage
- Agent management with natural language instructions
- Traits system — reusable context snippets assignable to agents
- Per-agent model selection (defaults to user's global preference)
- Unified tools — all agents have web search + URL fetch available
- Visual pipeline builder — drag-drop agents, connect in sequence, save templates
- Pipeline execution with streaming progress and cost visibility
- Output viewing and download (text/markdown)

**Codebase:**
- ~8,600 lines of TypeScript
- Tech stack: Remix (React Router v7), PostgreSQL, Drizzle, Tailwind, shadcn/ui
- 10 phases complete (6 in v1.0, 4 in v1.1)

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

### Active

<!-- Next milestone scope -->

(Planning next milestone)

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

- **Tech stack**: Remix (React Router v7), PostgreSQL, Drizzle, @anthropic-ai/sdk, TanStack Query, Tailwind CSS, shadcn/ui, Docker Compose — already decided
- **API model**: BYOK (bring your own key) — users provide their own Anthropic API keys
- **AI provider**: Anthropic API only for v1

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Remix for full-stack | SSR, native streaming support, good DX | ✓ Good |
| PostgreSQL + Drizzle | Robust storage, type-safe ORM | ✓ Good |
| BYOK model | Avoids billing complexity, users control costs | ✓ Good |
| Sequential pipelines only | Simpler execution model for v1 | ✓ Good |
| Unified tools (no capability dropdown) | Model infers from context, simpler UX | ✓ Good |
| Traits as text (not files) | Start simple, file attachments later | — Pending |

---
*Last updated: 2026-01-29 after v1.1 milestone*
