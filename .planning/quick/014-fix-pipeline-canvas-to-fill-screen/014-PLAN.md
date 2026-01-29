---
id: "014"
type: quick
title: Fix pipeline canvas to fill screen
files_modified:
  - app/routes/pipelines.$id.tsx
autonomous: true
---

<objective>
Fix the pipeline editor canvas to properly fill the available viewport height, accounting for the page header.

**Problem:** The canvas is pushed down by the editor header bar, but the main content area uses `h-full` which tries to be 100% of the parent container. This causes the canvas to overflow beyond the viewport bottom.

**Root cause:** The layout structure has nested `h-full` classes that don't account for the header height. Both the outer container and the main content div use `h-full`, but the main content should use `flex-1` to fill remaining space after the header takes its natural height.

**Solution:** Convert to flex column layout where:
1. Outer container: `h-full flex flex-col overflow-hidden`
2. Header: natural height (no explicit height needed)
3. Main content: `flex-1 min-h-0 flex` (flex-1 fills remaining space, min-h-0 allows flex children to shrink below content size)

Output: Pipeline editor canvas fills exactly the available space below the header
</objective>

<context>
@app/routes/pipelines.$id.tsx
@.claude/skills/frontend-designer/SKILL.md
</context>

<tasks>

<task type="auto">
  <name>Fix pipeline editor layout to fill viewport correctly</name>
  <files>app/routes/pipelines.$id.tsx</files>
  <action>
Update the layout structure in the return statement around lines 328-400:

1. Change outer container (line 329):
   FROM: `<div className='h-full overflow-hidden'>`
   TO: `<div className='flex h-full flex-col overflow-hidden'>`

2. Keep header unchanged (line 331):
   `<div className='z-10 border-b bg-background p-4 flex items-center gap-4'>` stays the same - it will take its natural height

3. Change main content wrapper (line 389):
   FROM: `<div className='h-full flex'>`
   TO: `<div className='flex flex-1 min-h-0'>`

The `min-h-0` is critical - it overrides the default `min-height: auto` on flex items, allowing the content to shrink and not overflow. The `flex-1` makes it fill the remaining vertical space after the header.
  </action>
  <verify>
1. Run the dev server: `npm run dev`
2. Navigate to any pipeline (e.g., /pipelines/new)
3. The canvas should fill exactly the space below the header
4. No vertical scrollbar should appear on the page
5. The React Flow canvas controls should be visible at bottom-left
  </verify>
  <done>Pipeline editor canvas fills available viewport height without overflowing, header stays fixed at top, no page scroll</done>
</task>

</tasks>

<verification>
- `npm run dev` starts without errors
- Pipeline editor page shows canvas filling exact available space
- No vertical page scroll when viewing the pipeline editor
- Canvas is fully interactive (can pan, zoom, drag nodes)
</verification>

<success_criteria>
- Canvas bottom edge aligns with viewport bottom
- Header remains visible at top
- No layout shifts or overflow issues
- Works with sidebar collapsed and expanded
</success_criteria>
