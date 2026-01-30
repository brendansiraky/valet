---
name: React Query
description: This skill should be used when the user asks to "create a query hook", "add a mutation", "use TanStack Query", "invalidate queries", "handle query errors", "optimistic update", "useQuery", "useMutation", or needs guidance on React Query / TanStack Query patterns, caching, and data fetching.
---

# React Query Patterns

This skill provides guidance for implementing TanStack Query (React Query) patterns in this codebase.

## Core Principles

1. **Type the data source, not the hook** - Avoid return-only generics on `useQuery`. Type your `queryFn` return value instead.
2. **Don't destructure query results** - Keep the result object intact for proper TypeScript narrowing.
3. **Use query key factories** - Centralize keys with `@lukemorales/query-key-factory`.
4. **Split callback concerns** - Hook-level for cache logic, call-level for UI logic.

## Project Conventions

Query hooks live in `app/hooks/queries/`. Follow existing patterns:

- **Queries**: `use{Resource}` or `use{Resource}ById`
- **Mutations**: `use{Action}{Resource}` (e.g., `useCreatePipeline`, `useDeleteAgent`)

## Quick Reference

### Basic Query Hook

```typescript
// app/hooks/queries/use-todos.ts
import { useQuery } from "@tanstack/react-query";

async function fetchTodos(): Promise<Todo[]> {
  const res = await fetch("/api/todos");
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export function useTodos() {
  return useQuery({
    queryKey: ["todos"],
    queryFn: fetchTodos,
  });
}
```

### Basic Mutation Hook

```typescript
export function useCreateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { title: string }) =>
      fetch("/api/todos", {
        method: "POST",
        body: JSON.stringify(data),
      }).then((res) => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
}
```

### Using Mutations in Components

```typescript
const mutation = useCreateTodo();

// Hook handles cache, component handles UI
mutation.mutate(formData, {
  onSuccess: () => {
    toast.success("Created!");
    navigate("/todos");
  },
});
```

## TypeScript Guidelines

### Don't Destructure Query Results

```typescript
// ❌ Breaks type narrowing
const { data, isSuccess } = useGroups();
if (isSuccess) {
  data; // still Group[] | undefined
}

// ✅ Proper narrowing
const groupsQuery = useGroups();
if (groupsQuery.isSuccess) {
  groupsQuery.data; // correctly narrowed to Group[]
}
```

### Avoid Return-Only Generics

```typescript
// ❌ Hidden type assertion
const query = useQuery<Todo[]>({ queryKey: ["todos"], queryFn: fetchTodos });

// ✅ Type the queryFn instead
async function fetchTodos(): Promise<Todo[]> { ... }
```

## Error Handling Summary

| Approach | Use For |
|----------|---------|
| `isError` / `status` | Component-specific error UI |
| Error Boundary | Unrecoverable errors, full-page failures |
| Global `QueryCache.onError` | Toasts, logging, background refetch failures |

Avoid `onError` in `useQuery` options—it fires per component instance, causing duplicate toasts.

## When to Use Optimistic Updates

Use sparingly—only when mutations rarely fail and instant feedback matters (toggles, likes).

**Skip optimistic updates for:**
- Operations that frequently fail
- Complex state changes (sorting, filtering)
- Data with server-computed fields
- Forms with validation—just use `isPending` state

## Additional Resources

For detailed patterns, advanced techniques, and complete examples:

- **`references/best-practices.md`** - Full TypeScript patterns, query key factories, mutation callbacks, selectors, dependent queries, stale time configuration
