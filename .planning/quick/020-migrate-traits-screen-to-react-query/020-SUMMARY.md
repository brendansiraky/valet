---
phase: quick
plan: 020
subsystem: traits
tags: [react-query, tanstack-query, migration, traits]
dependency-graph:
  requires: [quick-018]
  provides: ["traits-react-query-hooks", "traits-api-route"]
  affects: []
tech-stack:
  added: []
  patterns: ["React Query hooks for CRUD", "API route pattern"]
key-files:
  created:
    - app/routes/api.traits.ts
    - app/hooks/queries/use-traits.ts
  modified:
    - app/routes/traits.tsx
    - app/components/trait-form-dialog.tsx
    - app/components/trait-delete-dialog.tsx
decisions: []
metrics:
  duration: "2 min"
  completed: "2026-01-30"
---

# Quick Task 020: Migrate Traits Screen to React Query

Traits CRUD fully migrated to TanStack Query with dedicated API route and hooks.

## What Changed

### New Files

**`app/routes/api.traits.ts`**
- JSON API endpoint for traits CRUD operations
- Loader returns `{ traits: [...] }` for authenticated users
- Action handles create/update/delete intents via FormData
- Same Zod validation as original implementation

**`app/hooks/queries/use-traits.ts`**
- `useTraits()`: Fetches traits list, queryKey `["traits"]`
- `useCreateTrait()`: Mutation for creating traits
- `useUpdateTrait()`: Mutation for updating traits
- `useDeleteTrait()`: Mutation for deleting traits
- All mutations invalidate `["traits"]` on success

### Modified Files

**`app/routes/traits.tsx`**
- Removed loader and action functions entirely
- Now uses `useTraits()` hook for data fetching
- Added loading spinner state (`isPending`)
- Added error state with retry button (`isError`)

**`app/components/trait-form-dialog.tsx`**
- Replaced `useFetcher` with `useCreateTrait`/`useUpdateTrait` hooks
- Converted from `fetcher.Form` to regular `<form>` with `onSubmit`
- Error handling via mutation callbacks
- Dialog closes on mutation success

**`app/components/trait-delete-dialog.tsx`**
- Replaced react-router `Form` with `useDeleteTrait` mutation
- Added controlled dialog state for proper open/close handling
- Button shows "Deleting..." while mutation is pending

## Commits

| Hash | Message |
|------|---------|
| 4c31937 | feat(quick-020): add traits API route and React Query hooks |
| d491e74 | feat(quick-020): migrate traits screen and dialogs to React Query |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Trait interface color type**
- **Found during:** Task 2 TypeScript verification
- **Issue:** Trait interface declared `color: string | null` but DB schema has `color: string` (notNull with default)
- **Fix:** Changed interface to `color: string` to match DB
- **Files modified:** app/hooks/queries/use-traits.ts
- **Commit:** d491e74

## Verification

- [x] TypeScript compiles without errors
- [x] No Remix loader/action patterns remain in traits files
- [x] No useFetcher/Form patterns remain in traits dialogs
- [x] All mutations properly invalidate the traits query
