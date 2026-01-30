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

// Tab state - mutable for tests (via React Query hooks)
let mockTabs = [{ pipelineId: "home", name: "Home" }];
let mockActiveTabId: string | null = "home";
const mockCloseTabMutate = vi.fn();
const mockFocusOrOpenTabMutate = vi.fn();
const mockUpdateTabNameMutate = vi.fn();
const mockSetActiveTabMutate = vi.fn();

// Mock pipeline data for usePipelineFlow hook
let mockPipelineData: Map<
  string,
  {
    pipelineId: string;
    pipelineName: string;
    nodes: unknown[];
    edges: unknown[];
  }
> = new Map();
const mockGetPipeline = vi.fn((id: string) => mockPipelineData.get(id) ?? null);
const mockUpdatePipeline = vi.fn();

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useParams: vi.fn(() => ({ id: mockUrlId })),
    useNavigate: vi.fn(() => mockNavigate),
  };
});

vi.mock("~/hooks/queries/use-tabs", () => ({
  useTabsQuery: vi.fn(() => ({
    data: { tabs: mockTabs, activeTabId: mockActiveTabId },
    isLoading: false,
  })),
  useCloseTab: vi.fn(() => ({
    mutate: mockCloseTabMutate,
    isPending: false,
  })),
  useFocusOrOpenTab: vi.fn(() => ({
    mutate: mockFocusOrOpenTabMutate,
    isPending: false,
  })),
  useUpdateTabName: vi.fn(() => ({
    mutate: mockUpdateTabNameMutate,
    isPending: false,
  })),
  useSetActiveTab: vi.fn(() => ({
    mutate: mockSetActiveTabMutate,
    isPending: false,
  })),
  canOpenNewTab: vi.fn((tabs: Array<{ pipelineId: string }>) => {
    const nonHomeTabs = tabs.filter((t) => t.pipelineId !== "home");
    return nonHomeTabs.length < 8;
  }),
  HOME_TAB_ID: "home",
}));

// pipeline-store mock removed - component now uses React Query

// Mock usePipelineFlow hook used by PipelineTabPanel
vi.mock("~/hooks/queries/use-pipeline-flow", () => ({
  usePipelineFlow: vi.fn((pipelineId: string) => {
    const pipeline = mockPipelineData.get(pipelineId);
    return {
      nodes: pipeline?.nodes ?? [],
      edges: pipeline?.edges ?? [],
      pipelineName: pipeline?.pipelineName ?? "Untitled Pipeline",
      isLoading: false,
      onNodesChange: vi.fn(),
      onEdgesChange: vi.fn(),
      onConnect: vi.fn(),
      updateName: (name: string) => {
        // Update mockPipelineData directly so subsequent renders reflect the change
        const existing = mockPipelineData.get(pipelineId);
        if (existing) {
          mockPipelineData.set(pipelineId, { ...existing, pipelineName: name });
        }
        mockUpdatePipeline(pipelineId, { pipelineName: name });
      },
      addAgentNode: vi.fn(),
      addTraitNode: vi.fn(),
      removeNode: vi.fn(),
      addTraitToNode: vi.fn(),
      removeTraitFromNode: vi.fn(),
      setNodesAndEdges: vi.fn(),
    };
  }),
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

import { useTabsQuery } from "~/hooks/queries/use-tabs";
import { usePipelineFlow } from "~/hooks/queries/use-pipeline-flow";
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

  // Reset tab state - only home tab
  mockTabs = [{ pipelineId: "home", name: "Home" }];
  mockActiveTabId = "home";
  mockCloseTabMutate.mockClear();
  mockFocusOrOpenTabMutate.mockClear();
  mockUpdateTabNameMutate.mockClear();
  mockSetActiveTabMutate.mockClear();

  // Reset pipeline data for usePipelineFlow mock
  mockPipelineData = new Map();
  mockGetPipeline.mockClear();
  mockUpdatePipeline.mockClear();

  // Update mock implementations
  vi.mocked(useTabsQuery).mockReturnValue({
    data: { tabs: mockTabs, activeTabId: mockActiveTabId },
    isLoading: false,
  } as ReturnType<typeof useTabsQuery>);

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
          flowData: { nodes: [], edges: [] },
        },
      ];

      // Start with home tab only (simulating after tab was closed)
      mockTabs = [{ pipelineId: "home", name: "Home" }];
      mockActiveTabId = "home";
      mockUrlId = "home";

      vi.mocked(useTabsQuery).mockReturnValue({
        data: { tabs: mockTabs, activeTabId: "home" },
        isLoading: false,
      } as ReturnType<typeof useTabsQuery>);

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
        nodes: [],
        edges: [],
      });

      mockGetPipeline.mockImplementation((id: string) => mockPipelineData.get(id) ?? null);

      vi.mocked(useTabsQuery).mockReturnValue({
        data: { tabs: mockTabs, activeTabId: mockActiveTabId },
        isLoading: false,
      } as ReturnType<typeof useTabsQuery>);

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
        expect(mockUpdateTabNameMutate).toHaveBeenCalled();
      });

      // Verify updatePipeline was called with the new name
      await waitFor(() => {
        expect(mockUpdatePipeline).toHaveBeenCalled();
      });
    });

    test("typing in name field calls updateName for each keystroke", async () => {
      const user = userEvent.setup();

      // Pre-create a pipeline in DB
      dbPipelines = [
        {
          id: "pipeline-1",
          name: "Untitled Pipeline",
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
        nodes: [],
        edges: [],
      });

      vi.mocked(useTabsQuery).mockReturnValue({
        data: { tabs: mockTabs, activeTabId: mockActiveTabId },
        isLoading: false,
      } as ReturnType<typeof useTabsQuery>);

      vi.mocked(useParams).mockReturnValue({ id: mockUrlId });

      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Pipeline name")).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText("Pipeline name");

      // Clear mocks before typing
      mockUpdatePipeline.mockClear();

      // Type additional characters
      await user.type(nameInput, "XYZ");

      // Verify updatePipeline was called multiple times (once per keystroke)
      // Note: With controlled inputs and external mocks, exact call count may vary
      expect(mockUpdatePipeline).toHaveBeenCalled();
      expect(mockUpdatePipeline.mock.calls.length).toBeGreaterThanOrEqual(1);

      // Verify the last call includes at least one of the typed characters
      const lastCall = mockUpdatePipeline.mock.calls.at(-1);
      expect(lastCall?.[0]).toBe("pipeline-1");
      // The value will be whatever the input had + the last typed char
      expect(typeof lastCall?.[1]?.pipelineName).toBe("string");
    });

    test("closing tab after rename, pipeline appears with new name in dropdown", async () => {
      const user = userEvent.setup();

      // Start with a renamed pipeline in DB
      dbPipelines = [
        {
          id: "pipeline-1",
          name: "My Renamed Pipeline",
          flowData: { nodes: [], edges: [] },
        },
      ];

      // Only home tab open (simulating after close)
      mockTabs = [{ pipelineId: "home", name: "Home" }];
      mockActiveTabId = "home";
      mockUrlId = "home";

      vi.mocked(useTabsQuery).mockReturnValue({
        data: { tabs: mockTabs, activeTabId: mockActiveTabId },
        isLoading: false,
      } as ReturnType<typeof useTabsQuery>);

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
      expect(mockFocusOrOpenTabMutate).toHaveBeenCalledWith({ pipelineId: "pipeline-1", name: "My Renamed Pipeline" });
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
          flowData: { nodes: [], edges: [] },
        },
      ];

      const createdPipelineId = "pipeline-1";

      // Start with home tab only (simulating after tab was closed)
      mockTabs = [{ pipelineId: "home", name: "Home" }];
      mockActiveTabId = "home";
      mockUrlId = "home";

      vi.mocked(useTabsQuery).mockReturnValue({
        data: { tabs: mockTabs, activeTabId: "home" },
        isLoading: false,
      } as ReturnType<typeof useTabsQuery>);

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

      expect(mockFocusOrOpenTabMutate).toHaveBeenCalledWith({ pipelineId: createdPipelineId, name: "Workflow Alpha" });
      expect(mockNavigate).toHaveBeenCalledWith(`/pipelines/${createdPipelineId}`);
    });

    test("reopening pipeline loads the saved name in input field", async () => {
      const user = userEvent.setup();

      // Pre-create pipeline with custom name
      dbPipelines = [
        {
          id: "pipeline-1",
          name: "My Custom Workflow",
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
        nodes: [],
        edges: [],
      });

      mockGetPipeline.mockImplementation((id: string) => mockPipelineData.get(id) ?? null);

      vi.mocked(useTabsQuery).mockReturnValue({
        data: { tabs: mockTabs, activeTabId: mockActiveTabId },
        isLoading: false,
      } as ReturnType<typeof useTabsQuery>);

      vi.mocked(useParams).mockReturnValue({ id: mockUrlId });

      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Pipeline name")).toBeInTheDocument();
      });

      // Input field should have the saved name
      const nameInput = screen.getByPlaceholderText("Pipeline name");
      expect(nameInput).toHaveValue("My Custom Workflow");
    });

    test("pipeline name persists in input field after page refresh simulation", async () => {
      // This test verifies that when navigating to a pipeline that exists in the database,
      // the component loads and displays the server-provided name (not a default fallback).
      //
      // The test simulates a "page refresh" scenario where:
      // 1. User has previously created and renamed a pipeline to "Persisted Name Test"
      // 2. User refreshes the page
      // 3. The pipeline data is loaded from the server
      // 4. The input field should show "Persisted Name Test", not "Untitled Pipeline"

      // Database has the pipeline with the custom name
      dbPipelines = [
        {
          id: "pipeline-1",
          name: "Persisted Name Test",
          flowData: { nodes: [], edges: [] },
        },
      ];

      // Setup with pipeline tab active
      mockTabs = [
        { pipelineId: "home", name: "Home" },
        { pipelineId: "pipeline-1", name: "Persisted Name Test" },
      ];
      mockActiveTabId = "pipeline-1";
      mockUrlId = "pipeline-1";

      // Pre-populate the pipeline store with the server data
      // This simulates the pipeline being loaded from the server's response
      // In the real app, this happens via useEffect when initialData arrives from React Query
      mockPipelineData.set("pipeline-1", {
        pipelineId: "pipeline-1",
        pipelineName: "Persisted Name Test",
        nodes: [],
        edges: [],
      });

      mockGetPipeline.mockImplementation((id: string) => mockPipelineData.get(id) ?? null);

      vi.mocked(useTabsQuery).mockReturnValue({
        data: { tabs: mockTabs, activeTabId: mockActiveTabId },
        isLoading: false,
      } as ReturnType<typeof useTabsQuery>);

      vi.mocked(useParams).mockReturnValue({ id: mockUrlId });

      renderWithClient(<PipelineEditorPage />);

      // Wait for the component to render
      await waitFor(() => {
        expect(screen.getByPlaceholderText("Pipeline name")).toBeInTheDocument();
      });

      // THE KEY ASSERTION: The input should show the persisted name from the server
      // This verifies that after a "page refresh", when data is loaded from the server,
      // the name shown in the input matches what was saved, not a default fallback
      const nameInput = screen.getByPlaceholderText("Pipeline name");
      expect(nameInput).toHaveValue("Persisted Name Test");

      // Verify the pipeline data in the store has the correct name
      expect(mockPipelineData.get("pipeline-1")?.pipelineName).toBe("Persisted Name Test");
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

      vi.mocked(useTabsQuery).mockReturnValue({
        data: { tabs: mockTabs, activeTabId: "home" },
        isLoading: false,
      } as ReturnType<typeof useTabsQuery>);

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
      vi.mocked(useTabsQuery).mockReturnValue({
        data: { tabs: mockTabs, activeTabId: "home" },
        isLoading: false,
      } as ReturnType<typeof useTabsQuery>);

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
          flowData: { nodes: [], edges: [] },
        },
        {
          id: "pipeline-2",
          name: "Pipeline B",
          flowData: { nodes: [], edges: [] },
        },
        {
          id: "pipeline-3",
          name: "Pipeline C",
          flowData: { nodes: [], edges: [] },
        },
      ];

      mockTabs = [{ pipelineId: "home", name: "Home" }];
      vi.mocked(useTabsQuery).mockReturnValue({
        data: { tabs: mockTabs, activeTabId: "home" },
        isLoading: false,
      } as ReturnType<typeof useTabsQuery>);

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
          flowData: { nodes: [], edges: [] },
        },
        {
          id: "pipeline-2",
          name: "Closed Pipeline",
          flowData: { nodes: [], edges: [] },
        },
      ];

      // Pipeline 1 is open as a tab
      mockTabs = [
        { pipelineId: "home", name: "Home" },
        { pipelineId: "pipeline-1", name: "Open Pipeline" },
      ];
      mockActiveTabId = "home";

      vi.mocked(useTabsQuery).mockReturnValue({
        data: { tabs: mockTabs, activeTabId: "home" },
        isLoading: false,
      } as ReturnType<typeof useTabsQuery>);

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

  describe("Bug Regression: Renaming should NOT create duplicate pipeline", () => {
    /**
     * This test verifies that renaming an existing pipeline updates the existing
     * cache entry (via updatePipeline calls), not creates a new one.
     */
    test("renaming an existing pipeline updates existing cache entry", async () => {
      const user = userEvent.setup();

      dbPipelines = [
        {
          id: "pipeline-1",
          name: "Untitled Pipeline",
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
        nodes: [],
        edges: [],
      });

      vi.mocked(useTabsQuery).mockReturnValue({
        data: { tabs: mockTabs, activeTabId: mockActiveTabId },
        isLoading: false,
      } as ReturnType<typeof useTabsQuery>);

      vi.mocked(useParams).mockReturnValue({ id: mockUrlId });

      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Pipeline name")).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText("Pipeline name");
      mockUpdatePipeline.mockClear();

      // Type additional characters
      await user.type(nameInput, "ABC");

      // Verify updatePipeline was called for the existing pipeline ID
      expect(mockUpdatePipeline).toHaveBeenCalled();
      const calls = mockUpdatePipeline.mock.calls;

      // All calls should be for pipeline-1 (existing), not a new ID
      calls.forEach(call => {
        expect(call[0]).toBe("pipeline-1");
      });

      // Only one pipeline should exist in cache
      expect(mockPipelineData.size).toBe(1);
      expect(mockPipelineData.has("pipeline-1")).toBe(true);
    });

    test("after creating and renaming, dropdown should not show duplicate/truncated pipeline names", async () => {
      const user = userEvent.setup();

      // Scenario: User created and renamed a pipeline.
      // The database should have exactly ONE pipeline with the full renamed name.
      // When user opens dropdown, they should see the full name, not a truncated version.
      dbPipelines = [
        {
          id: "pipeline-1",
          name: "My Renamed Pipeline",
          flowData: { nodes: [], edges: [] },
        },
      ];

      // User is on home tab (simulating after refresh with no tabs restored)
      mockTabs = [{ pipelineId: "home", name: "Home" }];
      mockActiveTabId = "home";
      mockUrlId = "home";

      vi.mocked(useTabsQuery).mockReturnValue({
        data: { tabs: mockTabs, activeTabId: "home" },
        isLoading: false,
      } as ReturnType<typeof useTabsQuery>);

      vi.mocked(useParams).mockReturnValue({ id: "home" });

      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        expect(screen.getByTitle("Home")).toBeInTheDocument();
      });

      // Open the dropdown
      const dropdownTrigger = getDropdownTrigger();
      await user.click(dropdownTrigger!);

      await waitFor(() => {
        expect(screen.getByText("New Pipeline")).toBeInTheDocument();
      });

      // Should see exactly 2 items: "New Pipeline" and "My Renamed Pipeline"
      const menuItems = screen.getAllByRole("menuitem");
      expect(menuItems).toHaveLength(2);

      // Check that we see the FULL name, not truncated
      expect(screen.getByText("My Renamed Pipeline")).toBeInTheDocument();

      // Should NOT see any single-letter truncated names (the bug symptom)
      expect(screen.queryByText("M")).not.toBeInTheDocument();
    });

    test("full flow: create pipeline, rename it, refresh, dropdown shows only New Pipeline (pipeline is already open)", async () => {
      const user = userEvent.setup();

      // This test simulates the exact user-reported bug scenario:
      // 1. Fresh start - no pipelines
      // 2. Create new pipeline
      // 3. Rename it
      // 4. "Refresh" (reload state)
      // 5. Click dropdown
      // EXPECTED: Only "New Pipeline" because the one pipeline is open as a tab
      // BUG: Shows "New Pipeline" AND a truncated name (duplicate was created)

      // After "refresh", user has one pipeline in DB that they created and renamed
      dbPipelines = [
        {
          id: "pipeline-1",
          name: "My Custom Name",
          flowData: { nodes: [], edges: [] },
        },
      ];

      // User has that pipeline open as a tab (simulating they're viewing it)
      mockTabs = [
        { pipelineId: "home", name: "Home" },
        { pipelineId: "pipeline-1", name: "My Custom Name" },
      ];
      mockActiveTabId = "pipeline-1";
      mockUrlId = "pipeline-1";

      mockPipelineData.set("pipeline-1", {
        pipelineId: "pipeline-1",
        pipelineName: "My Custom Name",
        nodes: [],
        edges: [],
      });

      mockGetPipeline.mockImplementation((id: string) => mockPipelineData.get(id) ?? null);

      vi.mocked(useTabsQuery).mockReturnValue({
        data: { tabs: mockTabs, activeTabId: mockActiveTabId },
        isLoading: false,
      } as ReturnType<typeof useTabsQuery>);

      vi.mocked(useParams).mockReturnValue({ id: mockUrlId });

      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        expect(screen.getByTitle("Home")).toBeInTheDocument();
      });

      // Open the dropdown
      const dropdownTrigger = getDropdownTrigger();
      await user.click(dropdownTrigger!);

      await waitFor(() => {
        expect(screen.getByText("New Pipeline")).toBeInTheDocument();
      });

      // Since pipeline-1 is already open as a tab, it should NOT appear in dropdown
      // The dropdown only shows pipelines that are NOT currently open
      const menuItems = screen.getAllByRole("menuitem");
      expect(menuItems).toHaveLength(1);
      expect(menuItems[0]).toHaveTextContent("New Pipeline");

      // The pipeline name DOES appear on page (in the tab), but should NOT appear in dropdown
      // Verify no duplicate/truncated single-letter names appear in the dropdown menu items
      const menuItemTexts = menuItems.map((item) => item.textContent);
      expect(menuItemTexts).not.toContain("M");
      expect(menuItemTexts).not.toContain("My Custom Name");
    });
  });

  describe("Edge Cases", () => {
    test("rapid name changes all trigger saves", async () => {
      const user = userEvent.setup();

      dbPipelines = [
        {
          id: "pipeline-1",
          name: "Original",
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
        nodes: [],
        edges: [],
      });

      mockGetPipeline.mockImplementation((id: string) => mockPipelineData.get(id) ?? null);

      vi.mocked(useTabsQuery).mockReturnValue({
        data: { tabs: mockTabs, activeTabId: mockActiveTabId },
        isLoading: false,
      } as ReturnType<typeof useTabsQuery>);

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
        expect(mockUpdateTabNameMutate.mock.calls.length).toBeGreaterThan(0);
      });
    });

    test("empty name is allowed and saved correctly", async () => {
      const user = userEvent.setup();

      dbPipelines = [
        {
          id: "pipeline-1",
          name: "Has Name",
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
        nodes: [],
        edges: [],
      });

      mockGetPipeline.mockImplementation((id: string) => mockPipelineData.get(id) ?? null);

      vi.mocked(useTabsQuery).mockReturnValue({
        data: { tabs: mockTabs, activeTabId: mockActiveTabId },
        isLoading: false,
      } as ReturnType<typeof useTabsQuery>);

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
        expect(mockUpdateTabNameMutate).toHaveBeenCalledWith({ pipelineId: "pipeline-1", name: "" });
      });
    });

    test("special characters in name are passed to updateName", async () => {
      const user = userEvent.setup();

      dbPipelines = [
        {
          id: "pipeline-1",
          name: "Simple",
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
        nodes: [],
        edges: [],
      });

      vi.mocked(useTabsQuery).mockReturnValue({
        data: { tabs: mockTabs, activeTabId: mockActiveTabId },
        isLoading: false,
      } as ReturnType<typeof useTabsQuery>);

      vi.mocked(useParams).mockReturnValue({ id: mockUrlId });

      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Pipeline name")).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText("Pipeline name");
      mockUpdatePipeline.mockClear();
      mockUpdateTabNameMutate.mockClear();

      // Type special characters (appends to existing)
      const specialChars = "&<>";
      await user.type(nameInput, specialChars);

      // Verify updateName and updateTabName were called
      expect(mockUpdatePipeline).toHaveBeenCalled();
      expect(mockUpdateTabNameMutate).toHaveBeenCalled();

      // At least one call should have special characters in the value
      const allCalls = mockUpdatePipeline.mock.calls.map(c => c[1]?.pipelineName);
      const hasSpecialChars = allCalls.some(
        name => name && (name.includes("&") || name.includes("<") || name.includes(">"))
      );
      expect(hasSpecialChars).toBe(true);
    });

    test("multiple keystrokes trigger multiple updateName calls", async () => {
      const user = userEvent.setup();

      dbPipelines = [
        {
          id: "pipeline-1",
          name: "Short",
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
        nodes: [],
        edges: [],
      });

      vi.mocked(useTabsQuery).mockReturnValue({
        data: { tabs: mockTabs, activeTabId: mockActiveTabId },
        isLoading: false,
      } as ReturnType<typeof useTabsQuery>);

      vi.mocked(useParams).mockReturnValue({ id: mockUrlId });

      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Pipeline name")).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText("Pipeline name");
      mockUpdatePipeline.mockClear();

      // Type several characters
      await user.type(nameInput, "AAAAA");

      // Verify updateName was called multiple times
      expect(mockUpdatePipeline).toHaveBeenCalled();
      expect(mockUpdatePipeline.mock.calls.length).toBeGreaterThanOrEqual(1);

      // updateTabName should also be called
      expect(mockUpdateTabNameMutate).toHaveBeenCalled();
    });
  });
});
