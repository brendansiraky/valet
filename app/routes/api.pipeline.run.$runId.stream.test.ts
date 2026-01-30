import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { loader } from "./api.pipeline.run.$runId.stream";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteArgs = { request: Request; params: Record<string, string>; context: any; unstable_pattern: string };

// Mock dependencies
vi.mock("~/services/session.server", () => ({
  getSession: vi.fn(),
}));

vi.mock("~/db", () => ({
  db: {
    select: vi.fn(),
  },
  pipelineRuns: { id: "id", userId: "userId" },
}));

// Store the captured setup function from eventStream mock
let capturedSetup: ((send: (event: { event: string; data: string }) => void) => () => void) | null = null;

vi.mock("remix-utils/sse/server", () => ({
  eventStream: vi.fn((signal: AbortSignal, setup: (send: (event: { event: string; data: string }) => void) => () => void) => {
    // Capture the setup function for testing
    capturedSetup = setup;
    return new Response("SSE Stream", {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });
  }),
}));

vi.mock("~/services/run-emitter.server", () => ({
  runEmitter: {
    on: vi.fn(),
    off: vi.fn(),
  },
}));

import { getSession } from "~/services/session.server";
import { db } from "~/db";
import { eventStream } from "remix-utils/sse/server";
import { runEmitter } from "~/services/run-emitter.server";

// Helper to create mock session
function createMockSession(userId: string | null) {
  return {
    get: vi.fn((key: string) => (key === "userId" ? userId : null)),
  };
}

// Setup mock chain helper
function mockSelectChain(result: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(result),
  };
  (db.select as Mock).mockReturnValue(chain);
  return chain;
}

describe("api.pipeline.run.$runId.stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedSetup = null;
  });

  describe("loader (GET /api/pipeline/run/:runId/stream)", () => {
    it("returns 401 text response when unauthenticated", async () => {
      (getSession as Mock).mockResolvedValue(createMockSession(null));

      const request = new Request("http://test/api/pipeline/run/run-123/stream");
      const response = await loader({
        request,
        params: { runId: "run-123" },
        context: {},
        unstable_pattern: "",
      } as RouteArgs);

      expect(response.status).toBe(401);
      expect(await response.text()).toBe("Unauthorized");
    });

    it("returns 400 text response when runId param is missing", async () => {
      (getSession as Mock).mockResolvedValue(createMockSession("user-123"));

      const request = new Request("http://test/api/pipeline/run//stream");
      const response = await loader({
        request,
        params: {}, // No runId param
        context: {},
        unstable_pattern: "",
      } as RouteArgs);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe("Run ID required");
    });

    it("returns 404 text response when run not found", async () => {
      (getSession as Mock).mockResolvedValue(createMockSession("user-123"));
      mockSelectChain([]); // Empty result = not found

      const request = new Request("http://test/api/pipeline/run/run-nonexistent/stream");
      const response = await loader({
        request,
        params: { runId: "run-nonexistent" },
        context: {},
        unstable_pattern: "",
      } as RouteArgs);

      expect(response.status).toBe(404);
      expect(await response.text()).toBe("Run not found");
    });

    it("calls eventStream with AbortSignal and setup function on success", async () => {
      (getSession as Mock).mockResolvedValue(createMockSession("user-123"));
      const mockRun = { id: "run-123", userId: "user-123", status: "pending" };
      mockSelectChain([mockRun]);

      const request = new Request("http://test/api/pipeline/run/run-123/stream");

      const response = await loader({
        request,
        params: { runId: "run-123" },
        context: {},
        unstable_pattern: "",
      } as RouteArgs);

      expect(response.status).toBe(200);
      expect(eventStream).toHaveBeenCalledTimes(1);
      // Verify eventStream was called with an AbortSignal and a function
      const mockCalls = (eventStream as Mock).mock.calls;
      expect(mockCalls[0][0]).toBeInstanceOf(AbortSignal);
      expect(typeof mockCalls[0][1]).toBe("function");
    });

    it("setup function registers event listener on runEmitter", async () => {
      (getSession as Mock).mockResolvedValue(createMockSession("user-123"));
      const mockRun = { id: "run-123", userId: "user-123", status: "pending" };
      mockSelectChain([mockRun]);

      const request = new Request("http://test/api/pipeline/run/run-123/stream");
      await loader({
        request,
        params: { runId: "run-123" },
        context: {},
        unstable_pattern: "",
      } as RouteArgs);

      // Execute the captured setup function
      expect(capturedSetup).not.toBeNull();
      const mockSend = vi.fn();
      capturedSetup!(mockSend);

      // Verify runEmitter.on was called with correct event name
      expect(runEmitter.on).toHaveBeenCalledWith("run:run-123", expect.any(Function));
    });

    it("cleanup function unregisters event listener", async () => {
      (getSession as Mock).mockResolvedValue(createMockSession("user-123"));
      const mockRun = { id: "run-123", userId: "user-123", status: "pending" };
      mockSelectChain([mockRun]);

      const request = new Request("http://test/api/pipeline/run/run-123/stream");
      await loader({
        request,
        params: { runId: "run-123" },
        context: {},
        unstable_pattern: "",
      } as RouteArgs);

      // Execute the captured setup function and get cleanup
      const mockSend = vi.fn();
      const cleanup = capturedSetup!(mockSend);

      // Execute cleanup
      cleanup();

      // Verify runEmitter.off was called
      expect(runEmitter.off).toHaveBeenCalledWith("run:run-123", expect.any(Function));
    });

    it("sends initial status if run.status is not pending", async () => {
      (getSession as Mock).mockResolvedValue(createMockSession("user-123"));
      const mockRun = { id: "run-123", userId: "user-123", status: "running" };
      mockSelectChain([mockRun]);

      const request = new Request("http://test/api/pipeline/run/run-123/stream");
      await loader({
        request,
        params: { runId: "run-123" },
        context: {},
        unstable_pattern: "",
      } as RouteArgs);

      // Execute the captured setup function
      const mockSend = vi.fn();
      capturedSetup!(mockSend);

      // Verify initial status was sent
      expect(mockSend).toHaveBeenCalledWith({
        event: "update",
        data: JSON.stringify({ type: "status", status: "running" }),
      });
    });

    it("does not send initial status if run.status is pending", async () => {
      (getSession as Mock).mockResolvedValue(createMockSession("user-123"));
      const mockRun = { id: "run-123", userId: "user-123", status: "pending" };
      mockSelectChain([mockRun]);

      const request = new Request("http://test/api/pipeline/run/run-123/stream");
      await loader({
        request,
        params: { runId: "run-123" },
        context: {},
        unstable_pattern: "",
      } as RouteArgs);

      // Execute the captured setup function
      const mockSend = vi.fn();
      capturedSetup!(mockSend);

      // Verify no initial status was sent (only event listener registered)
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("event handler sends events to client", async () => {
      (getSession as Mock).mockResolvedValue(createMockSession("user-123"));
      const mockRun = { id: "run-123", userId: "user-123", status: "pending" };
      mockSelectChain([mockRun]);

      const request = new Request("http://test/api/pipeline/run/run-123/stream");
      await loader({
        request,
        params: { runId: "run-123" },
        context: {},
        unstable_pattern: "",
      } as RouteArgs);

      // Execute the captured setup function
      const mockSend = vi.fn();
      capturedSetup!(mockSend);

      // Get the event handler that was registered
      const registeredHandler = (runEmitter.on as Mock).mock.calls[0][1];

      // Simulate an event being emitted
      const testEvent = { type: "step_start", stepIndex: 0, agentName: "Test Agent" };
      registeredHandler(testEvent);

      // Verify the event was sent to the client
      expect(mockSend).toHaveBeenCalledWith({
        event: "update",
        data: JSON.stringify(testEvent),
      });
    });
  });
});
