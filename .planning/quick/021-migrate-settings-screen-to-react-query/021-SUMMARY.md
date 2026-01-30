---
task: 021
type: quick
status: complete
completed: 2026-01-30
duration: 4 min
commits:
  - hash: 2198095
    message: "feat(quick-021): add settings API route and query hooks"
  - hash: eab5e29
    message: "feat(quick-021): migrate settings screen to React Query"
key-files:
  created:
    - app/routes/api.settings.ts
    - app/hooks/queries/useSettings.ts
  modified:
    - app/routes/settings.tsx
---

# Quick Task 021: Migrate Settings Screen to React Query

**One-liner:** Settings screen now uses TanStack Query with useSettings() query and three mutation hooks for API keys and model preference.

## What Was Done

### Task 1: Create API route and query hooks (2198095)
- Created `app/routes/api.settings.ts` with JSON API endpoints
- Loader returns `{ hasApiKey, hasOpenAIKey, modelPreference }`
- Action handles three intents: save-api-key, save-openai-key, update-model
- All responses are JSON (no redirects, no flash messages)
- Created `app/hooks/queries/useSettings.ts` following useAgents.ts patterns:
  - `useSettings()` query with queryKey: ["settings"]
  - `useSaveApiKey()` mutation for Anthropic key
  - `useSaveOpenAIKey()` mutation for OpenAI key
  - `useUpdateModelPreference()` mutation for model preference
  - All mutations invalidate ["settings"] on success

### Task 2: Update Settings component (eab5e29)
- Removed Remix action() entirely (mutations go to API route)
- Kept minimal loader for auth redirect and user email only
- Replaced Remix `<Form>` with native `<form>` + onSubmit handlers
- Added controlled inputs with local state
- Added loading states with Loader2 spinner during mutations
- Replaced flash messages with sonner toast notifications
- Inputs and buttons disabled while mutations are pending
- Added error state handling for failed settings fetch

## Patterns Applied

- **Query hooks in `app/hooks/queries/`** - consistent with useAgents.ts
- **FormData for mutations** - matches existing API pattern
- **Error type casting** - `Error & { data: MutationError }` pattern
- **Cache invalidation on success** - queryClient.invalidateQueries
- **Don't destructure query results** - use settingsQuery.data?.hasApiKey pattern

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- [x] TypeScript compiles with `npx tsc --noEmit`
- [x] API route handles all three intents with JSON responses
- [x] Query hook fetches settings data
- [x] Three mutation hooks save keys/model with cache invalidation
- [x] Settings screen uses useSettings() for data
- [x] All forms use mutation hooks
- [x] No Remix action() in settings.tsx
- [x] Loading states shown during mutations
- [x] Toast notifications on success/error
