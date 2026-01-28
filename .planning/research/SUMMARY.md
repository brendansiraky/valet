# Project Research Summary

**Project:** Valet - AI Agent Pipeline Builder
**Domain:** Visual AI Workflow Tool for Document Production
**Researched:** 2026-01-28
**Confidence:** HIGH

## Executive Summary

Valet is an AI agent pipeline builder focused on sequential document production workflows for non-technical content writers. Research shows this domain is well-established with clear architectural patterns: visual workflow editors use React Flow for node-based UIs, background execution happens via job queues (BullMQ or pg-boss), and state management requires explicit orchestration layers. The recommended approach is a Remix-based full-stack app with PostgreSQL persistence, React Flow for the visual builder, and pg-boss for reliable pipeline execution.

The critical insight from research is to embrace sequential simplicity over complex branching. Competitors like n8n and Make.com serve technical users with 1000+ integrations and complex branching logic. Valet's competitive advantage comes from laser focus on linear document pipelines with native DOCX/PDF export, making it ideal for content writers who need "outline -> draft -> review -> format" workflows. The user-selected stack (Remix, PostgreSQL, Drizzle, TanStack Query, Tailwind, shadcn/ui) is excellent for this use case.

The highest-risk pitfalls center on AI-specific concerns: API key exposure through client-side code, runaway token costs without user controls, and silent agent failures masked by plausible hallucinations. These must be addressed architecturally in Phase 1-2, not bolted on later. Secondary concerns include context window overflow in multi-agent chains and non-technical user onboarding failures. Success requires treating LLM interactions as unreliable operations requiring monitoring, validation, and graceful degradation - not traditional deterministic software.

## Key Findings

### Recommended Stack

The user's pre-selected stack is well-suited for this domain. Critical additions needed: React Flow for visual pipeline building, pg-boss for background job processing (PostgreSQL-native alternative to BullMQ/Redis), and document generation libraries. One major update: Lucia Auth was deprecated in March 2025 - must use remix-auth with custom session handling or migrate to better-auth.

**Core technologies:**
- **Remix v2** + **React 18**: Full-stack framework with loader/action pattern - ideal for form-heavy pipeline builder UIs
- **PostgreSQL 16** + **Drizzle ORM**: Type-safe persistence with native support for advanced features (JSONB for pipeline state, transactions for execution consistency)
- **@xyflow/react v12**: The standard for node-based workflow UIs - used by every major AI workflow tool (n8n, Flowise, Langflow, Dify)
- **pg-boss v9+**: PostgreSQL-based job queue with exactly-once delivery, retry logic, and no Redis dependency
- **@anthropic-ai/sdk**: Direct Claude API integration with streaming support and tool use
- **Zod v4**: Schema validation for agent inputs/outputs and API contracts (57% smaller than v3)
- **@react-pdf/renderer v4** + **docx v9**: Native PDF/DOCX generation for final document export
- **Tailwind CSS v4**: Utility-first styling (major January 2025 release with CSS-first config, 5x faster builds)
- **shadcn/ui**: Copy-paste component library (not npm package) - updated for Tailwind v4

**Critical stack note:** Avoid BullMQ if possible - requires Redis infrastructure. Use pg-boss instead for PostgreSQL-native queuing (simplifies deployment, maintains transactional consistency with app data).

**Authentication update:** remix-auth (v4) with @oslojs/crypto for session management, replacing deprecated Lucia Auth. Alternative: better-auth (v1.4.15) for more batteries-included approach.

### Expected Features

Research shows clear feature tiers based on competitor analysis and domain expertise.

**Must have (table stakes):**
- Visual Workflow Builder - every competitor has drag-and-drop canvas; text-only configuration is non-viable
- Agent Definition with Natural Language - users describe agents in plain English, not code
- Sequential Pipeline Execution - core value prop with reliable output passing between steps
- Basic Error Handling - users need to know what failed and where
- Pipeline Run History - users expect to see past executions and outputs
- Output Preview/Display - see what each agent produced before export
- Document Export (downloadable) - at minimum text/markdown, preferably DOCX
- Save/Load Pipelines - losing work is unacceptable
- LLM API Configuration - BYOK pattern with secure server-side storage

**Should have (differentiators):**
- Reusable Pipeline Templates - content writers need "set it once, run many times" workflows
- Document Format Export (DOCX/PDF) - content writers deliver Word docs, not markdown (major friction reducer)
- Human-in-the-Loop Checkpoints - pause execution for compliance review or fact-checking
- Pipeline Variables/Inputs - same pipeline with different briefs/topics enables true reusability
- Streaming Output - real-time feedback reduces perceived wait time
- Execution Cost Display - token counts and API cost transparency builds trust

**Defer to v2+ (common but problematic):**
- Full RAG/Vector Database - massive complexity; "Dumb RAG" is top failure pattern. Start with simple context attachment.
- Multi-Model Orchestration - complexity explosion with different APIs, rate limits, error handling
- Real-Time Collaboration - CRDT overhead is overkill for small teams; async sharing via templates sufficient
- Branching/Conditional Logic - dramatically increases complexity; most content workflows are linear
- Auto-Scheduling/Cron - requires infrastructure; manual triggering sufficient for MVP
- External Tool Integrations - maintenance burden; export formats that paste into other tools works initially

### Architecture Approach

Standard architecture for AI pipeline builders follows a layered pattern: UI layer (React Flow canvas + form UIs), orchestration layer (job queue + pipeline executor), intelligence layer (agent runtime + LLM SDK wrapper), and data layer (PostgreSQL via Drizzle). The key architectural insight is that pipeline execution must be background-processed, not synchronous in request handlers - long-running LLM calls will timeout HTTP connections.

**Major components:**
1. **Template Editor** - define reusable pipeline blueprints with drag-drop agent ordering
2. **Pipeline Executor** - orchestrate sequential agent execution via job queue, manage state passing between stages
3. **Agent Runtime** - execute single agent (build prompt from template + previous output, call LLM, extract result)
4. **Job Queue (pg-boss)** - background processing with retry logic, exactly-once delivery using PostgreSQL SKIP LOCKED
5. **SSE Progress Stream** - real-time updates to UI during execution via Server-Sent Events
6. **State Manager** - transform pipeline state into agent-specific inputs, prevent coupling between stages
7. **Artifact Storage** - persist final documents for download (local filesystem for dev, S3/R2 for production)

**Critical architectural patterns:**
- **Sequential Pipeline Execution**: Chain agents in predefined linear order where output N becomes input N+1. Simple to understand and debug, clear data flow for audit trails.
- **State Isolation Between Agents**: Each agent receives only what it needs, not entire pipeline state. Enables independent testing and prevents accidental coupling.
- **Job Queue with pg-boss**: Use PostgreSQL as job queue for exactly-once delivery without Redis. Transactional consistency with application data.
- **SSE for Progress Updates**: Server-Sent Events for one-way server-to-client streaming. Native browser support, automatic reconnection, simpler than WebSockets.

**Data flow**: User triggers pipeline → Remix action queues job → pg-boss worker executes agents sequentially → Each stage updates database + emits SSE event → Client receives progress in real-time → Final output stored as artifact → Download available.

### Critical Pitfalls

Research identified 11 major pitfalls with AI workflow builders. Top 5 most critical:

1. **API Key Exposure Through Client-Side Requests** - BYOK implementations often store/transmit API keys through browser, exposing them to theft. Must route ALL API calls through backend server, store keys server-side encrypted at rest, never send keys back to client after submission. **Address in Phase 1 (architectural).**

2. **Runaway Token Costs Without User Controls** - Multi-agent pipelines consume 10-30x more tokens than expected due to thinking tokens and context accumulation. Users face surprise bills with no stop mechanism. Must display real-time cost estimation, implement hard spending caps, provide "stop pipeline" functionality, show live token consumption during streaming. **Address in Phase 2 (alongside execution engine).**

3. **Silent Agent Failures Masked by Plausible Hallucinations** - When agents fail or hallucinate, downstream agents treat fabricated output as fact. Final document looks reasonable but contains compounding errors. Must implement output validation between stages, provide human review checkpoints, log all inputs/outputs for debugging, design for failure recovery not prevention. **Address in Phase 2 (build into execution engine).**

4. **Context Window Overflow in Multi-Agent Pipelines** - Sequential pipelines accumulate context; by 4th-5th agent context window exhausts causing truncation or errors. Must implement context summarization between stages, pass only relevant output downstream (not full history), monitor token count at each stage, set per-agent context limits. **Address in Phase 2 (context management in execution architecture).**

5. **Non-Technical User Onboarding Failure** - Users don't understand prompts, agent capabilities, or how to structure instructions. Only 37.5% reach "aha moment" before churning. Must start with working template pipelines users can modify, provide progressive feature disclosure, include "agents are good/bad at" education, show example prompts. **Address in Phase 4 (after execution works).**

**Additional moderate pitfalls:**
- Prompt template brittleness (store in config not code, implement versioning)
- Rate limit exhaustion from parallel users (respect headers, implement backoff)
- Streaming UX failures (graceful fallback, partial output recovery)
- Document generation format failures (validate structure before conversion)
- Pipeline template lock-in (version templates, track performance over time)

## Implications for Roadmap

Based on research findings, suggested 4-phase structure prioritizing architectural foundations before feature expansion:

### Phase 1: Foundation & Security
**Rationale:** Must establish secure API key handling and basic execution before building pipeline features. API key exposure is architectural - retrofitting is expensive and risky.

**Delivers:**
- Database schema (templates, agents, executions, artifacts)
- Secure API key storage (server-side, encrypted at rest)
- Basic agent execution (single agent can call Claude API with user's key)
- Template/agent CRUD operations
- Authentication system (remix-auth or better-auth)

**Addresses from FEATURES.md:**
- LLM API Configuration (must-have)
- Save/Load Pipelines infrastructure (must-have)

**Avoids from PITFALLS.md:**
- Pitfall #1: API Key Exposure (Phase 1 is critical window)
- Pitfall #8: Rate Limit Exhaustion (build rate limit handling into SDK wrapper)

**Research flag:** Standard patterns - auth, CRUD, SDK integration all well-documented. No deep research needed.

### Phase 2: Pipeline Execution & Orchestration
**Rationale:** Core value proposition is sequential agent chaining. Must be reliable with proper error handling, cost tracking, and state management before adding UX polish.

**Delivers:**
- pg-boss job queue integration
- Sequential pipeline executor (chain agents with state passing)
- State manager (context isolation between agents)
- Execution monitoring (status, progress, errors)
- Cost tracking (token counts, estimated API costs per execution)
- Execution limits (per-pipeline spending caps)
- Basic error recovery (retry from failed stage)
- Execution history with outputs

**Uses from STACK.md:**
- pg-boss for background jobs
- Drizzle for execution state persistence
- @anthropic-ai/sdk for streaming responses

**Implements from ARCHITECTURE.md:**
- Sequential Pipeline Execution pattern
- State Isolation Between Agents pattern
- Job Queue with pg-boss pattern

**Addresses from FEATURES.md:**
- Sequential Pipeline Execution (must-have)
- Basic Error Handling (must-have)
- Pipeline Run History (must-have)
- Execution Cost Display (differentiator)

**Avoids from PITFALLS.md:**
- Pitfall #2: Runaway Token Costs (implement caps and tracking now)
- Pitfall #3: Silent Agent Failures (validation between stages)
- Pitfall #4: Context Window Overflow (context management in state passing)
- Pitfall #7: Prompt Template Brittleness (store prompts in DB, version them)
- Pitfall #9: Streaming UX Failures (graceful fallback, partial recovery)

**Research flag:** Moderate research needed for pg-boss patterns and execution state machines. Consult official pg-boss docs and XState actor patterns if complexity warrants.

### Phase 3: Visual Builder & Real-Time UX
**Rationale:** Need working execution engine before building UI to visualize it. React Flow integration is complex but well-documented.

**Delivers:**
- React Flow visual pipeline builder (drag-drop node canvas)
- Agent configuration UI (forms for instructions, model params)
- SSE progress streaming (real-time execution updates)
- Pipeline run view (stage-by-stage status, streaming output)
- Output preview/display (see what each agent produced)

**Uses from STACK.md:**
- @xyflow/react for visual builder
- remix-utils eventStream for SSE
- TanStack Query for client state management

**Implements from ARCHITECTURE.md:**
- SSE for Progress Updates pattern
- UI Layer with React Flow canvas

**Addresses from FEATURES.md:**
- Visual Workflow Builder (must-have)
- Agent Definition with Natural Language (must-have)
- Output Preview/Display (must-have)
- Streaming Output (differentiator)

**Avoids from PITFALLS.md:**
- Pitfall #9: Streaming UX Failures (already addressed in Phase 2, but UI polish here)

**Research flag:** Standard patterns - React Flow has extensive documentation. May need light research on custom node types and edge styling. Official React Flow docs sufficient.

### Phase 4: Document Export & Templates
**Rationale:** Export is final deliverable but requires working pipeline first. Templates enable reusability and address onboarding challenges.

**Delivers:**
- Document export (text/markdown download)
- DOCX export (native Word format using docx library)
- PDF export (using @react-pdf/renderer)
- Reusable pipeline templates (save, load, share)
- Pipeline variables/inputs (parameterized templates)
- Template library UI (browse, preview, clone)
- Onboarding templates (working examples users can modify)

**Uses from STACK.md:**
- @react-pdf/renderer for PDF generation
- docx for Word document generation
- Zod for template input schemas

**Addresses from FEATURES.md:**
- Document Export (must-have)
- Document Format Export DOCX/PDF (differentiator)
- Reusable Pipeline Templates (differentiator)
- Pipeline Variables/Inputs (differentiator)

**Avoids from PITFALLS.md:**
- Pitfall #6: Non-Technical User Onboarding Failure (templates with examples)
- Pitfall #10: Document Generation Format Failures (validate before conversion)
- Pitfall #11: Pipeline Template Lock-in (version templates from start)

**Research flag:** Document generation libraries (docx, @react-pdf/renderer) have good documentation but may need research on complex formatting patterns. Consider light research phase for advanced table/nested list handling.

### Phase Ordering Rationale

- **Foundation before execution:** Can't execute pipelines without secure API key handling and database schema. API key exposure is architectural - must be correct from day one.
- **Execution before UI:** Need working job queue and state management before building visual builder. Can't visualize what doesn't exist. Allows testing execution logic independently.
- **Real-time UX before export:** Users need to see pipeline running before caring about final format. Streaming progress is higher value than polished export formats initially.
- **Templates last:** Requires working execution engine and export capabilities. Templates showcase the full product - only valuable when underlying features work.

**Dependency chain:** Auth → API Keys → Agent Execution → Pipeline Orchestration → Job Queue → SSE Streaming → Visual Builder → Export → Templates

**Risk mitigation:** Phases 1-2 address the 5 critical pitfalls (API keys, costs, failures, context, rate limits). Delaying these creates technical debt that's expensive to fix. Phase 3-4 are feature expansion on solid foundation.

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 2 (Pipeline Execution):** May need `/gsd:research-phase` for pg-boss advanced patterns (retry strategies, dead letter queues, monitoring). Also XState actor model if state complexity warrants state machines over simple loops.
- **Phase 4 (Document Export):** May need light research on complex document formatting edge cases - nested lists, tables, embedded images in PDF/DOCX generation.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Foundation):** CRUD operations, authentication, API key storage all well-documented. Remix patterns, Drizzle schema design, remix-auth examples readily available.
- **Phase 3 (Visual Builder):** React Flow has extensive official documentation with examples for custom nodes, edges, controls. SSE patterns in Remix well-documented via remix-utils.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies verified via npm registry and official docs. Version compatibility matrix validated. Lucia deprecation confirmed via GitHub discussions. |
| Features | HIGH | Based on Anthropic official guidance, competitor analysis of 5+ platforms (n8n, Lindy, Vellum, Make.com), and authoritative sources (AWS/Azure architecture docs). Feature tiers validated against multiple 2026 market research reports. |
| Architecture | HIGH | Patterns validated via multiple authoritative sources: Anthropic official docs, Azure Architecture Center, pg-boss GitHub, LangGraph implementation details. Standard patterns widely documented. |
| Pitfalls | MEDIUM-HIGH | Critical pitfalls confirmed via Anthropic official docs (API rate limits, prompt caching, web search issues). Moderate pitfalls based on GitHub issues, industry reports, and practitioner blogs. Some pitfalls inferred from general AI agent failure modes. |

**Overall confidence:** HIGH

Research benefited from strong authoritative sources (Anthropic official documentation, Azure/AWS architecture centers, npm package verification) combined with recent 2026 market analysis. The domain is mature enough to have established patterns but recent enough that pitfall research reflects current challenges.

### Gaps to Address

**Auth library migration:** Lucia deprecation means no battle-tested integration guide for remix-auth + @oslojs/crypto. May encounter integration friction during Phase 1. Mitigation: Budget extra time for auth implementation, consider better-auth as fallback if custom session management proves complex.

**pg-boss vs BullMQ trade-offs:** Research favors pg-boss (no Redis dependency) but BullMQ has larger community and more tooling (BullBoard dashboard). May need to validate pg-boss meets monitoring needs during Phase 2 planning. Mitigation: Verify pg-boss monitoring/observability capabilities before committing. Have BullMQ as fallback if pg-boss proves limiting.

**Context summarization strategies:** Research identifies context overflow as critical issue but doesn't specify how to summarize agent outputs effectively without losing fidelity. Need to experiment during Phase 2. Mitigation: Start with simple truncation, iterate based on real pipeline testing. Consider LLM-based summarization for complex outputs.

**Document format edge cases:** Research shows conversion libraries (docx, @react-pdf/renderer) exist but doesn't validate handling of complex Markdown edge cases (nested lists, tables with merged cells, embedded images). May discover limitations during Phase 4. Mitigation: Set user expectations about supported formatting, provide style guide for agent outputs.

**Non-technical user mental models:** Research identifies onboarding as critical pitfall (37.5% activation rate) but doesn't specify exact educational content or template examples needed. Will require user testing during Phase 4. Mitigation: Create 3-5 template pipelines covering common use cases (blog post generation, compliance review, content repurposing). Include tooltips and inline help.

## Sources

### Primary (HIGH confidence)
- [npm: @xyflow/react v12.10.0](https://www.npmjs.com/package/@xyflow/react) - Version verification, SSR support
- [npm: bullmq v5.66.5](https://www.npmjs.com/package/bullmq) - Job queue features
- [npm: drizzle-orm v0.45.1](https://www.npmjs.com/package/drizzle-orm) - PostgreSQL compatibility
- [npm: zod v4.3.5](https://www.npmjs.com/package/zod) - Schema validation
- [npm: better-auth v1.4.15](https://www.npmjs.com/package/better-auth) - Auth alternative
- [Tailwind CSS v4.0 Announcement](https://tailwindcss.com/blog/tailwindcss-v4) - Major version features
- [Lucia Auth Deprecation](https://github.com/lucia-auth/lucia/discussions/1714) - March 2025 deprecation
- [Anthropic: Building Effective Agents](https://www.anthropic.com/research/building-effective-agents) - Official patterns
- [Anthropic: Prompt Caching Documentation](https://platform.claude.com/docs/en/docs/build-with-claude/prompt-caching) - Cost optimization
- [Anthropic: Rate Limits Documentation](https://platform.claude.com/docs/en/api/rate-limits) - Tier limitations
- [pg-boss GitHub](https://github.com/timgit/pg-boss) - Job queue documentation

### Secondary (MEDIUM confidence)
- [Azure Architecture Center: AI Agent Orchestration Patterns](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns) - Enterprise patterns
- [AWS: Workflow for Prompt Chaining](https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/workflow-for-prompt-chaining.html) - Sequential orchestration
- [Lindy: Best AI Agent Builders 2026](https://www.lindy.ai/blog/best-ai-agent-builders) - Competitor features
- [Vellum: Top AI Workflow Platforms 2026](https://www.vellum.ai/blog/top-ai-workflow-platform) - Market analysis
- [Composio: Why AI Pilots Fail in Production](https://composio.dev/blog/why-ai-agent-pilots-fail-2026-integration-roadmap) - Pitfall validation
- [NN/G: New Users Need Support with Generative AI Tools](https://www.nngroup.com/articles/new-AI-users-onboarding/) - UX research
- [LaunchDarkly: Prompt Versioning and Management Guide](https://launchdarkly.com/blog/prompt-versioning-and-management/) - Prompt management

### Tertiary (LOW confidence)
- [AIMultiple: AI Agents Reliability Challenges 2026](https://research.aimultiple.com/ai-agents-expectations-vs-reality/) - Cascading error patterns
- [Wildnet Edge: Common AI Agent Development Mistakes](https://www.wildnetedge.com/blogs/common-ai-agent-development-mistakes-and-how-to-avoid-them) - Security issues
- Various practitioner blogs and GitHub issues for specific implementation details

---
*Research completed: 2026-01-28*
*Ready for roadmap: yes*
