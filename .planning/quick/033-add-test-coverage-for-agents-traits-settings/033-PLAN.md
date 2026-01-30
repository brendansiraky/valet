# Quick Task 033: Add Test Coverage for Agents, Traits, and Settings Screens

## Context

The project has enabled test enforcement (`npm run typecheck && npm test` must pass). We need to add comprehensive test coverage for the three main screens:
- Agents screen (`app/routes/agents.tsx`)
- Traits screen (`app/routes/traits.tsx`)
- Settings screen (`app/routes/settings.tsx`)

All three screens follow the same pattern:
1. Use TanStack Query for data fetching
2. Show loading skeletons while pending
3. Show error states with retry buttons
4. Show empty states when no data
5. Show data cards when data exists

## Dependencies

- MSW already installed (`msw@2.12.7`)
- Testing Library already installed
- Vitest configured with jsdom environment
- No existing tests in the codebase

## Tasks

### Task 1: Create test utilities and MSW handlers

**Files:**
- `app/test-utils.tsx` - Test utilities with QueryClient wrapper
- `app/mocks/handlers.ts` - MSW request handlers for all APIs
- `app/mocks/server.ts` - MSW server setup
- Update `vitest.setup.ts` - Add MSW server lifecycle

**Details:**
1. Create `renderWithClient` helper that wraps components in QueryClientProvider
2. Create handlers for:
   - `GET /api/agents` - agents data
   - `GET /api/traits` - traits data
   - `GET /api/settings` - settings data
3. Configure MSW server for Node environment
4. Add MSW lifecycle hooks to vitest.setup.ts

### Task 2: Add tests for Agents screen

**File:** `app/routes/agents.test.tsx`

**Test cases:**
1. Shows loading skeleton while fetching
2. Shows error state with retry button on fetch failure
3. Shows empty state when no agents exist
4. Shows agent cards when agents exist
5. Retry button refetches data

### Task 3: Add tests for Traits screen

**File:** `app/routes/traits.test.tsx`

**Test cases:**
1. Shows loading skeleton while fetching
2. Shows error state with retry button on fetch failure
3. Shows empty state when no traits exist
4. Shows trait cards when traits exist
5. Retry button refetches data

### Task 4: Add tests for Settings screen

**File:** `app/routes/settings.test.tsx`

**Test cases:**
1. Shows loading skeleton while fetching settings
2. Shows error state on fetch failure
3. Shows profile email from loader data
4. Shows API key saved status when keys configured
5. Shows default model selector when API keys exist

Note: Settings has a server loader that provides user email. We'll mock useLoaderData for this.

## Success Criteria

- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
- [ ] All three screens have test coverage for loading, error, empty, and success states
