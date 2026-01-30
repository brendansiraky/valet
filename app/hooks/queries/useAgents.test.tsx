import { describe, test, expect } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "~/mocks/server";
import { createWrapper, createTestQueryClient } from "~/test-utils";
import { QueryClientProvider } from "@tanstack/react-query";
import { mockAgentsData } from "~/mocks/handlers";
import { useAgents, useCreateAgent, useUpdateAgent, useDeleteAgent } from "./useAgents";
import { queries } from "./keys";
import type { ReactNode } from "react";

// Helper to create wrapper with pre-seeded data
function createWrapperWithData() {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(queries.agents.all.queryKey, mockAgentsData);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, queryClient };
}

describe("useAgents", () => {
  test("fetches and returns agents data", async () => {
    const { result } = renderHook(() => useAgents(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isPending).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Check structure - dates are serialized as strings via JSON
    expect(result.current.data?.agents).toHaveLength(1);
    expect(result.current.data?.agents[0].name).toBe("Test Agent");
    expect(result.current.data?.traits).toHaveLength(1);
    expect(result.current.data?.configuredProviders).toContain("anthropic");
  });

  test("handles fetch error", async () => {
    server.use(
      http.get("/api/agents", () => {
        return HttpResponse.json({ message: "Server error" }, { status: 500 });
      })
    );

    const { result } = renderHook(() => useAgents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });
});

describe("useCreateAgent", () => {
  test("optimistically adds agent to cache", async () => {
    const { wrapper, queryClient } = createWrapperWithData();
    const { result } = renderHook(() => useCreateAgent(), { wrapper });

    // Delay the API response to observe optimistic update
    server.use(
      http.post("/api/agents", async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return HttpResponse.json({
          agent: {
            id: "new-agent-id",
            userId: "user-1",
            name: "New Agent",
            instructions: "New instructions",
            model: null,
            capability: "none",
            traitIds: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });
      })
    );

    act(() => {
      result.current.mutate({
        name: "New Agent",
        instructions: "New instructions",
      });
    });

    // Check optimistic update appears immediately
    await waitFor(() => {
      const cached = queryClient.getQueryData(queries.agents.all.queryKey) as typeof mockAgentsData;
      expect(cached.agents).toHaveLength(2);
      expect(cached.agents[0].name).toBe("New Agent");
      expect(cached.agents[0].id).toMatch(/^temp-/);
    });

    // Wait for mutation to complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  test("rolls back on error", async () => {
    const { wrapper, queryClient } = createWrapperWithData();
    const { result } = renderHook(() => useCreateAgent(), { wrapper });

    server.use(
      http.post("/api/agents", () => {
        return HttpResponse.json({ error: "Creation failed" }, { status: 500 });
      })
    );

    const initialAgents = queryClient.getQueryData(queries.agents.all.queryKey) as typeof mockAgentsData;
    const initialCount = initialAgents.agents.length;

    act(() => {
      result.current.mutate({
        name: "New Agent",
        instructions: "New instructions",
      });
    });

    // Wait for error
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Cache should be rolled back to original state
    const cached = queryClient.getQueryData(queries.agents.all.queryKey) as typeof mockAgentsData;
    expect(cached.agents).toHaveLength(initialCount);
  });

  test("returns validation errors from server", async () => {
    const { wrapper } = createWrapperWithData();
    const { result } = renderHook(() => useCreateAgent(), { wrapper });

    server.use(
      http.post("/api/agents", () => {
        return HttpResponse.json(
          { errors: { name: ["Name is required"] } },
          { status: 400 }
        );
      })
    );

    act(() => {
      result.current.mutate({
        name: "",
        instructions: "Some instructions",
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const error = result.current.error as Error & { data: { errors: { name: string[] } } };
    expect(error.data.errors.name).toContain("Name is required");
  });
});

describe("useUpdateAgent", () => {
  test("optimistically updates agent in cache", async () => {
    const { wrapper, queryClient } = createWrapperWithData();
    const { result } = renderHook(() => useUpdateAgent(), { wrapper });

    server.use(
      http.post("/api/agents", async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return HttpResponse.json({ success: true });
      })
    );

    act(() => {
      result.current.mutate({
        agentId: "agent-1",
        name: "Updated Name",
        instructions: "Updated instructions",
      });
    });

    // Check optimistic update appears immediately
    await waitFor(() => {
      const cached = queryClient.getQueryData(queries.agents.all.queryKey) as typeof mockAgentsData;
      const agent = cached.agents.find((a) => a.id === "agent-1");
      expect(agent?.name).toBe("Updated Name");
      expect(agent?.instructions).toBe("Updated instructions");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  test("rolls back on error", async () => {
    const { wrapper, queryClient } = createWrapperWithData();
    const { result } = renderHook(() => useUpdateAgent(), { wrapper });

    server.use(
      http.post("/api/agents", () => {
        return HttpResponse.json({ error: "Update failed" }, { status: 500 });
      })
    );

    const originalName = "Test Agent";

    act(() => {
      result.current.mutate({
        agentId: "agent-1",
        name: "Updated Name",
        instructions: "Updated instructions",
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Cache should be rolled back
    const cached = queryClient.getQueryData(queries.agents.all.queryKey) as typeof mockAgentsData;
    const agent = cached.agents.find((a) => a.id === "agent-1");
    expect(agent?.name).toBe(originalName);
  });

  test("updates traits when traitsUpdated is true", async () => {
    const { wrapper, queryClient } = createWrapperWithData();
    const { result } = renderHook(() => useUpdateAgent(), { wrapper });

    server.use(
      http.post("/api/agents", async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return HttpResponse.json({ success: true });
      })
    );

    act(() => {
      result.current.mutate({
        agentId: "agent-1",
        name: "Test Agent",
        instructions: "Test instructions for agent",
        traitsUpdated: true,
        traitIds: ["new-trait-1", "new-trait-2"],
      });
    });

    // Check optimistic update includes trait changes
    await waitFor(() => {
      const cached = queryClient.getQueryData(queries.agents.all.queryKey) as typeof mockAgentsData;
      const agent = cached.agents.find((a) => a.id === "agent-1");
      expect(agent?.traitIds).toEqual(["new-trait-1", "new-trait-2"]);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteAgent", () => {
  test("optimistically removes agent from cache", async () => {
    const { wrapper, queryClient } = createWrapperWithData();
    const { result } = renderHook(() => useDeleteAgent(), { wrapper });

    server.use(
      http.post("/api/agents", async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return HttpResponse.json({ success: true });
      })
    );

    const initialAgents = queryClient.getQueryData(queries.agents.all.queryKey) as typeof mockAgentsData;
    expect(initialAgents.agents).toHaveLength(1);

    act(() => {
      result.current.mutate({ agentId: "agent-1" });
    });

    // Check optimistic removal appears immediately
    await waitFor(() => {
      const cached = queryClient.getQueryData(queries.agents.all.queryKey) as typeof mockAgentsData;
      expect(cached.agents).toHaveLength(0);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  test("rolls back on error", async () => {
    const { wrapper, queryClient } = createWrapperWithData();
    const { result } = renderHook(() => useDeleteAgent(), { wrapper });

    server.use(
      http.post("/api/agents", () => {
        return HttpResponse.json({ error: "Delete failed" }, { status: 500 });
      })
    );

    act(() => {
      result.current.mutate({ agentId: "agent-1" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Cache should be rolled back
    const cached = queryClient.getQueryData(queries.agents.all.queryKey) as typeof mockAgentsData;
    expect(cached.agents).toHaveLength(1);
    expect(cached.agents[0].id).toBe("agent-1");
  });
});
