import { describe, test, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "~/mocks/server";
import { createWrapper } from "~/test-utils";
import { mockPipelinesData, mockPipelineData } from "~/mocks/handlers";
import { usePipelines, usePipeline } from "./use-pipelines";

describe("usePipelines", () => {
  test("fetches and returns pipeline list", async () => {
    const { result } = renderHook(() => usePipelines(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockPipelinesData.pipelines);
  });

  test("initially shows loading state", () => {
    const { result } = renderHook(() => usePipelines(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  test("handles fetch error", async () => {
    server.use(
      http.get("/api/pipelines", () => {
        return HttpResponse.json(
          { message: "Internal server error" },
          { status: 500 }
        );
      })
    );

    const { result } = renderHook(() => usePipelines(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });

  test("returns empty array when no pipelines exist", async () => {
    server.use(
      http.get("/api/pipelines", () => {
        return HttpResponse.json({ pipelines: [] });
      })
    );

    const { result } = renderHook(() => usePipelines(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

describe("usePipeline", () => {
  test("fetches single pipeline by id", async () => {
    const { result } = renderHook(() => usePipeline("pipeline-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockPipelineData.pipeline);
    expect(result.current.data?.id).toBe("pipeline-1");
    expect(result.current.data?.name).toBe("Test Pipeline");
    expect(result.current.data?.description).toBe("A test pipeline for unit testing");
    expect(result.current.data?.flowData).toEqual({ nodes: [], edges: [] });
  });

  test("returns loading state while fetching", () => {
    const { result } = renderHook(() => usePipeline("pipeline-1"), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  test("handles fetch error for single pipeline", async () => {
    server.use(
      http.get("/api/pipelines/:id", () => {
        return HttpResponse.json(
          { message: "Pipeline not found" },
          { status: 500 }
        );
      })
    );

    const { result } = renderHook(() => usePipeline("pipeline-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });

  test("is disabled when id is undefined", () => {
    const { result } = renderHook(() => usePipeline(undefined), {
      wrapper: createWrapper(),
    });

    // Query should not run - not loading, no data, no error
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.fetchStatus).toBe("idle");
  });

  test("is disabled when id is 'home'", () => {
    const { result } = renderHook(() => usePipeline("home"), {
      wrapper: createWrapper(),
    });

    // Query should not run - not loading, no data, no error
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.fetchStatus).toBe("idle");
  });

  test("is disabled when id is 'new'", () => {
    const { result } = renderHook(() => usePipeline("new"), {
      wrapper: createWrapper(),
    });

    // Query should not run - not loading, no data, no error
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.fetchStatus).toBe("idle");
  });
});
