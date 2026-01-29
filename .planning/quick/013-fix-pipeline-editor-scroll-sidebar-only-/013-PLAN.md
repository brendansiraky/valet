---
phase: quick
plan: 013
type: execute
wave: 1
depends_on: []
files_modified:
  - app/routes/pipelines.$id.tsx
  - app/components/pipeline-builder/agent-sidebar.tsx
autonomous: true

must_haves:
  truths:
    - "Page does not scroll - it's a fixed canvas"
    - "Header with name/save buttons stays visible at top"
    - "Sidebar scrolls independently when content overflows"
    - "Canvas fills remaining space without overflow"
  artifacts:
    - path: "app/routes/pipelines.$id.tsx"
      provides: "Fixed viewport layout with proper flex constraints"
    - path: "app/components/pipeline-builder/agent-sidebar.tsx"
      provides: "Self-contained scrolling sidebar"
---

<objective>
Fix the pipeline editor page so the sidebar is the only scrollable element while the header stays sticky and the page itself doesn't scroll.

Purpose: Currently the entire page scrolls when the sidebar content overflows, causing the header to scroll away and the sidebar to hang off the bottom. The page should be a fixed canvas.

Output: A properly constrained layout where only the sidebar scrolls.
</objective>

<context>
@app/routes/pipelines.$id.tsx
@app/components/pipeline-builder/agent-sidebar.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix page layout to prevent scrolling</name>
  <files>app/routes/pipelines.$id.tsx</files>
  <action>
Update the main container layout in pipelines.$id.tsx:

1. Add `overflow-hidden` to the root div to prevent page scrolling:
   `className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden"`

2. Add `min-h-0` to the flex-1 content area to allow proper flex shrinking:
   The flex container wrapping sidebar + canvas needs `min-h-0` to enable the sidebar's overflow-y-auto to work correctly. Change:
   `<div className="flex-1 flex">`
   to:
   `<div className="flex-1 flex min-h-0">`

3. Ensure the header stays in place (it's already positioned correctly as the first flex child, but verify `flex-none` or similar isn't needed).
  </action>
  <verify>
Run dev server and navigate to /pipelines/new or an existing pipeline:
1. Resize window to be shorter than sidebar content
2. Verify page itself does not scroll (no scrollbar on body/main)
3. Verify header stays visible at top
4. Verify sidebar shows scrollbar and scrolls independently
  </verify>
  <done>Page is a fixed canvas - only sidebar scrolls, header stays sticky</done>
</task>

<task type="auto">
  <name>Task 2: Ensure sidebar has proper height constraints</name>
  <files>app/components/pipeline-builder/agent-sidebar.tsx</files>
  <action>
Update AgentSidebar to ensure it fills available height and scrolls properly:

1. Change the root div to use `h-full` to fill the flex container height:
   `className="w-64 h-full border-r bg-background p-4 overflow-y-auto"`

The sidebar already has `overflow-y-auto` which is correct. The `h-full` ensures it takes the full height of its parent (the flex row), which combined with the parent's `min-h-0` will enable proper scrolling.
  </action>
  <verify>
1. Add many agents or traits to test scrolling
2. Sidebar should scroll independently
3. Content should not overflow below the viewport
4. Canvas should not be affected by sidebar scroll
  </verify>
  <done>Sidebar is self-contained with independent scrolling</done>
</task>

</tasks>

<verification>
1. Navigate to /pipelines/new with browser window shorter than sidebar content
2. Confirm: Page has no scrollbar, header is always visible
3. Confirm: Sidebar scrolls when hovering/clicking on it
4. Confirm: Canvas area fills remaining space
5. Confirm: Dragging agents/traits from sidebar still works correctly
</verification>

<success_criteria>
- Page does not scroll vertically at any viewport size
- Header with pipeline name and action buttons always visible
- Sidebar scrolls independently when agents/traits list is long
- Canvas (React Flow) area fills remaining horizontal/vertical space
- No visual regressions or broken interactions
</success_criteria>

<output>
After completion, create `.planning/quick/013-fix-pipeline-editor-scroll-sidebar-only-/013-SUMMARY.md`
</output>
