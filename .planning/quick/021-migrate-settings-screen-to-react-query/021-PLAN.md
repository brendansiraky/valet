---
task: 021
type: quick
files_modified:
  - app/routes/api.settings.ts
  - app/hooks/queries/useSettings.ts
  - app/routes/settings.tsx
---

<objective>
Migrate Settings screen from Remix loader/action to React Query

Purpose: Align Settings with the TanStack Query pattern established by useAgents.ts, enabling consistent data fetching and better UX (optimistic updates, loading states).

Output: Settings fetches data via `useSettings()` hook and mutates via `useSaveApiKey()`, `useSaveOpenAIKey()`, `useUpdateModelPreference()` mutations.
</objective>

<context>
@app/hooks/queries/useAgents.ts (pattern reference)
@app/routes/api.agents.ts (API route pattern)
@app/routes/settings.tsx (current implementation)
@.claude/skills/react-query/SKILL.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create API route and query hooks</name>
  <files>
    app/routes/api.settings.ts
    app/hooks/queries/useSettings.ts
  </files>
  <action>
Create `app/routes/api.settings.ts`:
- `loader()`: Return JSON with `{ hasApiKey, hasOpenAIKey, modelPreference }` (same data as current settings loader minus user/flash)
- `action()`: Handle three intents via FormData:
  - `save-api-key`: Validate and save Anthropic key (return `{ success: true }` or `{ error: string }`)
  - `save-openai-key`: Validate and save OpenAI key
  - `update-model`: Update model preference
- Use `jsonResponse()` helper pattern from api.agents.ts
- Copy validation and encryption logic from current settings.tsx action
- Return JSON responses (no redirects, no flash messages)

Create `app/hooks/queries/useSettings.ts`:
- Type: `SettingsData = { hasApiKey: boolean; hasOpenAIKey: boolean; modelPreference: string }`
- `fetchSettings()`: GET /api/settings
- `useSettings()`: Query hook with queryKey: ["settings"]
- `useSaveApiKey()`: Mutation for Anthropic key, invalidates ["settings"] on success
- `useSaveOpenAIKey()`: Mutation for OpenAI key, invalidates ["settings"] on success
- `useUpdateModelPreference()`: Mutation for model preference, invalidates ["settings"] on success

Follow useAgents.ts patterns exactly:
- Type the fetchFn return, not the hook
- Use `Error & { data: MutationError }` pattern for mutation errors
- Use FormData for mutations (match existing pattern)
  </action>
  <verify>
TypeScript compiles: `npx tsc --noEmit`
Hook file exports all expected functions
  </verify>
  <done>
API route handles all three intents with JSON responses.
Query hook fetches settings data.
Three mutation hooks save keys/model with cache invalidation.
  </done>
</task>

<task type="auto">
  <name>Task 2: Update Settings component to use React Query</name>
  <files>app/routes/settings.tsx</files>
  <action>
Modify `app/routes/settings.tsx`:

1. Keep minimal loader for auth redirect only:
```typescript
export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");
  if (!userId) return redirect("/login");

  // Get user email for display (static, no React Query needed)
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { email: true },
  });
  if (!user) return redirect("/login");

  return { user: { email: user.email } };
}
```

2. Remove `action()` entirely (mutations go to API route now)

3. Update component:
- Import and use `useSettings()` for data
- Import and use `useSaveApiKey()`, `useSaveOpenAIKey()`, `useUpdateModelPreference()` for mutations
- Replace Remix `<Form>` with regular `<form>` + `onSubmit` handlers
- Add local state for form inputs (controlled inputs)
- Add loading/error states using mutation.isPending and mutation.isError
- Replace flash messages with inline success/error from mutation state
- Use toast notifications (sonner) for success feedback

4. Handle loading state:
- Show skeleton or loading spinner while `settingsQuery.isLoading`
- Disable forms while mutations are pending

5. Key implementation details:
- Don't destructure query results (per skill guidance)
- Use mutation.mutate() with onSuccess callback for toast
- Clear input after successful key save
  </action>
  <verify>
`npm run dev` - Settings page loads without errors
Save API key shows loading state then success toast
Model preference updates without page refresh
  </verify>
  <done>
Settings screen fetches data via useSettings().
All three forms use mutation hooks.
No Remix action() in settings.tsx.
Loading states shown during mutations.
Toast notifications on success/error.
  </done>
</task>

</tasks>

<verification>
- [ ] `npx tsc --noEmit` passes
- [ ] Settings page loads and displays current state
- [ ] Save Anthropic API key works (validates, saves, shows toast)
- [ ] Save OpenAI API key works (validates, saves, shows toast)
- [ ] Update model preference works (saves, shows toast)
- [ ] Loading spinners appear during mutations
- [ ] Error messages display on validation failure
</verification>

<success_criteria>
Settings screen fully migrated to React Query:
- Data fetched via useSettings() hook
- Mutations via dedicated hooks with cache invalidation
- No Remix action() in settings.tsx
- Consistent with useAgents.ts patterns
</success_criteria>
