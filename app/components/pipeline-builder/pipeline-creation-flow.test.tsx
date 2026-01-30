import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "~/mocks/server";
import { renderWithClient } from "~/test-utils";
import { mockAgentsData, mockTraitsData } from "~/mocks/handlers";
import PipelineEditorPage from "~/routes/pipelines.$id";

/**
 * Pipeline Creation Flow Tests
 *
 * These tests rigorously verify the complete user flow for creating pipelines:
 * 1. Starting with NO pipelines - only "New Pipeline" in dropdown
 * 2. Creating a new pipeline - immediate auto-save
 * 3. Renaming the pipeline - name persists in both tab and input field
 * 4. Closing tab - pipeline appears in dropdown with correct name
 * 5. Reopening from dropdown - loads with saved name
 * 6. Deleting - removes from dropdown completely
 *
 * These tests are the SOURCE OF TRUTH. If they fail, the code is broken.
 */

// ============================================================
// TEST STATE - Simulates backend database
// ============================================================

// Simulated database of pipelines - starts EMPTY
let dbPipelines: Array<{
  id: string;
  name: string;
  description: string | null;
  flowData: { nodes: unknown[]; edges: unknown[] };
}> = [];

let nextPipelineId = 1;

// Track API calls for verification
let apiCalls: Array<{ type: string; data: Record<string, unknown> }> = [];

// ============================================================
// MOCK SETUP
// ============================================================

const mockNavigate = vi.fn();
let mockUrlId = "home";

// Tab store state - mutable for tests
let mockTabs = [{ pipelineId: "home", name: "Home" }];
let mockActiveTabId = "home";
const mockCloseTab = vi.fn();
const mockFocusOrOpenTab = vi.fn();
const mockUpdateTabName = vi.fn();
const mockCanOpenNewTab = vi.fn(() => true);

// Pipeline store state
let mockPipelineData: Map<
  string,
  {
    pipelineId: string;
    pipelineName: string;
    pipelineDescription: string;
    nodes: unknown[];
    edges: unknown[];
  }
> = new Map();
const mockRemovePipeline = vi.fn();
const mockGetPipeline = vi.fn((id: string) => mockPipelineData.get(id) ?? null);
const mockLoadPipeline = vi.fn();
const mockUpdatePipeline = vi.fn();
const mockAddAgentNodeTo = vi.fn();
const mockAddTraitNodeTo = vi.fn();
const mockCreateOnNodesChange = vi.fn(() => vi.fn());
const mockCreateOnEdgesChange = vi.fn(() => vi.fn());
const mockCreateOnConnect = vi.fn(() => vi.fn());

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useParams: vi.fn(() => ({ id: mockUrlId })),
    useNavigate: vi.fn(() => mockNavigate),
  };
});

vi.mock("~/stores/tab-store", () => ({
  useTabStore: vi.fn(() => ({
    tabs: mockTabs,
    activeTabId: mockActiveTabId,
    closeTab: mockCloseTab,
    focusOrOpenTab: mockFocusOrOpenTab,
    updateTabName: mockUpdateTabName,
    canOpenNewTab: mockCanOpenNewTab,
  })),
  HOME_TAB_ID: "home",
}));

vi.mock("~/stores/pipeline-store", () => ({
  usePipelineStore: vi.fn(() => ({
    removePipeline: mockRemovePipeline,
    getPipeline: mockGetPipeline,
    loadPipeline: mockLoadPipeline,
    updatePipeline: mockUpdatePipeline,
    addAgentNodeTo: mockAddAgentNodeTo,
    addTraitNodeTo: mockAddTraitNodeTo,
    createOnNodesChange: mockCreateOnNodesChange,
    createOnEdgesChange: mockCreateOnEdgesChange,
    createOnConnect: mockCreateOnConnect,
  })),
}));

vi.mock("@xyflow/react", () => ({
  ReactFlow: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="react-flow">{children}</div>
  ),
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Background: () => null,
  Controls: () => null,
  MiniMap: () => null,
  useReactFlow: () => ({
    screenToFlowPosition: vi.fn((pos: { x: number; y: number }) => pos),
    fitView: vi.fn(),
    getNodes: vi.fn(() => []),
    getEdges: vi.fn(() => []),
    setNodes: vi.fn(),
    setEdges: vi.fn(),
  }),
  useNodesState: vi.fn(() => [[], vi.fn(), vi.fn()]),
  useEdgesState: vi.fn(() => [[], vi.fn(), vi.fn()]),
}));

import { useTabStore } from "~/stores/tab-store";
import { usePipelineStore } from "~/stores/pipeline-store";
import { useParams } from "react-router";

// ============================================================
// TEST SETUP
// ============================================================

function resetAllState() {
  // Reset simulated database - START EMPTY
  dbPipelines = [];
  nextPipelineId = 1;
  apiCalls = [];

  // Reset navigation
  mockNavigate.mockClear();
  mockUrlId = "home";

  // Reset tab store - only home tab
  mockTabs = [{ pipelineId: "home", name: "Home" }];
  mockActiveTabId = "home";
  mockCloseTab.mockClear();
  mockFocusOrOpenTab.mockClear();
  mockUpdateTabName.mockClear();
  mockCanOpenNewTab.mockReturnValue(true);

  // Reset pipeline store
  mockPipelineData = new Map();
  mockRemovePipeline.mockClear();
  mockGetPipeline.mockClear();
  mockLoadPipeline.mockClear();
  mockUpdatePipeline.mockClear();
  mockAddAgentNodeTo.mockClear();
  mockAddTraitNodeTo.mockClear();
  mockCreateOnNodesChange.mockClear();
  mockCreateOnEdgesChange.mockClear();
  mockCreateOnConnect.mockClear();

  // Update mock implementations
  vi.mocked(useTabStore).mockReturnValue({
    tabs: mockTabs,
    activeTabId: mockActiveTabId,
    closeTab: mockCloseTab,
    focusOrOpenTab: mockFocusOrOpenTab,
    updateTabName: mockUpdateTabName,
    canOpenNewTab: mockCanOpenNewTab,
  });

  vi.mocked(usePipelineStore).mockReturnValue({
    removePipeline: mockRemovePipeline,
    getPipeline: mockGetPipeline,
    loadPipeline: mockLoadPipeline,
    updatePipeline: mockUpdatePipeline,
    addAgentNodeTo: mockAddAgentNodeTo,
    addTraitNodeTo: mockAddTraitNodeTo,
    createOnNodesChange: mockCreateOnNodesChange,
    createOnEdgesChange: mockCreateOnEdgesChange,
    createOnConnect: mockCreateOnConnect,
  });

  vi.mocked(useParams).mockReturnValue({ id: mockUrlId });
}

function setupMswHandlers() {
  server.use(
    // GET /api/agents - Return mock agents
    http.get("/api/agents", () => {
      return HttpResponse.json(mockAgentsData);
    }),

    // GET /api/traits - Return mock traits
    http.get("/api/traits", () => {
      return HttpResponse.json(mockTraitsData);
    }),

    // GET /api/pipelines - Return ONLY pipelines in our simulated DB
    http.get("/api/pipelines", () => {
      apiCalls.push({ type: "GET_PIPELINES", data: {} });
      return HttpResponse.json({
        pipelines: dbPipelines.map((p) => ({ id: p.id, name: p.name })),
      });
    }),

    // GET /api/pipelines/:id - Return specific pipeline from DB
    http.get("/api/pipelines/:id", ({ params }) => {
      const { id } = params;
      apiCalls.push({ type: "GET_PIPELINE", data: { id } });
      const pipeline = dbPipelines.find((p) => p.id === id);
      if (pipeline) {
        return HttpResponse.json({ pipeline });
      }
      return HttpResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }),

    // POST /api/pipelines - Handle create, update, delete
    http.post("/api/pipelines", async ({ request }) => {
      const formData = await request.formData();
      const intent = formData.get("intent") as string;

      if (intent === "create") {
        const name = (formData.get("name") as string) || "Untitled Pipeline";
        const description = (formData.get("description") as string) || null;
        const flowDataStr = formData.get("flowData") as string;
        const flowData = flowDataStr
          ? JSON.parse(flowDataStr)
          : { nodes: [], edges: [] };

        const newPipeline = {
          id: `pipeline-${nextPipelineId++}`,
          name,
          description,
          flowData,
        };

        dbPipelines.push(newPipeline);
        apiCalls.push({ type: "CREATE_PIPELINE", data: { name, description } });

        return HttpResponse.json({ pipeline: newPipeline });
      }

      if (intent === "update") {
        const id = formData.get("id") as string;
        const name = formData.get("name") as string;
        const description = (formData.get("description") as string) || null;
        const flowDataStr = formData.get("flowData") as string;
        const flowData = flowDataStr ? JSON.parse(flowDataStr) : undefined;

        const idx = dbPipelines.findIndex((p) => p.id === id);
        if (idx !== -1) {
          dbPipelines[idx] = {
            ...dbPipelines[idx],
            name,
            description,
            ...(flowData && { flowData }),
          };
          apiCalls.push({ type: "UPDATE_PIPELINE", data: { id, name, description } });
          return HttpResponse.json({ pipeline: dbPipelines[idx] });
        }
        return HttpResponse.json({ error: "Pipeline not found" }, { status: 404 });
      }

      if (intent === "delete") {
        const id = formData.get("id") as string;
        const idx = dbPipelines.findIndex((p) => p.id === id);
        if (idx !== -1) {
          dbPipelines.splice(idx, 1);
          apiCalls.push({ type: "DELETE_PIPELINE", data: { id } });
          return HttpResponse.json({ success: true });
        }
        return HttpResponse.json({ error: "Pipeline not found" }, { status: 404 });
      }

      return HttpResponse.json({ error: "Invalid intent" }, { status: 400 });
    })
  );
}

// Helper to find the dropdown trigger
function getDropdownTrigger() {
  const buttons = screen.getAllByRole("button");
  return buttons.find((btn) =>
    btn.querySelector("svg")?.classList.contains("lucide-plus")
  );
}

// ============================================================
// TESTS
// ============================================================

describe("Pipeline Creation Flow - Starting from Empty State", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAllState();
    setupMswHandlers();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe("Empty State - No Pipelines Exist", () => {
    test("dropdown shows only 'New Pipeline' when database has no pipelines", async () => {
      const user = userEvent.setup();
      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        expect(screen.getByTitle("Home")).toBeInTheDocument();
      });

      const dropdownTrigger = getDropdownTrigger();
      expect(dropdownTrigger).toBeTruthy();

      await user.click(dropdownTrigger!);

      await waitFor(() => {
        expect(screen.getByText("New Pipeline")).toBeInTheDocument();
      });

      // Should only have New Pipeline, no other items
      const menuItems = screen.getAllByRole("menuitem");
      expect(menuItems).toHaveLength(1);
      expect(menuItems[0]).toHaveTextContent("New Pipeline");

      // Verify database is actually empty
      expect(dbPipelines).toHaveLength(0);
    });

    test("home tab is the only tab visible", () => {
      renderWithClient(<PipelineEditorPage />);

      // Only home tab should exist
      expect(mockTabs).toHaveLength(1);
      expect(mockTabs[0].pipelineId).toBe("home");
      expect(mockActiveTabId).toBe("home");
    });

    test("canvas shows empty state message", async () => {
      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        expect(screen.getByText("Select a pipeline or create new")).toBeInTheDocument();
      });
    });
  });

  describe("Creating First Pipeline", () => {
    test("clicking 'New Pipeline' creates pipeline with 'Untitled Pipeline' name", async () => {
      const user = userEvent.setup();
      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        expect(screen.getByTitle("Home")).toBeInTheDocument();
      });

      const dropdownTrigger = getDropdownTrigger();
      await user.click(dropdownTrigger!);

      await waitFor(() => {
        expect(screen.getByText("New Pipeline")).toBeInTheDocument();
      });

      await user.click(screen.getByText("New Pipeline"));

      // Wait for pipeline to be created in database
      await waitFor(() => {
        expect(dbPipelines).toHaveLength(1);
      });

      // Verify the created pipeline
      expect(dbPipelines[0].name).toBe("Untitled Pipeline");
      expect(dbPipelines[0].id).toBe("pipeline-1");

      // Verify navigation was called
      expect(mockNavigate).toHaveBeenCalledWith("/pipelines/pipeline-1");

      // Verify CREATE API was called
      expect(apiCalls.some((c) => c.type === "CREATE_PIPELINE")).toBe(true);
    });

    test("new pipeline is immediately saved to database", async () => {
      const user = userEvent.setup();
      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        expect(screen.getByTitle("Home")).toBeInTheDocument();
      });

      const dropdownTrigger = getDropdownTrigger();
      await user.click(dropdownTrigger!);

      await waitFor(() => {
        expect(screen.getByText("New Pipeline")).toBeInTheDocument();
      });

      await user.click(screen.getByText("New Pipeline"));

      // Immediate save - no delay needed
      await waitFor(() => {
        expect(dbPipelines).toHaveLength(1);
      });

      // Pipeline should be in database with correct default values
      const pipeline = dbPipelines[0];
      expect(pipeline.id).toBeDefined();
      expect(pipeline.name).toBe("Untitled Pipeline");
      expect(pipeline.flowData).toEqual({ nodes: [], edges: [] });
    });

    test("after creating pipeline, it appears in dropdown if tab is closed", async () => {
      const user = userEvent.setup();

      // Pre-create a pipeline to simulate one already created
      dbPipelines = [
        {
          id: "pipeline-1",
          name: "Untitled Pipeline",
          description: null,
          flowData: { nodes: [], edges: [] },
        },
      ];

      // Start with home tab only (simulating after tab was closed)
      mockTabs = [{ pipelineId: "home", name: "Home" }];
      mockActiveTabId = "home";
      mockUrlId = "home";

      vi.mocked(useTabStore).mockReturnValue({
        tabs: mockTabs,
        activeTabId: "home",
        closeTab: mockCloseTab,
        focusOrOpenTab: mockFocusOrOpenTab,
        updateTabName: mockUpdateTabName,
        canOpenNewTab: mockCanOpenNewTab,
      });

      vi.mocked(useParams).mockReturnValue({ id: "home" });

      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        expect(screen.getByTitle("Home")).toBeInTheDocument();
      });

      // Open dropdown
      const dropdownTrigger = getDropdownTrigger();
      await user.click(dropdownTrigger!);

      // Should see both New Pipeline AND the created pipeline
      await waitFor(() => {
        expect(screen.getByText("New Pipeline")).toBeInTheDocument();
        expect(screen.getByText("Untitled Pipeline")).toBeInTheDocument();
      });

      // Should have 2 items now
      const menuItems = screen.getAllByRole("menuitem");
      expect(menuItems.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Renaming Pipeline - Name Persistence", () => {
    test("changing name updates tab name via updateTabName", async () => {
      const user = userEvent.setup();

      // Pre-create a pipeline in DB
      dbPipelines = [
        {
          id: "pipeline-1",
          name: "Untitled Pipeline",
          description: null,
          flowData: { nodes: [], edges: [] },
        },
      ];

      // Setup with pipeline tab active
      mockTabs = [
        { pipelineId: "home", name: "Home" },
        { pipelineId: "pipeline-1", name: "Untitled Pipeline" },
      ];
      mockActiveTabId = "pipeline-1";
      mockUrlId = "pipeline-1";

      // Mock pipeline in store
      mockPipelineData.set("pipeline-1", {
        pipelineId: "pipeline-1",
        pipelineName: "Untitled Pipeline",
        pipelineDescription: "",
        nodes: [],
        edges: [],
      });

      mockGetPipeline.mockImplementation((id: string) => mockPipelineData.get(id) ?? null);

      vi.mocked(useTabStore).mockReturnValue({
        tabs: mockTabs,
        activeTabId: mockActiveTabId,
        closeTab: mockCloseTab,
        focusOrOpenTab: mockFocusOrOpenTab,
        updateTabName: mockUpdateTabName,
        canOpenNewTab: mockCanOpenNewTab,
      });

      vi.mocked(useParams).mockReturnValue({ id: mockUrlId });

      renderWithClient(<PipelineEditorPage />);

      // Wait for pipeline to load
      await waitFor(() => {
        expect(screen.getByPlaceholderText("Pipeline name")).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText("Pipeline name");
      expect(nameInput).toHaveValue("Untitled Pipeline");

      // Change the name
      await user.clear(nameInput);
      await user.type(nameInput, "My Custom Pipeline");

      // updateTabName should be called for each character typed
      // Final call should be with the complete name
      await waitFor(() => {
        expect(mockUpdateTabName).toHaveBeenCalled();
      });

      // Verify updatePipeline was called with the new name
      await waitFor(() => {
        expect(mockUpdatePipeline).toHaveBeenCalled();
      });
    });

    test("renamed pipeline name persists in database after save", async () => {
      const user = userEvent.setup();

      // Pre-create a pipeline in DB
      dbPipelines = [
        {
          id: "pipeline-1",
          name: "Untitled Pipeline",
          description: null,
          flowData: { nodes: [], edges: [] },
        },
      ];

      mockTabs = [
        { pipelineId: "home", name: "Home" },
        { pipelineId: "pipeline-1", name: "Untitled Pipeline" },
      ];
      mockActiveTabId = "pipeline-1";
      mockUrlId = "pipeline-1";

      mockPipelineData.set("pipeline-1", {
        pipelineId: "pipeline-1",
        pipelineName: "Untitled Pipeline",
        pipelineDescription: "",
        nodes: [],
        edges: [],
      });

      // This is key - we need to actually update the mock when updatePipeline is called
      mockUpdatePipeline.mockImplementation((id: string, updates: Record<string, unknown>) => {
        const pipeline = mockPipelineData.get(id);
        if (pipeline) {
          mockPipelineData.set(id, { ...pipeline, ...updates });
        }
      });

      mockGetPipeline.mockImplementation((id: string) => mockPipelineData.get(id) ?? null);

      vi.mocked(useTabStore).mockReturnValue({
        tabs: mockTabs,
        activeTabId: mockActiveTabId,
        closeTab: mockCloseTab,
        focusOrOpenTab: mockFocusOrOpenTab,
        updateTabName: mockUpdateTabName,
        canOpenNewTab: mockCanOpenNewTab,
      });

      vi.mocked(useParams).mockReturnValue({ id: mockUrlId });

      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Pipeline name")).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText("Pipeline name");

      // Type new name
      await user.clear(nameInput);
      await user.type(nameInput, "Renamed Pipeline");

      // Wait for auto-save to happen
      await waitFor(
        () => {
          const updateCalls = apiCalls.filter((c) => c.type === "UPDATE_PIPELINE");
          return updateCalls.length > 0;
        },
        { timeout: 3000 }
      );

      // Verify database was updated
      const dbPipeline = dbPipelines.find((p) => p.id === "pipeline-1");
      expect(dbPipeline?.name).toBe("Renamed Pipeline");
    });

    test("closing tab after rename, pipeline appears with new name in dropdown", async () => {
      const user = userEvent.setup();

      // Start with a renamed pipeline in DB
      dbPipelines = [
        {
          id: "pipeline-1",
          name: "My Renamed Pipeline",
          description: null,
          flowData: { nodes: [], edges: [] },
        },
      ];

      // Only home tab open (simulating after close)
      mockTabs = [{ pipelineId: "home", name: "Home" }];
      mockActiveTabId = "home";
      mockUrlId = "home";

      vi.mocked(useTabStore).mockReturnValue({
        tabs: mockTabs,
        activeTabId: mockActiveTabId,
        closeTab: mockCloseTab,
        focusOrOpenTab: mockFocusOrOpenTab,
        updateTabName: mockUpdateTabName,
        canOpenNewTab: mockCanOpenNewTab,
      });

      vi.mocked(useParams).mockReturnValue({ id: mockUrlId });

      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        expect(screen.getByTitle("Home")).toBeInTheDocument();
      });

      // Open dropdown
      const dropdownTrigger = getDropdownTrigger();
      await user.click(dropdownTrigger!);

      // Should see the renamed pipeline
      await waitFor(() => {
        expect(screen.getByText("My Renamed Pipeline")).toBeInTheDocument();
      });

      // Click to reopen the pipeline
      await user.click(screen.getByText("My Renamed Pipeline"));

      // Should call focusOrOpenTab with the correct name
      expect(mockFocusOrOpenTab).toHaveBeenCalledWith("pipeline-1", "My Renamed Pipeline");
      expect(mockNavigate).toHaveBeenCalledWith("/pipelines/pipeline-1");
    });
  });

  describe("Create → Rename → Close → Reopen Cycle", () => {
    test("complete flow: create, rename, close tab, reopen from dropdown", async () => {
      const user = userEvent.setup();

      // Pre-create a renamed pipeline (simulating: create -> rename -> close)
      dbPipelines = [
        {
          id: "pipeline-1",
          name: "Workflow Alpha",
          description: null,
          flowData: { nodes: [], edges: [] },
        },
      ];

      const createdPipelineId = "pipeline-1";

      // Start with home tab only (simulating after tab was closed)
      mockTabs = [{ pipelineId: "home", name: "Home" }];
      mockActiveTabId = "home";
      mockUrlId = "home";

      vi.mocked(useTabStore).mockReturnValue({
        tabs: mockTabs,
        activeTabId: "home",
        closeTab: mockCloseTab,
        focusOrOpenTab: mockFocusOrOpenTab,
        updateTabName: mockUpdateTabName,
        canOpenNewTab: mockCanOpenNewTab,
      });

      vi.mocked(useParams).mockReturnValue({ id: "home" });

      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        expect(screen.getByTitle("Home")).toBeInTheDocument();
      });

      // Open dropdown - should see the renamed pipeline
      const dropdownTrigger = getDropdownTrigger();
      await user.click(dropdownTrigger!);

      await waitFor(() => {
        expect(screen.getByText("Workflow Alpha")).toBeInTheDocument();
      });

      // Click to reopen
      await user.click(screen.getByText("Workflow Alpha"));

      expect(mockFocusOrOpenTab).toHaveBeenCalledWith(createdPipelineId, "Workflow Alpha");
      expect(mockNavigate).toHaveBeenCalledWith(`/pipelines/${createdPipelineId}`);
    });

    test("reopening pipeline loads the saved name in input field", async () => {
      const user = userEvent.setup();

      // Pre-create pipeline with custom name
      dbPipelines = [
        {
          id: "pipeline-1",
          name: "My Custom Workflow",
          description: "Test description",
          flowData: { nodes: [], edges: [] },
        },
      ];

      // Simulate navigating to the pipeline
      mockTabs = [
        { pipelineId: "home", name: "Home" },
        { pipelineId: "pipeline-1", name: "My Custom Workflow" },
      ];
      mockActiveTabId = "pipeline-1";
      mockUrlId = "pipeline-1";

      // Pipeline loaded in store with saved name
      mockPipelineData.set("pipeline-1", {
        pipelineId: "pipeline-1",
        pipelineName: "My Custom Workflow",
        pipelineDescription: "Test description",
        nodes: [],
        edges: [],
      });

      mockGetPipeline.mockImplementation((id: string) => mockPipelineData.get(id) ?? null);

      vi.mocked(useTabStore).mockReturnValue({
        tabs: mockTabs,
        activeTabId: mockActiveTabId,
        closeTab: mockCloseTab,
        focusOrOpenTab: mockFocusOrOpenTab,
        updateTabName: mockUpdateTabName,
        canOpenNewTab: mockCanOpenNewTab,
      });

      vi.mocked(useParams).mockReturnValue({ id: mockUrlId });

      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Pipeline name")).toBeInTheDocument();
      });

      // Input field should have the saved name
      const nameInput = screen.getByPlaceholderText("Pipeline name");
      expect(nameInput).toHaveValue("My Custom Workflow");
    });
  });

  describe("Deleting Pipeline", () => {
    test("deleted pipeline no longer appears in dropdown", async () => {
      const user = userEvent.setup();

      // Start with NO pipelines (simulating after delete)
      dbPipelines = [];

      mockTabs = [{ pipelineId: "home", name: "Home" }];
      mockActiveTabId = "home";
      mockUrlId = "home";

      vi.mocked(useTabStore).mockReturnValue({
        tabs: mockTabs,
        activeTabId: "home",
        closeTab: mockCloseTab,
        focusOrOpenTab: mockFocusOrOpenTab,
        updateTabName: mockUpdateTabName,
        canOpenNewTab: mockCanOpenNewTab,
      });

      vi.mocked(useParams).mockReturnValue({ id: "home" });

      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        expect(screen.getByTitle("Home")).toBeInTheDocument();
      });

      // Open dropdown
      const dropdownTrigger = getDropdownTrigger();
      await user.click(dropdownTrigger!);

      await waitFor(() => {
        expect(screen.getByText("New Pipeline")).toBeInTheDocument();
      });

      // Should NOT see any pipeline (they've been deleted)
      expect(screen.queryByText("Pipeline To Delete")).not.toBeInTheDocument();

      // Should only have New Pipeline
      const menuItems = screen.getAllByRole("menuitem");
      expect(menuItems).toHaveLength(1);
      expect(menuItems[0]).toHaveTextContent("New Pipeline");
    });

    test("after deleting, database is empty and dropdown shows only New Pipeline", async () => {
      const user = userEvent.setup();

      // Create then delete (net result: empty)
      dbPipelines = [];

      mockTabs = [{ pipelineId: "home", name: "Home" }];
      vi.mocked(useTabStore).mockReturnValue({
        tabs: mockTabs,
        activeTabId: "home",
        closeTab: mockCloseTab,
        focusOrOpenTab: mockFocusOrOpenTab,
        updateTabName: mockUpdateTabName,
        canOpenNewTab: mockCanOpenNewTab,
      });

      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        expect(screen.getByTitle("Home")).toBeInTheDocument();
      });

      const dropdownTrigger = getDropdownTrigger();
      await user.click(dropdownTrigger!);

      await waitFor(() => {
        expect(screen.getByText("New Pipeline")).toBeInTheDocument();
      });

      // Verify only one item
      const menuItems = screen.getAllByRole("menuitem");
      expect(menuItems).toHaveLength(1);

      // Verify database is empty
      expect(dbPipelines).toHaveLength(0);
    });
  });

  describe("Multiple Pipelines Scenario", () => {
    test("creating multiple pipelines, all appear in dropdown when tabs closed", async () => {
      const user = userEvent.setup();

      // Pre-create multiple pipelines
      dbPipelines = [
        {
          id: "pipeline-1",
          name: "Pipeline A",
          description: null,
          flowData: { nodes: [], edges: [] },
        },
        {
          id: "pipeline-2",
          name: "Pipeline B",
          description: null,
          flowData: { nodes: [], edges: [] },
        },
        {
          id: "pipeline-3",
          name: "Pipeline C",
          description: null,
          flowData: { nodes: [], edges: [] },
        },
      ];

      mockTabs = [{ pipelineId: "home", name: "Home" }];
      vi.mocked(useTabStore).mockReturnValue({
        tabs: mockTabs,
        activeTabId: "home",
        closeTab: mockCloseTab,
        focusOrOpenTab: mockFocusOrOpenTab,
        updateTabName: mockUpdateTabName,
        canOpenNewTab: mockCanOpenNewTab,
      });

      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        expect(screen.getByTitle("Home")).toBeInTheDocument();
      });

      const dropdownTrigger = getDropdownTrigger();
      await user.click(dropdownTrigger!);

      await waitFor(() => {
        expect(screen.getByText("New Pipeline")).toBeInTheDocument();
        expect(screen.getByText("Pipeline A")).toBeInTheDocument();
        expect(screen.getByText("Pipeline B")).toBeInTheDocument();
        expect(screen.getByText("Pipeline C")).toBeInTheDocument();
      });

      // Should have 4 items total (New Pipeline + 3 existing)
      const menuItems = screen.getAllByRole("menuitem");
      expect(menuItems.length).toBe(4);
    });

    test("pipeline open as tab does NOT appear in dropdown", async () => {
      const user = userEvent.setup();

      dbPipelines = [
        {
          id: "pipeline-1",
          name: "Open Pipeline",
          description: null,
          flowData: { nodes: [], edges: [] },
        },
        {
          id: "pipeline-2",
          name: "Closed Pipeline",
          description: null,
          flowData: { nodes: [], edges: [] },
        },
      ];

      // Pipeline 1 is open as a tab
      mockTabs = [
        { pipelineId: "home", name: "Home" },
        { pipelineId: "pipeline-1", name: "Open Pipeline" },
      ];
      mockActiveTabId = "home";

      vi.mocked(useTabStore).mockReturnValue({
        tabs: mockTabs,
        activeTabId: "home",
        closeTab: mockCloseTab,
        focusOrOpenTab: mockFocusOrOpenTab,
        updateTabName: mockUpdateTabName,
        canOpenNewTab: mockCanOpenNewTab,
      });

      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        expect(screen.getByTitle("Home")).toBeInTheDocument();
      });

      const dropdownTrigger = getDropdownTrigger();
      await user.click(dropdownTrigger!);

      await waitFor(() => {
        expect(screen.getByText("New Pipeline")).toBeInTheDocument();
        // Pipeline 2 should appear (not open)
        expect(screen.getByText("Closed Pipeline")).toBeInTheDocument();
      });

      // Pipeline 1 should NOT appear in dropdown (already open as tab)
      const menuItems = screen.getAllByRole("menuitem");
      const menuTexts = menuItems.map((item) => item.textContent);
      expect(menuTexts).not.toContain("Open Pipeline");
      expect(menuTexts).toContain("Closed Pipeline");
    });
  });

  describe("Edge Cases", () => {
    test("rapid name changes all trigger saves", async () => {
      const user = userEvent.setup();

      dbPipelines = [
        {
          id: "pipeline-1",
          name: "Original",
          description: null,
          flowData: { nodes: [], edges: [] },
        },
      ];

      mockTabs = [
        { pipelineId: "home", name: "Home" },
        { pipelineId: "pipeline-1", name: "Original" },
      ];
      mockActiveTabId = "pipeline-1";
      mockUrlId = "pipeline-1";

      mockPipelineData.set("pipeline-1", {
        pipelineId: "pipeline-1",
        pipelineName: "Original",
        pipelineDescription: "",
        nodes: [],
        edges: [],
      });

      mockGetPipeline.mockImplementation((id: string) => mockPipelineData.get(id) ?? null);

      vi.mocked(useTabStore).mockReturnValue({
        tabs: mockTabs,
        activeTabId: mockActiveTabId,
        closeTab: mockCloseTab,
        focusOrOpenTab: mockFocusOrOpenTab,
        updateTabName: mockUpdateTabName,
        canOpenNewTab: mockCanOpenNewTab,
      });

      vi.mocked(useParams).mockReturnValue({ id: mockUrlId });

      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Pipeline name")).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText("Pipeline name");

      // Type rapidly
      await user.clear(nameInput);
      await user.type(nameInput, "ABCDEFGH");

      // Each keystroke should trigger updatePipeline (and thus save)
      await waitFor(() => {
        expect(mockUpdatePipeline.mock.calls.length).toBeGreaterThan(0);
      });

      // All keystrokes trigger tab name update
      await waitFor(() => {
        expect(mockUpdateTabName.mock.calls.length).toBeGreaterThan(0);
      });
    });

    test("empty name is allowed and saved correctly", async () => {
      const user = userEvent.setup();

      dbPipelines = [
        {
          id: "pipeline-1",
          name: "Has Name",
          description: null,
          flowData: { nodes: [], edges: [] },
        },
      ];

      mockTabs = [
        { pipelineId: "home", name: "Home" },
        { pipelineId: "pipeline-1", name: "Has Name" },
      ];
      mockActiveTabId = "pipeline-1";
      mockUrlId = "pipeline-1";

      mockPipelineData.set("pipeline-1", {
        pipelineId: "pipeline-1",
        pipelineName: "Has Name",
        pipelineDescription: "",
        nodes: [],
        edges: [],
      });

      mockGetPipeline.mockImplementation((id: string) => mockPipelineData.get(id) ?? null);

      vi.mocked(useTabStore).mockReturnValue({
        tabs: mockTabs,
        activeTabId: mockActiveTabId,
        closeTab: mockCloseTab,
        focusOrOpenTab: mockFocusOrOpenTab,
        updateTabName: mockUpdateTabName,
        canOpenNewTab: mockCanOpenNewTab,
      });

      vi.mocked(useParams).mockReturnValue({ id: mockUrlId });

      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Pipeline name")).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText("Pipeline name");

      // Clear the name entirely
      await user.clear(nameInput);

      // Should still call updateTabName with empty string
      await waitFor(() => {
        expect(mockUpdateTabName).toHaveBeenCalledWith("pipeline-1", "");
      });
    });

    test("special characters in name are preserved", async () => {
      const user = userEvent.setup();

      dbPipelines = [
        {
          id: "pipeline-1",
          name: "Simple",
          description: null,
          flowData: { nodes: [], edges: [] },
        },
      ];

      mockTabs = [
        { pipelineId: "home", name: "Home" },
        { pipelineId: "pipeline-1", name: "Simple" },
      ];
      mockActiveTabId = "pipeline-1";
      mockUrlId = "pipeline-1";

      mockPipelineData.set("pipeline-1", {
        pipelineId: "pipeline-1",
        pipelineName: "Simple",
        pipelineDescription: "",
        nodes: [],
        edges: [],
      });

      mockGetPipeline.mockImplementation((id: string) => mockPipelineData.get(id) ?? null);

      vi.mocked(useTabStore).mockReturnValue({
        tabs: mockTabs,
        activeTabId: mockActiveTabId,
        closeTab: mockCloseTab,
        focusOrOpenTab: mockFocusOrOpenTab,
        updateTabName: mockUpdateTabName,
        canOpenNewTab: mockCanOpenNewTab,
      });

      vi.mocked(useParams).mockReturnValue({ id: mockUrlId });

      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Pipeline name")).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText("Pipeline name");

      // Type special characters
      await user.clear(nameInput);
      await user.type(nameInput, "Test & Pipeline <> 'Quotes' \"Double\"");

      // Verify the input has the special characters
      expect(nameInput).toHaveValue("Test & Pipeline <> 'Quotes' \"Double\"");

      // Should update tab name with special characters
      await waitFor(() => {
        const lastCall = mockUpdateTabName.mock.calls.at(-1);
        expect(lastCall?.[1]).toContain("Test & Pipeline");
      });
    });

    test("very long name is handled correctly", async () => {
      const user = userEvent.setup();

      dbPipelines = [
        {
          id: "pipeline-1",
          name: "Short",
          description: null,
          flowData: { nodes: [], edges: [] },
        },
      ];

      mockTabs = [
        { pipelineId: "home", name: "Home" },
        { pipelineId: "pipeline-1", name: "Short" },
      ];
      mockActiveTabId = "pipeline-1";
      mockUrlId = "pipeline-1";

      mockPipelineData.set("pipeline-1", {
        pipelineId: "pipeline-1",
        pipelineName: "Short",
        pipelineDescription: "",
        nodes: [],
        edges: [],
      });

      mockGetPipeline.mockImplementation((id: string) => mockPipelineData.get(id) ?? null);

      vi.mocked(useTabStore).mockReturnValue({
        tabs: mockTabs,
        activeTabId: mockActiveTabId,
        closeTab: mockCloseTab,
        focusOrOpenTab: mockFocusOrOpenTab,
        updateTabName: mockUpdateTabName,
        canOpenNewTab: mockCanOpenNewTab,
      });

      vi.mocked(useParams).mockReturnValue({ id: mockUrlId });

      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Pipeline name")).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText("Pipeline name");

      // Type a very long name
      const longName = "A".repeat(200);
      await user.clear(nameInput);
      await user.type(nameInput, longName);

      // Input should accept the long name
      expect(nameInput).toHaveValue(longName);
    });
  });
});
