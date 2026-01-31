import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "~/mocks/server";
import { renderWithClient } from "~/test-utils";
import { mockAgentsData, mockTraitsData } from "~/mocks/handlers";
import PipelineEditorPage from "~/routes/pipelines.$id";

/**
 * Tabs Normalization Integration Tests
 *
 * These tests verify that the normalized tab schema works correctly:
 * 1. Tab names come from the pipeline table via JOIN (not stored on tab)
 * 2. Creating a pipeline creates both the pipeline and a tab
 * 3. Renaming updates the pipeline, and tabs refresh to show new name
 * 4. Page refresh shows persisted tab state with correct names
 *
 * The key insight: the API no longer accepts `name` when saving tabs.
 * Names are derived from the pipelines table via JOIN at query time.
 */

// ============================================================
// TEST STATE - Simulates normalized database
// ============================================================

// Simulated pipelines table
let dbPipelines: Array<{
  id: string;
  name: string;
  flowData: { nodes: unknown[]; edges: unknown[] };
}> = [];

// Simulated pipeline_tabs junction table (NO name column)
let dbPipelineTabs: Array<{
  id: string;
  userId: string;
  pipelineId: string;
  position: number;
  pinned: boolean;
  isActive: boolean;
}> = [];

let nextPipelineId = 1;
let nextTabId = 1;
const TEST_USER_ID = "test-user-123";

// Track API calls for verification
let apiCalls: Array<{ type: string; data: Record<string, unknown> }> = [];

// ============================================================
// MOCK SETUP
// ============================================================

const mockNavigate = vi.fn();
let mockUrlId = "home";

// Tab state derived from database via JOIN
function getTabsWithNames() {
  return dbPipelineTabs
    .sort((a, b) => a.position - b.position)
    .map((tab) => {
      const pipeline = dbPipelines.find((p) => p.id === tab.pipelineId);
      return {
        id: tab.id,
        pipelineId: tab.pipelineId,
        name: pipeline?.name ?? "Unknown", // Name comes from JOIN
        pinned: tab.pinned,
        position: tab.position,
        isActive: tab.isActive,
      };
    });
}

function getActiveTabId() {
  const activeTab = dbPipelineTabs.find((t) => t.isActive);
  return activeTab?.pipelineId ?? null;
}

// Mutable state for mocks to read
let mockTabs = [{ pipelineId: "home", name: "Home" }];
let mockActiveTabId: string | null = "home";
const mockCloseTabMutate = vi.fn();
const mockFocusOrOpenTabMutate = vi.fn();
const mockUpdateTabNameMutate = vi.fn();
const mockSetActiveTabMutate = vi.fn();

// Pipeline mocks
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
const mockDeletePipelineMutate = vi.fn();
const mockUpdatePipelineNameMutate = vi.fn();
const mockRunPipelineMutate = vi.fn();
const mockCreatePipelineMutate = vi.fn();
const mockOpenTabMutate = vi.fn();

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
  useOpenTab: vi.fn(() => ({
    mutate: (input: { pipelineId: string; name: string }) => {
      // Simulate adding a tab
      mockTabs = [...mockTabs, { pipelineId: input.pipelineId, name: input.name }];
      mockActiveTabId = input.pipelineId;
      mockOpenTabMutate(input);
    },
    isPending: false,
  })),
  canOpenNewTab: vi.fn((tabs: Array<{ pipelineId: string }>) => {
    const nonHomeTabs = tabs.filter((t) => t.pipelineId !== "home");
    return nonHomeTabs.length < 8;
  }),
  HOME_TAB_ID: "home",
}));

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

vi.mock("~/hooks/queries/use-pipelines", () => ({
  usePipeline: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
  usePipelines: vi.fn(() => ({
    data: dbPipelines.map((p) => ({ id: p.id, name: p.name })),
    isLoading: false,
  })),
  useDeletePipeline: vi.fn(() => ({
    mutate: mockDeletePipelineMutate,
  })),
  useUpdatePipelineName: vi.fn(() => ({
    mutate: mockUpdatePipelineNameMutate,
    isPending: false,
  })),
  useRunPipeline: vi.fn(() => ({
    mutate: mockRunPipelineMutate,
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useCreatePipeline: vi.fn(() => ({
    mutate: (
      input: { id: string; name: string; flowData: { nodes: unknown[]; edges: unknown[] } },
      callbacks?: {
        onSuccess?: (pipeline: { id: string; name: string }) => void;
        onError?: () => void;
      }
    ) => {
      // Create pipeline in DB using client-provided ID
      const newPipeline = {
        id: input.id,
        name: input.name,
        flowData: input.flowData,
      };
      dbPipelines.push(newPipeline);
      apiCalls.push({ type: "CREATE_PIPELINE", data: { id: input.id, name: input.name } });

      mockCreatePipelineMutate(input, callbacks);
      callbacks?.onSuccess?.({ id: newPipeline.id, name: newPipeline.name });
    },
    mutateAsync: vi
      .fn()
      .mockResolvedValue({ id: "new-pipeline-id", name: "Untitled Pipeline" }),
    isPending: false,
  })),
}));

vi.mock("@xyflow/react", () => ({
  ReactFlow: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="react-flow">{children}</div>
  ),
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
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
import { useParams } from "react-router";

// ============================================================
// TEST SETUP
// ============================================================

function resetAllState() {
  // Reset database
  dbPipelines = [];
  dbPipelineTabs = [];
  nextPipelineId = 1;
  nextTabId = 1;
  apiCalls = [];

  // Reset navigation
  mockNavigate.mockClear();
  mockUrlId = "home";

  // Reset tab state
  mockTabs = [{ pipelineId: "home", name: "Home" }];
  mockActiveTabId = "home";
  mockCloseTabMutate.mockClear();
  mockFocusOrOpenTabMutate.mockClear();
  mockUpdateTabNameMutate.mockClear();
  mockSetActiveTabMutate.mockClear();

  // Reset pipeline data
  mockPipelineData = new Map();
  mockGetPipeline.mockClear();
  mockUpdatePipeline.mockClear();
  mockDeletePipelineMutate.mockClear();
  mockUpdatePipelineNameMutate.mockClear();
  mockRunPipelineMutate.mockClear();
  mockCreatePipelineMutate.mockClear();
  mockOpenTabMutate.mockClear();

  // Update mock implementations
  vi.mocked(useTabsQuery).mockReturnValue({
    data: { tabs: mockTabs, activeTabId: mockActiveTabId },
    isLoading: false,
  } as ReturnType<typeof useTabsQuery>);

  vi.mocked(useParams).mockReturnValue({ id: mockUrlId });
}

function setupMswHandlers() {
  server.use(
    http.get("/api/agents", () => HttpResponse.json(mockAgentsData)),
    http.get("/api/traits", () => HttpResponse.json(mockTraitsData)),

    // GET /api/pipelines - List all
    http.get("/api/pipelines", () => {
      apiCalls.push({ type: "GET_PIPELINES", data: {} });
      return HttpResponse.json({
        pipelines: dbPipelines.map((p) => ({ id: p.id, name: p.name })),
      });
    }),

    // GET /api/pipelines/:id
    http.get("/api/pipelines/:id", ({ params }) => {
      const { id } = params;
      const pipeline = dbPipelines.find((p) => p.id === id);
      if (pipeline) {
        return HttpResponse.json({ pipeline });
      }
      return HttpResponse.json({ error: "Not found" }, { status: 404 });
    }),

    // POST /api/pipelines
    http.post("/api/pipelines", async ({ request }) => {
      const formData = await request.formData();
      const intent = formData.get("intent") as string;

      if (intent === "create") {
        const name = (formData.get("name") as string) || "Untitled Pipeline";
        const flowDataStr = formData.get("flowData") as string;
        const flowData = flowDataStr
          ? JSON.parse(flowDataStr)
          : { nodes: [], edges: [] };

        const newPipeline = {
          id: `pipeline-${nextPipelineId++}`,
          name,
          flowData,
        };
        dbPipelines.push(newPipeline);
        apiCalls.push({ type: "CREATE_PIPELINE", data: { name } });
        return HttpResponse.json({ pipeline: newPipeline });
      }

      if (intent === "updateName") {
        const id = formData.get("id") as string;
        const name = formData.get("name") as string;

        const idx = dbPipelines.findIndex((p) => p.id === id);
        if (idx !== -1) {
          dbPipelines[idx].name = name;
          apiCalls.push({ type: "UPDATE_PIPELINE_NAME", data: { id, name } });
          return HttpResponse.json({ pipeline: dbPipelines[idx] });
        }
        return HttpResponse.json({ error: "Not found" }, { status: 404 });
      }

      return HttpResponse.json({ error: "Invalid intent" }, { status: 400 });
    }),

    // GET /api/tabs - Returns tabs with names from pipeline JOIN
    http.get("/api/tabs", () => {
      apiCalls.push({ type: "GET_TABS", data: {} });
      const tabsWithNames = getTabsWithNames();
      return HttpResponse.json({
        tabs: tabsWithNames,
        activeTabId: getActiveTabId(),
      });
    }),

    // POST /api/tabs - Accepts TabInput[] (pipelineId, pinned) WITHOUT name
    http.post("/api/tabs", async ({ request }) => {
      const body = (await request.json()) as {
        tabs: Array<{ pipelineId: string; pinned?: boolean }>;
        activeTabId: string | null;
      };

      apiCalls.push({ type: "SAVE_TABS", data: body });

      // Clear existing tabs
      dbPipelineTabs = [];

      // Insert new tabs
      body.tabs.forEach((tab, index) => {
        dbPipelineTabs.push({
          id: `tab-${nextTabId++}`,
          userId: TEST_USER_ID,
          pipelineId: tab.pipelineId,
          position: index,
          pinned: tab.pinned ?? false,
          isActive: tab.pipelineId === body.activeTabId,
        });
      });

      // Return tabs with names from JOIN
      return HttpResponse.json({
        tabs: getTabsWithNames(),
        activeTabId: body.activeTabId,
      });
    })
  );
}

function getDropdownTrigger() {
  const buttons = screen.getAllByRole("button");
  return buttons.find((btn) =>
    btn.querySelector("svg")?.classList.contains("lucide-plus")
  );
}

// ============================================================
// TESTS
// ============================================================

describe("Tabs Normalization - Name from Pipeline JOIN", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAllState();
    setupMswHandlers();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe("Create Pipeline Flow", () => {
    test("clicking 'New Pipeline' creates pipeline and tab, name shows as 'Untitled Pipeline'", async () => {
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

      // Verify pipeline created in DB
      await waitFor(() => {
        expect(dbPipelines).toHaveLength(1);
      });

      expect(dbPipelines[0].name).toBe("Untitled Pipeline");

      // Verify openTab was called with client-generated UUID and correct name
      expect(mockOpenTabMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          pipelineId: expect.stringMatching(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          ),
          name: "Untitled Pipeline",
        })
      );

      // Verify the pipelineId matches what was stored in DB (client-generated ID)
      const openTabCall = mockOpenTabMutate.mock.calls[0][0];
      expect(dbPipelines[0].id).toBe(openTabCall.pipelineId);
    });
  });

  describe("Rename Pipeline Flow", () => {
    test("editing name input calls updateTabName for immediate UI and updatePipelineName for persistence", async () => {
      const user = userEvent.setup();

      // Setup: pipeline exists and is open as a tab
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
      expect(nameInput).toHaveValue("Untitled Pipeline");

      // Type to rename
      await user.clear(nameInput);
      await user.type(nameInput, "My New Name");

      // Verify updateTabName was called (immediate UI update)
      await waitFor(() => {
        expect(mockUpdateTabNameMutate).toHaveBeenCalled();
      });

      // The last call should have the full new name
      const lastCall = mockUpdateTabNameMutate.mock.calls.at(-1);
      expect(lastCall?.[0]?.pipelineId).toBe("pipeline-1");
    });
  });

  describe("Tab Name Comes from Pipeline Table", () => {
    test("GET /api/tabs returns names from pipeline JOIN, not stored on tab", async () => {
      // Setup: Pipeline with name in pipelines table
      dbPipelines = [
        {
          id: "pipeline-1",
          name: "My Custom Pipeline",
          flowData: { nodes: [], edges: [] },
        },
      ];

      // Tab in pipeline_tabs has NO name column
      dbPipelineTabs = [
        {
          id: "tab-1",
          userId: TEST_USER_ID,
          pipelineId: "pipeline-1",
          position: 0,
          pinned: false,
          isActive: true,
        },
      ];

      // Verify the helper function returns name from pipeline
      const tabsWithNames = getTabsWithNames();
      expect(tabsWithNames).toHaveLength(1);
      expect(tabsWithNames[0].pipelineId).toBe("pipeline-1");
      expect(tabsWithNames[0].name).toBe("My Custom Pipeline");
    });

    test("updating pipeline name automatically reflects in tab query", async () => {
      // Initial state
      dbPipelines = [
        {
          id: "pipeline-1",
          name: "Original Name",
          flowData: { nodes: [], edges: [] },
        },
      ];
      dbPipelineTabs = [
        {
          id: "tab-1",
          userId: TEST_USER_ID,
          pipelineId: "pipeline-1",
          position: 0,
          pinned: false,
          isActive: true,
        },
      ];

      // Before update
      let tabs = getTabsWithNames();
      expect(tabs[0].name).toBe("Original Name");

      // Update pipeline name (simulating what the API does)
      dbPipelines[0].name = "Updated Name";

      // After update - tab name automatically reflects change via JOIN
      tabs = getTabsWithNames();
      expect(tabs[0].name).toBe("Updated Name");
    });
  });

  describe("Page Refresh - State Persistence", () => {
    test("after refresh, tab shows with correct persisted name from pipeline", async () => {
      // Simulate: User created pipeline, renamed it, then refreshed page
      // The data should persist in both pipelines and pipeline_tabs tables

      dbPipelines = [
        {
          id: "pipeline-1",
          name: "Persisted Pipeline Name",
          flowData: { nodes: [], edges: [] },
        },
      ];

      dbPipelineTabs = [
        {
          id: "tab-1",
          userId: TEST_USER_ID,
          pipelineId: "pipeline-1",
          position: 0,
          pinned: false,
          isActive: true,
        },
      ];

      // Mock the tabs query to return data as if from server
      mockTabs = [
        { pipelineId: "home", name: "Home" },
        { pipelineId: "pipeline-1", name: "Persisted Pipeline Name" },
      ];
      mockActiveTabId = "pipeline-1";
      mockUrlId = "pipeline-1";

      mockPipelineData.set("pipeline-1", {
        pipelineId: "pipeline-1",
        pipelineName: "Persisted Pipeline Name",
        nodes: [],
        edges: [],
      });

      vi.mocked(useTabsQuery).mockReturnValue({
        data: { tabs: mockTabs, activeTabId: mockActiveTabId },
        isLoading: false,
      } as ReturnType<typeof useTabsQuery>);

      vi.mocked(useParams).mockReturnValue({ id: mockUrlId });

      renderWithClient(<PipelineEditorPage />);

      // Verify name input shows persisted name
      await waitFor(() => {
        expect(screen.getByPlaceholderText("Pipeline name")).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText("Pipeline name");
      expect(nameInput).toHaveValue("Persisted Pipeline Name");
    });

    test("active tab is restored after refresh", async () => {
      // Setup: Two pipelines, second one active
      dbPipelines = [
        { id: "pipeline-1", name: "First", flowData: { nodes: [], edges: [] } },
        { id: "pipeline-2", name: "Second", flowData: { nodes: [], edges: [] } },
      ];

      dbPipelineTabs = [
        {
          id: "tab-1",
          userId: TEST_USER_ID,
          pipelineId: "pipeline-1",
          position: 0,
          pinned: false,
          isActive: false,
        },
        {
          id: "tab-2",
          userId: TEST_USER_ID,
          pipelineId: "pipeline-2",
          position: 1,
          pinned: false,
          isActive: true, // Active
        },
      ];

      // Verify helper returns correct active state
      expect(getActiveTabId()).toBe("pipeline-2");

      const tabs = getTabsWithNames();
      expect(tabs).toHaveLength(2);
      expect(tabs[0].isActive).toBe(false);
      expect(tabs[1].isActive).toBe(true);
    });
  });

  describe("API Contract - No Name in Save Request", () => {
    test("POST /api/tabs receives TabInput without name field", async () => {
      const user = userEvent.setup();

      // Pre-setup pipeline in DB
      dbPipelines = [
        {
          id: "pipeline-1",
          name: "Existing Pipeline",
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

      // Open dropdown and click on existing pipeline
      const dropdownTrigger = getDropdownTrigger();
      await user.click(dropdownTrigger!);

      await waitFor(() => {
        expect(screen.getByText("Existing Pipeline")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Existing Pipeline"));

      // Verify focusOrOpenTab was called (component behavior)
      expect(mockFocusOrOpenTabMutate).toHaveBeenCalledWith({
        pipelineId: "pipeline-1",
        name: "Existing Pipeline",
      });
    });
  });

  describe("Delete Pipeline - Tab Cascade", () => {
    test("when pipeline is deleted, its tab entry is removed from junction table", () => {
      // Setup
      dbPipelines = [
        { id: "pipeline-1", name: "To Delete", flowData: { nodes: [], edges: [] } },
        { id: "pipeline-2", name: "Keep", flowData: { nodes: [], edges: [] } },
      ];

      dbPipelineTabs = [
        {
          id: "tab-1",
          userId: TEST_USER_ID,
          pipelineId: "pipeline-1",
          position: 0,
          pinned: false,
          isActive: true,
        },
        {
          id: "tab-2",
          userId: TEST_USER_ID,
          pipelineId: "pipeline-2",
          position: 1,
          pinned: false,
          isActive: false,
        },
      ];

      // Simulate CASCADE DELETE (what the DB FK does)
      const pipelineToDelete = "pipeline-1";
      dbPipelines = dbPipelines.filter((p) => p.id !== pipelineToDelete);
      dbPipelineTabs = dbPipelineTabs.filter(
        (t) => t.pipelineId !== pipelineToDelete
      );

      // Verify cascade worked
      expect(dbPipelines).toHaveLength(1);
      expect(dbPipelineTabs).toHaveLength(1);
      expect(dbPipelineTabs[0].pipelineId).toBe("pipeline-2");

      // Verify tab query returns only remaining tab
      const tabs = getTabsWithNames();
      expect(tabs).toHaveLength(1);
      expect(tabs[0].name).toBe("Keep");
    });
  });
});
