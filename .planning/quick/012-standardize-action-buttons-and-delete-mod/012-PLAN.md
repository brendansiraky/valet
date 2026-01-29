---
phase: quick-012
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/components/trait-card.tsx
  - app/components/trait-delete-dialog.tsx
  - app/components/agent-card.tsx
  - app/components/pipeline-card.tsx
  - app/components/pipeline-delete-dialog.tsx
  - app/routes/pipelines.tsx
autonomous: true

must_haves:
  truths:
    - "All delete actions show confirmation modal before deleting"
    - "Agents and Pipelines pages no longer show 'Updated at' timestamps"
    - "Button layouts are consistent across Agents, Pipelines, and Traits pages"
  artifacts:
    - path: "app/components/trait-delete-dialog.tsx"
      provides: "Delete confirmation modal for traits"
    - path: "app/components/pipeline-delete-dialog.tsx"
      provides: "Delete confirmation modal for pipelines"
    - path: "app/components/pipeline-card.tsx"
      provides: "Pipeline card component with delete button"
  key_links:
    - from: "app/components/trait-card.tsx"
      to: "app/components/trait-delete-dialog.tsx"
      via: "imports TraitDeleteDialog"
    - from: "app/components/pipeline-card.tsx"
      to: "app/components/pipeline-delete-dialog.tsx"
      via: "imports PipelineDeleteDialog"
    - from: "app/routes/pipelines.tsx"
      to: "app/components/pipeline-card.tsx"
      via: "renders PipelineCard"
---

<objective>
Standardize action buttons and add delete confirmation modals across Agents, Pipelines, and Traits pages.

Purpose: Consistent UX across all list pages with confirmation before destructive actions.
Output: Delete confirmation modals for all entities, removed timestamps, consistent button layout.
</objective>

<execution_context>
@/Users/brendan/.claude/get-shit-done/workflows/execute-plan.md
@/Users/brendan/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.claude/skills/frontend-designer/SKILL.md
@app/components/agent-delete-dialog.tsx (reference pattern for delete dialogs)
@app/components/agent-card.tsx (reference for card layout)
@app/components/trait-card.tsx
@app/routes/pipelines.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add delete confirmation modal to Traits</name>
  <files>
    app/components/trait-delete-dialog.tsx
    app/components/trait-card.tsx
  </files>
  <action>
1. Create `app/components/trait-delete-dialog.tsx` following AgentDeleteDialog pattern:
   - Props: `trait: Pick<Trait, "id" | "name">` and `trigger: ReactNode`
   - Use AlertDialog components from `~/components/ui/alert-dialog`
   - Message: "This will permanently delete {trait.name}. This action cannot be undone."
   - Form posts with intent="delete" and traitId hidden input

2. Update `app/components/trait-card.tsx`:
   - Import TraitDeleteDialog
   - Replace the direct Form delete button in CardFooter with:
     ```tsx
     <TraitDeleteDialog
       trait={trait}
       trigger={
         <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
           <Trash2 className="mr-2 size-4" />
           Delete
         </Button>
       }
     />
     ```
   - Keep Edit button unchanged (first button)
  </action>
  <verify>
    - Visit /traits page
    - Click Delete on a trait - modal should appear
    - Click Cancel - modal closes, no deletion
    - Click Delete in modal - trait is deleted
  </verify>
  <done>Traits delete button shows confirmation modal before deleting</done>
</task>

<task type="auto">
  <name>Task 2: Remove "Updated at" from Agents page</name>
  <files>app/components/agent-card.tsx</files>
  <action>
Remove the "Updated at" timestamp section from AgentCard:

1. Delete the `formatRelativeTime` function (no longer needed)
2. Delete lines 85-89 (the div with "Updated {formatRelativeTime(agent.updatedAt)}")
3. Keep all buttons (Test, Edit, Delete icons) in CardHeader unchanged
4. Keep CardContent with truncated instructions unchanged

The card should show: title in header with icon buttons, instructions in content, no footer.
  </action>
  <verify>
    - Visit /agents page
    - Confirm cards show name, instructions, and action buttons
    - Confirm no "Updated X ago" text appears
    - Confirm Test/Edit/Delete buttons still work
  </verify>
  <done>Agent cards no longer display "Updated at" timestamps</done>
</task>

<task type="auto">
  <name>Task 3: Add Delete button with modal to Pipelines</name>
  <files>
    app/components/pipeline-delete-dialog.tsx
    app/components/pipeline-card.tsx
    app/routes/pipelines.tsx
  </files>
  <action>
1. Create `app/components/pipeline-delete-dialog.tsx` following AgentDeleteDialog pattern:
   - Props: `pipeline: { id: string; name: string }` and `trigger: ReactNode`
   - Use AlertDialog components
   - Message: "This will permanently delete {pipeline.name}. This action cannot be undone."
   - Form posts with intent="delete" and pipelineId hidden input

2. Create `app/components/pipeline-card.tsx`:
   - Props: `pipeline: { id: string; name: string; description: string | null }` and `onDelete?: () => void` (optional callback)
   - Wrap in Link to `/pipelines/${pipeline.id}` for click navigation
   - Use Card with CardHeader containing:
     - CardTitle (pipeline.name) on left
     - Delete icon button on right (stops propagation to prevent navigation)
   - CardContent with CardDescription if pipeline.description exists
   - NO "Updated at" timestamp
   - Delete button triggers PipelineDeleteDialog

3. Update `app/routes/pipelines.tsx`:
   - Add delete action handler (intent="delete", pipelineId)
   - Import and use PipelineCard component
   - Replace inline card rendering with PipelineCard
  </action>
  <verify>
    - Visit /pipelines page
    - Confirm cards show name and description only (no "Updated at")
    - Click card body - navigates to pipeline detail
    - Click Delete button - modal appears (doesn't navigate)
    - Confirm deletion through modal works
  </verify>
  <done>Pipelines page has Delete button with confirmation modal, no timestamps</done>
</task>

</tasks>

<verification>
1. Navigate to /traits - verify Edit/Delete buttons with Delete showing modal
2. Navigate to /agents - verify Test/Edit/Delete buttons, no timestamps
3. Navigate to /pipelines - verify Delete button with modal, no timestamps
4. All delete operations require confirmation before executing
</verification>

<success_criteria>
- TraitDeleteDialog and PipelineDeleteDialog components created
- All three pages (Agents, Pipelines, Traits) have consistent delete UX with confirmation
- No "Updated at" timestamps on Agents or Pipelines pages
- `npm run typecheck` passes
</success_criteria>

<output>
After completion, create `.planning/quick/012-standardize-action-buttons-and-delete-mod/012-SUMMARY.md`
</output>
