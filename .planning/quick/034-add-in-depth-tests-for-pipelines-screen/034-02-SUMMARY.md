# Quick 034-02: Pipeline Mutation Hooks Test Coverage Summary

Comprehensive test coverage for all pipeline mutation hooks with success, error, and cache invalidation tests.

## What Was Done

### Task 1: Add mutation endpoint handlers to mocks
Added POST handlers for pipeline mutations to `app/mocks/handlers.ts`:
- `POST /api/pipeline/:pipelineId/run` - Runs a pipeline, validates FormData input, returns runId
- `POST /api/pipelines` with intent-based routing:
  - `create` intent: Returns new pipeline with generated id
  - `update` intent: Returns updated pipeline data
  - `delete` intent: Returns success response

### Task 2: Add comprehensive mutation hook tests
Added 11 new mutation tests to `app/hooks/queries/use-pipelines.test.tsx`:

**useRunPipeline (3 tests):**
- Runs pipeline and returns runId
- Handles run error with proper error message extraction
- Sends input as FormData (verified by intercepting request)

**useSavePipeline (4 tests):**
- Creates new pipeline when isNew is true
- Updates existing pipeline when isNew is false
- Handles save error with proper message
- Verifies cache is NOT invalidated on success (intentional per hook design)

**useDeletePipeline (3 tests):**
- Deletes pipeline by id with correct FormData
- Verifies cache IS invalidated on success
- Handles delete error with proper message

## Files Modified

| File | Changes |
|------|---------|
| `app/mocks/handlers.ts` | Added POST handlers for pipeline run and mutations |
| `app/hooks/queries/use-pipelines.test.tsx` | Added 11 mutation tests, renamed from .ts for JSX support |

## Test Results

```
20 tests passing in use-pipelines.test.tsx
- 9 query tests (existing from plan 01)
- 11 mutation tests (new from this plan)

44 total tests passing across all test files
```

## Commits

| Hash | Message |
|------|---------|
| cf31ffb | feat(quick-034-02): add pipeline mutation endpoint handlers to mocks |
| 4c5c4d5 | test(quick-034-02): add comprehensive tests for pipeline mutation hooks |

## Duration

~3 minutes

## Notes

- File renamed from `.ts` to `.tsx` to support JSX in custom wrapper tests for cache invalidation verification
- Cache invalidation tests use `createTestQueryClient()` directly with `QueryClientProvider` wrapper to access the queryClient instance for assertions
- Verified that useSavePipeline intentionally does NOT invalidate cache (per hook comments - avoids refetch flicker during auto-save)
- Verified that useDeletePipeline DOES invalidate cache (refreshes dropdown after deletion)
