import { describe, test, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "~/test-utils";
import { PipelineTabPanel } from "./pipeline-tab-panel";

/**
 * PipelineTabPanel Tests
 *
 * These tests verify the pipeline tab panel behavior:
 * 1. Displays pipeline name from tab data (useTabsQuery)
 * 2. Name editing updates tab via useUpdateTabName (immediate)
 * 3. Name editing updates pipeline via useUpdatePipelineName (debounced)
 *
 * NOTE: Tab name is the source of truth for display. Pipeline name is synced on edit.
 */

// ============================================================
// MOCK SETUP
// ============================================================

// usePipelineFlow mock state
let mockFlowState = {
  nodes: [] as unknown[],
  edges: [] as unknown[],
  isLoading: false,
};

// Tab data mock state
let mockTabsData = {
  tabs: [{ pipelineId: "test-pipeline-1", name: "Untitled Pipeline" }],
  activeTabId: "test-pipeline-1",
};

const mockOnNodesChange = vi.fn();
const mockOnEdgesChange = vi.fn();
const mockOnConnect = vi.fn();
const mockAddAgentNode = vi.fn();
const mockAddTraitNode = vi.fn();
const mockRemoveNode = vi.fn();
const mockAddTraitToNode = vi.fn();
const mockRemoveTraitFromNode = vi.fn();
const mockSetNodesAndEdges = vi.fn();

// Tab mutation mocks
const mockUpdateTabNameMutate = vi.fn();

// Pipeline mutation mocks
const mockDeletePipelineMutate = vi.fn();
const mockUpdatePipelineNameMutate = vi.fn();

vi.mock("~/hooks/queries/use-pipeline-flow", () => ({
  usePipelineFlow: vi.fn(() => ({
    nodes: mockFlowState.nodes,
    edges: mockFlowState.edges,
    isLoading: mockFlowState.isLoading,
    onNodesChange: mockOnNodesChange,
    onEdgesChange: mockOnEdgesChange,
    onConnect: mockOnConnect,
    addAgentNode: mockAddAgentNode,
    addTraitNode: mockAddTraitNode,
    removeNode: mockRemoveNode,
    addTraitToNode: mockAddTraitToNode,
    removeTraitFromNode: mockRemoveTraitFromNode,
    setNodesAndEdges: mockSetNodesAndEdges,
  })),
}));

vi.mock("~/hooks/queries/use-tabs", () => ({
  useUpdateTabName: vi.fn(() => ({
    mutate: mockUpdateTabNameMutate,
    isPending: false,
  })),
  useTabsQuery: vi.fn(() => ({
    data: mockTabsData,
    isLoading: false,
  })),
}));

vi.mock("~/hooks/queries/use-pipelines", () => ({
  useDeletePipeline: vi.fn(() => ({
    mutate: mockDeletePipelineMutate,
  })),
  useUpdatePipelineName: vi.fn(() => ({
    mutate: mockUpdatePipelineNameMutate,
    isPending: false,
  })),
}));

// Mock ReactFlow components
vi.mock("@xyflow/react", () => ({
  ReactFlow: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="react-flow">{children}</div>
  ),
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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
}));

// Mock PipelineCanvas to avoid complex ReactFlow internals
vi.mock("./pipeline-canvas", () => ({
  PipelineCanvas: () => <div data-testid="pipeline-canvas">Pipeline Canvas</div>,
}));

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const defaultProps = {
  pipelineId: "test-pipeline-1",
  initialData: null as {
    id: string;
    name: string;
    flowData: unknown;
  } | null,
  agents: [],
  traits: [],
  traitsMap: new Map(),
  runState: { runId: null, isStarting: false },
  onOpenRunDialog: vi.fn(),
  onDelete: vi.fn(),
};

function resetAllMocks() {
  mockFlowState = {
    nodes: [],
    edges: [],
    isLoading: false,
  };
  mockTabsData = {
    tabs: [{ pipelineId: "test-pipeline-1", name: "Untitled Pipeline" }],
    activeTabId: "test-pipeline-1",
  };
  mockOnNodesChange.mockClear();
  mockOnEdgesChange.mockClear();
  mockOnConnect.mockClear();
  mockAddAgentNode.mockClear();
  mockAddTraitNode.mockClear();
  mockRemoveNode.mockClear();
  mockAddTraitToNode.mockClear();
  mockRemoveTraitFromNode.mockClear();
  mockSetNodesAndEdges.mockClear();
  mockUpdateTabNameMutate.mockClear();
  mockDeletePipelineMutate.mockClear();
  mockUpdatePipelineNameMutate.mockClear();
}

// ============================================================
// TESTS
// ============================================================

describe("PipelineTabPanel - Name Initialization", () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe("Initial Load with Data", () => {
    test("displays pipeline name from tab data", async () => {
      mockTabsData.tabs = [{ pipelineId: "test-pipeline-1", name: "My Custom Pipeline" }];

      renderWithClient(
        <PipelineTabPanel
          {...defaultProps}
          initialData={{
            id: "test-pipeline-1",
            name: "My Custom Pipeline",
            flowData: { nodes: [], edges: [] },
          }}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Pipeline name")).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText("Pipeline name");
      expect(nameInput).toHaveValue("My Custom Pipeline");
    });

    test("shows loading state when isLoading is true", async () => {
      mockFlowState.isLoading = true;

      renderWithClient(<PipelineTabPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Loading...")).toBeInTheDocument();
      });
    });

    test("displays empty string when tab not found", async () => {
      mockTabsData.tabs = []; // No tabs

      renderWithClient(<PipelineTabPanel {...defaultProps} initialData={null} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Pipeline name")).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText("Pipeline name");
      expect(nameInput).toHaveValue("");
    });

    test("displays the correct name from tab data", async () => {
      mockTabsData.tabs = [{ pipelineId: "test-pipeline-1", name: "Server Pipeline Name" }];

      renderWithClient(
        <PipelineTabPanel
          {...defaultProps}
          initialData={{
            id: "test-pipeline-1",
            name: "Server Pipeline Name",
            flowData: { nodes: [], edges: [] },
          }}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Pipeline name")).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText("Pipeline name");
      expect(nameInput).toHaveValue("Server Pipeline Name");
    });

    test("renders pipeline canvas when not loading", async () => {
      mockFlowState.isLoading = false;
      mockTabsData.tabs = [{ pipelineId: "test-pipeline-1", name: "Test Pipeline" }];

      renderWithClient(
        <PipelineTabPanel
          {...defaultProps}
          initialData={{
            id: "test-pipeline-1",
            name: "Test Pipeline",
            flowData: { nodes: [], edges: [] },
          }}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("pipeline-canvas")).toBeInTheDocument();
      });
    });
  });

  describe("Name Editing", () => {
    test("editing name calls updateTabName mutation", async () => {
      const user = userEvent.setup();
      mockTabsData.tabs = [{ pipelineId: "test-pipeline-1", name: "Original Name" }];

      renderWithClient(
        <PipelineTabPanel
          {...defaultProps}
          initialData={{
            id: "test-pipeline-1",
            name: "Original Name",
            flowData: { nodes: [], edges: [] },
          }}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Pipeline name")).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText("Pipeline name");
      expect(nameInput).toHaveValue("Original Name");

      await user.clear(nameInput);
      await user.type(nameInput, "New Name");

      // Should update tab name via mutation (immediate)
      expect(mockUpdateTabNameMutate).toHaveBeenCalled();
    });
  });

  describe("Pipeline ID Changes (Tab Switching)", () => {
    test("component re-renders when pipelineId changes", async () => {
      mockTabsData.tabs = [
        { pipelineId: "pipeline-1", name: "Pipeline One" },
        { pipelineId: "pipeline-2", name: "Pipeline Two" },
      ];

      const { rerender } = renderWithClient(
        <PipelineTabPanel
          {...defaultProps}
          pipelineId="pipeline-1"
          initialData={{
            id: "pipeline-1",
            name: "Pipeline One",
            flowData: { nodes: [], edges: [] },
          }}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Pipeline name")).toHaveValue("Pipeline One");
      });

      // Switch to second pipeline
      rerender(
        <PipelineTabPanel
          {...defaultProps}
          pipelineId="pipeline-2"
          initialData={{
            id: "pipeline-2",
            name: "Pipeline Two",
            flowData: { nodes: [], edges: [] },
          }}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Pipeline name")).toHaveValue("Pipeline Two");
      });
    });
  });
});
