---
phase: quick
plan: 015
type: execute
wave: 1
depends_on: []
files_modified:
  - app/stores/tab-store.ts
  - app/components/pipeline-builder/pipeline-tabs.tsx
  - app/routes/pipelines.$id.tsx
  - app/routes/pipelines.tsx
  - app/components/nav-main.tsx
autonomous: true

must_haves:
  truths:
    - "Home tab is always visible as leftmost pinned tab"
    - "Home tab cannot be closed"
    - "Home tab shows empty locked canvas when selected"
    - "Plus button shows dropdown of available pipelines"
    - "Selecting pipeline from dropdown opens or focuses that tab"
    - "/pipelines route redirects to /pipelines/home"
  artifacts:
    - path: "app/stores/tab-store.ts"
      provides: "HOME_TAB constant and pinned tab logic"
    - path: "app/components/pipeline-builder/pipeline-tabs.tsx"
      provides: "Pinned home tab + dropdown menu on plus"
    - path: "app/routes/pipelines.$id.tsx"
      provides: "Home tab rendering with locked empty canvas"
    - path: "app/routes/pipelines.tsx"
      provides: "Redirect to home tab"
---

<objective>
Replace the /pipelines list page with a pinned home tab and convert the plus button to a dropdown for selecting existing pipelines.

Purpose: Streamline UX by making the pipeline editor the primary interface, with a permanent home tab as fallback when no pipelines are open.

Output: Pinned home tab, dropdown pipeline selector, /pipelines redirects to home
</objective>

<execution_context>
@/Users/brendan/.claude/get-shit-done/workflows/execute-plan.md
@/Users/brendan/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@app/stores/tab-store.ts
@app/components/pipeline-builder/pipeline-tabs.tsx
@app/routes/pipelines.$id.tsx
@app/routes/pipelines.tsx
@app/components/nav-main.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add dropdown-menu component and update tab store for pinned home</name>
  <files>app/components/ui/dropdown-menu.tsx, app/stores/tab-store.ts</files>
  <action>
1. Add shadcn dropdown-menu component: `npx shadcn@latest add dropdown-menu`

2. Update app/stores/tab-store.ts:
   - Export constant: `export const HOME_TAB_ID = "home";`
   - Modify Tab interface to add optional `pinned?: boolean`
   - In closeTab: Early return if pipelineId === HOME_TAB_ID (pinned tabs can't close)
   - In canOpenNewTab: Don't count home tab toward MAX_TABS limit (filter it out before length check)
   - Keep existing focusOrOpenTab, openTab behavior unchanged (home tab handled separately)
  </action>
  <verify>TypeScript compiles, dropdown-menu component exists</verify>
  <done>Home tab ID exported, closeTab ignores home, canOpenNewTab excludes home from limit</done>
</task>

<task type="auto">
  <name>Task 2: Update PipelineTabs with pinned home and dropdown selector</name>
  <files>app/components/pipeline-builder/pipeline-tabs.tsx</files>
  <action>
1. Import DropdownMenu components and HOME_TAB_ID from stores

2. Add API call to fetch pipelines list for dropdown (use TanStack Query or inline fetch)

3. Render pinned home tab BEFORE the map of regular tabs:
   - No close button (pinned)
   - Smaller visual style like Chrome pinned tabs (icon only, narrower)
   - Use Home icon from lucide-react
   - onClick navigates to /pipelines/home

4. Convert Plus button to DropdownMenuTrigger:
   - Dropdown shows list of user's pipelines
   - Each item shows pipeline name
   - Clicking focuses existing tab OR opens new tab and navigates
   - Add "New Pipeline" option at bottom with Plus icon (keeps current handleNewTab behavior)
   - Disable entire dropdown (not just button) when !canOpenNewTab() for "New Pipeline" only - existing pipelines can always be selected

5. Update performClose to navigate to /pipelines/home instead of /pipelines when no tabs remain

6. Regular tabs: Keep existing close button, but don't show it for home tab
  </action>
  <verify>Home tab renders first, plus shows dropdown, selecting pipeline navigates correctly</verify>
  <done>Pinned home tab visible, dropdown lists pipelines, navigation works, home tab has no close button</done>
</task>

<task type="auto">
  <name>Task 3: Handle home tab in pipelines.$id route</name>
  <files>app/routes/pipelines.$id.tsx</files>
  <action>
1. Import HOME_TAB_ID from tab store

2. Update loader:
   - If id === "home", return special response with requestedId: "home", requestedPipeline: null
   - Keep existing logic for real pipeline IDs

3. Update useEffect that syncs URL to tab store:
   - If urlId === "home", call focusOrOpenTab with HOME_TAB_ID and "Home" name
   - Skip the requestedPipeline name lookup for home

4. In the main render, handle home tab panel:
   - When tab.pipelineId === HOME_TAB_ID, render a simplified panel:
     - Full-height container with ReactFlowProvider
     - Empty ReactFlow canvas with Background, Controls (no MiniMap needed)
     - All interactions disabled: nodesDraggable={false}, nodesConnectable={false}, elementsSelectable={false}, deleteKeyCode={null}
     - No header toolbar (no name input, no save/run/delete buttons)
     - Centered text overlay: "Select a pipeline or create new" in muted text
   - Skip rendering PipelineTabPanelWithAutosave for home tab

5. Keep AgentSidebar visible even for home tab (consistent layout)
  </action>
  <verify>Navigate to /pipelines/home shows locked empty canvas, sidebar visible</verify>
  <done>Home tab shows empty locked canvas with instructional text, no toolbar</done>
</task>

<task type="auto">
  <name>Task 4: Redirect /pipelines to /pipelines/home and update nav</name>
  <files>app/routes/pipelines.tsx, app/components/nav-main.tsx</files>
  <action>
1. In app/routes/pipelines.tsx:
   - Replace entire loader with: `return redirect("/pipelines/home")`
   - Remove action function (no longer needed)
   - Remove default export component (no longer rendered)
   - Keep necessary imports for redirect

2. In app/components/nav-main.tsx:
   - Update Pipelines nav item url from "/pipelines" to "/pipelines/home"
   - Keep isActive logic working (pathname.startsWith will still match)
  </action>
  <verify>Visiting /pipelines redirects to /pipelines/home, sidebar nav highlights correctly</verify>
  <done>/pipelines redirects to home, nav link updated and active state works</done>
</task>

</tasks>

<verification>
1. Navigate to /pipelines - should redirect to /pipelines/home
2. Home tab visible as pinned (no close button, leftmost position)
3. Click home tab icon - shows empty locked canvas with instruction text
4. Click plus button - dropdown shows pipeline list
5. Select existing pipeline - opens in new tab or focuses existing
6. Click "New Pipeline" in dropdown - creates and opens new pipeline
7. Close all pipeline tabs - home tab remains, shows home canvas
8. Open 7 pipelines + home = plus still works (home not counted in limit)
9. Sidebar "Pipelines" link works and highlights correctly
</verification>

<success_criteria>
- Home tab permanently visible and cannot be closed
- Plus button reveals pipeline dropdown
- /pipelines route redirects to /pipelines/home
- Home tab shows empty locked canvas
- Max tabs (8) excludes home tab from count
</success_criteria>

<output>
After completion, create `.planning/quick/015-replace-pipelines-page-with-pinned-home-/015-SUMMARY.md`
</output>
