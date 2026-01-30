import { http, HttpResponse } from "msw";

// Default mock data
export const mockAgentsData = {
  agents: [
    {
      id: "agent-1",
      name: "Test Agent",
      instructions: "Test instructions for agent",
      model: "claude-sonnet-4-20250514",
      traitIds: ["trait-1"],
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-02"),
      userId: "user-1",
    },
  ],
  traits: [{ id: "trait-1", name: "Test Trait" }],
  configuredProviders: ["anthropic"],
};

export const mockTraitsData = {
  traits: [
    {
      id: "trait-1",
      name: "Test Trait",
      context: "Test context for trait",
      color: "#3b82f6",
      updatedAt: new Date("2024-01-02"),
    },
  ],
};

export const mockSettingsData = {
  hasApiKey: true,
  hasOpenAIKey: false,
  modelPreference: "claude-sonnet-4-20250514",
};

export const mockPipelinesData = {
  pipelines: [
    { id: "pipeline-1", name: "Test Pipeline" },
    { id: "pipeline-2", name: "Another Pipeline" },
  ],
};

export const mockPipelineData = {
  pipeline: {
    id: "pipeline-1",
    name: "Test Pipeline",
    description: "A test pipeline for unit testing",
    flowData: { nodes: [], edges: [] },
  },
};

export const handlers = [
  // Agents API
  http.get("/api/agents", () => {
    return HttpResponse.json(mockAgentsData);
  }),

  // Traits API
  http.get("/api/traits", () => {
    return HttpResponse.json(mockTraitsData);
  }),

  // Settings API
  http.get("/api/settings", () => {
    return HttpResponse.json(mockSettingsData);
  }),

  // Pipelines API
  http.get("/api/pipelines", () => {
    return HttpResponse.json(mockPipelinesData);
  }),

  http.get("/api/pipelines/:id", () => {
    return HttpResponse.json(mockPipelineData);
  }),

  // Mutations (POST handlers)
  http.post("/api/agents", () => {
    return HttpResponse.json({ success: true });
  }),

  http.post("/api/traits", () => {
    return HttpResponse.json({ success: true });
  }),

  http.post("/api/settings", () => {
    return HttpResponse.json({ success: true });
  }),

  // Pipeline run mutation
  http.post("/api/pipeline/:pipelineId/run", async ({ request }) => {
    const formData = await request.formData();
    const input = formData.get("input");
    if (!input) {
      return HttpResponse.json({ error: "Input is required" }, { status: 400 });
    }
    return HttpResponse.json({ runId: "run-123" });
  }),

  // Pipeline mutations (create, update, delete)
  http.post("/api/pipelines", async ({ request }) => {
    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "create") {
      const name = formData.get("name") as string;
      const description = formData.get("description") as string;
      const flowData = formData.get("flowData") as string;
      return HttpResponse.json({
        pipeline: {
          id: "new-pipeline-id",
          name,
          description,
          flowData: flowData ? JSON.parse(flowData) : null,
        },
      });
    }

    if (intent === "update") {
      const id = formData.get("id") as string;
      const name = formData.get("name") as string;
      const description = formData.get("description") as string;
      const flowData = formData.get("flowData") as string;
      return HttpResponse.json({
        pipeline: {
          id,
          name,
          description,
          flowData: flowData ? JSON.parse(flowData) : null,
        },
      });
    }

    if (intent === "delete") {
      return HttpResponse.json({ success: true });
    }

    return HttpResponse.json({ error: "Invalid intent" }, { status: 400 });
  }),
];
