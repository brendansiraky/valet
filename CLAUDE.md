# Valet - Project Instructions

## ⛔ CRITICAL: Testing & Type Safety Requirements

**THIS IS NON-NEGOTIABLE. Every change to the codebase MUST satisfy these requirements:**

1. **TypeScript must compile with zero errors** (`npm run typecheck`)
2. **All tests must pass** (`npm test`)

### Why This Matters

Tests are the driving force of this application. They define correctness, prevent regressions, and ensure the codebase remains maintainable. Failing tests are not obstacles to work around—they are signals that something is broken.

### Rules for Agents

- **NEVER** bypass a failing test with a hacky fix just to make it pass
- **NEVER** delete or skip tests to avoid failures
- **NEVER** weaken assertions to make tests pass
- If a test fails after your change, the change is likely wrong—investigate and fix the root cause
- If a test is genuinely outdated due to intentional behavior changes, update it to reflect the new correct behavior with clear reasoning
- Run `npm run typecheck && npm test` before considering any task complete

### Testing Stack

| Package | Purpose |
|---------|---------|
| vitest | Test runner, assertions, mocking |
| @testing-library/react | Component rendering and DOM queries |
| @testing-library/user-event | Realistic user interaction simulation |
| jsdom | Browser DOM environment |
| msw | API request mocking for query/mutation tests |

### Test Organization

**Tests MUST be co-located with their source files.** The only difference in naming is adding `.test` before the extension.

```
app/components/
  Button.tsx
  Button.test.tsx

app/hooks/queries/
  usePipelines.ts
  usePipelines.test.ts

app/lib/
  format.ts
  format.test.ts
```

**NEVER** create separate `__tests__` directories or place tests elsewhere. Co-location keeps tests discoverable and ensures they're updated alongside the code they test.

### Shared Test Utilities

The `app/test-utils.tsx` file provides reusable utilities for testing components that need providers:

| Utility | Purpose |
|---------|---------|
| `createTestQueryClient()` | Creates a QueryClient with retries disabled for testing |
| `createWrapper()` | Returns a wrapper component for `renderHook` tests |
| `renderWithClient(ui, options?)` | Renders component with QueryClientProvider, returns `queryClient` for cache manipulation |

**`renderWithClient` options:**
- `withTheme: true` - Wraps in ThemeProvider (for components using `useTheme`)
- `withRouter: true` - Wraps in RouterProvider (for components using react-router hooks)

**Usage examples:**

```tsx
// Component test with query client
const { queryClient } = renderWithClient(<MyComponent />);

// Component needing router context
renderWithClient(<PageWithLinks />, { withRouter: true });

// Component needing theme context
renderWithClient(<ThemedComponent />, { withTheme: true });

// Hook test
const { result } = renderHook(() => useMyQuery(), { wrapper: createWrapper() });
```

**Invoke `/vitest-testing` skill when writing or modifying tests.**

---

## Tech Stack

- **Framework**: Remix
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: TanStack Query
- **AI**: Anthropic SDK (@anthropic-ai/sdk)

## Available Skills

Read the relevant skill file when encountering matching work. Do not load all skills - only read what's needed for the current task.

| Skill             | Path                                        | Use When                                                                                                  |
| ----------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Frontend Designer | `.claude/skills/frontend-designer/SKILL.md` | Designing pages, layouts, applying design system, visual consistency, spacing/colors/typography decisions |
| React Components  | `.claude/skills/react-components/SKILL.md`  | Component architecture, prop interfaces, React patterns                                                   |
| React Query       | `.claude/skills/react-query/SKILL.md`       | TanStack Query patterns, query hooks, mutations, caching, invalidation                                    |
| Styling           | `.claude/skills/styling/SKILL.md`           | CVA patterns, Tailwind organization, variant definitions                                                  |
| Vitest Testing    | `.claude/skills/vitest-testing/SKILL.md`    | Writing tests, test patterns, mocking                                                                     |

**Important**: Skills have `references/` subdirectories with additional detail. Read those when the main SKILL.md indicates they're relevant.

## Mandatory Skill Invocation

**ALWAYS invoke these skills before starting related work:**

| Skill | Invoke When | Command |
|-------|-------------|---------|
| **React Query** | Creating/modifying query hooks, adding mutations, working with server data fetching, optimistic updates, cache invalidation | `/react-query` |
| **Frontend Designer** | ANY UI/UX changes - new pages, modifying layouts, adding components, styling updates, visual consistency work | `/frontend-designer` |

These skills contain project-specific patterns and must be loaded to ensure consistency. Do not rely on general knowledge - invoke the skill first.

## Data Fetching

**ALL async server state MUST use TanStack Query.** Invoke `/react-query` for patterns.

- Query hooks live in `app/hooks/queries/`
- Zustand is for local UI state only (sidebar, tabs, form state)
