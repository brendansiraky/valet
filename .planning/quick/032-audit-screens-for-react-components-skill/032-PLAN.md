# Quick Task 032: Audit Screens for React-Components Skill Compliance

## Objective

Audit the Agents, Traits, and Settings screens for compliance with the react-components skill patterns and fix any deviations.

## Key Patterns to Enforce

From `.claude/skills/react-components/SKILL.md`:

1. **Props Interface Naming**: Always use `[ComponentName]Props`
2. **HTML Element Extension**: Extend appropriate HTML element attributes
3. **Spread Props**: Always spread `...props` to root element
4. **ClassName Merging**: Accept and merge `className` using `cn()`
5. **Standard Layout Structure**: Components with headers follow consistent pattern
6. **shadcn Components**: Use from `~/components/ui/`

From `references/react-best-practices.md`:

1. **No useEffect Abuse**: Don't use useEffect for derived state or data transformations
2. **Data Fetching**: Use TanStack Query, not raw useEffect
3. **Memoization**: Only use useMemo/useCallback when necessary

## Audit Findings

### Agents Screen (`app/routes/agents.tsx`)
- ✅ Uses TanStack Query for data fetching
- ✅ Uses shadcn components correctly
- ⚠️ Header/content duplication across loading/error/success states - could extract to shared layout component
- ⚠️ No loader auth check needed since traits.tsx doesn't have one

### Traits Screen (`app/routes/traits.tsx`)
- ✅ Uses TanStack Query for data fetching
- ✅ Uses shadcn components correctly
- ⚠️ Header/content duplication across loading/error/success states
- ✅ No unnecessary auth loader (consistent approach)

### Settings Screen (`app/routes/settings.tsx`)
- ✅ Uses TanStack Query for data fetching
- ✅ Uses shadcn components correctly
- ⚠️ Header duplication across states
- ✅ Proper form state management with useState
- ✅ Mutation handlers follow best practices

## Tasks

### Task 1: Extract PageLayout Component

Create a shared `PageLayout` component that follows the Standard Layout Structure pattern from the skill:

```typescript
interface PageLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string
    description?: string
    children: React.ReactNode
    headerActions?: React.ReactNode
}
```

This eliminates header duplication and enforces consistent structure.

**Files to create:**
- `app/components/page-layout.tsx`

### Task 2: Refactor Agents Screen

Update `app/routes/agents.tsx` to:
- Use the new `PageLayout` component
- Remove duplicated header across loading/error/success states
- Remove the unnecessary loader (traits screen doesn't have one, consistent pattern)

### Task 3: Refactor Traits Screen

Update `app/routes/traits.tsx` to:
- Use the new `PageLayout` component
- Remove duplicated header across loading/error/success states

### Task 4: Refactor Settings Screen

Update `app/routes/settings.tsx` to:
- Use the new `PageLayout` component for the outer structure
- Keep the loader (needed for user email which is static auth data)
- Remove duplicated header across states

## Execution Strategy

Run three parallel executors, one per screen:
- Executor A: Create PageLayout + Refactor Agents
- Executor B: Refactor Traits (depends on PageLayout, but can run after Task 1)
- Executor C: Refactor Settings (depends on PageLayout, but can run after Task 1)

Since PageLayout is needed first, run Task 1 first, then Tasks 2-4 in parallel.

## Success Criteria

- [ ] PageLayout component created following skill patterns
- [ ] All three screens use PageLayout
- [ ] No more header duplication
- [ ] All screens compile without errors
- [ ] TypeScript types correct
