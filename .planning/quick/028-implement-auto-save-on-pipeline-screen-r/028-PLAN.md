---
id: "028"
name: Implement auto-save on pipeline screen
type: quick
status: planned
created: 2026-01-30
---

<objective>
Implement immediate auto-save on the pipeline screen. Remove the manual save button and auto-save whenever any state change occurs (canvas changes, name changes, new pipelines, tabs, etc). Save immediately with no debounce.

Purpose: Reduce friction in pipeline editing - users never have to remember to save.
Output: Auto-saving pipeline editor with no save button.
</objective>

<context>
@app/components/pipeline-builder/pipeline-tab-panel.tsx - Contains Save button and handleSave logic
@app/stores/pipeline-store.ts - Zustand store with isDirty tracking
@app/hooks/queries/use-pipelines.ts - React Query hooks for pipelines
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create useSavePipeline mutation hook</name>
  <files>app/hooks/queries/use-pipelines.ts</files>
  <action>
Add a `useSavePipeline` mutation hook to use-pipelines.ts that:
1. Accepts pipeline data: `{ id: string; name: string; description: string; nodes: Node[]; edges: Edge[]; isNew: boolean }`
2. POSTs to `/api/pipelines` with FormData (intent: "update" or "create" based on isNew)
3. Does NOT invalidate queries (to avoid refetch flicker during editing)
4. Returns the saved pipeline response

Follow existing mutation patterns in the file.
  </action>
  <verify>`npm run typecheck` passes</verify>
  <done>useSavePipeline mutation hook exists and is exported</done>
</task>

<task type="auto">
  <name>Task 2: Add auto-save effect and remove save button</name>
  <files>app/components/pipeline-builder/pipeline-tab-panel.tsx</files>
  <action>
Modify pipeline-tab-panel.tsx:

1. Import `useSavePipeline` from use-pipelines.ts
2. Remove the `isSaving` state and `handleSave` function
3. Remove the Save button from the header (keep Auto Layout, Run, Delete buttons)
4. Remove the `Save` import from lucide-react

5. Add auto-save effect that:
   - Watches pipeline.isDirty (from store)
   - When isDirty becomes true, immediately call the save mutation
   - On save success, call updatePipeline(pipelineId, { isDirty: false })
   - Use useEffect with dependency on [pipeline?.isDirty, pipelineId]
   - Handle isNew flag: if !initialData, this is a create (but note: new pipelines are now created in handleNewTab in pipeline-tabs.tsx, so initialData should always exist)

6. Also trigger save when name changes:
   - In handleNameChange, the store already sets isDirty implicitly via updatePipeline
   - Verify updatePipeline marks isDirty: true (it does NOT currently - fix this)

7. Update the store call in handleNameChange to also mark dirty:
   - Change updatePipeline call to include isDirty: true
  </action>
  <verify>
1. `npm run typecheck` passes
2. `npm run dev` and open a pipeline
3. Make a canvas change (drag node, add edge) - verify network request fires immediately
4. Change pipeline name - verify network request fires immediately
5. Confirm no Save button visible
  </verify>
  <done>Pipeline auto-saves immediately on any state change, no save button present</done>
</task>

<task type="auto">
  <name>Task 3: Ensure all state changes trigger isDirty</name>
  <files>app/stores/pipeline-store.ts, app/components/pipeline-builder/pipeline-tab-panel.tsx</files>
  <action>
Audit and verify isDirty is set on all state changes:

1. In pipeline-store.ts, verify these actions set isDirty: true (they already do):
   - createOnNodesChange - YES (line 221-224)
   - createOnEdgesChange - YES (line 233)
   - createOnConnect - YES (line 248)
   - addAgentNodeTo - YES (line 273)
   - addTraitNodeTo - YES (line 297)
   - removeNodeFrom - YES (line 312)
   - addTraitToNodeIn - YES (line 336)
   - removeTraitFromNodeIn - YES (line 361)

2. In pipeline-tab-panel.tsx handleNameChange:
   - Currently calls updatePipeline with only pipelineName
   - Add isDirty: true to the update object

3. handleAutoLayout also needs isDirty: true added to its updatePipeline call

All canvas interactions are already covered by store. Name change and auto-layout need the isDirty flag added.
  </action>
  <verify>
1. `npm run typecheck` passes
2. Test: change name -> auto-save triggers
3. Test: click Auto Layout -> auto-save triggers
4. Test: add/remove nodes -> auto-save triggers
5. Test: add/remove edges -> auto-save triggers
  </verify>
  <done>All pipeline state changes trigger immediate auto-save</done>
</task>

</tasks>

<verification>
- `npm run typecheck` passes
- Pipeline screen has no Save button
- Making any change (name, canvas, layout) triggers immediate network save
- No debounce delay - saves fire synchronously with changes
- Multiple rapid changes each trigger their own save (no coalescing)
</verification>

<success_criteria>
- Save button removed from pipeline header
- useSavePipeline mutation hook created
- Auto-save effect watches isDirty and saves immediately
- All state changes (name, nodes, edges, layout) mark isDirty and trigger save
- No user action required to persist changes
</success_criteria>
