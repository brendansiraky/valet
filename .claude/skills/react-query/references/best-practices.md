# React Query Best Practices

Detailed patterns and techniques that extend the core guidance in SKILL.md.

## TypeScript

### Avoid Return-Only Generics

**Golden rule of generics:** A generic must appear at least twice to be useful. Return-only generics are hidden type assertions—they lie to you.

```typescript
// ❌ Return-only generic - just a type assertion in disguise
const query = useQuery<Todo[]>({ queryKey: ["todos"], queryFn: fetchTodos });

// ✅ Type the data source, inference handles the rest
async function fetchTodos(): Promise<Todo[]> {
  const res = await fetch("/api/todos");
  return res.json();
}

function useTodos() {
  return useQuery({ queryKey: ["todos"], queryFn: fetchTodos });
}
```

### Validate at Runtime with Zod

Types only exist at compile time. For true type safety, validate API responses at runtime.

```typescript
import { z } from "zod";

const todoSchema = z.object({
  id: z.string(),
  title: z.string(),
  done: z.boolean(),
});

type Todo = z.infer<typeof todoSchema>;

async function fetchTodo(id: string): Promise<Todo> {
  const res = await fetch(`/api/todos/${id}`);
  const data = await res.json();
  return todoSchema.parse(data); // Throws if shape doesn't match
}
```

Validation failures become React Query errors, preventing silent type mismatches from propagating through your app.

### Don't Destructure Query Results

Destructuring breaks TypeScript's ability to narrow types based on status flags.

```typescript
// ❌ data remains Group[] | undefined even after isSuccess check
const { data, isSuccess } = useGroups();
if (isSuccess) {
  data; // still Group[] | undefined
}

// ✅ Keep the result object intact for proper narrowing
const groupsQuery = useGroups();
if (groupsQuery.isSuccess) {
  groupsQuery.data; // correctly narrowed to Group[]
}
```

### Handle Errors Defensively

Errors are typed as `Error | null` but can technically be anything at runtime.

```typescript
if (query.error instanceof Error) {
  return <div>Error: {query.error.message}</div>;
}
```

### Type `pageParam` Explicitly in Infinite Queries

The `pageParam` defaults to `any`. Always type it.

```typescript
useInfiniteQuery({
  queryKey: ["projects"],
  queryFn: ({ pageParam }: { pageParam: number }) => fetchProjects(pageParam),
  initialPageParam: 0,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});
```

## Query Key Management

Use [@lukemorales/query-key-factory](https://github.com/lukemorales/query-key-factory) to centralize and type query keys. **All query keys in this codebase MUST use the factory.**

### Define Feature-Based Keys

Create a factory per feature with `createQueryKeys` in `app/hooks/queries/keys/`:

```typescript
// app/hooks/queries/keys/users.ts
import { createQueryKeys } from "@lukemorales/query-key-factory";

export const usersKeys = createQueryKeys("users", {
  all: null,
  detail: (userId: string) => [userId],
  list: (filters: { status?: string }) => [{ filters }],
});
```

### Merge Into Single Store

Combine feature factories in `app/hooks/queries/keys/index.ts`:

```typescript
import { mergeQueryKeys } from "@lukemorales/query-key-factory";
import { usersKeys } from "./users";
import { pipelinesKeys } from "./pipelines";

export const queries = mergeQueryKeys(usersKeys, pipelinesKeys);
```

### Use in Hooks

Import `queries` and use `.queryKey` for query definitions:

```typescript
import { queries } from './keys'

function useUser(userId: string) {
  return useQuery({
    queryKey: queries.users.detail(userId).queryKey,
    queryFn: () => fetchUser(userId),
  });
}

function useUsers() {
  return useQuery({
    queryKey: queries.users.all.queryKey,
    queryFn: fetchUsers,
  });
}
```

### Invalidation Patterns

Use `._def` to target all variations of a key scope:

```typescript
const queryClient = useQueryClient();

// Invalidate all user queries (list, detail, etc.)
queryClient.invalidateQueries({ queryKey: queries.users._def });

// Invalidate all user lists (any filter combination)
queryClient.invalidateQueries({ queryKey: queries.users.list._def });

// Invalidate specific user detail
queryClient.invalidateQueries({ queryKey: queries.users.detail(userId).queryKey });
```

### Adding New Query Keys

When adding a new feature:

1. Create `app/hooks/queries/keys/{feature}.ts`
2. Define keys with `createQueryKeys`
3. Export and merge in `app/hooks/queries/keys/index.ts`
4. Use `queries.{feature}` in hooks

## Mutations

### Callback Placement

Split callbacks by concern:

- **Hook-level** (`useMutation` options): Query logic like invalidation
- **Call-level** (`mutate` options): UI logic like toasts, redirects

```typescript
// Hook: handles cache
const mutation = useMutation({
  mutationFn: createUser,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queries.users._def });
  },
});

// Component: handles UI
mutation.mutate(userData, {
  onSuccess: () => {
    toast.success("User created");
    navigate("/users");
  },
});
```

Return promises from hook callbacks to keep loading state accurate:

```typescript
onSuccess: () => queryClient.invalidateQueries({ queryKey: queries.users._def })
// The promise is returned, so isPending stays true until invalidation completes
```

### Prefer `mutate` Over `mutateAsync`

Use `mutate` for standard operations—it handles errors internally. Reserve `mutateAsync` only when you need to await the result.

```typescript
// ✅ Errors handled automatically
mutation.mutate(data);

// ❌ Requires manual try-catch, risks unhandled rejections
await mutation.mutateAsync(data);
```

## Error Handling

### Component-Level Errors

Check status directly for inline error states.

```typescript
function UserProfile({ userId }: { userId: string }) {
  const userQuery = useQuery(queries.users.detail(userId));

  if (userQuery.isError) {
    return <div>Failed to load user</div>;
  }

  // ...
}
```

### Error Boundaries with `throwOnError`

Propagate errors to React Error Boundaries. Use a function to selectively throw.

```typescript
useQuery({
  queryKey: ["user", userId],
  queryFn: fetchUser,
  throwOnError: (error) => error.status >= 500, // Only server errors
});
```

This lets you handle 4xx errors locally (validation, not found) while 5xx errors bubble up to a boundary.

### Global Error Handler

Use `QueryCache` callbacks for unified handling. This fires once per query, not per component.

```typescript
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Only toast for background refetches (user already has data)
      if (query.state.data !== undefined) {
        toast.error(`Something went wrong: ${error.message}`);
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      toast.error(`Mutation failed: ${error.message}`);
    },
  }),
});
```

### Avoid `onError` in `useQuery` Options

The `onError` callback in `useQuery` fires for every component instance using that query. If three components use `useUsers()` and it fails, you get three toast notifications.

```typescript
// ❌ Fires per component instance
useQuery({
  queryKey: ["users"],
  queryFn: fetchUsers,
  onError: () => toast.error("Failed"), // May fire multiple times
});

// ✅ Use global QueryCache.onError instead
```

### Strategy Summary

- **Initial load errors**: Handle in component or Error Boundary
- **Background refetch errors**: Toast via global `QueryCache.onError`
- **Mutation errors**: Toast via global `MutationCache.onError` or call-level callback
- **Logging/monitoring**: Global callbacks

## Selectors

Use `select` to transform data and subscribe only to what you need. The component re-renders only when the selected result changes.

### Basic Usage

```typescript
// Component only re-renders when todoCount changes
function TodoCount() {
  const todoCountQuery = useQuery({
    ...queries.todos.list({}),
    select: (todos) => todos.length,
  });

  return <span>{todoCountQuery.data}</span>;
}

// Pick specific fields
function UserName({ userId }: { userId: string }) {
  const nameQuery = useQuery({
    ...queries.users.detail(userId),
    select: (user) => user.name,
  });

  return <span>{nameQuery.data}</span>;
}
```

### Stabilize Select Functions

Inline arrow functions create new references each render. Stabilize them to avoid unnecessary re-computations.

```typescript
// ✅ Pure selector outside component - automatically stable
const selectTodoCount = (todos: Todo[]) => todos.length;

function TodoCount() {
  const query = useQuery({
    ...queries.todos.list({}),
    select: selectTodoCount,
  });
}

// ✅ useCallback when selector depends on props
function TodoById({ todoId }: { todoId: string }) {
  const selectTodo = useCallback(
    (todos: Todo[]) => todos.find((t) => t.id === todoId),
    [todoId]
  );

  const query = useQuery({
    ...queries.todos.list({}),
    select: selectTodo,
  });
}
```

### Structural Sharing

React Query uses structural sharing on selected results. Returning objects with the same shape and values keeps referential stability—no need for manual memoization of the return value.

```typescript
// ✅ Structural sharing handles this - no useMemo needed
select: (user) => ({ name: user.name, email: user.email })
```

### When to Use

Selectors are an optimization. Use them when:

- A query returns large objects but components need small slices
- Multiple components use the same query but need different fields
- You want to derive/compute values without extra state

Skip them for simple cases where the full response is needed.

## Dependent Queries

Use `enabled` to chain queries—the second waits for the first.

```typescript
function useUserProjects(userId: string | undefined) {
  // First query
  const userQuery = useQuery({
    ...queries.users.detail(userId!),
    enabled: !!userId,
  });

  // Second query waits for first
  const projectsQuery = useQuery({
    ...queries.projects.byOwner(userQuery.data?.id!),
    enabled: !!userQuery.data?.id,
  });

  return { userQuery, projectsQuery };
}
```

### Typing with `enabled`

When `enabled` is false, `data` can be `undefined` even after the query "succeeds" (it never ran). TypeScript knows this—don't fight it with non-null assertions in the return type.

```typescript
// ✅ Accept that data may be undefined
function useOptionalUser(userId: string | undefined) {
  return useQuery({
    ...queries.users.detail(userId!),
    enabled: !!userId,
  });
  // Return type: data is User | undefined
}

// ❌ Don't lie to TypeScript
function useOptionalUser(userId: string | undefined) {
  const query = useQuery({...});
  return { ...query, data: query.data! }; // Unsafe
}
```

## Stale Time & Cache Time

### Defaults

| Option | Default | Meaning |
|--------|---------|---------|
| `staleTime` | `0` | Data is stale immediately, eligible for background refetch |
| `gcTime` | `5 min` | Unused cache entries are garbage collected after 5 minutes |

### The `staleTime` Philosophy

React Query is a **state synchronizer**, not just a fetcher. It follows "stale-while-revalidate":

1. Serve cached data immediately (no loading spinner)
2. Refetch in background if data is stale
3. Update UI when fresh data arrives

With `staleTime: 0`, every mount/focus triggers a background refetch. This is **intentional**—it keeps data fresh. Don't disable `refetchOnMount` or `refetchOnWindowFocus`; adjust `staleTime` instead.

### Recommended Defaults

Set a baseline `staleTime` on your `QueryClient` to deduplicate rapid requests:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 20, // 20 seconds
    },
  },
});
```

### Per-Query Overrides

```typescript
// Static reference data - rarely changes
useQuery({
  ...queries.countries.list(),
  staleTime: Infinity, // Never refetch automatically
});

// Form initial data - don't refetch while user edits
useQuery({
  ...queries.users.detail(userId),
  staleTime: Infinity,
});

// Real-time data - always fresh
useQuery({
  ...queries.notifications.unread(),
  staleTime: 0,
  refetchInterval: 1000 * 30, // Poll every 30s
});
```

### When to Adjust `gcTime`

Rarely. The 5-minute default handles most cases. Consider increasing it for:

- Expensive queries you want to keep cached longer
- Offline-first apps where stale data beats no data
