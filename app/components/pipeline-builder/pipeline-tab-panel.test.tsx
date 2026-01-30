import { describe, test, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "~/test-utils";
import { PipelineTabPanel } from "./pipeline-tab-panel";

/**
 * PipelineTabPanel Tests
 *
 * These tests verify the pipeline name initialization behavior:
 * 1. When initialData is available, pipeline loads with that name
 * 2. When initialData is null (new pipeline), pipeline loads with "Untitled Pipeline"
 * 3. Name editing updates store, tab, and triggers save
 *
 * NOTE: The component uses lazy initialization during render, not useEffect.
 * This avoids race conditions - the pipeline is initialized synchronously
 * when the component first renders with the data available at that time.
 */

// ============================================================
// MOCK SETUP
// ============================================================

// Pipeline store mocks
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

const mockGetPipeline = vi.fn((id: string) => mockPipelineData.get(id) ?? undefined);
const mockLoadPipeline = vi.fn(
  (data: { pipelineId: string; pipelineName: string; pipelineDescription?: string }) => {
    mockPipelineData.set(data.pipelineId, {
      pipelineId: data.pipelineId,
      pipelineName: data.pipelineName,
      pipelineDescription: data.pipelineDescription || "",
      nodes: [],
      edges: [],
    });
  }
);
const mockUpdatePipeline = vi.fn((id: string, updates: Record<string, unknown>) => {
  const pipeline = mockPipelineData.get(id);
  if (pipeline) {
    mockPipelineData.set(id, { ...pipeline, ...updates });
  }
});
const mockAddAgentNodeTo = vi.fn();
const mockAddTraitNodeTo = vi.fn();

// Tab store mocks
const mockUpdateTabName = vi.fn();

// Mutation mocks
const mockSavePipelineMutate = vi.fn();
const mockDeletePipelineMutate = vi.fn();

vi.mock("~/stores/pipeline-store", () => ({
  usePipelineStore: vi.fn(() => ({
    getPipeline: mockGetPipeline,
    loadPipeline: mockLoadPipeline,
    updatePipeline: mockUpdatePipeline,
    addAgentNodeTo: mockAddAgentNodeTo,
    addTraitNodeTo: mockAddTraitNodeTo,
  })),
}));

vi.mock("~/stores/tab-store", () => ({
  useTabStore: vi.fn(() => ({
    updateTabName: mockUpdateTabName,
  })),
}));

vi.mock("~/hooks/queries/use-pipelines", () => ({
  useSavePipeline: vi.fn(() => ({
    mutate: mockSavePipelineMutate,
  })),
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
  mockPipelineData = new Map();
  mockGetPipeline.mockClear();
  mockGetPipeline.mockImplementation((id: string) => mockPipelineData.get(id) ?? undefined);
  mockLoadPipeline.mockClear();
  mockLoadPipeline.mockImplementation(
    (data: { pipelineId: string; pipelineName: string; pipelineDescription?: string }) => {
      mockPipelineData.set(data.pipelineId, {
        pipelineId: data.pipelineId,
        pipelineName: data.pipelineName,
        pipelineDescription: data.pipelineDescription || "",
        nodes: [],
        edges: [],
      });
    }
  );
  mockUpdatePipeline.mockClear();
  mockUpdatePipeline.mockImplementation((id: string, updates: Record<string, unknown>) => {
    const pipeline = mockPipelineData.get(id);
    if (pipeline) {
      mockPipelineData.set(id, { ...pipeline, ...updates });
    }
  });
  mockAddAgentNodeTo.mockClear();
  mockAddTraitNodeTo.mockClear();
  mockUpdateTabName.mockClear();
  mockSavePipelineMutate.mockClear();
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
    test("displays pipeline name from initialData when available on mount", async () => {
      // Pre-populate pipeline in store with the correct name (simulating loadPipeline having run)
      mockPipelineData.set("test-pipeline-1", {
        pipelineId: "test-pipeline-1",
        pipelineName: "My Custom Pipeline",
        pipelineDescription: "Test description",
        nodes: [],
        edges: [],
      });

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

    test("loads pipeline with 'Untitled Pipeline' when initialData is null (new pipeline)", async () => {
      // Pipeline not in store yet - will be created by loadPipeline during render
      renderWithClient(
        <PipelineTabPanel {...defaultProps} initialData={null} />
      );

      // loadPipeline should have been called with default name
      await waitFor(() => {
        expect(mockLoadPipeline).toHaveBeenCalledWith(
          expect.objectContaining({
            pipelineName: "Untitled Pipeline",
            pipelineDescription: "",
          })
        );
      });
    });

    test("loads pipeline with initialData name when provided", async () => {
      // Pipeline not in store yet - will be created with initialData
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

      // loadPipeline should have been called with the server name
      await waitFor(() => {
        expect(mockLoadPipeline).toHaveBeenCalledWith(
          expect.objectContaining({
            pipelineName: "Server Pipeline Name",
            pipelineDescription: "From server",
          })
        );
      });
    });

    test("does not reload pipeline if already in store", async () => {
      // Pipeline already in store
      mockPipelineData.set("test-pipeline-1", {
        pipelineId: "test-pipeline-1",
        pipelineName: "Already In Store",
        pipelineDescription: "",
        nodes: [],
        edges: [],
      });

      renderWithClient(
        <PipelineTabPanel
          {...defaultProps}
          initialData={{
            id: "test-pipeline-1",
            name: "Different Name From Server",
            description: null,
            flowData: { nodes: [], edges: [] },
          }}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Pipeline name")).toBeInTheDocument();
      });

      // loadPipeline should NOT have been called - pipeline already exists
      expect(mockLoadPipeline).not.toHaveBeenCalled();

      // Should show the store name, not the initialData name
      const nameInput = screen.getByPlaceholderText("Pipeline name");
      expect(nameInput).toHaveValue("Already In Store");
    });
  });

  describe("Name Editing", () => {
    test("editing name updates store and triggers save", async () => {
      const user = userEvent.setup();

      mockPipelineData.set("test-pipeline-1", {
        pipelineId: "test-pipeline-1",
        pipelineName: "Original Name",
        pipelineDescription: "",
        nodes: [],
        edges: [],
      });

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

      // Should update store
      expect(mockUpdatePipeline).toHaveBeenCalled();

      // Should update tab name
      expect(mockUpdateTabName).toHaveBeenCalled();

      // Should trigger save
      expect(mockSavePipelineMutate).toHaveBeenCalled();
    });
  });

  describe("Pipeline ID Changes (Tab Switching)", () => {
    test("loads new pipeline when pipelineId changes", async () => {
      // First pipeline in store
      mockPipelineData.set("pipeline-1", {
        pipelineId: "pipeline-1",
        pipelineName: "Pipeline One",
        pipelineDescription: "",
        nodes: [],
        edges: [],
      });

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

      // Switch to second pipeline (not yet in store)
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

      // Should load the second pipeline
      await waitFor(() => {
        expect(mockLoadPipeline).toHaveBeenCalledWith(
          expect.objectContaining({
            pipelineId: "pipeline-2",
            pipelineName: "Pipeline Two",
          })
        );
      });
    });
  });
});
