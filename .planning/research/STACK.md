# Stack Research

**Domain:** AI Agent Pipeline Builder / Visual Workflow Tools
**Researched:** 2026-01-28
**Confidence:** HIGH (verified via npm, official docs, and multiple sources)

## Executive Summary

The user's pre-selected stack (Remix, PostgreSQL, Drizzle, TanStack Query, Tailwind CSS, shadcn/ui, Docker Compose) is well-suited for this domain. Key additions needed: React Flow for visual pipeline building, BullMQ for background job processing, and document generation libraries for downloadable outputs.

**Critical finding:** Lucia Auth was deprecated in March 2025. Recommend using **remix-auth** with custom session handling (following Lucia's educational patterns), or migrating to **better-auth** which emerged as a comprehensive replacement.

## Pre-Selected Stack (User Decided)

These technologies are already chosen. Versions verified and compatibility notes provided.

### Core Framework

| Technology | Version | Purpose | Compatibility Notes |
|------------|---------|---------|---------------------|
| Remix | ^2.17.3 | Full-stack React framework | Stable v2; React Router 7 is the spiritual successor. Remix 3 (non-React) in early 2026 is not recommended for this project. |
| React | ^18.x | UI framework | Required for Remix v2, TanStack Query v5, React Flow v12 |
| TypeScript | ^5.5+ | Type safety | Required by XState v5, Zod v4 |

### Database & ORM

| Technology | Version | Purpose | Compatibility Notes |
|------------|---------|---------|---------------------|
| PostgreSQL | 16.x | Primary database | Use identity columns (recommended over serial). Drizzle has native support. |
| Drizzle ORM | ^0.45.1 | Type-safe ORM | 1.0.0-beta.2 available but use stable 0.45.x for production. Excellent PostgreSQL support. |
| drizzle-kit | ^0.28.x | Migrations & introspection | Companion tool for Drizzle ORM |

### UI Layer

| Technology | Version | Purpose | Compatibility Notes |
|------------|---------|---------|---------------------|
| Tailwind CSS | ^4.0.0 | Utility-first CSS | Major v4 release (Jan 2025). CSS-first config, 5x faster builds. Requires Safari 16.4+, Chrome 111+. |
| shadcn/ui | latest | Component library | Not versioned as npm package - components copied into project. Updated for Tailwind v4. |

### Data Fetching

| Technology | Version | Purpose | Compatibility Notes |
|------------|---------|---------|---------------------|
| TanStack Query | ^5.90.x | Async state management | Requires React 18+. Use `useSuspenseQuery` for Suspense patterns. |

### AI Integration

| Technology | Version | Purpose | Compatibility Notes |
|------------|---------|---------|---------------------|
| @anthropic-ai/sdk | ^0.61.x | Anthropic API client | Streaming support via `stream: true`. Tool use with Zod schemas. TypeScript 4.5+ required. |

### Infrastructure

| Technology | Version | Purpose | Compatibility Notes |
|------------|---------|---------|---------------------|
| Docker Compose | v2.x | Local development orchestration | Use for PostgreSQL + Redis containers |

## Required Additions

Technologies essential for this specific domain that must be added to the stack.

### Visual Workflow Builder

| Technology | Version | Purpose | Why Required |
|------------|---------|---------|--------------|
| @xyflow/react | ^12.10.0 | Visual pipeline editor | **The** standard for node-based workflow UIs. Used by n8n, Flowise, Langflow. SSR support in v12. Drag-and-drop, custom nodes, edge connections. |
| @xyflow/system | ^12.x | Framework-agnostic helpers | Bundled with @xyflow/react. Provides coordinate transforms, viewport management. |

**Why React Flow:** Every major AI workflow builder (Dify, Flowise, Langflow, n8n) uses React Flow. It's the de facto standard with 25k+ GitHub stars. Alternatives like REAFLOW or JointJS are either less maintained or prohibitively expensive.

### Background Job Processing

| Technology | Version | Purpose | Why Required |
|------------|---------|---------|--------------|
| BullMQ | ^5.66.5 | Job queue for pipeline execution | Redis-backed, supports delayed jobs, retries, priorities, horizontal scaling. Used by Microsoft, Vendure. |
| ioredis | ^5.9.2 | Redis client | Required by BullMQ. Full-featured, supports Cluster, Streams, Pub/Sub. |
| Redis | 7.x | Job queue backend | Required for BullMQ. Run via Docker Compose. |

**Why BullMQ:** AI pipelines are long-running, may fail, need retries, and must be observable. BullMQ provides exactly-once semantics, priority queues, and built-in UI tooling. Essential for production-grade pipeline execution.

### Pipeline State Management

| Technology | Version | Purpose | Why Required |
|------------|---------|---------|--------------|
| XState | ^5.x | State machine orchestration | Manages pipeline execution states (pending, running, paused, completed, failed). Supports persisted actors - critical for long-running workflows. |
| @xstate/react | ^5.x | React bindings | Hooks for XState in React components |

**Why XState:** Pipeline execution is fundamentally a state machine problem. XState v5's actor model enables: hierarchical states (pipeline > stage > agent), event-driven transitions, persistence across restarts, and visual debugging via Stately Inspector.

### Document Generation

| Technology | Version | Purpose | When to Use |
|------------|---------|---------|-------------|
| @react-pdf/renderer | ^4.3.2 | PDF generation | Visual layouts, styled documents, charts |
| docx | ^9.5.1 | Word document generation | When users need editable Word files |
| docxtemplater | ^3.67.6 | Template-based Word docs | When using document templates with placeholders |

**Why these libraries:**
- `@react-pdf/renderer`: React-native API for building PDFs declaratively. 1.4M weekly downloads.
- `docx`: Declarative API for building Word docs programmatically. Works in Node and browser.
- `docxtemplater`: For template-based generation where non-technical users create Word templates.

### Validation & Schema

| Technology | Version | Purpose | Why Required |
|------------|---------|---------|--------------|
| Zod | ^4.3.5 | Schema validation | 57% smaller than v3. Used for agent input/output schemas, API validation, form validation. Works with @anthropic-ai/sdk tool definitions. |

### Authentication (CRITICAL UPDATE)

| Technology | Version | Purpose | Notes |
|------------|---------|---------|-------|
| remix-auth | ^4.x | Authentication framework | Passport.js-inspired, strategy-based. Use with custom session handling. |
| @oslojs/crypto | latest | Cryptographic utilities | Password hashing, token generation. Successor to oslo package. |
| arctic | ^3.x | OAuth 2.0 clients | 50+ providers. Use for social auth (Google, GitHub, etc.) |

**CRITICAL:** Lucia Auth was deprecated in March 2025. The recommended path:
1. Use `remix-auth` for the strategy pattern and session management
2. Follow Lucia's educational guides at lucia-auth.com for implementing auth from scratch
3. Use `@oslojs/crypto` and `arctic` for cryptographic utilities and OAuth (same author, actively maintained)

**Alternative:** Consider `better-auth` (^1.4.15) - a comprehensive TypeScript-first auth framework that emerged post-Lucia. Framework-agnostic, plugin ecosystem, built-in 2FA support.

### Real-time Updates

| Technology | Version | Purpose | Why Required |
|------------|---------|---------|--------------|
| remix-utils | ^9.0.0 | Remix utilities | `eventStream` helper for SSE responses. CSRF protection. |

**Why SSE over WebSockets:** For pipeline status updates, SSE is simpler and sufficient. One-way server-to-client. Native browser support. Works with Remix's loader pattern via resource routes.

## Supporting Libraries

Utilities that improve developer experience and code quality.

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nanoid | ^5.x | ID generation | Pipeline IDs, agent IDs. URL-safe, collision-resistant. |
| date-fns | ^4.x | Date manipulation | Pipeline scheduling, execution timestamps |
| zod-to-json-schema | ^3.x | Zod to JSON Schema | Convert Zod schemas for React Flow node configs |
| class-variance-authority | ^0.7.x | Variant styling | Already used by shadcn/ui |
| clsx | ^2.x | Classname utility | Already used by shadcn/ui |
| tailwind-merge | ^3.x | Tailwind class merging | Already used by shadcn/ui |

## Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vitest | Unit/integration testing | Faster than Jest, ESM-native |
| Playwright | E2E testing | Critical for testing pipeline builder UI |
| ESLint | Linting | Use flat config (eslint.config.js) |
| Prettier | Formatting | Tailwind plugin for class sorting |
| tsx | TypeScript execution | For scripts, migrations |

## Installation

```bash
# Core framework (already selected)
npm install @remix-run/node @remix-run/react @remix-run/serve
npm install drizzle-orm postgres
npm install @tanstack/react-query
npm install tailwindcss@latest
npm install @anthropic-ai/sdk

# Visual workflow builder
npm install @xyflow/react

# Background job processing
npm install bullmq ioredis

# State management for pipelines
npm install xstate @xstate/react

# Document generation
npm install @react-pdf/renderer docx

# Validation
npm install zod

# Authentication (post-Lucia approach)
npm install remix-auth @oslojs/crypto arctic
# OR for comprehensive solution:
npm install better-auth

# Real-time & utilities
npm install remix-utils nanoid date-fns

# Dev dependencies
npm install -D drizzle-kit vitest playwright @playwright/test
npm install -D eslint prettier prettier-plugin-tailwindcss tsx
npm install -D @types/node typescript
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| @xyflow/react | REAFLOW | Never - less maintained, smaller community |
| @xyflow/react | JointJS | Enterprise budget, need official support contract |
| BullMQ | Agenda | MongoDB-only projects (not PostgreSQL) |
| BullMQ | pg-boss | Want to avoid Redis dependency (PostgreSQL-only queues) |
| XState | Zustand | Simple state only, no state machine semantics needed |
| XState | Custom reducers | Very simple pipelines without pause/resume/retry |
| @react-pdf/renderer | PDFKit | Node-only, no React component model |
| @react-pdf/renderer | Puppeteer | Need to render complex HTML to PDF |
| docx | officegen | Older, less TypeScript support |
| remix-auth + oslojs | better-auth | Want more batteries-included solution, less manual work |
| remix-auth + oslojs | Auth0/Clerk | SaaS auth, don't want to self-host |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Lucia Auth | Deprecated March 2025. NPM package no longer maintained. | remix-auth + @oslojs/*, or better-auth |
| oslo (npm package) | Deprecated. Superseded by @oslojs/* packages. | @oslojs/crypto, @oslojs/encoding |
| reactflow (npm) | Old package name. Renamed in v12. | @xyflow/react |
| Bull | Predecessor to BullMQ. Less features, older API. | BullMQ |
| node-redis | While officially recommended, ioredis has better TypeScript support and BullMQ uses it internally. | ioredis |
| LangChain.js | Over-abstraction for simple sequential pipelines. Complex dependency graph. | Direct @anthropic-ai/sdk usage |
| Prisma | Schema-first approach conflicts with existing Drizzle decision. Migration complexity. | Drizzle ORM (already chosen) |

## Stack Patterns by Variant

**If pipelines are simple (2-5 steps, no branching):**
- Skip XState, use simpler state management with TanStack Query
- BullMQ still recommended for reliability

**If pipelines have complex branching/conditionals:**
- XState is essential for managing state transitions
- Consider React Flow's edge types for conditional paths

**If document output is critical:**
- Invest early in @react-pdf/renderer component library
- Create reusable document components (headers, tables, etc.)

**If real-time collaboration is needed (future):**
- SSE won't scale - plan for WebSocket or Liveblocks
- Consider Yjs for CRDT-based sync

## Version Compatibility Matrix

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Remix ^2.17 | React 18.x | Not compatible with React 19 yet |
| TanStack Query ^5.x | React 18+ | Uses useSyncExternalStore |
| @xyflow/react ^12.x | React 18.x | SSR support added in v12 |
| XState ^5.x | TypeScript 5.0+ | Actor persistence requires v5 |
| Tailwind ^4.x | Safari 16.4+, Chrome 111+ | Uses @property, color-mix() |
| Zod ^4.x | TypeScript 5.5+ | Smaller bundle, new features |
| Drizzle ^0.45 | Node 18+ | ESM-first |

## Sources

**HIGH Confidence (npm registry, official docs):**
- [npm: @xyflow/react](https://www.npmjs.com/package/@xyflow/react) - v12.10.0 verified
- [npm: bullmq](https://www.npmjs.com/package/bullmq) - v5.66.5 verified
- [npm: xstate](https://www.npmjs.com/package/xstate) - v5.x verified
- [npm: drizzle-orm](https://www.npmjs.com/package/drizzle-orm) - v0.45.1 verified
- [npm: @tanstack/react-query](https://www.npmjs.com/package/@tanstack/react-query) - v5.90.x verified
- [npm: zod](https://www.npmjs.com/package/zod) - v4.3.5 verified
- [npm: @react-pdf/renderer](https://www.npmjs.com/package/@react-pdf/renderer) - v4.3.2 verified
- [npm: better-auth](https://www.npmjs.com/package/better-auth) - v1.4.15 verified
- [Tailwind CSS v4.0 Announcement](https://tailwindcss.com/blog/tailwindcss-v4) - Jan 2025 release
- [Lucia Auth Deprecation](https://github.com/lucia-auth/lucia/discussions/1714) - March 2025 deprecation confirmed
- [React Flow v12 Release](https://xyflow.com/blog/react-flow-12-release) - SSR support, package rename

**MEDIUM Confidence (WebSearch verified with official sources):**
- [Anthropic Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk) - Streaming, orchestration patterns
- [BullMQ Documentation](https://docs.bullmq.io) - Job queue patterns
- [XState Actors Documentation](https://stately.ai/docs/actors) - Actor model, persistence

**LOW Confidence (WebSearch only - verify before implementation):**
- Remix 3 timeline (early 2026) - may shift
- AI workflow builder market landscape - rapidly evolving

---
*Stack research for: AI Agent Pipeline Builder*
*Researched: 2026-01-28*
