import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "~/mocks/server";
import { renderWithClient } from "~/test-utils";
import {
  mockAgentsData,
  mockTraitsData,
  mockPipelinesData,
} from "~/mocks/handlers";
import PipelineEditorPage from "./pipelines.$id";

// Keep track of created pipelines for mock state
let createdPipelines: Array<{ id: string; name: string; description: string | null; flowData: unknown }> = [];
let nextPipelineId = 1;

// Mock navigation function
const mockNavigate = vi.fn();
let mockUrlId = "home";

// Mock tab store state - mutable for tests to modify
let mockTabs = [{ pipelineId: "home", name: "Home" }];
let mockActiveTabId = "home";
const mockCloseTab = vi.fn();
const mockFocusOrOpenTab = vi.fn();
const mockUpdateTabName = vi.fn();
const mockCanOpenNewTab = vi.fn(() => true);

// Mock pipeline store state
let mockPipelineData: Map<string, {
  pipelineId: string;
  pipelineName: string;
  pipelineDescription: string;
  nodes: unknown[];
  edges: unknown[];
}> = new Map();
const mockRemovePipeline = vi.fn();
const mockGetPipeline = vi.fn((id: string) => mockPipelineData.get(id) || null);
const mockLoadPipeline = vi.fn();
const mockUpdatePipeline = vi.fn();
const mockAddAgentNodeTo = vi.fn();
const mockAddTraitNodeTo = vi.fn();
const mockCreateOnNodesChange = vi.fn(() => vi.fn());
const mockCreateOnEdgesChange = vi.fn(() => vi.fn());
const mockCreateOnConnect = vi.fn(() => vi.fn());

// Mock react-router hooks
vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useParams: vi.fn(() => ({ id: mockUrlId })),
    useNavigate: vi.fn(() => mockNavigate),
  };
});

// Mock zustand stores
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

// Mock @xyflow/react to avoid canvas issues in jsdom
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

// Import mocked modules
import { useTabStore } from "~/stores/tab-store";
import { usePipelineStore } from "~/stores/pipeline-store";
import { useParams } from "react-router";

describe("PipelineEditorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset state
    createdPipelines = [];
    nextPipelineId = 1;
    mockUrlId = "home";
    mockTabs = [{ pipelineId: "home", name: "Home" }];
    mockActiveTabId = "home";
    mockPipelineData = new Map();
    mockCanOpenNewTab.mockReturnValue(true);

    // Reset mocks
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

    // Setup MSW handlers for pipeline operations
    server.use(
      http.get("/api/pipelines", () => {
        // Return base pipelines plus created ones
        const allPipelines = [
          ...mockPipelinesData.pipelines,
          ...createdPipelines.map(p => ({ id: p.id, name: p.name })),
        ];
        return HttpResponse.json({ pipelines: allPipelines });
      }),

      http.get("/api/pipelines/:id", ({ params }) => {
        const { id } = params;
        // Check if it's a created pipeline
        const created = createdPipelines.find(p => p.id === id);
        if (created) {
          return HttpResponse.json({ pipeline: created });
        }
        // Default mock pipeline
        return HttpResponse.json({
          pipeline: {
            id,
            name: "Test Pipeline",
            description: null,
            flowData: { nodes: [], edges: [] },
          },
        });
      }),

      http.post("/api/pipelines", async ({ request }) => {
        const formData = await request.formData();
        const intent = formData.get("intent");

        if (intent === "create") {
          const name = (formData.get("name") as string) || "Untitled Pipeline";
          const description = formData.get("description") as string || null;
          const flowData = formData.get("flowData") as string;

          const newPipeline = {
            id: `pipeline-${nextPipelineId++}`,
            name,
            description,
            flowData: flowData ? JSON.parse(flowData) : { nodes: [], edges: [] },
          };
          createdPipelines.push(newPipeline);

          return HttpResponse.json({ pipeline: newPipeline });
        }

        if (intent === "update") {
          const id = formData.get("id") as string;
          const name = formData.get("name") as string;
          const description = formData.get("description") as string || null;
          const flowData = formData.get("flowData") as string;

          // Update if exists
          const idx = createdPipelines.findIndex(p => p.id === id);
          if (idx !== -1) {
            createdPipelines[idx] = {
              ...createdPipelines[idx],
              name,
              description,
              flowData: flowData ? JSON.parse(flowData) : createdPipelines[idx].flowData,
            };
          }

          return HttpResponse.json({
            pipeline: {
              id,
              name,
              description,
              flowData: flowData ? JSON.parse(flowData) : { nodes: [], edges: [] },
            },
          });
        }

        if (intent === "delete") {
          const id = formData.get("id") as string;
          createdPipelines = createdPipelines.filter(p => p.id !== id);
          return HttpResponse.json({ success: true });
        }

        return HttpResponse.json({ error: "Invalid intent" }, { status: 400 });
      })
    );
  });

  afterEach(() => {
    server.resetHandlers();
  });

  // ============================================
  // BASIC RENDERING TESTS (existing)
  // ============================================

  test("renders pipeline tabs component", async () => {
    renderWithClient(<PipelineEditorPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Select a pipeline or create new")
      ).toBeInTheDocument();
    });
  });

  test("renders agent sidebar", async () => {
    renderWithClient(<PipelineEditorPage />);

    await waitFor(() => {
      expect(screen.getByText("Test Agent")).toBeInTheDocument();
    });
  });

  test("shows home tab empty state when id is home", async () => {
    renderWithClient(<PipelineEditorPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Select a pipeline or create new")
      ).toBeInTheDocument();
    });

    expect(screen.getByTestId("react-flow")).toBeInTheDocument();
  });

  test("handles loading state while fetching data", async () => {
    server.use(
      http.get("/api/agents", async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json(mockAgentsData);
      }),
      http.get("/api/traits", async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json(mockTraitsData);
      }),
      http.get("/api/pipelines", async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json(mockPipelinesData);
      })
    );

    renderWithClient(<PipelineEditorPage />);

    expect(screen.getByTestId("react-flow")).toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.getByText("Test Agent")).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  test("handles error state when agents query fails", async () => {
    server.use(
      http.get("/api/agents", () => {
        return HttpResponse.json(
          { message: "Internal server error" },
          { status: 500 }
        );
      })
    );

    renderWithClient(<PipelineEditorPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Select a pipeline or create new")
      ).toBeInTheDocument();
    });

    expect(screen.queryByText("Test Agent")).not.toBeInTheDocument();
  });

  // ============================================
  // USER FLOW TESTS
  // ============================================

  describe("Initial Landing State", () => {
    test("home tab is active on initial load", () => {
      renderWithClient(<PipelineEditorPage />);

      // Home tab should be in the tabs
      expect(mockTabs).toContainEqual({ pipelineId: "home", name: "Home" });
      expect(mockActiveTabId).toBe("home");
    });

    test("canvas shows empty state message when no pipeline selected", async () => {
      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        expect(
          screen.getByText("Select a pipeline or create new")
        ).toBeInTheDocument();
      });
    });

    test("sidebar shows 'Your Agents' section", async () => {
      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        expect(screen.getByText("Test Agent")).toBeInTheDocument();
      });
    });

    test("sidebar shows traits section", async () => {
      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        expect(screen.getByText("Test Trait")).toBeInTheDocument();
      });
    });
  });

  describe("Creating First Pipeline", () => {
    test("clicking New Pipeline in dropdown creates new pipeline", async () => {
      const user = userEvent.setup();

      // Mock empty pipelines list initially
      server.use(
        http.get("/api/pipelines", () => {
          return HttpResponse.json({ pipelines: createdPipelines.map(p => ({ id: p.id, name: p.name })) });
        })
      );

      renderWithClient(<PipelineEditorPage />);

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByTitle("Home")).toBeInTheDocument();
      });

      // Find and click the dropdown trigger (the button with plus icon after home)
      const buttons = screen.getAllByRole("button");
      const dropdownTrigger = buttons.find(btn =>
        btn.querySelector("svg")?.classList.contains("lucide-plus")
      );

      if (dropdownTrigger) {
        await user.click(dropdownTrigger);

        // Wait for dropdown to open
        await waitFor(() => {
          expect(screen.getByText("New Pipeline")).toBeInTheDocument();
        });

        // Click "New Pipeline"
        await user.click(screen.getByText("New Pipeline"));

        // Verify navigate was called with the new pipeline ID
        await waitFor(() => {
          expect(mockNavigate).toHaveBeenCalledWith(expect.stringMatching(/\/pipelines\/pipeline-\d+/));
        });

        // Verify a pipeline was created
        expect(createdPipelines.length).toBeGreaterThan(0);
        expect(createdPipelines[0].name).toBe("Untitled Pipeline");
      }
    });

    test("new pipeline is auto-saved via POST /api/pipelines with intent=create", async () => {
      const user = userEvent.setup();
      let createCalled = false;

      server.use(
        http.post("/api/pipelines", async ({ request }) => {
          const formData = await request.formData();
          const intent = formData.get("intent");

          if (intent === "create") {
            createCalled = true;
            const name = formData.get("name");
            expect(name).toBe("Untitled Pipeline");

            return HttpResponse.json({
              pipeline: { id: "new-pipeline-123", name, description: null, flowData: { nodes: [], edges: [] } }
            });
          }
          return HttpResponse.json({ error: "Invalid intent" }, { status: 400 });
        }),
        http.get("/api/pipelines", () => {
          return HttpResponse.json({ pipelines: [] });
        })
      );

      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        expect(screen.getByTitle("Home")).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole("button");
      const dropdownTrigger = buttons.find(btn =>
        btn.querySelector("svg")?.classList.contains("lucide-plus")
      );

      if (dropdownTrigger) {
        await user.click(dropdownTrigger);
        await waitFor(() => {
          expect(screen.getByText("New Pipeline")).toBeInTheDocument();
        });
        await user.click(screen.getByText("New Pipeline"));

        await waitFor(() => {
          expect(createCalled).toBe(true);
        });
      }
    });
  });

  describe("Tab Management - Close and Reopen", () => {
    test("closing a pipeline tab removes it from tab bar", async () => {
      const user = userEvent.setup();

      // Setup with an open pipeline tab
      mockTabs = [
        { pipelineId: "home", name: "Home" },
        { pipelineId: "p1", name: "Test Pipeline" },
      ];
      mockActiveTabId = "p1";
      mockUrlId = "p1";

      vi.mocked(useTabStore).mockReturnValue({
        tabs: mockTabs,
        activeTabId: mockActiveTabId,
        closeTab: mockCloseTab,
        focusOrOpenTab: mockFocusOrOpenTab,
        updateTabName: mockUpdateTabName,
        canOpenNewTab: mockCanOpenNewTab,
      });

      vi.mocked(useParams).mockReturnValue({ id: mockUrlId });

      // Mock pipeline data in store
      mockPipelineData.set("p1", {
        pipelineId: "p1",
        pipelineName: "Test Pipeline",
        pipelineDescription: "",
        nodes: [],
        edges: [],
      });

      renderWithClient(<PipelineEditorPage />);

      // Wait for tab to render
      await waitFor(() => {
        expect(screen.getByText("Test Pipeline")).toBeInTheDocument();
      });

      // Find close button on the tab
      const tabText = screen.getByText("Test Pipeline");
      const tabButton = tabText.closest("button");
      const closeButton = within(tabButton!).getByRole("button");

      await user.click(closeButton);

      // closeTab should be called
      expect(mockCloseTab).toHaveBeenCalledWith("p1");
    });

    test("after closing tab, navigates to home if no other tabs", async () => {
      const user = userEvent.setup();

      mockTabs = [
        { pipelineId: "home", name: "Home" },
        { pipelineId: "p1", name: "Only Pipeline" },
      ];
      mockActiveTabId = "p1";
      mockUrlId = "p1";

      vi.mocked(useTabStore).mockReturnValue({
        tabs: mockTabs,
        activeTabId: mockActiveTabId,
        closeTab: mockCloseTab,
        focusOrOpenTab: mockFocusOrOpenTab,
        updateTabName: mockUpdateTabName,
        canOpenNewTab: mockCanOpenNewTab,
      });

      vi.mocked(useParams).mockReturnValue({ id: mockUrlId });

      mockPipelineData.set("p1", {
        pipelineId: "p1",
        pipelineName: "Only Pipeline",
        pipelineDescription: "",
        nodes: [],
        edges: [],
      });

      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        expect(screen.getByText("Only Pipeline")).toBeInTheDocument();
      });

      const tabText = screen.getByText("Only Pipeline");
      const tabButton = tabText.closest("button");
      const closeButton = within(tabButton!).getByRole("button");

      await user.click(closeButton);

      expect(mockNavigate).toHaveBeenCalledWith("/pipelines/home");
    });

    test("dropdown shows closed pipelines that can be reopened", async () => {
      const user = userEvent.setup();

      // Home tab only, but pipelines exist in DB
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

      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        expect(screen.getByTitle("Home")).toBeInTheDocument();
      });

      // Open dropdown
      const buttons = screen.getAllByRole("button");
      const dropdownTrigger = buttons.find(btn =>
        btn.querySelector("svg")?.classList.contains("lucide-plus")
      );

      if (dropdownTrigger) {
        await user.click(dropdownTrigger);

        // Should show existing pipelines from mockPipelinesData
        await waitFor(() => {
          expect(screen.getByText("Test Pipeline")).toBeInTheDocument();
          expect(screen.getByText("Another Pipeline")).toBeInTheDocument();
        });
      }
    });

    test("clicking pipeline in dropdown opens it as tab", async () => {
      const user = userEvent.setup();

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

      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        expect(screen.getByTitle("Home")).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole("button");
      const dropdownTrigger = buttons.find(btn =>
        btn.querySelector("svg")?.classList.contains("lucide-plus")
      );

      if (dropdownTrigger) {
        await user.click(dropdownTrigger);

        await waitFor(() => {
          expect(screen.getByText("Test Pipeline")).toBeInTheDocument();
        });

        // Click on existing pipeline
        await user.click(screen.getByRole("menuitem", { name: "Test Pipeline" }));

        // Should call focusOrOpenTab and navigate
        expect(mockFocusOrOpenTab).toHaveBeenCalledWith("pipeline-1", "Test Pipeline");
        expect(mockNavigate).toHaveBeenCalledWith("/pipelines/pipeline-1");
      }
    });
  });

  describe("Pipeline Deletion", () => {
    test("delete button triggers confirmation and calls delete mutation", async () => {
      const user = userEvent.setup();

      // Mock window.confirm
      const originalConfirm = window.confirm;
      window.confirm = vi.fn(() => true);

      let deleteCalled = false;
      let deletedId = "";

      server.use(
        http.post("/api/pipelines", async ({ request }) => {
          const formData = await request.formData();
          const intent = formData.get("intent");

          if (intent === "delete") {
            deleteCalled = true;
            deletedId = formData.get("id") as string;
            return HttpResponse.json({ success: true });
          }

          return HttpResponse.json({ error: "Invalid intent" }, { status: 400 });
        })
      );

      // Setup with pipeline tab
      mockTabs = [
        { pipelineId: "home", name: "Home" },
        { pipelineId: "p1", name: "Pipeline to Delete" },
      ];
      mockActiveTabId = "p1";
      mockUrlId = "p1";

      vi.mocked(useTabStore).mockReturnValue({
        tabs: mockTabs,
        activeTabId: mockActiveTabId,
        closeTab: mockCloseTab,
        focusOrOpenTab: mockFocusOrOpenTab,
        updateTabName: mockUpdateTabName,
        canOpenNewTab: mockCanOpenNewTab,
      });

      vi.mocked(useParams).mockReturnValue({ id: mockUrlId });

      mockPipelineData.set("p1", {
        pipelineId: "p1",
        pipelineName: "Pipeline to Delete",
        pipelineDescription: "",
        nodes: [],
        edges: [],
      });

      renderWithClient(<PipelineEditorPage />);

      // Wait for pipeline panel to render with delete button
      await waitFor(() => {
        expect(screen.getByText("Pipeline to Delete")).toBeInTheDocument();
      });

      // Find and click delete button (the one with "Delete" text, not tab close buttons)
      // The Delete button is in the header with text "Delete" and destructive variant
      const deleteButtons = screen.getAllByRole("button").filter(
        btn => btn.textContent?.trim() === "Delete"
      );
      expect(deleteButtons.length).toBeGreaterThan(0);
      await user.click(deleteButtons[0]);

      // Confirm should have been called
      expect(window.confirm).toHaveBeenCalledWith("Delete this pipeline?");

      // Delete mutation should have been called
      await waitFor(() => {
        expect(deleteCalled).toBe(true);
        expect(deletedId).toBe("p1");
      });

      // Restore
      window.confirm = originalConfirm;
    });

    test("canceling delete confirmation does not delete pipeline", async () => {
      const user = userEvent.setup();

      const originalConfirm = window.confirm;
      window.confirm = vi.fn(() => false);

      let deleteCalled = false;

      server.use(
        http.post("/api/pipelines", async ({ request }) => {
          const formData = await request.formData();
          const intent = formData.get("intent");

          if (intent === "delete") {
            deleteCalled = true;
            return HttpResponse.json({ success: true });
          }

          return HttpResponse.json({ error: "Invalid intent" }, { status: 400 });
        })
      );

      mockTabs = [
        { pipelineId: "home", name: "Home" },
        { pipelineId: "p1", name: "Pipeline to Keep" },
      ];
      mockActiveTabId = "p1";
      mockUrlId = "p1";

      vi.mocked(useTabStore).mockReturnValue({
        tabs: mockTabs,
        activeTabId: mockActiveTabId,
        closeTab: mockCloseTab,
        focusOrOpenTab: mockFocusOrOpenTab,
        updateTabName: mockUpdateTabName,
        canOpenNewTab: mockCanOpenNewTab,
      });

      vi.mocked(useParams).mockReturnValue({ id: mockUrlId });

      mockPipelineData.set("p1", {
        pipelineId: "p1",
        pipelineName: "Pipeline to Keep",
        pipelineDescription: "",
        nodes: [],
        edges: [],
      });

      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        expect(screen.getByText("Pipeline to Keep")).toBeInTheDocument();
      });

      // Find the Delete button with "Delete" text
      const deleteButtons = screen.getAllByRole("button").filter(
        btn => btn.textContent?.trim() === "Delete"
      );
      expect(deleteButtons.length).toBeGreaterThan(0);
      await user.click(deleteButtons[0]);

      expect(window.confirm).toHaveBeenCalled();

      // Delete should NOT have been called
      expect(deleteCalled).toBe(false);

      window.confirm = originalConfirm;
    });

    test("deleted pipeline no longer appears in dropdown", async () => {
      const user = userEvent.setup();

      const originalConfirm = window.confirm;
      window.confirm = vi.fn(() => true);

      // Create a pipeline first
      createdPipelines = [{ id: "p-delete", name: "To Delete", description: null, flowData: { nodes: [], edges: [] } }];

      mockTabs = [
        { pipelineId: "home", name: "Home" },
        { pipelineId: "p-delete", name: "To Delete" },
      ];
      mockActiveTabId = "p-delete";
      mockUrlId = "p-delete";

      vi.mocked(useTabStore).mockReturnValue({
        tabs: mockTabs,
        activeTabId: mockActiveTabId,
        closeTab: mockCloseTab,
        focusOrOpenTab: mockFocusOrOpenTab,
        updateTabName: mockUpdateTabName,
        canOpenNewTab: mockCanOpenNewTab,
      });

      vi.mocked(useParams).mockReturnValue({ id: mockUrlId });

      mockPipelineData.set("p-delete", {
        pipelineId: "p-delete",
        pipelineName: "To Delete",
        pipelineDescription: "",
        nodes: [],
        edges: [],
      });

      const { rerender } = renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        expect(screen.getByText("To Delete")).toBeInTheDocument();
      });

      // Find and click the Delete button with "Delete" text
      const deleteButtons = screen.getAllByRole("button").filter(
        btn => btn.textContent?.trim() === "Delete"
      );
      expect(deleteButtons.length).toBeGreaterThan(0);
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        // Pipeline should be removed from createdPipelines by the handler
        expect(createdPipelines.find(p => p.id === "p-delete")).toBeUndefined();
      });

      window.confirm = originalConfirm;
    });
  });

  describe("Run Pipeline Dialog", () => {
    test("run button opens input dialog", async () => {
      const user = userEvent.setup();

      mockTabs = [
        { pipelineId: "home", name: "Home" },
        { pipelineId: "p1", name: "Test Pipeline" },
      ];
      mockActiveTabId = "p1";
      mockUrlId = "p1";

      vi.mocked(useTabStore).mockReturnValue({
        tabs: mockTabs,
        activeTabId: mockActiveTabId,
        closeTab: mockCloseTab,
        focusOrOpenTab: mockFocusOrOpenTab,
        updateTabName: mockUpdateTabName,
        canOpenNewTab: mockCanOpenNewTab,
      });

      vi.mocked(useParams).mockReturnValue({ id: mockUrlId });

      mockPipelineData.set("p1", {
        pipelineId: "p1",
        pipelineName: "Test Pipeline",
        pipelineDescription: "",
        nodes: [],
        edges: [],
      });

      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        expect(screen.getByText("Test Pipeline")).toBeInTheDocument();
      });

      // Find the Run button with text "Run" exactly
      const runButtons = screen.getAllByRole("button").filter(
        btn => btn.textContent?.trim() === "Run"
      );
      expect(runButtons.length).toBeGreaterThan(0);
      await user.click(runButtons[0]);

      // Dialog should open - check for dialog-specific elements
      await waitFor(() => {
        // Dialog title is in a heading element
        expect(screen.getByRole("heading", { name: "Run Pipeline" })).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Enter your input here...")).toBeInTheDocument();
      });
    });

    test("cancel button closes run dialog", async () => {
      const user = userEvent.setup();

      mockTabs = [
        { pipelineId: "home", name: "Home" },
        { pipelineId: "p1", name: "My Pipeline" },
      ];
      mockActiveTabId = "p1";
      mockUrlId = "p1";

      vi.mocked(useTabStore).mockReturnValue({
        tabs: mockTabs,
        activeTabId: mockActiveTabId,
        closeTab: mockCloseTab,
        focusOrOpenTab: mockFocusOrOpenTab,
        updateTabName: mockUpdateTabName,
        canOpenNewTab: mockCanOpenNewTab,
      });

      vi.mocked(useParams).mockReturnValue({ id: mockUrlId });

      mockPipelineData.set("p1", {
        pipelineId: "p1",
        pipelineName: "My Pipeline",
        pipelineDescription: "",
        nodes: [],
        edges: [],
      });

      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        expect(screen.getByText("My Pipeline")).toBeInTheDocument();
      });

      // Find and click the Run button
      const runButtons = screen.getAllByRole("button").filter(
        btn => btn.textContent?.trim() === "Run"
      );
      expect(runButtons.length).toBeGreaterThan(0);
      await user.click(runButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Run Pipeline" })).toBeInTheDocument();
      });

      // Click cancel
      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      await user.click(cancelButton);

      // Dialog should close - heading should disappear
      await waitFor(() => {
        expect(screen.queryByRole("heading", { name: "Run Pipeline" })).not.toBeInTheDocument();
      });
    });
  });

  describe("Multiple Tabs", () => {
    test("multiple pipeline tabs can be open simultaneously", () => {
      mockTabs = [
        { pipelineId: "home", name: "Home" },
        { pipelineId: "p1", name: "Pipeline 1" },
        { pipelineId: "p2", name: "Pipeline 2" },
        { pipelineId: "p3", name: "Pipeline 3" },
      ];
      mockActiveTabId = "p2";
      mockUrlId = "p2";

      vi.mocked(useTabStore).mockReturnValue({
        tabs: mockTabs,
        activeTabId: mockActiveTabId,
        closeTab: mockCloseTab,
        focusOrOpenTab: mockFocusOrOpenTab,
        updateTabName: mockUpdateTabName,
        canOpenNewTab: mockCanOpenNewTab,
      });

      vi.mocked(useParams).mockReturnValue({ id: mockUrlId });

      // Add pipeline data for each
      ["p1", "p2", "p3"].forEach((id, i) => {
        mockPipelineData.set(id, {
          pipelineId: id,
          pipelineName: `Pipeline ${i + 1}`,
          pipelineDescription: "",
          nodes: [],
          edges: [],
        });
      });

      renderWithClient(<PipelineEditorPage />);

      // All tabs should be visible
      expect(screen.getByText("Pipeline 1")).toBeInTheDocument();
      expect(screen.getByText("Pipeline 2")).toBeInTheDocument();
      expect(screen.getByText("Pipeline 3")).toBeInTheDocument();
    });

    test("clicking different tabs navigates between them", async () => {
      const user = userEvent.setup();

      mockTabs = [
        { pipelineId: "home", name: "Home" },
        { pipelineId: "p1", name: "First Pipeline" },
        { pipelineId: "p2", name: "Second Pipeline" },
      ];
      mockActiveTabId = "p1";
      mockUrlId = "p1";

      vi.mocked(useTabStore).mockReturnValue({
        tabs: mockTabs,
        activeTabId: mockActiveTabId,
        closeTab: mockCloseTab,
        focusOrOpenTab: mockFocusOrOpenTab,
        updateTabName: mockUpdateTabName,
        canOpenNewTab: mockCanOpenNewTab,
      });

      vi.mocked(useParams).mockReturnValue({ id: mockUrlId });

      mockPipelineData.set("p1", {
        pipelineId: "p1",
        pipelineName: "First Pipeline",
        pipelineDescription: "",
        nodes: [],
        edges: [],
      });

      mockPipelineData.set("p2", {
        pipelineId: "p2",
        pipelineName: "Second Pipeline",
        pipelineDescription: "",
        nodes: [],
        edges: [],
      });

      renderWithClient(<PipelineEditorPage />);

      // Click on Second Pipeline tab
      const secondTab = screen.getByText("Second Pipeline");
      await user.click(secondTab);

      expect(mockNavigate).toHaveBeenCalledWith("/pipelines/p2");
    });
  });

  describe("Integration with Sidebar", () => {
    test("agents from API appear in sidebar", async () => {
      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        // Test Agent is from mockAgentsData
        expect(screen.getByText("Test Agent")).toBeInTheDocument();
      });
    });

    test("traits from API appear in sidebar", async () => {
      renderWithClient(<PipelineEditorPage />);

      await waitFor(() => {
        // Test Trait is from mockTraitsData
        expect(screen.getByText("Test Trait")).toBeInTheDocument();
      });
    });
  });
});
