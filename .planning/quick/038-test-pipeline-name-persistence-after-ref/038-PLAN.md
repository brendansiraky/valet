---
phase: quick
plan: 038
type: execute
wave: 1
depends_on: []
files_modified:
  - app/components/pipeline-builder/pipeline-creation-flow.test.tsx
autonomous: true

must_haves:
  truths:
    - "Test verifies pipeline name persists after simulated page refresh"
    - "Test covers full flow: create -> rename -> refresh -> verify persisted name"
  artifacts:
    - path: "app/components/pipeline-builder/pipeline-creation-flow.test.tsx"
      provides: "Name persistence after refresh test"
      contains: "page refresh"
  key_links:
    - from: "pipeline-creation-flow.test.tsx"
      to: "pipeline-tab-panel.tsx"
      via: "renders and verifies name input field value"
---

<objective>
Add a test to verify pipeline name persistence after page refresh.

Purpose: Ensure that when a user creates a pipeline, renames it, and refreshes the page, the name persists in the input field rather than defaulting back to "Untitled Pipeline".

Output: New test case in the existing pipeline-creation-flow.test.tsx file.
</objective>

<execution_context>
@/Users/brendan/.claude/get-shit-done/workflows/execute-plan.md
@/Users/brendan/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

Existing test file with comprehensive pipeline flow tests:
@app/components/pipeline-builder/pipeline-creation-flow.test.tsx

The pipeline-tab-panel.tsx shows the Input component uses `pipeline.pipelineName` as its value.
@app/components/pipeline-builder/pipeline-tab-panel.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add pipeline name persistence after refresh test</name>
  <files>app/components/pipeline-builder/pipeline-creation-flow.test.tsx</files>
  <action>
Add a new test to the "Create -> Rename -> Close -> Reopen Cycle" describe block in pipeline-creation-flow.test.tsx.

The test should verify the complete flow:
1. Create a pipeline (simulate via dbPipelines array with "Untitled Pipeline" name)
2. Render with the pipeline tab active
3. Change the name via the input field to a custom name like "Persisted Name Test"
4. Wait for the database to be updated (check dbPipelines)
5. Unmount the component (simulating leaving the page)
6. Re-render with fresh state but same pipeline in database (simulating page refresh)
7. Verify the input field shows the persisted custom name, NOT "Untitled Pipeline"

Test name: "pipeline name persists in input field after page refresh simulation"

Follow the existing test patterns in the file:
- Use the same mock setup (resetAllState, setupMswHandlers)
- Mock the stores and router as other tests do
- Use waitFor for async assertions
- Verify via screen.getByPlaceholderText("Pipeline name") having the correct value

Key assertion: After "refresh", the input should have value "Persisted Name Test" (or whatever custom name was set), not "Untitled Pipeline".
  </action>
  <verify>npm test -- app/components/pipeline-builder/pipeline-creation-flow.test.tsx --reporter=verbose</verify>
  <done>New test passes verifying that pipeline name persists after simulated page refresh</done>
</task>

</tasks>

<verification>
- Run the specific test file: `npm test -- app/components/pipeline-builder/pipeline-creation-flow.test.tsx`
- Confirm the new test passes
- Run full test suite: `npm test`
- Run typecheck: `npm run typecheck`
</verification>

<success_criteria>
- New test "pipeline name persists in input field after page refresh simulation" exists
- Test verifies complete flow: create -> rename -> refresh -> verify persisted name
- All tests pass
- TypeScript compiles with no errors
</success_criteria>

<output>
After completion, create `.planning/quick/038-test-pipeline-name-persistence-after-ref/038-SUMMARY.md`
</output>
