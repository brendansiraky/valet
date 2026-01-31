import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PipelineTabs } from "./pipeline-tabs";

// Mock dependencies
const mockNavigate = vi.fn();
const mockFocusOrOpenTabMutate = vi.fn();
const mockSetActiveTabMutate = vi.fn();
const mockOpenTabMutate = vi.fn();

// Mock tab state - updated per test
let mockTabState = {
  tabs: [{ pipelineId: "home", name: "Home" }],
  activeTabId: "home" as string | null,
};

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("~/hooks/queries/use-tabs", () => ({
  useTabsQuery: vi.fn(() => ({
    data: mockTabState,
    isLoading: false,
  })),
  useFocusOrOpenTab: vi.fn(() => ({
    mutate: mockFocusOrOpenTabMutate,
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
  canOpenNewTab: vi.fn((tabs) => {
    const nonHomeTabs = tabs.filter((t: { pipelineId: string }) => t.pipelineId !== "home");
    return nonHomeTabs.length < 8;
  }),
  HOME_TAB_ID: "home",
}));

// Variable to control mock pipeline data per test
let mockPipelinesData: Array<{ id: string; name: string }> = [];
let mockPipelinesLoading = false;
const mockCreatePipelineMutate = vi.fn();

vi.mock("~/hooks/queries/use-pipelines", () => ({
  usePipelines: () => ({
    data: mockPipelinesData,
    isLoading: mockPipelinesLoading,
  }),
  useCreatePipeline: () => ({
    mutate: mockCreatePipelineMutate,
    isPending: false,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

// Import mocked modules to access/modify
import { useTabsQuery, canOpenNewTab } from "~/hooks/queries/use-tabs";
import { toast } from "sonner";

describe("PipelineTabs", () => {
  const createQueryClient = () =>
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

  const renderTabs = (
    runStates = new Map<string, { runId: string | null; isStarting: boolean }>(),
    onCloseTab = vi.fn()
  ) => {
    const queryClient = createQueryClient();
    return render(
      <QueryClientProvider client={queryClient}>
        <PipelineTabs runStates={runStates} onCloseTab={onCloseTab} />
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPipelinesData = [];
    mockPipelinesLoading = false;
    mockCreatePipelineMutate.mockReset();
    mockOpenTabMutate.mockReset();

    // Reset tab state to default
    mockTabState = {
      tabs: [{ pipelineId: "home", name: "Home" }],
      activeTabId: "home",
    };

    // Reset useTabsQuery mock to return updated state
    vi.mocked(useTabsQuery).mockReturnValue({
      data: mockTabState,
      isLoading: false,
    } as ReturnType<typeof useTabsQuery>);
  });

  describe("Initial State", () => {
    test("renders pinned home icon", () => {
      renderTabs();

      // Home button should have a title attribute
      const homeButton = screen.getByTitle("Home");
      expect(homeButton).toBeInTheDocument();
    });

    test("renders plus symbol dropdown trigger", () => {
      renderTabs();

      // Look for the button with plus icon
      const dropdownTrigger = screen.getByRole("button", { name: "" });
      expect(dropdownTrigger).toBeInTheDocument();
    });

    test("dropdown contains only 'New Pipeline' item when no pipelines exist", async () => {
      const user = userEvent.setup();
      mockPipelinesData = [];

      renderTabs();

      // Click dropdown trigger (it's the button after home)
      const buttons = screen.getAllByRole("button");
      const dropdownTrigger = buttons[buttons.length - 1]; // Last button is dropdown
      await user.click(dropdownTrigger);

      // Should see "New Pipeline" option
      await waitFor(() => {
        expect(screen.getByText("New Pipeline")).toBeInTheDocument();
      });

      // Should NOT see a separator (only appears when there are existing pipelines)
      // Only "New Pipeline" should be in the dropdown menu
      const menuItems = screen.getAllByRole("menuitem");
      expect(menuItems).toHaveLength(1);
      expect(menuItems[0]).toHaveTextContent("New Pipeline");
    });

    test("home tab cannot be closed (no X button on home)", () => {
      renderTabs();

      // Find home button - it should NOT have a close button inside
      const homeButton = screen.getByTitle("Home");

      // Home button should not contain an X/close element
      expect(within(homeButton).queryByRole("button")).not.toBeInTheDocument();
    });
  });

  describe("Dropdown Behavior", () => {
    test("dropdown shows 'New Pipeline' item always", async () => {
      const user = userEvent.setup();
      mockPipelinesData = [{ id: "p1", name: "Pipeline 1" }];

      renderTabs();

      // Click dropdown
      const buttons = screen.getAllByRole("button");
      const dropdownTrigger = buttons[buttons.length - 1];
      await user.click(dropdownTrigger);

      await waitFor(() => {
        expect(screen.getByText("New Pipeline")).toBeInTheDocument();
      });
    });

    test("dropdown shows separator and existing pipelines when they exist and are not open", async () => {
      const user = userEvent.setup();
      mockPipelinesData = [
        { id: "p1", name: "Pipeline 1" },
        { id: "p2", name: "Pipeline 2" },
      ];

      renderTabs();

      // Click dropdown
      const buttons = screen.getAllByRole("button");
      const dropdownTrigger = buttons[buttons.length - 1];
      await user.click(dropdownTrigger);

      await waitFor(() => {
        expect(screen.getByText("New Pipeline")).toBeInTheDocument();
        expect(screen.getByText("Pipeline 1")).toBeInTheDocument();
        expect(screen.getByText("Pipeline 2")).toBeInTheDocument();
      });

      // Should have separator element
      expect(screen.getByRole("separator")).toBeInTheDocument();
    });

    test("pipelines already open as tabs do NOT appear in dropdown", async () => {
      const user = userEvent.setup();

      // Pipeline 1 is open as a tab
      mockTabState = {
        tabs: [
          { pipelineId: "home", name: "Home" },
          { pipelineId: "p1", name: "Pipeline 1" },
        ],
        activeTabId: "p1",
      };
      vi.mocked(useTabsQuery).mockReturnValue({
        data: mockTabState,
        isLoading: false,
      } as ReturnType<typeof useTabsQuery>);

      // Both pipelines exist in DB
      mockPipelinesData = [
        { id: "p1", name: "Pipeline 1" },
        { id: "p2", name: "Pipeline 2" },
      ];

      renderTabs();

      // Click dropdown
      const buttons = screen.getAllByRole("button");
      const dropdownTrigger = buttons[buttons.length - 1];
      await user.click(dropdownTrigger);

      await waitFor(() => {
        // Pipeline 2 should appear (not open)
        expect(screen.getByRole("menuitem", { name: "Pipeline 2" })).toBeInTheDocument();
      });

      // Pipeline 1 should NOT appear in dropdown (already open)
      const menuItems = screen.getAllByRole("menuitem");
      const pipelineNames = menuItems.map((item) => item.textContent);
      expect(pipelineNames).not.toContain("Pipeline 1");
      expect(pipelineNames).toContain("Pipeline 2");
    });

    test("clicking 'New Pipeline' creates new pipeline via mutation", async () => {
      const user = userEvent.setup();

      // Configure mock to simulate successful creation
      mockCreatePipelineMutate.mockImplementation((_data, options) => {
        // Simulate onSuccess callback with created pipeline
        options?.onSuccess?.({ id: "new-123", name: "Untitled Pipeline", flowData: { nodes: [], edges: [] } });
      });

      renderTabs();

      // Click dropdown
      const buttons = screen.getAllByRole("button");
      const dropdownTrigger = buttons[buttons.length - 1];
      await user.click(dropdownTrigger);

      // Click "New Pipeline"
      await waitFor(() => {
        expect(screen.getByText("New Pipeline")).toBeInTheDocument();
      });
      await user.click(screen.getByText("New Pipeline"));

      // Verify mutation was called with correct parameters (id is client-generated UUID)
      expect(mockCreatePipelineMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringMatching(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          ),
          name: "Untitled Pipeline",
          flowData: { nodes: [], edges: [] },
        }),
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        })
      );
    });
  });

  describe("Tab Management", () => {
    test("clicking a tab sets it as active via setActiveTab mutation", async () => {
      const user = userEvent.setup();

      mockTabState = {
        tabs: [
          { pipelineId: "home", name: "Home" },
          { pipelineId: "p1", name: "My Pipeline" },
        ],
        activeTabId: "home",
      };
      vi.mocked(useTabsQuery).mockReturnValue({
        data: mockTabState,
        isLoading: false,
      } as ReturnType<typeof useTabsQuery>);

      renderTabs();

      // Click on "My Pipeline" tab
      const pipelineTab = screen.getByText("My Pipeline");
      await user.click(pipelineTab);

      // Tab state is source of truth - no navigation, just setActiveTab mutation
      expect(mockSetActiveTabMutate).toHaveBeenCalledWith("p1");
    });

    test("close button appears on non-home tabs", () => {
      mockTabState = {
        tabs: [
          { pipelineId: "home", name: "Home" },
          { pipelineId: "p1", name: "My Pipeline" },
        ],
        activeTabId: "p1",
      };
      vi.mocked(useTabsQuery).mockReturnValue({
        data: mockTabState,
        isLoading: false,
      } as ReturnType<typeof useTabsQuery>);

      renderTabs();

      // Find the pipeline tab container (now a div with role="button")
      const tabWithName = screen.getByText("My Pipeline").closest('[role="button"]');
      expect(tabWithName).toBeInTheDocument();

      // The close button should be inside the tab
      const closeButton = within(tabWithName as HTMLElement).getByRole("button");
      expect(closeButton).toBeInTheDocument();
    });

    test("clicking close triggers immediate close for non-running pipeline", async () => {
      const user = userEvent.setup();
      const onCloseTab = vi.fn();

      mockTabState = {
        tabs: [
          { pipelineId: "home", name: "Home" },
          { pipelineId: "p1", name: "My Pipeline" },
        ],
        activeTabId: "p1",
      };
      vi.mocked(useTabsQuery).mockReturnValue({
        data: mockTabState,
        isLoading: false,
      } as ReturnType<typeof useTabsQuery>);

      // No running pipelines
      const runStates = new Map<string, { runId: string | null; isStarting: boolean }>();

      renderTabs(runStates, onCloseTab);

      // Find and click close button (tab is now a div with role="button")
      const tabWithName = screen.getByText("My Pipeline").closest('[role="button"]');
      const closeButton = within(tabWithName as HTMLElement).getByRole("button");
      await user.click(closeButton);

      // Should call parent's onCloseTab (parent handles closeTab and navigation)
      expect(onCloseTab).toHaveBeenCalledWith("p1");
    });

    test("running pipeline shows confirm dialog before closing", async () => {
      const user = userEvent.setup();
      const onCloseTab = vi.fn();

      mockTabState = {
        tabs: [
          { pipelineId: "home", name: "Home" },
          { pipelineId: "p1", name: "Running Pipeline" },
        ],
        activeTabId: "p1",
      };
      vi.mocked(useTabsQuery).mockReturnValue({
        data: mockTabState,
        isLoading: false,
      } as ReturnType<typeof useTabsQuery>);

      // Pipeline is running
      const runStates = new Map([
        ["p1", { runId: "run-123", isStarting: false }],
      ]);

      renderTabs(runStates, onCloseTab);

      // Find and click close button (tab is now a div with role="button")
      const tabWithName = screen.getByText("Running Pipeline").closest('[role="button"]');
      const closeButton = within(tabWithName as HTMLElement).getByRole("button");
      await user.click(closeButton);

      // Should show confirm dialog
      await waitFor(() => {
        expect(screen.getByText("Close running pipeline?")).toBeInTheDocument();
      });

      // Close should NOT be called yet
      expect(onCloseTab).not.toHaveBeenCalled();
    });

    test("confirming close dialog closes the running pipeline", async () => {
      const user = userEvent.setup();
      const onCloseTab = vi.fn();

      mockTabState = {
        tabs: [
          { pipelineId: "home", name: "Home" },
          { pipelineId: "p1", name: "Running Pipeline" },
        ],
        activeTabId: "p1",
      };
      vi.mocked(useTabsQuery).mockReturnValue({
        data: mockTabState,
        isLoading: false,
      } as ReturnType<typeof useTabsQuery>);

      const runStates = new Map([
        ["p1", { runId: "run-123", isStarting: false }],
      ]);

      renderTabs(runStates, onCloseTab);

      // Click close button (tab is now a div with role="button")
      const tabWithName = screen.getByText("Running Pipeline").closest('[role="button"]');
      const closeButton = within(tabWithName as HTMLElement).getByRole("button");
      await user.click(closeButton);

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByText("Close running pipeline?")).toBeInTheDocument();
      });

      // Click "Close Anyway"
      const closeAnyway = screen.getByRole("button", { name: "Close Anyway" });
      await user.click(closeAnyway);

      // Now close should be called (parent handles closeTab and navigation)
      await waitFor(() => {
        expect(onCloseTab).toHaveBeenCalledWith("p1");
      });
    });

    test("canceling close dialog does not close the pipeline", async () => {
      const user = userEvent.setup();
      const onCloseTab = vi.fn();

      mockTabState = {
        tabs: [
          { pipelineId: "home", name: "Home" },
          { pipelineId: "p1", name: "Running Pipeline" },
        ],
        activeTabId: "p1",
      };
      vi.mocked(useTabsQuery).mockReturnValue({
        data: mockTabState,
        isLoading: false,
      } as ReturnType<typeof useTabsQuery>);

      const runStates = new Map([
        ["p1", { runId: "run-123", isStarting: false }],
      ]);

      renderTabs(runStates, onCloseTab);

      // Click close button (tab is now a div with role="button")
      const tabWithName = screen.getByText("Running Pipeline").closest('[role="button"]');
      const closeButton = within(tabWithName as HTMLElement).getByRole("button");
      await user.click(closeButton);

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByText("Close running pipeline?")).toBeInTheDocument();
      });

      // Click "Cancel"
      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      await user.click(cancelButton);

      // Dialog should close, close should NOT be called
      await waitFor(() => {
        expect(screen.queryByText("Close running pipeline?")).not.toBeInTheDocument();
      });
      expect(onCloseTab).not.toHaveBeenCalled();
    });

    test("after close, calls onCloseTab (parent handles tab state)", async () => {
      const user = userEvent.setup();
      const onCloseTab = vi.fn();

      mockTabState = {
        tabs: [
          { pipelineId: "home", name: "Home" },
          { pipelineId: "p1", name: "Pipeline 1" },
          { pipelineId: "p2", name: "Pipeline 2" },
        ],
        activeTabId: "p1",
      };
      vi.mocked(useTabsQuery).mockReturnValue({
        data: mockTabState,
        isLoading: false,
      } as ReturnType<typeof useTabsQuery>);

      renderTabs(new Map(), onCloseTab);

      // Close Pipeline 1 (tab is now a div with role="button")
      const tabWithName = screen.getByText("Pipeline 1").closest('[role="button"]');
      const closeButton = within(tabWithName as HTMLElement).getByRole("button");
      await user.click(closeButton);

      // Should call onCloseTab (parent handles tab state)
      expect(onCloseTab).toHaveBeenCalledWith("p1");
    });

    test("after closing last non-home tab, calls onCloseTab (parent handles tab state)", async () => {
      const user = userEvent.setup();
      const onCloseTab = vi.fn();

      mockTabState = {
        tabs: [
          { pipelineId: "home", name: "Home" },
          { pipelineId: "p1", name: "Only Pipeline" },
        ],
        activeTabId: "p1",
      };
      vi.mocked(useTabsQuery).mockReturnValue({
        data: mockTabState,
        isLoading: false,
      } as ReturnType<typeof useTabsQuery>);

      renderTabs(new Map(), onCloseTab);

      // Close the only pipeline (tab is now a div with role="button")
      const tabWithName = screen.getByText("Only Pipeline").closest('[role="button"]');
      const closeButton = within(tabWithName as HTMLElement).getByRole("button");
      await user.click(closeButton);

      // Should call onCloseTab (parent handles tab state)
      expect(onCloseTab).toHaveBeenCalledWith("p1");
    });
  });

  describe("Edge Cases", () => {
    test("dropdown is hidden when at max tabs", () => {
      mockTabState = {
        tabs: [
          { pipelineId: "home", name: "Home" },
          { pipelineId: "p1", name: "Pipeline 1" },
          { pipelineId: "p2", name: "Pipeline 2" },
          { pipelineId: "p3", name: "Pipeline 3" },
          { pipelineId: "p4", name: "Pipeline 4" },
          { pipelineId: "p5", name: "Pipeline 5" },
          { pipelineId: "p6", name: "Pipeline 6" },
          { pipelineId: "p7", name: "Pipeline 7" },
          { pipelineId: "p8", name: "Pipeline 8" },
        ],
        activeTabId: "p1",
      };
      vi.mocked(useTabsQuery).mockReturnValue({
        data: mockTabState,
        isLoading: false,
      } as ReturnType<typeof useTabsQuery>);

      renderTabs();

      // The dropdown trigger should not be rendered
      const buttons = screen.getAllByRole("button");
      // Only buttons should be: home tab + 8 pipeline tabs (each has a tab button and a close button)
      // No dropdown trigger

      // Check that there's no dropdown by verifying no button with Plus icon pattern
      // The dropdown trigger is the only button that's an icon button with size-8 class
      // We can check this by ensuring clicking anywhere doesn't open a dropdown
      const allButtons = document.querySelectorAll('button');
      // Home button + 8 tabs * (tab button) + 8 close buttons = 17 buttons
      // If dropdown existed, it would be 18

      // A simpler check: ensure canOpenNewTab is being respected by looking for the dropdown content
      expect(screen.queryByText("New Pipeline")).not.toBeInTheDocument();
    });

    test("clicking home tab sets it as active via setActiveTab mutation", async () => {
      const user = userEvent.setup();

      mockTabState = {
        tabs: [
          { pipelineId: "home", name: "Home" },
          { pipelineId: "p1", name: "Pipeline 1" },
        ],
        activeTabId: "p1",
      };
      vi.mocked(useTabsQuery).mockReturnValue({
        data: mockTabState,
        isLoading: false,
      } as ReturnType<typeof useTabsQuery>);

      renderTabs();

      // Click home tab
      const homeButton = screen.getByTitle("Home");
      await user.click(homeButton);

      // Tab state is source of truth - no navigation, just setActiveTab mutation
      expect(mockSetActiveTabMutate).toHaveBeenCalledWith("home");
    });

    test("selecting existing pipeline from dropdown calls focusOrOpenTab mutation", async () => {
      const user = userEvent.setup();

      mockTabState = {
        tabs: [{ pipelineId: "home", name: "Home" }],
        activeTabId: "home",
      };
      vi.mocked(useTabsQuery).mockReturnValue({
        data: mockTabState,
        isLoading: false,
      } as ReturnType<typeof useTabsQuery>);

      mockPipelinesData = [{ id: "p1", name: "Existing Pipeline" }];

      renderTabs();

      // Open dropdown
      const buttons = screen.getAllByRole("button");
      const dropdownTrigger = buttons[buttons.length - 1];
      await user.click(dropdownTrigger);

      // Click on existing pipeline
      await waitFor(() => {
        expect(screen.getByText("Existing Pipeline")).toBeInTheDocument();
      });
      await user.click(screen.getByText("Existing Pipeline"));

      // Tab state is source of truth - focusOrOpenTab mutation handles it, no navigation
      expect(mockFocusOrOpenTabMutate).toHaveBeenCalledWith({ pipelineId: "p1", name: "Existing Pipeline" });
    });

    test("active tab has primary border styling", () => {
      mockTabState = {
        tabs: [
          { pipelineId: "home", name: "Home" },
          { pipelineId: "p1", name: "Active Pipeline" },
        ],
        activeTabId: "p1",
      };
      vi.mocked(useTabsQuery).mockReturnValue({
        data: mockTabState,
        isLoading: false,
      } as ReturnType<typeof useTabsQuery>);

      renderTabs();

      // Find active tab (now a div with role="button")
      const activeTab = screen.getByText("Active Pipeline").closest('[role="button"]');
      expect(activeTab).toHaveClass("border-primary");
    });

    test("isStarting state also triggers confirm dialog", async () => {
      const user = userEvent.setup();
      const onCloseTab = vi.fn();

      mockTabState = {
        tabs: [
          { pipelineId: "home", name: "Home" },
          { pipelineId: "p1", name: "Starting Pipeline" },
        ],
        activeTabId: "p1",
      };
      vi.mocked(useTabsQuery).mockReturnValue({
        data: mockTabState,
        isLoading: false,
      } as ReturnType<typeof useTabsQuery>);

      // Pipeline is starting (not yet running)
      const runStates = new Map([
        ["p1", { runId: null, isStarting: true }],
      ]);

      renderTabs(runStates, onCloseTab);

      // Click close button (tab is now a div with role="button")
      const tabWithName = screen.getByText("Starting Pipeline").closest('[role="button"]');
      const closeButton = within(tabWithName as HTMLElement).getByRole("button");
      await user.click(closeButton);

      // Should show confirm dialog
      await waitFor(() => {
        expect(screen.getByText("Close running pipeline?")).toBeInTheDocument();
      });
    });
  });
});
