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
import PipelinesPage from "./pipelines";

// Keep track of created pipelines for mock state
let createdPipelines: Array<{ id: string; name: string; flowData: unknown }> = [];
let nextPipelineId = 1;

// Mock tab state - mutable for tests to modify (via React Query hooks)
let mockTabs = [{ pipelineId: "home", name: "Home" }];
let mockActiveTabId: string | null = "home";
const mockCloseTabMutate = vi.fn();
const mockFocusOrOpenTabMutate = vi.fn();
const mockUpdateTabNameMutate = vi.fn();
const mockSetActiveTabMutate = vi.fn();
const mockOpenTabMutate = vi.fn();

// Mock pipeline data for usePipelineFlow hook
let mockPipelineData: Map<string, {
  pipelineId: string;
  pipelineName: string;
  nodes: unknown[];
  edges: unknown[];
}> = new Map();
const mockUpdatePipeline = vi.fn();

// Mock React Query tab hooks
vi.mock("~/hooks/queries/use-tabs", () => ({
  useTabsQuery: vi.fn(() => ({
    data: { tabs: mockTabs, activeTabId: mockActiveTabId },
    isLoading: false,
    isPending: false,
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
    mutate: mockOpenTabMutate,
    isPending: false,
  })),
  canOpenNewTab: vi.fn((tabs: Array<{ pipelineId: string }>) => {
    const nonHomeTabs = tabs.filter((t) => t.pipelineId !== "home");
    return nonHomeTabs.length < 8;
  }),
  HOME_TAB_ID: "home",
}));

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
  MarkerType: { ArrowClosed: "arrowclosed" },
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
import { useTabsQuery } from "~/hooks/queries/use-tabs";

describe("PipelinesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset state
    createdPipelines = [];
    nextPipelineId = 1;
    mockTabs = [{ pipelineId: "home", name: "Home" }];
    mockActiveTabId = "home";
    mockPipelineData = new Map();

    // Reset mocks
    vi.mocked(useTabsQuery).mockReturnValue({
      data: { tabs: mockTabs, activeTabId: mockActiveTabId },
      isLoading: false,
      isPending: false,
    } as ReturnType<typeof useTabsQuery>);

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
            flowData: { nodes: [], edges: [] },
          },
        });
      }),

      http.post("/api/pipelines", async ({ request }) => {
        const formData = await request.formData();
        const intent = formData.get("intent");

        if (intent === "create") {
          // Use client-provided ID if available, else generate one
          const id = (formData.get("id") as string) || `pipeline-${nextPipelineId++}`;
          const name = (formData.get("name") as string) || "Untitled Pipeline";
          const flowData = formData.get("flowData") as string;

          const newPipeline = {
            id,
            name,
            flowData: flowData ? JSON.parse(flowData) : { nodes: [], edges: [] },
          };
          createdPipelines.push(newPipeline);

          return HttpResponse.json({ pipeline: newPipeline });
        }

        if (intent === "update") {
          const id = formData.get("id") as string;
          const name = formData.get("name") as string;
          const flowData = formData.get("flowData") as string;

          // Update if exists
          const idx = createdPipelines.findIndex(p => p.id === id);
          if (idx !== -1) {
            createdPipelines[idx] = {
              ...createdPipelines[idx],
              name,
              flowData: flowData ? JSON.parse(flowData) : createdPipelines[idx].flowData,
            };
          }

          return HttpResponse.json({
            pipeline: {
              id,
              name,
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
  // BASIC RENDERING TESTS
  // ============================================

  test("renders pipeline tabs component", async () => {
    renderWithClient(<PipelinesPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Select a pipeline or create new")
      ).toBeInTheDocument();
    });
  });

  test("renders agent sidebar", async () => {
    renderWithClient(<PipelinesPage />);

    await waitFor(() => {
      expect(screen.getByText("Test Agent")).toBeInTheDocument();
    });
  });

  test("shows home tab empty state when home tab is active", async () => {
    renderWithClient(<PipelinesPage />);

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

    renderWithClient(<PipelinesPage />);

    // While data is loading, a centered loader should be shown (not the main UI)
    expect(screen.queryByTestId("react-flow")).not.toBeInTheDocument();

    // After data loads, the UI should appear
    await waitFor(
      () => {
        expect(screen.getByText("Test Agent")).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  test("shows loading state while fetching pipeline data, then renders panel", async () => {
    // Setup: viewing an existing pipeline (not in cache yet, needs to load from server)
    mockTabs = [
      { pipelineId: "home", name: "Home" },
      { pipelineId: "existing-pipeline", name: "Loading..." },
    ];
    mockActiveTabId = "existing-pipeline";

    vi.mocked(useTabsQuery).mockReturnValue({
      data: { tabs: mockTabs, activeTabId: mockActiveTabId },
      isLoading: false,
      isPending: false,
    } as ReturnType<typeof useTabsQuery>);

    // Pipeline NOT in cache - this simulates first load
    // The server will return the pipeline with a specific name
    server.use(
      http.get("/api/pipelines/:id", async ({ params }) => {
        // Add delay to simulate network latency
        await new Promise((resolve) => setTimeout(resolve, 50));
        return HttpResponse.json({
          pipeline: {
            id: params.id,
            name: "My Saved Pipeline",
            flowData: { nodes: [], edges: [] },
          },
        });
      })
    );

    renderWithClient(<PipelinesPage />);

    // Initially should show loading state (pipeline not in cache, query pending)
    await waitFor(() => {
      expect(screen.getByText("Loading pipeline...")).toBeInTheDocument();
    });

    // After data loads, should show the pipeline panel (name input present)
    await waitFor(
      () => {
        const nameInput = screen.getByPlaceholderText("Pipeline name");
        expect(nameInput).toBeInTheDocument();
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

    renderWithClient(<PipelinesPage />);

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
      renderWithClient(<PipelinesPage />);

      // Home tab should be in the tabs
      expect(mockTabs).toContainEqual({ pipelineId: "home", name: "Home" });
      expect(mockActiveTabId).toBe("home");
    });

    test("canvas shows empty state message when no pipeline selected", async () => {
      renderWithClient(<PipelinesPage />);

      await waitFor(() => {
        expect(
          screen.getByText("Select a pipeline or create new")
        ).toBeInTheDocument();
      });
    });

    test("sidebar shows 'Your Agents' section", async () => {
      renderWithClient(<PipelinesPage />);

      await waitFor(() => {
        expect(screen.getByText("Test Agent")).toBeInTheDocument();
      });
    });

    test("sidebar shows traits section", async () => {
      renderWithClient(<PipelinesPage />);

      await waitFor(() => {
        expect(screen.getByText("Test Trait")).toBeInTheDocument();
      });
    });
  });

  describe("Creating First Pipeline", () => {
    test("clicking New Pipeline in dropdown creates new pipeline and opens tab", async () => {
      const user = userEvent.setup();

      // Mock empty pipelines list initially
      server.use(
        http.get("/api/pipelines", () => {
          return HttpResponse.json({ pipelines: createdPipelines.map(p => ({ id: p.id, name: p.name })) });
        })
      );

      renderWithClient(<PipelinesPage />);

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

        // Verify openTab mutation was called (tab state is the source of truth)
        // Client generates UUID, so expect a UUID pattern
        await waitFor(() => {
          expect(mockOpenTabMutate).toHaveBeenCalledWith(
            expect.objectContaining({
              pipelineId: expect.stringMatching(
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
              ),
              name: "Untitled Pipeline",
            })
          );
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
              pipeline: { id: "new-pipeline-123", name, flowData: { nodes: [], edges: [] } }
            });
          }
          return HttpResponse.json({ error: "Invalid intent" }, { status: 400 });
        }),
        http.get("/api/pipelines", () => {
          return HttpResponse.json({ pipelines: [] });
        })
      );

      renderWithClient(<PipelinesPage />);

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
    test("closing a pipeline tab calls closeTab mutation", async () => {
      const user = userEvent.setup();

      // Setup with an open pipeline tab
      mockTabs = [
        { pipelineId: "home", name: "Home" },
        { pipelineId: "p1", name: "Test Pipeline" },
      ];
      mockActiveTabId = "p1";

      vi.mocked(useTabsQuery).mockReturnValue({
        data: { tabs: mockTabs, activeTabId: mockActiveTabId },
        isLoading: false,
        isPending: false,
      } as ReturnType<typeof useTabsQuery>);

      // Mock pipeline data in store
      mockPipelineData.set("p1", {
        pipelineId: "p1",
        pipelineName: "Test Pipeline",
        nodes: [],
        edges: [],
      });

      renderWithClient(<PipelinesPage />);

      // Wait for tab to render
      await waitFor(() => {
        expect(screen.getByText("Test Pipeline")).toBeInTheDocument();
      });

      // Find close button on the tab (tab is now a div with role="button")
      const tabText = screen.getByText("Test Pipeline");
      const tabButton = tabText.closest('[role="button"]');
      const closeButton = within(tabButton as HTMLElement).getByRole("button");

      await user.click(closeButton);

      // closeTab should be called
      expect(mockCloseTabMutate).toHaveBeenCalledWith("p1");
    });

    test("dropdown shows closed pipelines that can be reopened", async () => {
      const user = userEvent.setup();

      // Home tab only, but pipelines exist in DB
      mockTabs = [{ pipelineId: "home", name: "Home" }];
      mockActiveTabId = "home";

      vi.mocked(useTabsQuery).mockReturnValue({
        data: { tabs: mockTabs, activeTabId: mockActiveTabId },
        isLoading: false,
        isPending: false,
      } as ReturnType<typeof useTabsQuery>);

      renderWithClient(<PipelinesPage />);

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

    test("clicking pipeline in dropdown opens it as tab via focusOrOpenTab mutation", async () => {
      const user = userEvent.setup();

      mockTabs = [{ pipelineId: "home", name: "Home" }];
      mockActiveTabId = "home";

      vi.mocked(useTabsQuery).mockReturnValue({
        data: { tabs: mockTabs, activeTabId: mockActiveTabId },
        isLoading: false,
        isPending: false,
      } as ReturnType<typeof useTabsQuery>);

      renderWithClient(<PipelinesPage />);

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

        // Should call focusOrOpenTab (no navigate - tab state is source of truth)
        expect(mockFocusOrOpenTabMutate).toHaveBeenCalledWith({ pipelineId: "pipeline-1", name: "Test Pipeline" });
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

      vi.mocked(useTabsQuery).mockReturnValue({
        data: { tabs: mockTabs, activeTabId: mockActiveTabId },
        isLoading: false,
        isPending: false,
      } as ReturnType<typeof useTabsQuery>);

      mockPipelineData.set("p1", {
        pipelineId: "p1",
        pipelineName: "Pipeline to Delete",
        nodes: [],
        edges: [],
      });

      renderWithClient(<PipelinesPage />);

      // Wait for pipeline to load and panel to render (name input indicates loading complete)
      await waitFor(() => {
        expect(screen.getByPlaceholderText("Pipeline name")).toBeInTheDocument();
      });

      // Find and click delete button (the one with "Delete" text, not tab close buttons)
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

      vi.mocked(useTabsQuery).mockReturnValue({
        data: { tabs: mockTabs, activeTabId: mockActiveTabId },
        isLoading: false,
        isPending: false,
      } as ReturnType<typeof useTabsQuery>);

      mockPipelineData.set("p1", {
        pipelineId: "p1",
        pipelineName: "Pipeline to Keep",
        nodes: [],
        edges: [],
      });

      renderWithClient(<PipelinesPage />);

      // Wait for pipeline to load (name input indicates loading complete)
      await waitFor(() => {
        expect(screen.getByPlaceholderText("Pipeline name")).toBeInTheDocument();
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
      createdPipelines = [{ id: "p-delete", name: "To Delete", flowData: { nodes: [], edges: [] } }];

      mockTabs = [
        { pipelineId: "home", name: "Home" },
        { pipelineId: "p-delete", name: "To Delete" },
      ];
      mockActiveTabId = "p-delete";

      vi.mocked(useTabsQuery).mockReturnValue({
        data: { tabs: mockTabs, activeTabId: mockActiveTabId },
        isLoading: false,
        isPending: false,
      } as ReturnType<typeof useTabsQuery>);

      mockPipelineData.set("p-delete", {
        pipelineId: "p-delete",
        pipelineName: "To Delete",
        nodes: [],
        edges: [],
      });

      renderWithClient(<PipelinesPage />);

      // Wait for pipeline to load (name input indicates loading complete)
      await waitFor(() => {
        expect(screen.getByPlaceholderText("Pipeline name")).toBeInTheDocument();
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

      vi.mocked(useTabsQuery).mockReturnValue({
        data: { tabs: mockTabs, activeTabId: mockActiveTabId },
        isLoading: false,
        isPending: false,
      } as ReturnType<typeof useTabsQuery>);

      mockPipelineData.set("p1", {
        pipelineId: "p1",
        pipelineName: "Test Pipeline",
        nodes: [],
        edges: [],
      });

      renderWithClient(<PipelinesPage />);

      // Wait for pipeline to load (name input indicates loading complete)
      await waitFor(() => {
        expect(screen.getByPlaceholderText("Pipeline name")).toBeInTheDocument();
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

      vi.mocked(useTabsQuery).mockReturnValue({
        data: { tabs: mockTabs, activeTabId: mockActiveTabId },
        isLoading: false,
        isPending: false,
      } as ReturnType<typeof useTabsQuery>);

      mockPipelineData.set("p1", {
        pipelineId: "p1",
        pipelineName: "My Pipeline",
        nodes: [],
        edges: [],
      });

      renderWithClient(<PipelinesPage />);

      // Wait for pipeline to load (name input indicates loading complete)
      await waitFor(() => {
        expect(screen.getByPlaceholderText("Pipeline name")).toBeInTheDocument();
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
    test("multiple pipeline tabs can be open simultaneously", async () => {
      mockTabs = [
        { pipelineId: "home", name: "Home" },
        { pipelineId: "p1", name: "Pipeline 1" },
        { pipelineId: "p2", name: "Pipeline 2" },
        { pipelineId: "p3", name: "Pipeline 3" },
      ];
      mockActiveTabId = "p2";

      vi.mocked(useTabsQuery).mockReturnValue({
        data: { tabs: mockTabs, activeTabId: mockActiveTabId },
        isLoading: false,
        isPending: false,
      } as ReturnType<typeof useTabsQuery>);

      // Add pipeline data for each
      ["p1", "p2", "p3"].forEach((id, i) => {
        mockPipelineData.set(id, {
          pipelineId: id,
          pipelineName: `Pipeline ${i + 1}`,
          nodes: [],
          edges: [],
        });
      });

      renderWithClient(<PipelinesPage />);

      // Wait for initial data to load, then check tabs are visible
      await waitFor(() => {
        expect(screen.getByText("Pipeline 1")).toBeInTheDocument();
      });
      expect(screen.getByText("Pipeline 2")).toBeInTheDocument();
      expect(screen.getByText("Pipeline 3")).toBeInTheDocument();
    });

    test("clicking different tabs switches active tab via setActiveTab mutation", async () => {
      const user = userEvent.setup();

      mockTabs = [
        { pipelineId: "home", name: "Home" },
        { pipelineId: "p1", name: "First Pipeline" },
        { pipelineId: "p2", name: "Second Pipeline" },
      ];
      mockActiveTabId = "p1";

      vi.mocked(useTabsQuery).mockReturnValue({
        data: { tabs: mockTabs, activeTabId: mockActiveTabId },
        isLoading: false,
        isPending: false,
      } as ReturnType<typeof useTabsQuery>);

      mockPipelineData.set("p1", {
        pipelineId: "p1",
        pipelineName: "First Pipeline",
        nodes: [],
        edges: [],
      });

      mockPipelineData.set("p2", {
        pipelineId: "p2",
        pipelineName: "Second Pipeline",
        nodes: [],
        edges: [],
      });

      renderWithClient(<PipelinesPage />);

      // Wait for initial data to load, then click on Second Pipeline tab
      const secondTab = await screen.findByText("Second Pipeline");
      await user.click(secondTab);

      // Should call setActiveTab mutation (no navigation)
      expect(mockSetActiveTabMutate).toHaveBeenCalledWith("p2");
    });
  });

  describe("Integration with Sidebar", () => {
    test("agents from API appear in sidebar", async () => {
      renderWithClient(<PipelinesPage />);

      await waitFor(() => {
        // Test Agent is from mockAgentsData
        expect(screen.getByText("Test Agent")).toBeInTheDocument();
      });
    });

    test("traits from API appear in sidebar", async () => {
      renderWithClient(<PipelinesPage />);

      await waitFor(() => {
        // Test Trait is from mockTraitsData
        expect(screen.getByText("Test Trait")).toBeInTheDocument();
      });
    });
  });
});
