---
phase: quick
plan: 004
type: execute
wave: 1
depends_on: []
files_modified:
  - app/components/pipeline-builder/pipeline-canvas.tsx
autonomous: true

must_haves:
  truths:
    - "User can drag traits from sidebar onto agent nodes in the pipeline canvas"
    - "Dragging agents onto canvas still works correctly"
    - "Trait chips appear on agent nodes after dropping"
  artifacts:
    - path: "app/components/pipeline-builder/pipeline-canvas.tsx"
      provides: "Canvas drag handling that distinguishes agents vs traits"
  key_links:
    - from: "agent-sidebar.tsx"
      to: "agent-node.tsx"
      via: "trait drag data transfer"
      pattern: "application/trait-id"
---

<objective>
Fix trait drag-drop onto agent nodes in the React Flow pipeline canvas.

Purpose: Users cannot drag traits from the sidebar onto agent nodes - the canvas intercepts the drag event before it reaches the agent node's drop handler.

Output: Working trait drag-drop where traits can be dropped onto agent nodes to assign them.
</objective>

<context>
@.planning/STATE.md
@app/components/pipeline-builder/pipeline-canvas.tsx
@app/components/pipeline-builder/agent-node.tsx
@app/components/pipeline-builder/agent-sidebar.tsx
</context>

<diagnosis>
The bug is in `pipeline-canvas.tsx` lines 30-33:

```tsx
const onDragOver = useCallback((event: React.DragEvent) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
}, []);
```

This handler unconditionally calls `preventDefault()` on ALL drag events, including trait drags. This interferes with event bubbling to the AgentNode's drag handlers.

The canvas should only handle agent drags (for dropping new agents onto the canvas). Trait drags should be allowed to propagate to the AgentNode components, which have their own `onDragOver` and `onDrop` handlers.
</diagnosis>

<tasks>

<task type="auto">
  <name>Task 1: Fix canvas onDragOver to only handle agent drags</name>
  <files>app/components/pipeline-builder/pipeline-canvas.tsx</files>
  <action>
Modify the `onDragOver` callback in `PipelineCanvasInner` to check the drag data type before handling:

1. Only call `event.preventDefault()` and set `dropEffect` if the drag contains agent data
2. Check for `application/agent-id` in `event.dataTransfer.types` to identify agent drags
3. For trait drags (identified by `application/trait-id`), do NOT prevent default at the canvas level - let them bubble to AgentNode

Updated handler should be:
```tsx
const onDragOver = useCallback((event: React.DragEvent) => {
  // Only handle agent drops at the canvas level
  // Trait drops should bubble to AgentNode handlers
  if (event.dataTransfer.types.includes("application/agent-id")) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }
}, []);
```

This allows trait drags to reach the AgentNode's `handleDragOver` which already correctly handles them (line 21-27 in agent-node.tsx).
  </action>
  <verify>
1. Start dev server: `npm run dev`
2. Navigate to pipeline builder
3. Add an agent to the canvas
4. Drag a trait from the sidebar onto the agent node
5. Verify the trait chip appears on the agent node
6. Verify dragging agents onto canvas still works
  </verify>
  <done>
- Traits can be dragged from sidebar and dropped onto agent nodes
- Trait chips appear on agent nodes after dropping
- Agent drag-drop onto canvas continues to work
  </done>
</task>

</tasks>

<verification>
Manual testing:
1. Drag agent from sidebar to canvas - should create node
2. Drag trait from sidebar to agent node - should add trait chip
3. Drag another trait to same agent - should add second trait chip
4. Remove trait via X button - should remove chip
</verification>

<success_criteria>
- Trait drag-drop onto agent nodes works
- Agent drag-drop onto canvas still works
- No regressions in existing drag-drop behavior
</success_criteria>

<output>
After completion, create `.planning/quick/004-fix-trait-drag-drop-onto-react-flow-canv/004-SUMMARY.md`
</output>
