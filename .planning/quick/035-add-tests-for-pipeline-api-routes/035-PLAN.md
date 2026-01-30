---
phase: quick-035
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/routes/api.pipelines.test.ts
  - app/routes/api.pipelines.$id.test.ts
  - app/routes/api.pipeline.$pipelineId.run.test.ts
  - app/routes/api.pipeline.run.$runId.stream.test.ts
autonomous: true

must_haves:
  truths:
    - "Pipeline CRUD API routes have test coverage"
    - "Authentication is tested (401 for unauthenticated requests)"
    - "Validation is tested (400 for missing required fields)"
    - "Success paths return correct data"
    - "Error paths return appropriate status codes"
  artifacts:
    - path: "app/routes/api.pipelines.test.ts"
      provides: "Tests for pipelines list/create/update/delete API"
      exports: []
    - path: "app/routes/api.pipelines.$id.test.ts"
      provides: "Tests for single pipeline fetch API"
      exports: []
    - path: "app/routes/api.pipeline.$pipelineId.run.test.ts"
      provides: "Tests for pipeline run trigger API"
      exports: []
    - path: "app/routes/api.pipeline.run.$runId.stream.test.ts"
      provides: "Tests for pipeline run SSE stream API"
      exports: []
  key_links:
    - from: "test files"
      to: "route loader/action functions"
      via: "direct import and invocation"
      pattern: "import.*from.*api\\.pipelines"
---

<objective>
Add comprehensive test coverage for the 4 pipeline API routes.

Purpose: Ensure API routes handle authentication, validation, and business logic correctly. Prevent regressions when modifying pipeline functionality.

Output: 4 test files co-located with their source files, all tests passing.
</objective>

<context>
@CLAUDE.md (testing requirements and conventions)
@app/routes/api.pipelines.ts (list/CRUD API)
@app/routes/api.pipelines.$id.ts (single pipeline fetch)
@app/routes/api.pipeline.$pipelineId.run.ts (trigger run)
@app/routes/api.pipeline.run.$runId.stream.ts (SSE stream)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Test pipelines CRUD API (api.pipelines.ts)</name>
  <files>app/routes/api.pipelines.test.ts</files>
  <action>
Create test file for the pipelines CRUD API route. Test the loader and action functions directly by:

1. Mock dependencies at top of file:
   - `vi.mock("~/services/session.server")` - mock getSession to return userId or null
   - `vi.mock("~/db")` - mock db.select, db.insert, db.update, db.delete chains

2. Test loader (GET /api/pipelines):
   - Returns 401 when no userId in session
   - Returns list of pipelines for authenticated user

3. Test action with intent="create":
   - Returns 401 when unauthenticated
   - Returns 400 when name is missing
   - Returns pipeline object on success

4. Test action with intent="update":
   - Returns 401 when unauthenticated
   - Returns 400 when id or name missing
   - Returns 404 when pipeline not found (db returns empty)
   - Returns updated pipeline on success

5. Test action with intent="delete":
   - Returns 401 when unauthenticated
   - Returns 400 when id missing
   - Returns 404 when pipeline not found
   - Returns success: true on successful delete

6. Test action with invalid intent:
   - Returns 400 with "Invalid intent" error

Helper pattern for creating mock Request with FormData:
```typescript
function createRequest(formData: Record<string, string>, method = "POST") {
  const form = new FormData();
  Object.entries(formData).forEach(([k, v]) => form.append(k, v));
  return new Request("http://test/api/pipelines", { method, body: form });
}
```

Use `beforeEach` to reset mocks. Use `vi.mocked()` to type mock return values.
  </action>
  <verify>Run `npm test app/routes/api.pipelines.test.ts` - all tests pass</verify>
  <done>api.pipelines.ts has tests covering auth, validation, and CRUD operations</done>
</task>

<task type="auto">
  <name>Task 2: Test single pipeline and run APIs</name>
  <files>app/routes/api.pipelines.$id.test.ts, app/routes/api.pipeline.$pipelineId.run.test.ts</files>
  <action>
Create test files for the single pipeline fetch and run trigger APIs.

**api.pipelines.$id.test.ts** - Test the loader:
1. Mock `~/services/session.server` and `~/db`
2. Test cases:
   - Returns 401 when unauthenticated
   - Returns 400 when id param missing (empty params object)
   - Returns 404 when pipeline not found
   - Returns pipeline object on success

Helper for loader call:
```typescript
const request = new Request("http://test/api/pipelines/123");
const params = { id: "pipeline-123" };
const response = await loader({ request, params, context: {} });
```

**api.pipeline.$pipelineId.run.test.ts** - Test the action:
1. Mock `~/services/session.server`, `~/db`, and `~/services/job-queue.server`
2. Test cases:
   - Returns 401 when unauthenticated
   - Returns 400 when pipelineId param missing
   - Returns 404 when pipeline not found
   - Creates run record and queues job on success
   - Returns { runId: string } on success

Mock job queue:
```typescript
vi.mock("~/services/job-queue.server", () => ({
  registerPipelineWorker: vi.fn(),
  getJobQueue: vi.fn(() => ({ send: vi.fn() })),
}));
```
  </action>
  <verify>Run `npm test app/routes/api.pipelines.$id.test.ts app/routes/api.pipeline.$pipelineId.run.test.ts` - all tests pass</verify>
  <done>Single pipeline fetch and run trigger APIs have comprehensive test coverage</done>
</task>

<task type="auto">
  <name>Task 3: Test SSE stream API</name>
  <files>app/routes/api.pipeline.run.$runId.stream.test.ts</files>
  <action>
Create test file for the SSE stream endpoint. This is a loader that returns a streaming response.

1. Mock dependencies:
   - `vi.mock("~/services/session.server")`
   - `vi.mock("~/db")`
   - `vi.mock("remix-utils/sse/server")` - mock eventStream to capture setup function
   - `vi.mock("~/services/run-emitter.server")` - mock runEmitter.on/off

2. Test cases:
   - Returns 401 text response when unauthenticated
   - Returns 400 text response when runId param missing
   - Returns 404 text response when run not found
   - Calls eventStream with request.signal and setup function on success
   - Setup function registers event listener on runEmitter
   - Cleanup function unregisters event listener
   - Sends initial status if run.status !== "pending"

For testing the eventStream callback:
```typescript
vi.mock("remix-utils/sse/server", () => ({
  eventStream: vi.fn((signal, setup) => {
    // Capture and test the setup function
    const send = vi.fn();
    const cleanup = setup(send);
    return { send, cleanup, signal };
  }),
}));
```

Note: The stream API returns plain text responses (not JSON) for errors:
- `new Response("Unauthorized", { status: 401 })`
- `new Response("Run ID required", { status: 400 })`
- `new Response("Run not found", { status: 404 })`
  </action>
  <verify>Run `npm test app/routes/api.pipeline.run.$runId.stream.test.ts` - all tests pass</verify>
  <done>SSE stream API has test coverage including event emitter registration</done>
</task>

</tasks>

<verification>
```bash
# Run all pipeline API route tests
npm test app/routes/api.pipelines.test.ts app/routes/api.pipelines.\$id.test.ts app/routes/api.pipeline.\$pipelineId.run.test.ts app/routes/api.pipeline.run.\$runId.stream.test.ts

# Verify no type errors
npm run typecheck
```
</verification>

<success_criteria>
- All 4 test files created and co-located with source files
- Tests cover: authentication (401), validation (400), not found (404), success paths
- All tests pass with `npm test`
- TypeScript compiles with zero errors
</success_criteria>

<output>
After completion, update `.planning/STATE.md` quick tasks table with:
| 035 | Add tests for pipeline API routes | {date} | {commit} | [035-add-tests-for-pipeline-api-routes](./quick/035-add-tests-for-pipeline-api-routes/) |
</output>
