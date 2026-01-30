---
phase: quick-034
plan: 03
subsystem: testing
tags: [vitest, react-testing-library, msw, component-tests]
dependency-graph:
  requires: [quick-034-01, quick-034-02]
  provides: [pipeline-screen-tests]
  affects: []
tech-stack:
  added: []
  patterns: [component-mocking, store-mocking, react-flow-mocking]
key-files:
  created:
    - app/routes/pipelines.$id.test.tsx
  modified:
    - app/mocks/handlers.ts
decisions: []
metrics:
  duration: 2 min
  completed: 2026-01-30
---

# Quick Task 034-03: Pipeline Screen Component Tests Summary

Component test coverage for the pipeline editor screen with mocking of complex dependencies.

## One-liner

Pipeline editor screen tests with mocked react-router, zustand stores, and @xyflow/react for 5 test cases covering rendering and error states.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add missing mock handlers | a3478bb | app/mocks/handlers.ts |
| 2 | Create pipeline screen component tests | cb78d5c | app/routes/pipelines.$id.test.tsx |

## Changes Made

### Task 1: Mock Handlers

Added missing MSW handlers for pipeline screen dependencies:
- `POST /api/pipeline/:id/run` - returns `{ runId: "run-123" }`
- `POST /api/pipelines` - returns mock pipeline data for save mutations

### Task 2: Component Tests

Created 5 comprehensive tests for `pipelines.$id.tsx`:

1. **renders pipeline tabs component** - Verifies PipelineTabs renders with empty state
2. **renders agent sidebar** - Verifies AgentSidebar shows agent data from query
3. **shows home tab empty state when id is home** - Verifies "Select a pipeline or create new" message
4. **handles loading state while fetching data** - Delayed responses to test loading behavior
5. **handles error state when agents query fails** - 500 error response to test graceful degradation

### Mocking Strategy

Complex dependencies required strategic mocking:

```typescript
// react-router hooks
vi.mock("react-router", async () => ({
  ...actual,
  useParams: vi.fn(() => ({ id: "home" })),
  useNavigate: vi.fn(() => vi.fn()),
}));

// zustand stores
vi.mock("~/stores/tab-store", () => ({
  useTabStore: () => ({
    tabs: [{ pipelineId: "home", name: "Home" }],
    activeTabId: "home",
    closeTab: vi.fn(),
    focusOrOpenTab: vi.fn(),
    canOpenNewTab: () => true,
  }),
  HOME_TAB_ID: "home",
}));

// @xyflow/react (canvas issues in jsdom)
vi.mock("@xyflow/react", () => ({
  ReactFlow: ({ children }) => <div data-testid="react-flow">{children}</div>,
  ReactFlowProvider: ({ children }) => <>{children}</>,
  Background: () => null,
  Controls: () => null,
}));
```

## Verification

- `npm run typecheck` - Passes
- `npm test -- pipelines.$id.test.tsx` - 5/5 tests passing
- `npm test` - All 34 tests passing across 5 test files

## Deviations from Plan

None - plan executed exactly as written.

## Test Coverage Summary

After this plan, the codebase has:
- **5 test files** with **34 tests** total
- Coverage for: Agents, Traits, Settings, Pipeline hooks, Pipeline screen
