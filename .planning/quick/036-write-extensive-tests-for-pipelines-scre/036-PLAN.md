---
type: quick
task: "036"
title: Write extensive tests for pipelines screen user flow
files_modified:
  - app/components/pipeline-builder/pipeline-tabs.test.tsx
  - app/routes/pipelines.$id.test.tsx
  - app/mocks/handlers.ts
---

<objective>
Write extensive integration tests that verify the complete pipelines screen user flow works as designed.

**Purpose:** Tests must validate the entire user journey: initial empty state, creating pipelines, renaming with auto-save, tab management (closing/reopening), pipeline deletion, and dropdown behavior. Tests are the driving force - if tests fail, the code is broken and must be fixed.

**Output:** Comprehensive test files co-located with source files that cover the user flow described in requirements.
</objective>

<context>
@CLAUDE.md - Testing requirements and patterns
@.claude/skills/vitest-testing/SKILL.md - Testing patterns
@app/test-utils.tsx - Test utilities
@app/mocks/handlers.ts - MSW handlers for API mocking
@app/routes/pipelines.$id.tsx - Main pipeline editor page
@app/routes/pipelines.$id.test.tsx - Existing basic tests
@app/components/pipeline-builder/pipeline-tabs.tsx - Tab bar component
@app/components/pipeline-builder/pipeline-tab-panel.tsx - Individual tab content
@app/stores/tab-store.ts - Tab state management (Zustand with persistence)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create extensive PipelineTabs component tests</name>
  <files>app/components/pipeline-builder/pipeline-tabs.test.tsx</files>
  <action>
Create a comprehensive test file for the PipelineTabs component that covers:

**Initial State:**
- Renders pinned home icon
- Renders plus symbol dropdown trigger
- Dropdown contains only "New Pipeline" item when no pipelines exist
- Home tab cannot be closed (no X button on home)

**Dropdown Behavior:**
- Dropdown shows "New Pipeline" item always
- Dropdown shows separator and existing pipelines when pipelines exist (and are not already open)
- Pipelines already open as tabs do NOT appear in dropdown (filtered out)
- Clicking "New Pipeline" calls handleNewTab (creates pipeline via POST /api/pipelines)

**Tab Management:**
- Clicking a tab activates it (calls handleTabClick -> navigate)
- Close button appears on non-home tabs
- Clicking close triggers handleClose (or confirm dialog if running)
- Running pipeline shows confirm close dialog before closing
- After close, navigates to remaining tab or home

**Integration with Store:**
Mock useTabStore to control tabs state. Mock usePipelines to control available pipelines.

Test setup pattern:
```typescript
vi.mock("~/stores/tab-store", () => ({
  useTabStore: vi.fn(() => ({
    tabs: [],
    activeTabId: "home",
    closeTab: vi.fn(),
    focusOrOpenTab: vi.fn(),
    canOpenNewTab: () => true,
  })),
  HOME_TAB_ID: "home",
}));

vi.mock("~/hooks/queries/use-pipelines", () => ({
  usePipelines: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return { ...actual, useNavigate: vi.fn(() => vi.fn()) };
});
```

Use userEvent for all interactions. Verify dropdown opens/closes, items render correctly.
  </action>
  <verify>npm test app/components/pipeline-builder/pipeline-tabs.test.tsx -- --run passes all tests</verify>
  <done>
- Initial empty state renders correctly (home icon, plus dropdown, "New Pipeline" only)
- Dropdown shows existing pipelines when they exist and are not open
- Tab clicks navigate correctly
- Close button behavior correct (dialog for running, immediate for stopped)
- All edge cases covered (max tabs, home cannot close)
  </done>
</task>

<task type="auto">
  <name>Task 2: Extend pipelines.$id.test.tsx with complete user flow tests</name>
  <files>app/routes/pipelines.$id.test.tsx, app/mocks/handlers.ts</files>
  <action>
Extend the existing pipelines.$id.test.tsx with comprehensive user flow tests. The existing tests cover basic rendering; add tests for the full user journey.

**Update mocks/handlers.ts if needed:**
- Ensure POST /api/pipelines with intent=create returns new pipeline with incrementing ID
- Ensure POST /api/pipelines with intent=delete returns success
- Track created pipelines in test state for realistic dropdown behavior

**New test scenarios to add:**

1. **Initial landing state (no pipelines):**
   - Home tab active
   - Canvas shows "Select a pipeline or create new" message
   - Sidebar shows "Your Agents" and "Traits" sections
   - Canvas is locked (user cannot drag because no pipeline selected)

2. **Creating first pipeline:**
   - Click plus symbol in tabbar
   - Click "New Pipeline" in dropdown
   - New tab appears with "Untitled Pipeline" name
   - Pipeline is auto-saved (POST /api/pipelines called with intent=create)
   - Tab is now active

3. **Renaming pipeline:**
   - Focus the name input in header
   - Type new name
   - Debounce triggers save (POST /api/pipelines with intent=update)
   - Tab name updates in tab bar
   - Navigate away and back - name persists

4. **Closing and reopening tabs:**
   - Close the pipeline tab (click X)
   - Tab disappears, navigates to home
   - Click plus, dropdown now shows the closed pipeline
   - Click the pipeline in dropdown
   - Tab reopens with saved name

5. **Deleting pipeline:**
   - Click delete button on pipeline
   - Confirm dialog appears (window.confirm mock)
   - Confirm deletion
   - POST /api/pipelines with intent=delete called
   - Tab removed, navigates to home
   - Pipeline no longer appears in dropdown

**Test setup considerations:**
- Mock window.confirm for delete confirmation
- Use vi.useFakeTimers() for debounce testing (call vi.advanceTimersByTime)
- Track API calls to verify auto-save behavior
- Reset zustand stores between tests (or mock them fresh each test)
  </action>
  <verify>npm test app/routes/pipelines.$id.test.tsx -- --run passes all tests including new user flow tests</verify>
  <done>
- Initial empty state test passes
- Pipeline creation flow test passes
- Rename with auto-save test passes
- Close/reopen tab flow test passes
- Delete pipeline flow test passes
- All tests verify the feature works as specified
  </done>
</task>

<task type="auto">
  <name>Task 3: Verify all tests pass and fix any broken functionality</name>
  <files>Any files identified as broken</files>
  <action>
Run the full test suite to verify everything passes:

```bash
npm run typecheck && npm test -- --run
```

**If tests fail:**
1. Analyze the failure - is it a test issue or code issue?
2. If test issue (wrong mock, wrong assertion) - fix the test
3. If code issue (feature doesn't work as specified) - fix the code
4. The user's specification is the source of truth:
   - Initial state: home tab only, dropdown has "New Pipeline" only
   - Creating pipeline: POST creates, tab appears, auto-saves
   - Renaming: debounced auto-save, persists across navigation
   - Closing: tab removed, pipeline still in dropdown
   - Deleting: confirm prompt, removes from DB and frontend

**Important:** Do NOT weaken tests to make them pass. The tests define correct behavior. If the code doesn't match, the code is wrong.

Document any code fixes made in the summary.
  </action>
  <verify>npm run typecheck && npm test -- --run passes with 0 failures</verify>
  <done>
- All TypeScript compiles without errors
- All tests pass
- Any code fixes documented
- Feature works exactly as user specified
  </done>
</task>

</tasks>

<verification>
```bash
# All tests must pass
npm run typecheck && npm test -- --run

# Specific test files
npm test app/components/pipeline-builder/pipeline-tabs.test.tsx -- --run
npm test app/routes/pipelines.$id.test.tsx -- --run
```
</verification>

<success_criteria>
- PipelineTabs component has comprehensive tests covering all dropdown and tab behaviors
- PipelineEditorPage has tests for complete user flow (create, rename, close, reopen, delete)
- All tests pass without weakening assertions
- Tests accurately represent the user's specification
- Any code fixes to broken functionality are documented
- TypeScript compiles with zero errors
</success_criteria>

<output>
After completion, create `.planning/quick/036-write-extensive-tests-for-pipelines-scre/036-SUMMARY.md`
</output>
