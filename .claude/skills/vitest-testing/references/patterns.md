# Component Testing Patterns

Advanced patterns for testing React components with Vitest and Testing Library.

## Wrapper Components

### Providers

Use the project's `renderWithClient` for components needing providers:

```typescript
import { renderWithClient } from "~/test-utils";

test("component with providers", () => {
  renderWithClient(<UserProfile />);
});

test("component with router context", () => {
  renderWithClient(<UserProfile />, { withRouter: true });
});

test("component with theme context", () => {
  renderWithClient(<ThemedComponent />, { withTheme: true });
});
```

### Custom Render

This project uses `renderWithClient` from `~/test-utils`:

```typescript
import { renderWithClient } from "~/test-utils";

// Basic usage - wraps in QueryClientProvider
renderWithClient(<MyComponent />);

// With theme context (for components using useTheme)
renderWithClient(<ThemedComponent />, { withTheme: true });

// With router context (for components using react-router hooks)
renderWithClient(<PageWithLinks />, { withRouter: true });

// With both
renderWithClient(<FullPage />, { withTheme: true, withRouter: true });

// Access queryClient for cache manipulation
const { queryClient } = renderWithClient(<MyComponent />);
```

## Mocking Patterns

### Mock API Calls

```typescript
import { vi } from "vitest";
import * as api from "./api";

vi.mock("./api");

test("displays user data", async () => {
  vi.mocked(api.fetchUser).mockResolvedValue({
    id: 1,
    name: "John Doe",
  });

  render(<UserProfile userId={1} />);

  expect(await screen.findByText("John Doe")).toBeInTheDocument();
  expect(api.fetchUser).toHaveBeenCalledWith(1);
});
```

### Mock React Query Hooks

```typescript
import { vi } from "vitest";
import * as hooks from "./hooks/useUser";

vi.mock("./hooks/useUser");

test("displays loading state", () => {
  vi.mocked(hooks.useUser).mockReturnValue({
    data: undefined,
    isLoading: true,
    error: null,
  } as any);

  render(<UserProfile userId={1} />);
  expect(screen.getByText("Loading...")).toBeInTheDocument();
});

test("displays error state", () => {
  vi.mocked(hooks.useUser).mockReturnValue({
    data: undefined,
    isLoading: false,
    error: new Error("Failed to fetch"),
  } as any);

  render(<UserProfile userId={1} />);
  expect(screen.getByText("Error loading user")).toBeInTheDocument();
});
```

### Mock React Router

```typescript
import { vi } from "vitest";
import { useNavigate, useParams } from "react-router";

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: vi.fn(),
    useParams: vi.fn(),
  };
});

test("navigates on click", async () => {
  const navigate = vi.fn();
  vi.mocked(useNavigate).mockReturnValue(navigate);
  vi.mocked(useParams).mockReturnValue({ id: "123" });

  const user = userEvent.setup();
  render(<BackButton />);

  await user.click(screen.getByRole("button", { name: "Back" }));
  expect(navigate).toHaveBeenCalledWith(-1);
});
```

## Testing State Changes

### Counter Example

```typescript
test("increments and decrements count", async () => {
  const user = userEvent.setup();
  render(<Counter initialCount={0} />);

  expect(screen.getByText("Count: 0")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Increment" }));
  expect(screen.getByText("Count: 1")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Decrement" }));
  expect(screen.getByText("Count: 0")).toBeInTheDocument();
});
```

### Toggle Example

```typescript
test("toggles visibility", async () => {
  const user = userEvent.setup();
  render(<Accordion title="Details" content="Hidden content" />);

  // Content hidden initially
  expect(screen.queryByText("Hidden content")).not.toBeInTheDocument();

  // Click to expand
  await user.click(screen.getByRole("button", { name: "Details" }));
  expect(screen.getByText("Hidden content")).toBeInTheDocument();

  // Click to collapse
  await user.click(screen.getByRole("button", { name: "Details" }));
  expect(screen.queryByText("Hidden content")).not.toBeInTheDocument();
});
```

## Form Testing

### Basic Form

```typescript
test("validates required fields", async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();

  render(<ContactForm onSubmit={onSubmit} />);

  // Submit without filling required fields
  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(screen.getByText("Email is required")).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();

  // Fill and submit
  await user.type(screen.getByLabelText("Email"), "test@example.com");
  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(screen.queryByText("Email is required")).not.toBeInTheDocument();
  expect(onSubmit).toHaveBeenCalled();
});
```

### Form with Validation

```typescript
test("shows validation errors on blur", async () => {
  const user = userEvent.setup();
  render(<SignupForm />);

  const emailInput = screen.getByLabelText("Email");

  // Focus and blur without value
  await user.click(emailInput);
  await user.tab(); // Move focus away

  expect(screen.getByText("Email is required")).toBeInTheDocument();

  // Type invalid email
  await user.type(emailInput, "invalid");
  await user.tab();

  expect(screen.getByText("Invalid email format")).toBeInTheDocument();

  // Type valid email
  await user.clear(emailInput);
  await user.type(emailInput, "valid@example.com");
  await user.tab();

  expect(screen.queryByText("Invalid email format")).not.toBeInTheDocument();
});
```

## Async Testing

### Loading States

```typescript
test("shows loading then content", async () => {
  vi.mocked(api.fetchData).mockResolvedValue({ items: ["a", "b"] });

  render(<DataList />);

  // Loading state
  expect(screen.getByText("Loading...")).toBeInTheDocument();

  // Wait for content
  expect(await screen.findByText("a")).toBeInTheDocument();
  expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
});
```

### Error States

```typescript
test("shows error message on failure", async () => {
  vi.mocked(api.fetchData).mockRejectedValue(new Error("Network error"));

  render(<DataList />);

  expect(await screen.findByText("Failed to load data")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
});
```

### Refetch on Retry

```typescript
test("refetches on retry click", async () => {
  const user = userEvent.setup();
  vi.mocked(api.fetchData)
    .mockRejectedValueOnce(new Error("Failed"))
    .mockResolvedValueOnce({ items: ["success"] });

  render(<DataList />);

  // Wait for error
  expect(await screen.findByText("Failed to load")).toBeInTheDocument();

  // Click retry
  await user.click(screen.getByRole("button", { name: "Retry" }));

  // Wait for success
  expect(await screen.findByText("success")).toBeInTheDocument();
  expect(api.fetchData).toHaveBeenCalledTimes(2);
});
```

## Testing Hooks

### Basic Hook Test

```typescript
import { renderHook, act } from "@testing-library/react";

test("useCounter hook", () => {
  const { result } = renderHook(() => useCounter(10));

  expect(result.current.count).toBe(10);

  act(() => {
    result.current.increment();
  });

  expect(result.current.count).toBe(11);
});
```

### Hook with Dependencies

```typescript
test("useCounter with step", () => {
  const { result, rerender } = renderHook(
    ({ step }) => useCounter(0, step),
    { initialProps: { step: 1 } }
  );

  act(() => result.current.increment());
  expect(result.current.count).toBe(1);

  // Change step prop
  rerender({ step: 5 });

  act(() => result.current.increment());
  expect(result.current.count).toBe(6);
});
```

### Hook with Context

```typescript
test("useTheme with provider", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider defaultTheme="light">{children}</ThemeProvider>
  );

  const { result } = renderHook(() => useTheme(), { wrapper });

  expect(result.current.theme).toBe("light");

  act(() => {
    result.current.setTheme("dark");
  });

  expect(result.current.theme).toBe("dark");
});
```

## Accessibility Testing

### Basic a11y Check

```typescript
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

test("has no accessibility violations", async () => {
  const { container } = render(<Navigation />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Keyboard Navigation

```typescript
test("supports keyboard navigation", async () => {
  const user = userEvent.setup();
  render(<Dropdown options={["A", "B", "C"]} />);

  const trigger = screen.getByRole("button");

  // Open with Enter
  await user.click(trigger);
  await user.keyboard("{Enter}");
  expect(screen.getByRole("listbox")).toBeInTheDocument();

  // Navigate with arrows
  await user.keyboard("{ArrowDown}");
  expect(screen.getByRole("option", { name: "A" })).toHaveFocus();

  await user.keyboard("{ArrowDown}");
  expect(screen.getByRole("option", { name: "B" })).toHaveFocus();

  // Select with Enter
  await user.keyboard("{Enter}");
  expect(trigger).toHaveTextContent("B");
});
```
