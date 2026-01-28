/**
 * Example React component tests with Vitest and Testing Library.
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Example component (inline for demonstration)
function Button({
  children,
  onClick,
  disabled = false,
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant}`}
    >
      {children}
    </button>
  );
}

describe("Button", () => {
  // Basic rendering
  test("renders with text content", () => {
    render(<Button>Click me</Button>);

    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  // Props testing
  test("applies variant class", () => {
    render(<Button variant="secondary">Secondary</Button>);

    expect(screen.getByRole("button")).toHaveClass("btn-secondary");
  });

  test("is disabled when disabled prop is true", () => {
    render(<Button disabled>Disabled</Button>);

    expect(screen.getByRole("button")).toBeDisabled();
  });

  // Event handling
  test("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByRole("button"));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test("does not call onClick when disabled", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <Button onClick={handleClick} disabled>
        Click me
      </Button>
    );

    await user.click(screen.getByRole("button"));

    expect(handleClick).not.toHaveBeenCalled();
  });
});

// Example component with state
function Counter({ initialCount = 0 }: { initialCount?: number }) {
  const [count, setCount] = React.useState(initialCount);

  return (
    <div>
      <span data-testid="count">Count: {count}</span>
      <button onClick={() => setCount((c) => c + 1)}>Increment</button>
      <button onClick={() => setCount((c) => c - 1)}>Decrement</button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  );
}

import React from "react";

describe("Counter", () => {
  test("renders initial count", () => {
    render(<Counter initialCount={5} />);

    expect(screen.getByText("Count: 5")).toBeInTheDocument();
  });

  test("increments count when increment clicked", async () => {
    const user = userEvent.setup();
    render(<Counter initialCount={0} />);

    await user.click(screen.getByRole("button", { name: "Increment" }));

    expect(screen.getByText("Count: 1")).toBeInTheDocument();
  });

  test("decrements count when decrement clicked", async () => {
    const user = userEvent.setup();
    render(<Counter initialCount={5} />);

    await user.click(screen.getByRole("button", { name: "Decrement" }));

    expect(screen.getByText("Count: 4")).toBeInTheDocument();
  });

  test("resets count to zero", async () => {
    const user = userEvent.setup();
    render(<Counter initialCount={10} />);

    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(screen.getByText("Count: 0")).toBeInTheDocument();
  });
});

// Example with mocking
describe("Component with mocked dependencies", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("handles successful data fetch", async () => {
    mockFetch.mockResolvedValue({ name: "Test User" });

    // Component would use this mock
    const result = await mockFetch();

    expect(result).toEqual({ name: "Test User" });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test("handles fetch error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    await expect(mockFetch()).rejects.toThrow("Network error");
  });
});
