import { describe, test, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "~/test-utils";
import { PipelineTabPanel } from "./pipeline-tab-panel";

/**
 * PipelineTabPanel Tests
 *
 * These tests verify the pipeline tab panel behavior:
 * 1. Displays pipeline name from usePipelineFlow hook
 * 2. Name editing updates React Query cache via updateName
 * 3. Tab name is also updated via tab store
 *
 * NOTE: The component now uses usePipelineFlow hook which manages state via React Query.
 */

// ============================================================
// MOCK SETUP
// ============================================================

// usePipelineFlow mock state
let mockFlowState = {
  nodes: [] as unknown[],
  edges: [] as unknown[],
  pipelineName: "Untitled Pipeline",
  pipelineDescription: "",
  isLoading: false,
};

const mockOnNodesChange = vi.fn();
const mockOnEdgesChange = vi.fn();
const mockOnConnect = vi.fn();
const mockUpdateName = vi.fn();
const mockUpdateDescription = vi.fn();
const mockAddAgentNode = vi.fn();
const mockAddTraitNode = vi.fn();
const mockRemoveNode = vi.fn();
const mockAddTraitToNode = vi.fn();
const mockRemoveTraitFromNode = vi.fn();
const mockSetNodesAndEdges = vi.fn();

// Tab store mocks
const mockUpdateTabName = vi.fn();

// Mutation mocks
const mockDeletePipelineMutate = vi.fn();

vi.mock("~/hooks/queries/use-pipeline-flow", () => ({
  usePipelineFlow: vi.fn(() => ({
    nodes: mockFlowState.nodes,
    edges: mockFlowState.edges,
    pipelineName: mockFlowState.pipelineName,
    pipelineDescription: mockFlowState.pipelineDescription,
    isLoading: mockFlowState.isLoading,
    onNodesChange: mockOnNodesChange,
    onEdgesChange: mockOnEdgesChange,
    onConnect: mockOnConnect,
    updateName: mockUpdateName,
    updateDescription: mockUpdateDescription,
    addAgentNode: mockAddAgentNode,
    addTraitNode: mockAddTraitNode,
    removeNode: mockRemoveNode,
    addTraitToNode: mockAddTraitToNode,
    removeTraitFromNode: mockRemoveTraitFromNode,
    setNodesAndEdges: mockSetNodesAndEdges,
  })),
}));

vi.mock("~/stores/tab-store", () => ({
  useTabStore: vi.fn(() => ({
    updateTabName: mockUpdateTabName,
  })),
}));

vi.mock("~/hooks/queries/use-pipelines", () => ({
  useDeletePipeline: vi.fn(() => ({
    mutate: mockDeletePipelineMutate,
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
    description: string | null;
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
    pipelineName: "Untitled Pipeline",
    pipelineDescription: "",
    isLoading: false,
  };
  mockOnNodesChange.mockClear();
  mockOnEdgesChange.mockClear();
  mockOnConnect.mockClear();
  mockUpdateName.mockClear();
  mockUpdateDescription.mockClear();
  mockAddAgentNode.mockClear();
  mockAddTraitNode.mockClear();
  mockRemoveNode.mockClear();
  mockAddTraitToNode.mockClear();
  mockRemoveTraitFromNode.mockClear();
  mockSetNodesAndEdges.mockClear();
  mockUpdateTabName.mockClear();
  mockDeletePipelineMutate.mockClear();
}

// ============================================================
// TESTS
// ============================================================

describe("PipelineTabPanel - Name Initialization", () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe("Initial Load with Data", () => {
    test("displays pipeline name from usePipelineFlow hook", async () => {
      mockFlowState.pipelineName = "My Custom Pipeline";

      renderWithClient(
        <PipelineTabPanel
          {...defaultProps}
          initialData={{
            id: "test-pipeline-1",
            name: "My Custom Pipeline",
            description: "Test description",
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

    test("displays 'Untitled Pipeline' when pipeline is new", async () => {
      mockFlowState.pipelineName = "Untitled Pipeline";

      renderWithClient(<PipelineTabPanel {...defaultProps} initialData={null} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Pipeline name")).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText("Pipeline name");
      expect(nameInput).toHaveValue("Untitled Pipeline");
    });

    test("displays the correct name when provided", async () => {
      mockFlowState.pipelineName = "Server Pipeline Name";

      renderWithClient(
        <PipelineTabPanel
          {...defaultProps}
          initialData={{
            id: "test-pipeline-1",
            name: "Server Pipeline Name",
            description: "From server",
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
      mockFlowState.pipelineName = "Test Pipeline";

      renderWithClient(
        <PipelineTabPanel
          {...defaultProps}
          initialData={{
            id: "test-pipeline-1",
            name: "Test Pipeline",
            description: null,
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
    test("editing name calls updateName and updateTabName", async () => {
      const user = userEvent.setup();
      mockFlowState.pipelineName = "Original Name";

      renderWithClient(
        <PipelineTabPanel
          {...defaultProps}
          initialData={{
            id: "test-pipeline-1",
            name: "Original Name",
            description: null,
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

      // Should call updateName from usePipelineFlow
      expect(mockUpdateName).toHaveBeenCalled();

      // Should update tab name
      expect(mockUpdateTabName).toHaveBeenCalled();
    });
  });

  describe("Pipeline ID Changes (Tab Switching)", () => {
    test("component re-renders when pipelineId changes", async () => {
      mockFlowState.pipelineName = "Pipeline One";

      const { rerender } = renderWithClient(
        <PipelineTabPanel
          {...defaultProps}
          pipelineId="pipeline-1"
          initialData={{
            id: "pipeline-1",
            name: "Pipeline One",
            description: null,
            flowData: { nodes: [], edges: [] },
          }}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Pipeline name")).toHaveValue("Pipeline One");
      });

      // Update the mock state for the new pipeline
      mockFlowState.pipelineName = "Pipeline Two";

      // Switch to second pipeline
      rerender(
        <PipelineTabPanel
          {...defaultProps}
          pipelineId="pipeline-2"
          initialData={{
            id: "pipeline-2",
            name: "Pipeline Two",
            description: null,
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
