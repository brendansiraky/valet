import { describe, test, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "~/mocks/server";
import { renderWithClient } from "~/test-utils";
import { mockAgentsData } from "~/mocks/handlers";
import Agents from "./agents";

describe("Agents", () => {
  test("shows loading skeleton while fetching", () => {
    // Delay the response to observe loading state
    server.use(
      http.get("/api/agents", async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json(mockAgentsData);
      })
    );

    renderWithClient(<Agents />);

    // PageLayout title should be visible
    expect(screen.getByRole("heading", { name: "My Agents" })).toBeInTheDocument();

    // Skeleton cards should be visible (they render as div elements with specific structure)
    // We check for the grid container with multiple skeleton children
    const main = screen.getByRole("main");
    expect(main.querySelector(".grid")).toBeInTheDocument();
  });

  test("shows error state with retry button on fetch failure", async () => {
    server.use(
      http.get("/api/agents", () => {
        return HttpResponse.json(
          { message: "Internal server error" },
          { status: 500 }
        );
      })
    );

    renderWithClient(<Agents />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText("Failed to load agents")).toBeInTheDocument();
    });

    // Retry button should be visible
    expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();
  });

  test("shows empty state when no agents exist", async () => {
    server.use(
      http.get("/api/agents", () => {
        return HttpResponse.json({
          agents: [],
          traits: [],
          configuredProviders: ["anthropic"],
        });
      })
    );

    renderWithClient(<Agents />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText("No agents yet")).toBeInTheDocument();
    });

    // Empty state description
    expect(
      screen.getByText(/Create your first agent to get started/)
    ).toBeInTheDocument();

    // Create button in empty state
    expect(
      screen.getByRole("button", { name: /Create Your First Agent/ })
    ).toBeInTheDocument();
  });

  test("shows agent cards when agents exist", async () => {
    renderWithClient(<Agents />);

    // Wait for agent data to load
    await waitFor(() => {
      expect(screen.getByText("Test Agent")).toBeInTheDocument();
    });

    // Agent card actions should be visible
    expect(screen.getByRole("button", { name: /Test/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Edit/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Delete/ })).toBeInTheDocument();

    // Header action to create agent should exist
    expect(
      screen.getByRole("button", { name: /Create Agent/ })
    ).toBeInTheDocument();
  });

  test("retry button refetches data", async () => {
    const user = userEvent.setup();
    let callCount = 0;

    server.use(
      http.get("/api/agents", () => {
        callCount++;
        if (callCount === 1) {
          return HttpResponse.json(
            { message: "Server error" },
            { status: 500 }
          );
        }
        return HttpResponse.json(mockAgentsData);
      })
    );

    renderWithClient(<Agents />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText("Failed to load agents")).toBeInTheDocument();
    });

    // Click retry
    await user.click(screen.getByRole("button", { name: "Try Again" }));

    // Should now show the agent
    await waitFor(() => {
      expect(screen.getByText("Test Agent")).toBeInTheDocument();
    });

    expect(callCount).toBe(2);
  });
});
