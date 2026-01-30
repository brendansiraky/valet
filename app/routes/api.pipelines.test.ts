import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { loader, action } from "./api.pipelines";

// Mock dependencies
vi.mock("~/services/session.server", () => ({
  getSession: vi.fn(),
}));

vi.mock("~/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  pipelines: { id: "id", name: "name", userId: "userId", updatedAt: "updatedAt" },
}));

import { getSession } from "~/services/session.server";
import { db } from "~/db";

// Helper to create mock session
function createMockSession(userId: string | null) {
  return {
    get: vi.fn((key: string) => (key === "userId" ? userId : null)),
  };
}

// Helper to create Request with FormData
function createRequest(formData: Record<string, string>, method = "POST") {
  const form = new FormData();
  Object.entries(formData).forEach(([k, v]) => form.append(k, v));
  return new Request("http://test/api/pipelines", { method, body: form });
}

// Helper to parse JSON response
async function parseResponse(response: Response) {
  return JSON.parse(await response.text());
}

// Setup mock chain helpers
function mockSelectChain(result: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(result),
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

function mockUpdateChain(result: unknown[]) {
  const chain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(result),
  };
  (db.update as Mock).mockReturnValue(chain);
  return chain;
}

function mockDeleteChain(result: unknown[]) {
  const chain = {
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(result),
  };
  (db.delete as Mock).mockReturnValue(chain);
  return chain;
}

describe("api.pipelines", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loader (GET /api/pipelines)", () => {
    it("returns 401 when no userId in session", async () => {
      (getSession as Mock).mockResolvedValue(createMockSession(null));

      const request = new Request("http://test/api/pipelines");
      const response = await loader({ request, params: {}, context: {} });

      expect(response.status).toBe(401);
      const data = await parseResponse(response);
      expect(data.error).toBe("Authentication required");
    });

    it("returns list of pipelines for authenticated user", async () => {
      (getSession as Mock).mockResolvedValue(createMockSession("user-123"));
      const mockPipelines = [
        { id: "pipe-1", name: "Pipeline 1" },
        { id: "pipe-2", name: "Pipeline 2" },
      ];
      mockSelectChain(mockPipelines);

      const request = new Request("http://test/api/pipelines");
      const response = await loader({ request, params: {}, context: {} });

      expect(response.status).toBe(200);
      const data = await parseResponse(response);
      expect(data.pipelines).toEqual(mockPipelines);
    });
  });

  describe("action with intent=create", () => {
    it("returns 401 when unauthenticated", async () => {
      (getSession as Mock).mockResolvedValue(createMockSession(null));

      const request = createRequest({ intent: "create", name: "Test Pipeline" });
      const response = await action({ request, params: {}, context: {} });

      expect(response.status).toBe(401);
      const data = await parseResponse(response);
      expect(data.error).toBe("Authentication required");
    });

    it("returns 400 when name is missing", async () => {
      (getSession as Mock).mockResolvedValue(createMockSession("user-123"));

      const request = createRequest({ intent: "create" });
      const response = await action({ request, params: {}, context: {} });

      expect(response.status).toBe(400);
      const data = await parseResponse(response);
      expect(data.error).toBe("Name is required");
    });

    it("returns pipeline object on success", async () => {
      (getSession as Mock).mockResolvedValue(createMockSession("user-123"));
      const newPipeline = {
        id: "pipe-new",
        name: "Test Pipeline",
        description: "A test pipeline",
        flowData: { nodes: [], edges: [] },
        userId: "user-123",
      };
      mockInsertChain([newPipeline]);

      const request = createRequest({
        intent: "create",
        name: "Test Pipeline",
        description: "A test pipeline",
      });
      const response = await action({ request, params: {}, context: {} });

      expect(response.status).toBe(200);
      const data = await parseResponse(response);
      expect(data.pipeline).toEqual(newPipeline);
    });

    it("uses provided flowData when present", async () => {
      (getSession as Mock).mockResolvedValue(createMockSession("user-123"));
      const flowData = { nodes: [{ id: "1" }], edges: [] };
      const insertChain = mockInsertChain([{ id: "pipe-new", flowData }]);

      const request = createRequest({
        intent: "create",
        name: "Test Pipeline",
        flowData: JSON.stringify(flowData),
      });
      await action({ request, params: {}, context: {} });

      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({ flowData })
      );
    });
  });

  describe("action with intent=update", () => {
    it("returns 401 when unauthenticated", async () => {
      (getSession as Mock).mockResolvedValue(createMockSession(null));

      const request = createRequest({
        intent: "update",
        id: "pipe-1",
        name: "Updated",
        flowData: "{}",
      });
      const response = await action({ request, params: {}, context: {} });

      expect(response.status).toBe(401);
      const data = await parseResponse(response);
      expect(data.error).toBe("Authentication required");
    });

    it("returns 400 when id is missing", async () => {
      (getSession as Mock).mockResolvedValue(createMockSession("user-123"));

      const request = createRequest({
        intent: "update",
        name: "Updated",
        flowData: "{}",
      });
      const response = await action({ request, params: {}, context: {} });

      expect(response.status).toBe(400);
      const data = await parseResponse(response);
      expect(data.error).toBe("ID and name are required");
    });

    it("returns 400 when name is missing", async () => {
      (getSession as Mock).mockResolvedValue(createMockSession("user-123"));

      const request = createRequest({
        intent: "update",
        id: "pipe-1",
        flowData: "{}",
      });
      const response = await action({ request, params: {}, context: {} });

      expect(response.status).toBe(400);
      const data = await parseResponse(response);
      expect(data.error).toBe("ID and name are required");
    });

    it("returns 404 when pipeline not found", async () => {
      (getSession as Mock).mockResolvedValue(createMockSession("user-123"));
      mockUpdateChain([]); // Empty result = not found

      const request = createRequest({
        intent: "update",
        id: "pipe-nonexistent",
        name: "Updated",
        flowData: "{}",
      });
      const response = await action({ request, params: {}, context: {} });

      expect(response.status).toBe(404);
      const data = await parseResponse(response);
      expect(data.error).toBe("Pipeline not found");
    });

    it("returns updated pipeline on success", async () => {
      (getSession as Mock).mockResolvedValue(createMockSession("user-123"));
      const updatedPipeline = {
        id: "pipe-1",
        name: "Updated Pipeline",
        description: "Updated desc",
        flowData: { nodes: [{ id: "1" }], edges: [] },
      };
      mockUpdateChain([updatedPipeline]);

      const request = createRequest({
        intent: "update",
        id: "pipe-1",
        name: "Updated Pipeline",
        description: "Updated desc",
        flowData: JSON.stringify({ nodes: [{ id: "1" }], edges: [] }),
      });
      const response = await action({ request, params: {}, context: {} });

      expect(response.status).toBe(200);
      const data = await parseResponse(response);
      expect(data.pipeline).toEqual(updatedPipeline);
    });
  });

  describe("action with intent=delete", () => {
    it("returns 401 when unauthenticated", async () => {
      (getSession as Mock).mockResolvedValue(createMockSession(null));

      const request = createRequest({ intent: "delete", id: "pipe-1" });
      const response = await action({ request, params: {}, context: {} });

      expect(response.status).toBe(401);
      const data = await parseResponse(response);
      expect(data.error).toBe("Authentication required");
    });

    it("returns 400 when id is missing", async () => {
      (getSession as Mock).mockResolvedValue(createMockSession("user-123"));

      const request = createRequest({ intent: "delete" });
      const response = await action({ request, params: {}, context: {} });

      expect(response.status).toBe(400);
      const data = await parseResponse(response);
      expect(data.error).toBe("ID is required");
    });

    it("returns 404 when pipeline not found", async () => {
      (getSession as Mock).mockResolvedValue(createMockSession("user-123"));
      mockDeleteChain([]); // Empty result = not found

      const request = createRequest({ intent: "delete", id: "pipe-nonexistent" });
      const response = await action({ request, params: {}, context: {} });

      expect(response.status).toBe(404);
      const data = await parseResponse(response);
      expect(data.error).toBe("Pipeline not found");
    });

    it("returns success: true on successful delete", async () => {
      (getSession as Mock).mockResolvedValue(createMockSession("user-123"));
      mockDeleteChain([{ id: "pipe-1" }]);

      const request = createRequest({ intent: "delete", id: "pipe-1" });
      const response = await action({ request, params: {}, context: {} });

      expect(response.status).toBe(200);
      const data = await parseResponse(response);
      expect(data.success).toBe(true);
    });
  });

  describe("action with invalid intent", () => {
    it("returns 400 with Invalid intent error", async () => {
      (getSession as Mock).mockResolvedValue(createMockSession("user-123"));

      const request = createRequest({ intent: "invalid-action" });
      const response = await action({ request, params: {}, context: {} });

      expect(response.status).toBe(400);
      const data = await parseResponse(response);
      expect(data.error).toBe("Invalid intent");
    });
  });
});
