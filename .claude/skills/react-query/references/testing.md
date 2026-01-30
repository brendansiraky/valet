# Testing React Query

Reference guide for testing components and hooks that use TanStack Query.

## Core Testing Philosophy

React Query components are "impure"—they consume external dependencies beyond props (hooks, context, queries). Testing requires carefully setting up surrounding environments to ensure consistent behavior across different test runs.

## Test Setup

### Create Fresh QueryClient Per Test

Create a new `QueryClient` for each test to ensure complete isolation. Shared clients cause flaky tests from leaked state.

```typescript
// test-utils.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Critical: prevents test timeouts
      },
    },
  });
}

export function renderWithClient(ui: React.ReactElement) {
  const testQueryClient = createTestQueryClient();
  return {
    ...render(
      <QueryClientProvider client={testQueryClient}>
        {ui}
      </QueryClientProvider>
    ),
    queryClient: testQueryClient,
  };
}
```

### Testing Hooks with renderHook

```typescript
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

test("useTodos returns todos", async () => {
  const { result } = renderHook(() => useTodos(), {
    wrapper: createWrapper(),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toHaveLength(3);
});
```

## Critical Testing Gotchas

### Turn Off Retries

React Query defaults to three retries with exponential backoff. Without disabling retries, tests will timeout waiting for all retry attempts.

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});
```

### Use Query Defaults for Flexibility

Avoid hardcoding options in hooks—use `setQueryDefaults` instead. This preserves test override flexibility.

```typescript
// ❌ Can't override in tests
useQuery({
  queryKey: ["todos"],
  queryFn: fetchTodos,
  retry: 5, // Locked in
});

// ✅ Tests can override defaults
queryClient.setQueryDefaults(["todos"], { retry: 5 });
```

### Always Await Query State

React Query is asynchronous. Never assert on data immediately—always wait for state transitions.

```typescript
// ❌ Will fail - data not loaded yet
const { result } = renderHook(() => useTodos(), { wrapper });
expect(result.current.data).toBeDefined();

// ✅ Wait for success state
const { result } = renderHook(() => useTodos(), { wrapper });
await waitFor(() => expect(result.current.isSuccess).toBe(true));
expect(result.current.data).toBeDefined();
```

## Mocking Network Requests

### Recommended: Mock Service Worker (MSW)

Use MSW instead of mocking fetch/axios directly. Benefits:

- Single source of truth for API mocking
- Works in Node (testing) and browsers (development/Storybook)
- Supports REST and GraphQL
- Tests real network behavior without actual network calls

```typescript
// mocks/handlers.ts
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/todos", () => {
    return HttpResponse.json([
      { id: "1", title: "Learn Testing", done: false },
      { id: "2", title: "Write Tests", done: true },
    ]);
  }),

  http.post("/api/todos", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: "3", ...body }, { status: 201 });
  }),
];
```

```typescript
// mocks/server.ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
```

```typescript
// vitest.setup.ts
import { server } from "./mocks/server";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Override Handlers Per Test

```typescript
import { server } from "./mocks/server";
import { http, HttpResponse } from "msw";

test("handles error state", async () => {
  server.use(
    http.get("/api/todos", () => {
      return HttpResponse.json({ message: "Server error" }, { status: 500 });
    })
  );

  const { result } = renderHook(() => useTodos(), { wrapper: createWrapper() });

  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error).toBeDefined();
});
```

## Testing Patterns

### Testing Query Hooks

```typescript
describe("useTodos", () => {
  test("fetches and returns todos", async () => {
    const { result } = renderHook(() => useTodos(), {
      wrapper: createWrapper(),
    });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for success
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify data
    expect(result.current.data).toEqual([
      { id: "1", title: "Learn Testing", done: false },
      { id: "2", title: "Write Tests", done: true },
    ]);
  });

  test("handles fetch error", async () => {
    server.use(
      http.get("/api/todos", () => HttpResponse.error())
    );

    const { result } = renderHook(() => useTodos(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
```

### Testing Mutation Hooks

```typescript
describe("useCreateTodo", () => {
  test("creates todo and invalidates cache", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateTodo(), { wrapper });

    // Trigger mutation
    result.current.mutate({ title: "New Todo" });

    // Wait for success
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify returned data
    expect(result.current.data).toMatchObject({
      id: "3",
      title: "New Todo",
    });
  });
});
```

### Testing Components with Queries

```typescript
import { screen, waitFor } from "@testing-library/react";
import { renderWithClient } from "./test-utils";

describe("TodoList", () => {
  test("renders todos after loading", async () => {
    renderWithClient(<TodoList />);

    // Shows loading state initially
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText("Learn Testing")).toBeInTheDocument();
    });

    expect(screen.getByText("Write Tests")).toBeInTheDocument();
  });

  test("renders error state on failure", async () => {
    server.use(
      http.get("/api/todos", () => HttpResponse.error())
    );

    renderWithClient(<TodoList />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });
});
```

### Testing with Pre-Seeded Data

Seed the query cache when testing components that expect data to already be loaded.

```typescript
test("displays user name", async () => {
  const queryClient = createTestQueryClient();

  // Pre-seed the cache
  queryClient.setQueryData(["users", "1"], {
    id: "1",
    name: "Alice",
    email: "alice@example.com",
  });

  render(
    <QueryClientProvider client={queryClient}>
      <UserProfile userId="1" />
    </QueryClientProvider>
  );

  // No loading state - data is already cached
  expect(screen.getByText("Alice")).toBeInTheDocument();
});
```

## Best Practices Summary

| Practice | Reason |
|----------|--------|
| Fresh QueryClient per test | Prevents state leakage between tests |
| Disable retries | Prevents test timeouts |
| Use MSW for mocking | Single source of truth, realistic behavior |
| Always await state transitions | React Query is async |
| Use `setQueryDefaults` | Keeps hooks flexible for testing |
| Pre-seed cache when needed | Test components without loading states |

## Common Mistakes

### Mistake: Shared QueryClient

```typescript
// ❌ Shared client leaks state between tests
const queryClient = new QueryClient();

test("test 1", () => {
  render(<App />, { wrapper: ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )});
});

test("test 2", () => {
  // May have cached data from test 1!
  render(<App />, { wrapper: ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )});
});
```

### Mistake: Not Awaiting Async State

```typescript
// ❌ Assertion runs before data loads
const { result } = renderHook(() => useTodos(), { wrapper });
expect(result.current.data).toHaveLength(3); // undefined!

// ✅ Wait for the query to complete
await waitFor(() => expect(result.current.isSuccess).toBe(true));
expect(result.current.data).toHaveLength(3);
```

### Mistake: Mocking Fetch Directly

```typescript
// ❌ Tight coupling, doesn't test actual fetch behavior
vi.mock("./api", () => ({
  fetchTodos: vi.fn().mockResolvedValue([{ id: 1 }]),
}));

// ✅ MSW intercepts actual requests
server.use(
  http.get("/api/todos", () => HttpResponse.json([{ id: 1 }]))
);
```
