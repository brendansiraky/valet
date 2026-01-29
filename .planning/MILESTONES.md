# Project Milestones: Valet

## v1.3 Agent DNA & Dynamic Traits (Planned)

**Goal:** Improve UX for non-technical users with human-centric naming (DNA), dynamic trait assignment at pipeline level, and visual trait customization

**Phases:** 15-17

**Key scope:**
- Rename "Instructions" → "DNA" with explanatory tooltips
- Move trait assignment from agent-level to pipeline-step-level
- Drag traits from sidebar to attach to agent nodes in pipeline builder
- Add color picker for traits (warm preset palette)
- Temporary trait picker for agent testing

**Status:** Planned (after v1.2)

---

## v1.2 Multi-Provider & Artifacts (In Progress)

**Goal:** Add multi-provider support (Anthropic + OpenAI), unified model selection, and persistent artifact storage

**Phases:** 11-14

**Key scope:**
- Provider abstraction layer with Anthropic + OpenAI implementations
- Live agent-pipeline relationships with orphan handling
- Flat model dropdown grouped by provider
- JSONB artifact storage with metadata

**Status:** Planning Phase 11

---

## v1.1 Enhanced Agents (Shipped: 2026-01-29)

**Delivered:** Traits system for reusable context, per-agent model configuration, unified pipeline tools, and cost visibility

**Phases completed:** 7-10 (8 plans total)

**Key accomplishments:**
- Sidebar navigation with collapsible sidebar on all authenticated pages
- Traits system — create, edit, delete reusable context snippets assignable to agents
- Agent configuration — per-agent model selection and trait assignment
- Unified tools — all agents have web search + URL fetch (model infers from context)
- Cost visibility — token counts and estimated cost displayed after pipeline runs
- Dead code cleanup — removed 274 lines of obsolete capability files

**Stats:**
- 67 files created/modified
- 7,710 lines of TypeScript added
- 4 phases, 8 plans, ~19 tasks
- 1 day from v1.0 to v1.1

**Git range:** `feat(07-01)` → `chore(10-01)`

**What's next:** TBD — planning next milestone

---

## v1.0 MVP (Shipped: 2026-01-28)

**Delivered:** Visual AI agent pipeline builder with auth, agent management, capabilities, pipeline builder, execution engine, and output export

**Phases completed:** 1-6 (18 plans total)

**Key accomplishments:**
- User authentication with encrypted API key storage
- Agent management — create, edit, delete agents with natural language instructions
- Agent capabilities — text generation, web search, URL fetching
- Visual pipeline builder — drag-drop agents, connect in sequence, save templates
- Execution engine — sequential pipeline runs with streaming progress
- Output export — view agent outputs, download as text/markdown

**Stats:**
- 100+ files created
- ~8,600 lines of TypeScript
- 6 phases, 18 plans, ~70 tasks
- 1 day from start to ship

**Git range:** `feat(01-01)` → `feat(06-02)`

**What's next:** v1.1 Enhanced Agents — traits, capabilities, cost visibility

---
