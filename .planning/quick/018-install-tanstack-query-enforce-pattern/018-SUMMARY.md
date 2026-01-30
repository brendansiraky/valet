---
phase: quick
plan: 018
subsystem: infrastructure
tags: [tanstack-query, react-query, data-fetching, state-management]
requires: []
provides:
  - TanStack Query infrastructure
  - Query hook pattern
  - Async data fetching rules
affects:
  - All future components fetching server data
tech-stack:
  added:
    - "@tanstack/react-query"
  patterns:
    - QueryClient singleton
    - useQuery for GET operations
    - useMutation for mutations
key-files:
  created:
    - app/lib/query-client.ts
    - app/hooks/queries/use-pipelines.ts
  modified:
    - app/root.tsx
    - CLAUDE.md
    - package.json
decisions:
  - description: "1-minute stale time, 5-minute gc time for default query config"
    rationale: "Balance between fresh data and reduced API calls"
metrics:
  duration: 3 min
  completed: 2026-01-30
---

# Quick Task 018: Install TanStack Query and Enforce Pattern Summary

TanStack Query installed with QueryClientProvider wrapping app; canonical hook pattern established at app/hooks/queries/; CLAUDE.md now mandates useQuery/useMutation for all server state.

## What Was Done

### Task 1: Install TanStack Query and Configure Provider
- Installed `@tanstack/react-query` package
- Created `app/lib/query-client.ts` with singleton QueryClient
- Configured sensible defaults:
  - `staleTime`: 1 minute
  - `gcTime`: 5 minutes
  - `refetchOnWindowFocus`: false
  - `retry`: 1
- Wrapped app with `QueryClientProvider` in `app/root.tsx` (inside ThemeProvider)

### Task 2: Create Example Query Hook and Update CLAUDE.md
- Created `app/hooks/queries/use-pipelines.ts` as canonical example
- Added "Async Data Fetching Rules" section to CLAUDE.md documenting:
  - Mandatory `useQuery` for GET operations
  - Mandatory `useMutation` for POST/PUT/DELETE
  - Forbidden patterns: raw fetch(), useEffect+useState, useFetcher for reads
  - Hook naming conventions
  - Query hook file location

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 532aac7 | feat | Install TanStack Query and configure provider |
| f753ae9 | docs | Add query hook pattern and enforce TanStack Query usage |

## Deviations from Plan

None - plan executed exactly as written.

## Files Changed

| File | Change |
|------|--------|
| package.json | Added @tanstack/react-query dependency |
| app/lib/query-client.ts | Created - QueryClient singleton |
| app/root.tsx | Added QueryClientProvider wrapper |
| app/hooks/queries/use-pipelines.ts | Created - Example query hook |
| CLAUDE.md | Added Async Data Fetching Rules section |

## Technical Notes

- QueryClient is a singleton to ensure consistent cache across the app
- `gcTime` (garbage collection time) replaced `cacheTime` in TanStack Query v5
- The example hook `usePipelines()` can be used directly or as a template for other query hooks
- Future Claude instances will now follow the TanStack Query pattern due to CLAUDE.md rules
