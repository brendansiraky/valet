---
name: React Query
description: This skill should be used when the user asks to "create a query hook", "add a mutation", "use TanStack Query", "invalidate queries", "handle query errors", "optimistic update", "useQuery", "useMutation", "test a query hook", "test a mutation", "mock API requests", "testing React Query", or needs guidance on React Query / TanStack Query patterns, caching, data fetching, and testing.
---

# React Query Patterns

This skill provides guidance for implementing TanStack Query (React Query) patterns in this codebase.

## Core Principles

1. **Type the data source, not the hook** - Avoid return-only generics on `useQuery`. Type the `queryFn` return value instead.
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
import { useQuery } from '@tanstack/react-query'

async function fetchTodos(): Promise<Todo[]> {
    const res = await fetch('/api/todos')
    if (!res.ok) throw new Error('Failed to fetch')
    return res.json()
}

export function useTodos() {
    return useQuery({
        queryKey: ['todos'],
        queryFn: fetchTodos,
    })
}
```

### Basic Mutation Hook

```typescript
export function useCreateTodo() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: { title: string }) =>
            fetch('/api/todos', {
                method: 'POST',
                body: JSON.stringify(data),
            }).then((res) => res.json()),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['todos'] })
        },
    })
}
```

### Using Mutations in Components

```typescript
const mutation = useCreateTodo()

// Hook handles cache, component handles UI
mutation.mutate(formData, {
    onSuccess: () => {
        toast.success('Created!')
        navigate('/todos')
    },
})
```

## Optimistic Updates - TanStack Query (react-query)

### Approach: Via Cache (Cross-Component)

Use `onMutate` to update the cache directly. Best when multiple components need to see the optimistic update.

```typescript
function useToggleTodo() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (todoId: string) =>
            fetch(`/api/todos/${todoId}/toggle`, { method: 'POST' }),

        onMutate: async (todoId) => {
            // Cancel in-flight queries to prevent race conditions
            await queryClient.cancelQueries({ queryKey: ['todos'] })

            // Snapshot current state for rollback
            const previous = queryClient.getQueryData<Todo[]>(['todos'])

            // Optimistically update the cache
            queryClient.setQueryData<Todo[]>(['todos'], (old) =>
                old?.map((todo) =>
                    todo.id === todoId ? { ...todo, done: !todo.done } : todo,
                ),
            )

            // Return context with snapshot
            return { previous }
        },

        onError: (_err, _todoId, context) => {
            // Rollback on error
            if (context?.previous) {
                queryClient.setQueryData(['todos'], context.previous)
            }
        },

        onSettled: () => {
            // Always refetch to ensure server state
            queryClient.invalidateQueries({ queryKey: ['todos'] })
        },
    })
}
```

### Cross-Component Access with useMutationState

Access mutation state from any component using `useMutationState`:

```typescript
import { useMutationState } from "@tanstack/react-query";

function TodoList() {
  const todosQuery = useTodos();

  // Access pending mutations from anywhere
  const pendingTodos = useMutationState({
    filters: { mutationKey: ["addTodo"], status: "pending" },
    select: (mutation) => mutation.state.variables as { title: string },
  });

  return (
    <ul>
      {todosQuery.data?.map((todo) => (
        <li key={todo.id}>{todo.title}</li>
      ))}
      {pendingTodos.map((variables, i) => (
        <li key={`pending-${i}`} style={{ opacity: 0.5 }}>
          {variables?.title}
        </li>
      ))}
    </ul>
  );
}
```

### Which Approach to Use

| Scenario                               | Approach             |
| -------------------------------------- | -------------------- |
| Mutation and display in same component | Via UI (variables)   |
| Multiple components need the update    | Via Cache (onMutate) |
| Simple add/toggle operations           | Via UI               |
| Complex state transformations          | Via Cache            |
| Need automatic rollback                | Via Cache            |

## Error Handling Summary

| Approach                    | Use For                                      |
| --------------------------- | -------------------------------------------- |
| `isError` / `status`        | Component-specific error UI                  |
| Error Boundary              | Unrecoverable errors, full-page failures     |
| Global `QueryCache.onError` | Toasts, logging, background refetch failures |

Avoid `onError` in `useQuery` options—it fires per component instance, causing duplicate toasts.

## Additional Resources

For detailed patterns, advanced techniques, and complete examples:

- **`references/best-practices.md`** - Full TypeScript patterns, query key factories, mutation callbacks, selectors, dependent queries, stale time configuration
- **`references/testing.md`** - Testing queries and mutations with MSW, test setup utilities, common testing patterns and gotchas
