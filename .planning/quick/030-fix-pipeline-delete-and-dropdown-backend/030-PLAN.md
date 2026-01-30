---
phase: quick-030
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/hooks/queries/use-pipelines.ts
  - app/components/pipeline-builder/pipeline-tabs.tsx
  - app/components/pipeline-builder/pipeline-tab-panel.tsx
autonomous: true

must_haves:
  truths:
    - "Deleting a pipeline removes it from backend database"
    - "Deleted pipeline immediately disappears from dropdown"
    - "Dropdown shows all existing pipelines from backend"
    - "Selecting pipeline from dropdown opens it in a tab"
    - "+ New Pipeline creates a new pipeline in the backend"
  artifacts:
    - path: "app/hooks/queries/use-pipelines.ts"
      provides: "useDeletePipeline mutation with cache invalidation"
      exports: ["usePipelines", "usePipeline", "useRunPipeline", "useSavePipeline", "useDeletePipeline"]
    - path: "app/components/pipeline-builder/pipeline-tabs.tsx"
      provides: "Dropdown using usePipelines() React Query hook"
    - path: "app/components/pipeline-builder/pipeline-tab-panel.tsx"
      provides: "Delete using useDeletePipeline() mutation"
  key_links:
    - from: "app/components/pipeline-builder/pipeline-tabs.tsx"
      to: "app/hooks/queries/use-pipelines.ts"
      via: "usePipelines() hook import"
      pattern: "usePipelines\\(\\)"
    - from: "app/components/pipeline-builder/pipeline-tab-panel.tsx"
      to: "app/hooks/queries/use-pipelines.ts"
      via: "useDeletePipeline() hook import"
      pattern: "useDeletePipeline\\(\\)"
---

<objective>
Fix pipeline deletion and dropdown to work correctly with backend data

Purpose: Currently the dropdown fetches pipeline list once on mount with raw fetch, and delete doesn't invalidate the cache. This causes deleted pipelines to still appear in dropdown.

Output: Properly wired React Query mutations that keep UI in sync with backend state
</objective>

<execution_context>
@/Users/brendan/.claude/get-shit-done/workflows/execute-plan.md
@/Users/brendan/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@app/hooks/queries/use-pipelines.ts
@app/components/pipeline-builder/pipeline-tabs.tsx
@app/components/pipeline-builder/pipeline-tab-panel.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add useDeletePipeline mutation to hooks</name>
  <files>app/hooks/queries/use-pipelines.ts</files>
  <action>
Add a new `useDeletePipeline()` mutation hook to `use-pipelines.ts`:

```typescript
interface DeletePipelineInput {
  id: string;
}

async function deletePipeline(data: DeletePipelineInput): Promise<void> {
  const formData = new FormData();
  formData.set("intent", "delete");
  formData.set("id", data.id);

  const response = await fetch("/api/pipelines", {
    method: "POST",
    body: formData,
  });

  const result = await response.json();

  if (!response.ok || result.error) {
    throw new Error(result.error || "Failed to delete pipeline");
  }
}

export function useDeletePipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePipeline,
    onSuccess: () => {
      // Invalidate pipelines list to refresh dropdown
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
    },
  });
}
```

Import `useQueryClient` from @tanstack/react-query at the top of the file.
  </action>
  <verify>TypeScript compiles: `npx tsc --noEmit`</verify>
  <done>useDeletePipeline mutation exists and invalidates ["pipelines"] cache on success</done>
</task>

<task type="auto">
  <name>Task 2: Use usePipelines hook in dropdown</name>
  <files>app/components/pipeline-builder/pipeline-tabs.tsx</files>
  <action>
Replace the local `useState<Pipeline[]>` and `useEffect` fetch with `usePipelines()` hook:

1. Remove the local state and useEffect:
   - Remove `const [pipelines, setPipelines] = useState<Pipeline[]>([]);`
   - Remove the `useEffect` block that calls `fetchPipelines`
   - Remove the local `Pipeline` interface (it's in the hook file)

2. Import and use the hook:
   - Add import: `import { usePipelines } from "~/hooks/queries/use-pipelines";`
   - In the component: `const { data: pipelines = [] } = usePipelines();`

3. The rest of the component stays the same - `availablePipelines` filtering and dropdown rendering will work as-is because the hook returns the same shape `{ id: string; name: string }[]`.
  </action>
  <verify>TypeScript compiles and dropdown shows pipelines from backend</verify>
  <done>Dropdown uses React Query hook and auto-updates when cache is invalidated</done>
</task>

<task type="auto">
  <name>Task 3: Use useDeletePipeline in tab panel</name>
  <files>app/components/pipeline-builder/pipeline-tab-panel.tsx</files>
  <action>
Replace the manual fetch delete with the mutation:

1. Import the mutation:
   - Update import: `import { useSavePipeline, useDeletePipeline } from "~/hooks/queries/use-pipelines";`

2. Use the mutation in the component:
   - Add: `const deletePipelineMutation = useDeletePipeline();`

3. Update handleDelete:
   ```typescript
   const handleDelete = () => {
     if (!confirm("Delete this pipeline?")) return;

     deletePipelineMutation.mutate(
       { id: pipelineId },
       {
         onSuccess: () => {
           onDelete();
         },
         onError: (error) => {
           console.error("Failed to delete pipeline:", error);
         },
       }
     );
   };
   ```

This ensures deletion goes through React Query, invalidates the cache, and the dropdown immediately updates.
  </action>
  <verify>Delete pipeline, verify it disappears from dropdown immediately</verify>
  <done>Delete uses mutation, cache invalidates, dropdown updates without page refresh</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` - TypeScript compiles
2. Create pipeline via "+ New Pipeline" - appears in dropdown
3. Open pipeline, click Delete - pipeline removed from both tab and dropdown immediately
4. Refresh page - deleted pipeline stays deleted (backend verified)
</verification>

<success_criteria>
- Pipeline dropdown reads from backend via usePipelines() hook
- Delete pipeline uses useDeletePipeline() mutation
- Deleting invalidates cache, dropdown updates immediately
- No stale pipelines shown in dropdown after deletion
</success_criteria>

<output>
After completion, create `.planning/quick/030-fix-pipeline-delete-and-dropdown-backend/030-SUMMARY.md`
</output>
