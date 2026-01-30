---
phase: quick-031
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/components/pipeline-builder/pipeline-tab-panel.tsx
  - app/stores/pipeline-store.ts
autonomous: true

must_haves:
  truths:
    - "Pipeline saves trigger directly from user actions, not from useEffect watching state"
    - "No useEffect triggers mutations based on isDirty flag"
    - "All pipeline modifications (name change, drop agent, drop trait, auto-layout, canvas changes) save immediately"
  artifacts:
    - path: "app/components/pipeline-builder/pipeline-tab-panel.tsx"
      provides: "Event-driven save logic"
      contains: "savePipeline callback called from handlers"
    - path: "app/stores/pipeline-store.ts"
      provides: "Pipeline store without isDirty tracking"
  key_links:
    - from: "handleNameChange, handleDropAgent, handleDropTrait, handleAutoLayout"
      to: "savePipeline callback"
      via: "direct function call"
---

<objective>
Fix the useEffect mutation anti-pattern in pipeline-tab-panel.tsx by moving auto-save from a useEffect side-effect to direct calls in event handlers.

Purpose: Eliminate React anti-pattern where mutations fire from useEffect watching state changes, which causes unpredictable timing, potential race conditions, and violates React's event-driven model.

Output: Clean event-driven save architecture where user actions directly trigger saves.
</objective>

<context>
@app/components/pipeline-builder/pipeline-tab-panel.tsx
@app/components/pipeline-builder/pipeline-canvas.tsx
@app/stores/pipeline-store.ts
@.claude/skills/react-components/references/react-best-practices.md (lines 128-136)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create savePipeline callback and wire to local handlers</name>
  <files>app/components/pipeline-builder/pipeline-tab-panel.tsx</files>
  <action>
1. Create a `savePipeline` callback using `useCallback` that:
   - Gets current pipeline state from store
   - Calls `savePipelineMutation.mutate()` with current pipeline data
   - Tracks `hasBeenSavedRef` for isNew flag (keep this ref)
   - Remove `isSavingRef` - let TanStack Query handle deduplication via mutation key

2. Delete the anti-pattern useEffect (lines 149-176) entirely

3. Update local event handlers to call savePipeline after state changes:
   - `handleNameChange`: After `updatePipeline()` and `updateTabName()`, call `savePipeline()`
   - `handleAutoLayout`: After `updatePipeline()`, call `savePipeline()`

4. Update drop handlers to call savePipeline:
   - `handleDropAgent`: After `addAgentNodeTo()`, call `savePipeline()`
   - `handleDropTrait`: After `addTraitNodeTo()`, call `savePipeline()`

5. Remove `isDirty` from the `loadPipeline` call (line 92) - no longer needed

Note: The store methods `addAgentNodeTo`, `addTraitNodeTo`, etc. currently set `isDirty: true` internally. This is fine to leave - the flag becomes unused but removing it from the store is a separate cleanup task.
  </action>
  <verify>
    - TypeScript compiles: `npx tsc --noEmit`
    - No useEffect with isDirty dependency remains in file
    - grep confirms: `grep -n "isDirty" app/components/pipeline-builder/pipeline-tab-panel.tsx` returns no matches
  </verify>
  <done>
    - useEffect mutation anti-pattern removed
    - savePipeline callback exists and is called from handleNameChange, handleAutoLayout, handleDropAgent, handleDropTrait
    - File compiles without errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Wire canvas changes to save callback via onPipelineChange prop</name>
  <files>app/components/pipeline-builder/pipeline-tab-panel.tsx, app/components/pipeline-builder/pipeline-canvas.tsx</files>
  <action>
The pipeline-canvas.tsx uses store callbacks (`createOnNodesChange`, `createOnEdgesChange`, `createOnConnect`) that update the store directly. These need to trigger saves too.

1. In pipeline-tab-panel.tsx:
   - Pass `onPipelineChange={savePipeline}` prop to PipelineCanvas

2. In pipeline-canvas.tsx:
   - Add `onPipelineChange?: () => void` to PipelineCanvasProps
   - Wrap the store callbacks to also call onPipelineChange:

   ```typescript
   const onNodesChangeBase = useMemo(
     () => createOnNodesChange(pipelineId),
     [pipelineId, createOnNodesChange]
   );
   const onNodesChange = useCallback(
     (changes: NodeChange<Node<PipelineNodeData>>[]) => {
       onNodesChangeBase(changes);
       onPipelineChange?.();
     },
     [onNodesChangeBase, onPipelineChange]
   );
   ```

   - Do the same for onEdgesChange and onConnect
   - Import NodeChange type from @xyflow/react

3. The onDrop handler already calls onDropAgent/onDropTrait which now trigger saves in the parent, so no change needed there.
  </action>
  <verify>
    - TypeScript compiles: `npx tsc --noEmit`
    - Manual test: Open pipeline, drag a node, verify network request fires (check Network tab)
    - Manual test: Connect two nodes, verify save fires
  </verify>
  <done>
    - PipelineCanvas accepts onPipelineChange prop
    - Node drags, edge connections, and node deletions all trigger saves
    - No useEffect-based save logic anywhere in the pipeline builder
  </done>
</task>

<task type="auto">
  <name>Task 3: Clean up isDirty from store interface (optional simplification)</name>
  <files>app/stores/pipeline-store.ts</files>
  <action>
Now that saves are event-driven, the `isDirty` flag serves no purpose. Clean it up:

1. Remove `isDirty` from `PipelineData` interface (line 42)
2. Remove `isDirty: false` from `createCompatPipeline()` (line 159)
3. Remove `markDirty` and `markClean` methods from interface and implementation (lines 64-65, 199-213)
4. Remove `isDirty: true` from all the store methods that set it:
   - createOnNodesChange (line 222)
   - createOnEdgesChange (line 234)
   - createOnConnect (line 248)
   - addAgentNodeTo (line 273)
   - addTraitNodeTo (line 296)
   - removeNodeFrom (line 312)
   - addTraitToNodeIn (line 336)
   - removeTraitFromNodeIn (line 363)

Note: Keep the store method signatures and behavior otherwise identical - they still update nodes/edges, they just don't set isDirty anymore.
  </action>
  <verify>
    - TypeScript compiles: `npx tsc --noEmit`
    - grep confirms: `grep -n "isDirty" app/stores/pipeline-store.ts` returns no matches
    - grep confirms: `grep -rn "isDirty" app/` returns no matches in the entire app
  </verify>
  <done>
    - isDirty concept fully removed from codebase
    - Store is simpler with no dirty tracking
    - All types compile cleanly
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` - TypeScript compiles
2. `npm run dev` - App starts without errors
3. Manual verification:
   - Create new pipeline, rename it -> saves (check Network tab)
   - Drop an agent onto canvas -> saves
   - Drop a trait onto canvas -> saves
   - Drag a node to new position -> saves
   - Connect two nodes -> saves
   - Click Auto Layout -> saves
   - Refresh page -> all changes persisted
</verification>

<success_criteria>
- Zero useEffect hooks that trigger mutations based on state changes
- All pipeline modifications save immediately via direct callback invocation
- isDirty flag removed from store and components
- TypeScript compiles without errors
- Pipeline builder functions correctly with new save architecture
</success_criteria>

<output>
After completion, create `.planning/quick/031-fix-useeffect-mutation-antipattern/031-SUMMARY.md`
</output>
