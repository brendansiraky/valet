import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { loader } from "./api.pipelines.$id";

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
  pipelines: { id: "id", userId: "userId" },
}));

import { getSession } from "~/services/session.server";
import { db } from "~/db";

// Helper to create mock session
function createMockSession(userId: string | null) {
  return {
    get: vi.fn((key: string) => (key === "userId" ? userId : null)),
  };
}

// Helper to parse JSON response
async function parseResponse(response: Response) {
  return JSON.parse(await response.text());
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

describe("api.pipelines.$id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loader (GET /api/pipelines/:id)", () => {
    it("returns 401 when unauthenticated", async () => {
      (getSession as Mock).mockResolvedValue(createMockSession(null));

      const request = new Request("http://test/api/pipelines/pipe-123");
      const response = await loader({
        request,
        params: { id: "pipe-123" },
        context: {},
        unstable_pattern: "",
      } as RouteArgs);

      expect(response.status).toBe(401);
      const data = await parseResponse(response);
      expect(data.error).toBe("Authentication required");
    });

    it("returns 400 when id param is missing", async () => {
      (getSession as Mock).mockResolvedValue(createMockSession("user-123"));

      const request = new Request("http://test/api/pipelines/");
      const response = await loader({
        request,
        params: {}, // No id param
        context: {},
        unstable_pattern: "",
      } as RouteArgs);

      expect(response.status).toBe(400);
      const data = await parseResponse(response);
      expect(data.error).toBe("Pipeline ID required");
    });

    it("returns 404 when pipeline not found", async () => {
      (getSession as Mock).mockResolvedValue(createMockSession("user-123"));
      mockSelectChain([]); // Empty result = not found

      const request = new Request("http://test/api/pipelines/pipe-nonexistent");
      const response = await loader({
        request,
        params: { id: "pipe-nonexistent" },
        context: {},
        unstable_pattern: "",
      } as RouteArgs);

      expect(response.status).toBe(404);
      const data = await parseResponse(response);
      expect(data.error).toBe("Pipeline not found");
    });

    it("returns pipeline object on success", async () => {
      (getSession as Mock).mockResolvedValue(createMockSession("user-123"));
      const mockPipeline = {
        id: "pipe-123",
        name: "Test Pipeline",
        description: "A test pipeline",
        flowData: { nodes: [], edges: [] },
        userId: "user-123",
      };
      mockSelectChain([mockPipeline]);

      const request = new Request("http://test/api/pipelines/pipe-123");
      const response = await loader({
        request,
        params: { id: "pipe-123" },
        context: {},
        unstable_pattern: "",
      } as RouteArgs);

      expect(response.status).toBe(200);
      const data = await parseResponse(response);
      expect(data.pipeline).toEqual(mockPipeline);
    });
  });
});
