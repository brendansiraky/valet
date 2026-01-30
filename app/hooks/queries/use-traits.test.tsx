import { describe, test, expect, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { http, HttpResponse, delay } from "msw";
import { server } from "~/mocks/server";
import { createWrapper, createTestQueryClient } from "~/test-utils";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  useTraits,
  useCreateTrait,
  useUpdateTrait,
  useDeleteTrait,
  type Trait,
} from "./use-traits";
import { queries } from "./keys";

const mockTraits: Trait[] = [
  {
    id: "trait-1",
    name: "Test Trait",
    context: "Test context",
    color: "#3b82f6",
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "trait-2",
    name: "Another Trait",
    context: "Another context",
    color: "#10b981",
    updatedAt: new Date("2024-01-02"),
  },
];

describe("useTraits", () => {
  test("fetches and returns traits", async () => {
    server.use(
      http.get("/api/traits", () => {
        return HttpResponse.json({ traits: mockTraits });
      })
    );

    const { result } = renderHook(() => useTraits(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isPending).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].name).toBe("Test Trait");
  });

  test("handles fetch error", async () => {
    server.use(
      http.get("/api/traits", () => {
        return HttpResponse.json({ error: "Server error" }, { status: 500 });
      })
    );

    const { result } = renderHook(() => useTraits(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useCreateTrait", () => {
  test("optimistically adds trait to cache", async () => {
    const queryClient = createTestQueryClient();

    // Pre-seed cache with existing traits
    queryClient.setQueryData(queries.traits.all.queryKey, mockTraits);

    // Delay the server response to observe optimistic state
    server.use(
      http.post("/api/traits", async () => {
        await delay(100);
        return HttpResponse.json({
          success: true,
          trait: {
            id: "trait-3",
            name: "New Trait",
            context: "New context",
            color: "#ef4444",
            updatedAt: new Date(),
          },
        });
      })
    );

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateTrait(), { wrapper });

    act(() => {
      result.current.mutate({
        name: "New Trait",
        context: "New context",
        color: "#ef4444",
      });
    });

    // Check optimistic update was applied immediately (new traits go to the top)
    await waitFor(() => {
      const cached = queryClient.getQueryData<Trait[]>(queries.traits.all.queryKey);
      expect(cached).toHaveLength(3);
      expect(cached?.[0].name).toBe("New Trait");
    });
  });

  test("rolls back cache on error", async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(queries.traits.all.queryKey, mockTraits);

    server.use(
      http.post("/api/traits", async () => {
        await delay(50);
        return HttpResponse.json(
          { errors: { name: ["Name already exists"] } },
          { status: 400 }
        );
      })
    );

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateTrait(), { wrapper });

    act(() => {
      result.current.mutate({
        name: "Duplicate Trait",
        context: "Some context",
      });
    });

    // Wait for mutation to fail
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Cache should be rolled back to original state
    const cached = queryClient.getQueryData<Trait[]>(queries.traits.all.queryKey);
    expect(cached).toHaveLength(2);
  });
});

describe("useUpdateTrait", () => {
  test("optimistically updates trait in cache", async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(queries.traits.all.queryKey, mockTraits);

    server.use(
      http.post("/api/traits", async () => {
        await delay(100);
        return HttpResponse.json({ success: true });
      })
    );

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUpdateTrait(), { wrapper });

    act(() => {
      result.current.mutate({
        traitId: "trait-1",
        name: "Updated Trait Name",
        context: "Updated context",
        color: "#f59e0b",
      });
    });

    // Check optimistic update was applied immediately
    await waitFor(() => {
      const cached = queryClient.getQueryData<Trait[]>(queries.traits.all.queryKey);
      const updatedTrait = cached?.find((t) => t.id === "trait-1");
      expect(updatedTrait?.name).toBe("Updated Trait Name");
      expect(updatedTrait?.context).toBe("Updated context");
      expect(updatedTrait?.color).toBe("#f59e0b");
    });
  });

  test("rolls back cache on error", async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(queries.traits.all.queryKey, mockTraits);

    server.use(
      http.post("/api/traits", async () => {
        await delay(50);
        return HttpResponse.json(
          { error: "Failed to update" },
          { status: 500 }
        );
      })
    );

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUpdateTrait(), { wrapper });

    act(() => {
      result.current.mutate({
        traitId: "trait-1",
        name: "Updated Name",
        context: "Updated context",
      });
    });

    // Wait for mutation to fail
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Cache should be rolled back - original name should be restored
    const cached = queryClient.getQueryData<Trait[]>(queries.traits.all.queryKey);
    const trait = cached?.find((t) => t.id === "trait-1");
    expect(trait?.name).toBe("Test Trait");
  });
});

describe("useDeleteTrait", () => {
  test("optimistically removes trait from cache", async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(queries.traits.all.queryKey, mockTraits);

    server.use(
      http.post("/api/traits", async () => {
        await delay(100);
        return HttpResponse.json({ success: true });
      })
    );

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useDeleteTrait(), { wrapper });

    act(() => {
      result.current.mutate({ traitId: "trait-1" });
    });

    // Check optimistic delete was applied immediately
    await waitFor(() => {
      const cached = queryClient.getQueryData<Trait[]>(queries.traits.all.queryKey);
      expect(cached).toHaveLength(1);
      expect(cached?.find((t) => t.id === "trait-1")).toBeUndefined();
    });
  });

  test("rolls back cache on error", async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(queries.traits.all.queryKey, mockTraits);

    server.use(
      http.post("/api/traits", async () => {
        await delay(50);
        return HttpResponse.json(
          { error: "Trait is in use" },
          { status: 400 }
        );
      })
    );

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useDeleteTrait(), { wrapper });

    act(() => {
      result.current.mutate({ traitId: "trait-1" });
    });

    // Wait for mutation to fail
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Cache should be rolled back - trait should be restored
    const cached = queryClient.getQueryData<Trait[]>(queries.traits.all.queryKey);
    expect(cached).toHaveLength(2);
    expect(cached?.find((t) => t.id === "trait-1")).toBeDefined();
  });
});
