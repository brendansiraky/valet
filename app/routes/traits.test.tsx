import { describe, test, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "~/mocks/server";
import { renderWithClient } from "~/test-utils";
import { mockTraitsData } from "~/mocks/handlers";
import Traits from "./traits";

describe("Traits", () => {
  test("shows loading skeleton while fetching", () => {
    // Delay the response to observe loading state
    server.use(
      http.get("/api/traits", async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json(mockTraitsData);
      })
    );

    renderWithClient(<Traits />);

    // PageLayout title should be visible
    expect(screen.getByRole("heading", { name: "My Traits" })).toBeInTheDocument();

    // Skeleton cards should be visible in the grid
    const main = screen.getByRole("main");
    expect(main.querySelector(".grid")).toBeInTheDocument();
  });

  test("shows error state with retry button on fetch failure", async () => {
    server.use(
      http.get("/api/traits", () => {
        return HttpResponse.json(
          { message: "Internal server error" },
          { status: 500 }
        );
      })
    );

    renderWithClient(<Traits />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText("Error loading traits")).toBeInTheDocument();
    });

    // Retry button should be visible
    expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();
  });

  test("shows empty state when no traits exist", async () => {
    server.use(
      http.get("/api/traits", () => {
        return HttpResponse.json({ traits: [] });
      })
    );

    renderWithClient(<Traits />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText("No traits yet")).toBeInTheDocument();
    });

    // Empty state description
    expect(
      screen.getByText(/Create your first trait to get started/)
    ).toBeInTheDocument();

    // Create button in empty state
    expect(
      screen.getByRole("button", { name: /Create Your First Trait/ })
    ).toBeInTheDocument();
  });

  test("shows trait cards when traits exist", async () => {
    renderWithClient(<Traits />);

    // Wait for trait data to load
    await waitFor(() => {
      expect(screen.getByText("Test Trait")).toBeInTheDocument();
    });

    // Trait card actions should be visible
    expect(screen.getByRole("button", { name: /Edit/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Delete/ })).toBeInTheDocument();

    // Header action to create trait should exist
    expect(
      screen.getByRole("button", { name: /Create Trait/ })
    ).toBeInTheDocument();
  });

  test("retry button refetches data", async () => {
    const user = userEvent.setup();
    let callCount = 0;

    server.use(
      http.get("/api/traits", () => {
        callCount++;
        if (callCount === 1) {
          return HttpResponse.json(
            { message: "Server error" },
            { status: 500 }
          );
        }
        return HttpResponse.json(mockTraitsData);
      })
    );

    renderWithClient(<Traits />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText("Error loading traits")).toBeInTheDocument();
    });

    // Click retry
    await user.click(screen.getByRole("button", { name: "Try Again" }));

    // Should now show the trait
    await waitFor(() => {
      expect(screen.getByText("Test Trait")).toBeInTheDocument();
    });

    expect(callCount).toBe(2);
  });
});
