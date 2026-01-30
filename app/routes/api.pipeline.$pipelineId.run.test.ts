import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { action } from "./api.pipeline.$pipelineId.run";

// Mock dependencies
vi.mock("~/services/session.server", () => ({
  getSession: vi.fn(),
}));

vi.mock("~/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
  pipelines: { id: "id", userId: "userId" },
  pipelineRuns: { id: "id" },
}));

vi.mock("~/services/job-queue.server", () => ({
  registerPipelineWorker: vi.fn().mockResolvedValue(undefined),
  getJobQueue: vi.fn().mockResolvedValue({
    send: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { getSession } from "~/services/session.server";
import { db } from "~/db";
import { registerPipelineWorker, getJobQueue } from "~/services/job-queue.server";

// Helper to create mock session
function createMockSession(userId: string | null) {
  return {
    get: vi.fn((key: string) => (key === "userId" ? userId : null)),
  };
}

// Helper to create Request with FormData
function createRequest(formData: Record<string, string> = {}) {
  const form = new FormData();
  Object.entries(formData).forEach(([k, v]) => form.append(k, v));
  return new Request("http://test/api/pipeline/pipe-123/run", {
    method: "POST",
    body: form,
  });
}

// Helper to parse JSON response
async function parseResponse(response: Response) {
  return JSON.parse(await response.text());
}

// Setup mock chain helpers
function mockSelectChain(result: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(result),
  };
  (db.select as Mock).mockReturnValue(chain);
  return chain;
}

function mockInsertChain(result: unknown[]) {
  const chain = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(result),
  };
  (db.insert as Mock).mockReturnValue(chain);
  return chain;
}

describe("api.pipeline.$pipelineId.run", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("action (POST /api/pipeline/:pipelineId/run)", () => {
    it("returns 401 when unauthenticated", async () => {
      (getSession as Mock).mockResolvedValue(createMockSession(null));

      const request = createRequest();
      const response = await action({
        request,
        params: { pipelineId: "pipe-123" },
        context: {},
      });

      expect(response.status).toBe(401);
      const data = await parseResponse(response);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 400 when pipelineId param is missing", async () => {
      (getSession as Mock).mockResolvedValue(createMockSession("user-123"));

      const request = createRequest();
      const response = await action({
        request,
        params: {}, // No pipelineId param
        context: {},
      });

      expect(response.status).toBe(400);
      const data = await parseResponse(response);
      expect(data.error).toBe("Pipeline ID required");
    });

    it("returns 404 when pipeline not found", async () => {
      (getSession as Mock).mockResolvedValue(createMockSession("user-123"));
      mockSelectChain([]); // Empty result = not found

      const request = createRequest();
      const response = await action({
        request,
        params: { pipelineId: "pipe-nonexistent" },
        context: {},
      });

      expect(response.status).toBe(404);
      const data = await parseResponse(response);
      expect(data.error).toBe("Pipeline not found");
    });

    it("creates run record and queues job on success", async () => {
      (getSession as Mock).mockResolvedValue(createMockSession("user-123"));

      // Mock pipeline exists
      const mockPipeline = { id: "pipe-123", userId: "user-123" };
      mockSelectChain([mockPipeline]);

      // Mock run creation
      const mockRun = { id: "run-456" };
      mockInsertChain([mockRun]);

      // Mock job queue
      const mockSend = vi.fn().mockResolvedValue(undefined);
      (getJobQueue as Mock).mockResolvedValue({ send: mockSend });

      const request = createRequest({ input: "Test input" });
      const response = await action({
        request,
        params: { pipelineId: "pipe-123" },
        context: {},
      });

      expect(response.status).toBe(200);
      const data = await parseResponse(response);
      expect(data.runId).toBe("run-456");

      // Verify worker registration and job queuing
      expect(registerPipelineWorker).toHaveBeenCalled();
      expect(mockSend).toHaveBeenCalledWith(
        "pipeline-run",
        expect.objectContaining({
          runId: "run-456",
          pipelineId: "pipe-123",
          userId: "user-123",
          input: "Test input",
        }),
        expect.objectContaining({
          retryLimit: 2,
          retryDelay: 5000,
        })
      );
    });

    it("uses empty string for input when not provided", async () => {
      (getSession as Mock).mockResolvedValue(createMockSession("user-123"));

      // Mock pipeline exists
      mockSelectChain([{ id: "pipe-123", userId: "user-123" }]);

      // Mock run creation
      mockInsertChain([{ id: "run-789" }]);

      // Mock job queue
      const mockSend = vi.fn().mockResolvedValue(undefined);
      (getJobQueue as Mock).mockResolvedValue({ send: mockSend });

      const request = createRequest(); // No input provided
      await action({
        request,
        params: { pipelineId: "pipe-123" },
        context: {},
      });

      expect(mockSend).toHaveBeenCalledWith(
        "pipeline-run",
        expect.objectContaining({
          input: "", // Empty string when not provided
        }),
        expect.any(Object)
      );
    });
  });
});
