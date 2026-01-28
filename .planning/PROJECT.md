# Valet

## What This Is

A GUI application that wraps the Anthropic API, enabling non-technical users to create, configure, and run sequential AI agent pipelines. Users like content writers can define agents (Research, Writer, Compliance, Fact Checker), wire them into reusable templates, and execute pipelines that produce downloadable documents — all without writing code.

## Core Value

Non-technical users can automate repetitive multi-stage document workflows by building and running AI agent pipelines through a visual interface.

## Current Milestone: v1.1 Enhanced Agents

**Goal:** Enhance agents with traits, full pipeline capabilities, and cost visibility

**Target features:**
- Traits system (reusable context snippets assigned to agents)
- Pipeline capabilities parity (web search + URL fetch in pipeline execution)
- Cost visibility (token counts and cost estimation per run)
- Agent UX improvements (capability on agent definition, cleaner test dialog)

## Requirements

### Validated

<!-- Shipped and confirmed valuable in v1.0 -->

- ✓ User can create account and log in — v1.0
- ✓ User can save and manage their Anthropic API key — v1.0
- ✓ User can create agents with natural language instructions — v1.0
- ✓ Agents can perform web searches (in testing) — v1.0
- ✓ Agents can browse provided URLs (in testing) — v1.0
- ✓ User can create pipeline templates by wiring agents in sequence — v1.0
- ✓ User can save and reuse agents across different pipelines — v1.0
- ✓ User can save and reuse pipeline templates — v1.0
- ✓ User can execute a pipeline and see meaningful progress updates — v1.0
- ✓ Pipeline runs sequentially, passing output from each agent to the next — v1.0
- ✓ User can download the final output document — v1.0
- ✓ User can view output from each agent in the pipeline — v1.0

### Active

<!-- Current scope for v1.1 -->

- [ ] User can create and manage reusable traits (name + context text)
- [ ] User can assign traits to agents
- [ ] Agent capabilities (web search, URL fetch) work in pipeline execution
- [ ] Capability is defined on the agent, not selected at test time
- [ ] User sees token count per pipeline run
- [ ] User sees estimated cost per pipeline run
- [ ] Test dialog is clearer about its purpose (testing vs running)

### Out of Scope

- Intervention during pipeline execution — defer to future version
- Context file attachments (upload docs) — text-based traits first, files later
- OAuth/social login — email/password sufficient
- Real-time collaboration — single-user focus
- Mobile app — web-first
- DOCX/PDF export — text/markdown sufficient for now

## Context

**Primary user (Luke):** Content writer who receives briefs, needs to research topics, write content, check compliance, and fact-check. Currently does this manually. Wants to set up agents once, then run automated pipelines that produce review-ready content.

**Agent model:** Each agent is a configured prompt with capabilities. Users write natural language instructions; the system shapes them into effective prompts. Agents are personal and specialized — Luke might have "Tech Research Agent" and "Food Research Agent" as separate agents.

**Pipeline model:** Templates wire agents together in sequence. Output from one agent feeds as input to the next. The same agent can be used in multiple pipelines.

**Execution model:** Pipelines run start-to-finish without intervention. User sees progress through stages. Final outputs are downloadable documents.

## Constraints

- **Tech stack**: Remix, PostgreSQL, Drizzle, Lucia/Remix Auth, @anthropic-ai/sdk, TanStack Query, Tailwind CSS, shadcn/ui, Docker Compose — already decided
- **API model**: BYOK (bring your own key) — users provide their own Anthropic API keys
- **AI provider**: Anthropic API only for v1

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Remix for full-stack | SSR, native streaming support, good DX | — Pending |
| PostgreSQL + Drizzle | Robust storage, type-safe ORM | — Pending |
| BYOK model | Avoids billing complexity, users control costs | — Pending |
| Sequential pipelines only | Simpler execution model for v1 | — Pending |
| Download-only output | Faster to ship, display can come later | — Pending |

---
*Last updated: 2026-01-29 after v1.1 milestone start*
