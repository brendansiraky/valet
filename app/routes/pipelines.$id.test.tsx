import { describe, test, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "~/mocks/server";
import { renderWithClient } from "~/test-utils";
import {
  mockAgentsData,
  mockTraitsData,
  mockPipelinesData,
  mockPipelineData,
} from "~/mocks/handlers";
import PipelineEditorPage from "./pipelines.$id";

// Mock react-router hooks
vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useParams: vi.fn(() => ({ id: "home" })),
    useNavigate: vi.fn(() => vi.fn()),
  };
});

// Mock zustand stores
vi.mock("~/stores/tab-store", () => ({
  useTabStore: () => ({
    tabs: [{ pipelineId: "home", name: "Home" }],
    activeTabId: "home",
    closeTab: vi.fn(),
    focusOrOpenTab: vi.fn(),
    canOpenNewTab: () => true,
  }),
  HOME_TAB_ID: "home",
}));

vi.mock("~/stores/pipeline-store", () => ({
  usePipelineStore: () => ({
    removePipeline: vi.fn(),
    getPipeline: vi.fn(),
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
}));

describe("PipelineEditorPage", () => {
  test("renders pipeline tabs component", async () => {
    renderWithClient(<PipelineEditorPage />);

    // Wait for data to load
    await waitFor(() => {
      // The PipelineTabs component should render - it contains a dropdown
      // Look for the home tab empty state which confirms the page rendered
      expect(
        screen.getByText("Select a pipeline or create new")
      ).toBeInTheDocument();
    });
  });

  test("renders agent sidebar", async () => {
    renderWithClient(<PipelineEditorPage />);

    // Wait for agents data to load into sidebar
    await waitFor(() => {
      // Agent sidebar should display agent names from query
      expect(screen.getByText("Test Agent")).toBeInTheDocument();
    });
  });

  test("shows home tab empty state when id is home", async () => {
    renderWithClient(<PipelineEditorPage />);

    // Wait for the empty state message
    await waitFor(() => {
      expect(
        screen.getByText("Select a pipeline or create new")
      ).toBeInTheDocument();
    });

    // The react-flow mock should be present
    expect(screen.getByTestId("react-flow")).toBeInTheDocument();
  });

  test("handles loading state while fetching data", async () => {
    // Delay all responses
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

    // The page should still render without crashing during loading
    // The react-flow container should be present
    expect(screen.getByTestId("react-flow")).toBeInTheDocument();

    // Eventually the agent data should load
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

    // The page should still render without crashing
    // Home tab empty state should be visible even if agents fail
    await waitFor(() => {
      expect(
        screen.getByText("Select a pipeline or create new")
      ).toBeInTheDocument();
    });

    // Agent sidebar should gracefully handle missing data
    // The agent "Test Agent" should NOT be present
    expect(screen.queryByText("Test Agent")).not.toBeInTheDocument();
  });
});
