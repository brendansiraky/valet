# Tab State Backend Migration Checklist

## Goal

Move pipeline tab state from client-side Zustand store to server-authoritative storage. This enables:
- Tab state persistence across sessions/devices
- Automatic cleanup when pipelines are deleted
- Consistent state without client-side sync issues

---

## Current State: ✅ MIGRATION COMPLETE

**What's done:**
- Database table exists (`user_tabs`)
- API complete: GET fetches tabs, POST saves tabs
- MSW handlers for GET and POST `/api/tabs`
- React Query hooks in `app/hooks/queries/use-tabs.ts`:
  - `useTabsQuery()`, `useSaveTabsMutation()`
  - `useOpenTab()`, `useCloseTab()`, `useSetActiveTab()`
  - `useFocusOrOpenTab()`, `useUpdateTabName()`
  - `canOpenNewTab()` helper
- All components migrated from Zustand to React Query hooks
- All tests updated and passing (167 tests)
- Zustand dependency removed from project

---

## Architecture Decision

**Server = dumb persistence layer.** The API just saves and returns `{ tabs, activeTabId }`.

**Client = owns all tab logic.** The mutation hooks compute new state (open tab, close tab, switch active, etc.) and send the result to the server. This avoids duplicating logic between client and server, and makes optimistic updates straightforward.

**API Shape:**
```
GET  /api/tabs  →  { tabs: TabData[], activeTabId: string | null }
POST /api/tabs  ←  { tabs: TabData[], activeTabId: string | null }  (JSON body)
```

---

## Phase 1: Foundation (COMPLETE)

- [x] Database schema created (`app/db/schema/user-tabs.ts`)
- [x] Schema registered in db index (`app/db/index.ts`)
- [x] Migration generated (`drizzle/0007_ordinary_randall.sql`) and applied
- [x] GET API route created (`app/routes/api.tabs.ts`)
- [x] useQuery added to pipeline-tabs component (temporary, for verification)
- [x] MSW handler added for `/api/tabs` (`app/mocks/handlers.ts`)

## Phase 2: Mutations (COMPLETE)

- [x] POST action in `api.tabs.ts` - simple save endpoint (accepts JSON `{ tabs, activeTabId }`)
- [x] Add MSW POST handler for `/api/tabs` in `app/mocks/handlers.ts`
- [x] Create `app/hooks/queries/use-tabs.ts`:
  - [x] `useTabsQuery()` - fetch tab state (move from pipeline-tabs.tsx)
  - [x] `useSaveTabsMutation()` - POST to /api/tabs
  - [x] `useOpenTab()` - with optimistic update
  - [x] `useCloseTab()` - with optimistic update + active tab switching logic
  - [x] `useSetActiveTab()` - with optimistic update
  - [x] `useFocusOrOpenTab()` - with optimistic update
  - [x] `useUpdateTabName()` - with optimistic update
  - [x] Export `canOpenNewTab(tabs)` helper function

## Phase 3: Replace Zustand Usage (COMPLETE)

- [x] Replace `useTabStore` calls with query/mutation hooks
- [x] Update all components that use tab state:
  - [x] `pipeline-tabs.tsx`
  - [x] `pipeline-tab-panel.tsx`
  - [x] `pipelines.$id.tsx` (route component)
  - [x] `pipeline-card.tsx`
- [x] Update tests:
  - [x] `pipeline-tabs.test.tsx`
  - [x] `pipeline-tab-panel.test.tsx`
  - [x] `pipeline-creation-flow.test.tsx`
  - [x] `pipelines.$id.test.tsx`
- [x] Handle tab state initialization on login (data loads on mount)
- [x] Ensure proper cache invalidation (handled by optimistic updates)

## Phase 4: Cleanup (COMPLETE)

- [x] Remove `console.log` from pipeline-tabs
- [x] Delete `stores/tab-store.ts`
- [x] Remove Zustand dependency from package.json
- [x] All tests passing (167 tests)

---

## Technical Notes

- The `home` tab (pipelineId: "home") is special and should never be deleted
- Maximum 8 tabs allowed (enforced in UI, see `canOpenNewTab()` in use-tabs.ts)
- Tabs referencing deleted pipelines are automatically cleaned up on GET fetch
- One row per user (userId is unique) - upsert pattern needed for mutations
- `staleTime: Infinity` on the query because state is managed via mutations, not polling

### Critical: Optimistic Updates Required

Tab interactions must feel instant. The client owns all tab logic and optimistically updates the cache before the server round-trip completes.

**Pattern for action hooks:**
```typescript
function useSetActiveTab() {
  const queryClient = useQueryClient()
  const saveMutation = useSaveTabsMutation()

  return useMutation({
    mutationFn: async (pipelineId: string) => {
      const current = queryClient.getQueryData<TabState>(['tabs'])!
      return saveMutation.mutateAsync({ ...current, activeTabId: pipelineId })
    },
    onMutate: async (pipelineId) => {
      await queryClient.cancelQueries({ queryKey: ['tabs'] })
      const previous = queryClient.getQueryData<TabState>(['tabs'])
      queryClient.setQueryData(['tabs'], { ...previous, activeTabId: pipelineId })
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['tabs'], context.previous)
      }
    },
  })
}
```

`onMutate` applies the optimistic update immediately. `mutationFn` persists to server. On error, rollback.

## Testing Notes

- MSW GET handler exists in `app/mocks/handlers.ts` (returns empty tabs by default)
- MSW POST handler accepts `{ tabs, activeTabId }` and returns same
- When testing hooks, use `renderHook` with `createWrapper()` from `app/test-utils.tsx`
