---
phase: quick
plan: 020
type: execute
wave: 1
depends_on: []
files_modified:
  - app/routes/api.traits.ts
  - app/hooks/queries/use-traits.ts
  - app/routes/traits.tsx
  - app/components/trait-form-dialog.tsx
  - app/components/trait-delete-dialog.tsx
autonomous: true

must_haves:
  truths:
    - "Traits list loads via React Query hook"
    - "Creating a trait invalidates and refetches the list"
    - "Editing a trait invalidates and refetches the list"
    - "Deleting a trait invalidates and refetches the list"
  artifacts:
    - path: "app/routes/api.traits.ts"
      provides: "JSON API for traits CRUD"
      exports: ["loader", "action"]
    - path: "app/hooks/queries/use-traits.ts"
      provides: "React Query hooks for traits"
      exports: ["useTraits", "useCreateTrait", "useUpdateTrait", "useDeleteTrait"]
  key_links:
    - from: "app/routes/traits.tsx"
      to: "app/hooks/queries/use-traits.ts"
      via: "useTraits hook import"
    - from: "app/components/trait-form-dialog.tsx"
      to: "app/hooks/queries/use-traits.ts"
      via: "useCreateTrait/useUpdateTrait hooks"
    - from: "app/components/trait-delete-dialog.tsx"
      to: "app/hooks/queries/use-traits.ts"
      via: "useDeleteTrait hook"
---

<objective>
Migrate the Traits screen from Remix loader/action patterns to TanStack Query.

Purpose: Align traits data fetching with the project-wide React Query pattern established in quick-018.
Output: API route + query hooks + migrated components using React Query for all traits operations.
</objective>

<execution_context>
@/Users/brendan/.claude/get-shit-done/workflows/execute-plan.md
@/Users/brendan/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.claude/skills/react-query/SKILL.md
@app/hooks/queries/use-pipelines.ts (pattern reference)
@app/routes/api.agents.ts (API pattern reference)
@app/routes/traits.tsx (current implementation)
@app/components/trait-form-dialog.tsx (uses useFetcher)
@app/components/trait-delete-dialog.tsx (uses Form)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create traits API route and query hooks</name>
  <files>
    app/routes/api.traits.ts
    app/hooks/queries/use-traits.ts
  </files>
  <action>
Create `app/routes/api.traits.ts`:
- Copy the loader logic from `app/routes/traits.tsx` - return `{ traits: userTraits }` as JSON
- Copy the action logic from `app/routes/traits.tsx` handling create/update/delete intents
- Use the same `jsonResponse` helper pattern as `api.agents.ts`
- Keep the same Zod validation schema (colorRegex, TraitSchema)

Create `app/hooks/queries/use-traits.ts`:
- Follow patterns from SKILL.md and use-pipelines.ts
- Define `Trait` interface: `{ id: string; name: string; context: string; color: string | null; updatedAt: Date }`
- `useTraits()`: queryKey `["traits"]`, fetches from `/api/traits`, returns `traits` array
- `useCreateTrait()`: mutation posting to `/api/traits` with intent=create, invalidates `["traits"]` on success
- `useUpdateTrait()`: mutation posting to `/api/traits` with intent=update, invalidates `["traits"]` on success
- `useDeleteTrait()`: mutation posting to `/api/traits` with intent=delete, invalidates `["traits"]` on success

For mutations, use FormData to match the existing API contract (intent, name, context, color, traitId).
  </action>
  <verify>
TypeScript compiles: `npx tsc --noEmit`
API route accessible: `curl http://localhost:5173/api/traits` (should return 401 or traits list)
  </verify>
  <done>
API route exists at `app/routes/api.traits.ts` with loader+action.
Query hooks exist at `app/hooks/queries/use-traits.ts` with useTraits, useCreateTrait, useUpdateTrait, useDeleteTrait.
  </done>
</task>

<task type="auto">
  <name>Task 2: Migrate traits screen and dialogs to React Query</name>
  <files>
    app/routes/traits.tsx
    app/components/trait-form-dialog.tsx
    app/components/trait-delete-dialog.tsx
  </files>
  <action>
Update `app/routes/traits.tsx`:
- Remove the loader function entirely (no more server-side data loading)
- Remove the action function entirely (mutations handled by hooks)
- Remove `useLoaderData` import and usage
- Import and use `useTraits()` hook
- Handle loading state: show skeleton or spinner while `traitsQuery.isPending`
- Handle error state: show error message if `traitsQuery.isError`
- Use `traitsQuery.data` for the traits list (guard with `traitsQuery.isSuccess`)

Update `app/components/trait-form-dialog.tsx`:
- Remove `useFetcher` import and usage
- Import `useCreateTrait` and `useUpdateTrait` from use-traits
- Use `isEditing ? updateMutation : createMutation`
- On form submit: call `mutation.mutate()` with FormData-like object
- Close dialog in mutation's `onSuccess` callback (call-site, not hook-level)
- Use `mutation.isPending` for loading state instead of `fetcher.state !== "idle"`
- Handle errors from `mutation.error` or check `mutation.isError`

Update `app/components/trait-delete-dialog.tsx`:
- Remove `Form` import from react-router
- Import `useDeleteTrait` from use-traits
- Add state to control dialog open/close
- On confirm: call `deleteMutation.mutate({ traitId: trait.id })`
- Close dialog in mutation's `onSuccess` callback
- Disable button while `deleteMutation.isPending`
  </action>
  <verify>
TypeScript compiles: `npx tsc --noEmit`
Manual test: Load /traits page, create a trait, edit it, delete it - all operations should work without page refresh.
  </verify>
  <done>
Traits page loads data via useTraits hook.
Create/Edit dialog uses useCreateTrait/useUpdateTrait mutations.
Delete dialog uses useDeleteTrait mutation.
All CRUD operations invalidate and refetch the traits list automatically.
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes
2. Navigate to /traits - page loads (may be empty or show existing traits)
3. Create a new trait via dialog - appears in list without refresh
4. Edit the trait - changes appear without refresh
5. Delete the trait - removed from list without refresh
</verification>

<success_criteria>
- Traits screen fully migrated to React Query
- No Remix loader/action/useFetcher/Form patterns remain in traits files
- All mutations properly invalidate the traits query
- TypeScript compiles without errors
</success_criteria>

<output>
After completion, create `.planning/quick/020-migrate-traits-screen-to-react-query/020-SUMMARY.md`
</output>
