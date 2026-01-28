# Valet

## What This Is

A GUI application that wraps the Anthropic API, enabling non-technical users to create, configure, and run sequential AI agent pipelines. Users like content writers can define agents (Research, Writer, Compliance, Fact Checker), wire them into reusable templates, and execute pipelines that produce downloadable documents — all without writing code.

## Core Value

Non-technical users can automate repetitive multi-stage document workflows by building and running AI agent pipelines through a visual interface.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can create account and log in
- [ ] User can save and manage their Anthropic API key
- [ ] User can create agents with natural language instructions
- [ ] Agents can perform web searches
- [ ] Agents can browse provided URLs
- [ ] User can create pipeline templates by wiring agents in sequence
- [ ] User can save and reuse agents across different pipelines
- [ ] User can save and reuse pipeline templates
- [ ] User can execute a pipeline and see meaningful progress updates
- [ ] Pipeline runs sequentially, passing output from each agent to the next
- [ ] User can download the final output document
- [ ] Each agent in the pipeline can produce downloadable artifacts

### Out of Scope

- Intervention during pipeline execution — defer to future version
- Visual display of results in-app — v1 is download-only
- Visual traits/presets for agent configuration — future enhancement
- OAuth/social login — email/password sufficient for v1
- Real-time collaboration — single-user focus for v1
- Mobile app — web-first

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
*Last updated: 2025-01-28 after initialization*
