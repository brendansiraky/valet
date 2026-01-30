# Quick Task 035: Add Tests for Pipeline API Routes

## One-Liner
Comprehensive test coverage for 4 pipeline API routes: CRUD, single fetch, run trigger, and SSE stream.

## What Was Done

### Task 1: Test pipelines CRUD API (api.pipelines.ts)
- Created `app/routes/api.pipelines.test.ts` with 16 tests
- Tests for loader: authentication (401), list pipelines
- Tests for action intent=create: auth, validation (400), success
- Tests for action intent=update: auth, validation, not found (404), success
- Tests for action intent=delete: auth, validation, not found, success
- Tests for invalid intent handling

### Task 2: Test single pipeline and run APIs
- Created `app/routes/api.pipelines.$id.test.ts` with 4 tests
  - Authentication (401)
  - Validation (400) for missing id
  - Not found (404)
  - Success case
- Created `app/routes/api.pipeline.$pipelineId.run.test.ts` with 5 tests
  - Authentication (401)
  - Validation (400) for missing pipelineId
  - Not found (404)
  - Job queue integration on success
  - Empty input handling

### Task 3: Test SSE stream API
- Created `app/routes/api.pipeline.run.$runId.stream.test.ts` with 9 tests
  - Authentication (401) - text response
  - Validation (400) for missing runId - text response
  - Not found (404) - text response
  - eventStream setup verification
  - Event listener registration on runEmitter
  - Cleanup function unregisters listener
  - Initial status send for non-pending runs
  - Event handler forwards events to client

## Test Coverage Summary

| API Route | Tests | Coverage |
|-----------|-------|----------|
| api.pipelines.ts (CRUD) | 16 | Auth, validation, CRUD operations |
| api.pipelines.$id.ts | 4 | Auth, validation, fetch |
| api.pipeline.$pipelineId.run.ts | 5 | Auth, validation, job queue |
| api.pipeline.run.$runId.stream.ts | 9 | Auth, validation, SSE setup/cleanup |
| **Total** | **34** | - |

## Testing Pattern Established

Created a reusable pattern for testing React Router loader/action functions:
- Mock session service for auth testing
- Mock db chains for database operations
- RouteArgs type helper for TypeScript compatibility with react-router v7
- Separate helpers for select/insert/update/delete chain mocking

## Files Created
- `app/routes/api.pipelines.test.ts`
- `app/routes/api.pipelines.$id.test.ts`
- `app/routes/api.pipeline.$pipelineId.run.test.ts`
- `app/routes/api.pipeline.run.$runId.stream.test.ts`

## Duration
~7 minutes

## Commits
- `64be9bb` - test(quick-035): add tests for pipelines CRUD API
- `a685c25` - test(quick-035): add tests for single pipeline and run APIs
- `42d61ef` - test(quick-035): add tests for SSE stream API
- `4b9c8dc` - fix(quick-035): add RouteArgs type for TypeScript compatibility
