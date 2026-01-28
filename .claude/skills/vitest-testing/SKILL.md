---
name: Vitest Testing
description: This skill should be used when the user asks to "test a component", "test React component", "component test", "render test", "Testing Library", "screen queries", "userEvent", "vitest", "vi.fn", "vi.mock", or needs guidance on testing React components. Use for testing UI components that require a DOM environment.
---

# Vitest Component Testing

Provides guidance for testing React components using Vitest with Testing Library.

## When to Use Vitest

Use Vitest for testing code that requires a DOM or React rendering:

- **React components** - rendering, user interactions, state changes
- **Custom hooks** - hook behavior and state management
- **UI logic** - components with complex conditional rendering

For other test types:
- **Non-UI code** (utilities, API, business logic) → Use `bun test`
- **End-to-end browser tests** → Use Playwright

## Project Conventions

### File Naming and Location

Place component test files adjacent to the component with `_test.tsx` suffix:

```
app/
  components/
    Button.tsx
    Button_test.tsx     # Tests for Button.tsx
    Form/
      Form.tsx
      Form_test.tsx
```

### Test Coverage Approach

When testing components, cover:

1. **Rendering** - Component renders without crashing
2. **User interactions** - Clicks, typing, form submissions
3. **State changes** - UI updates correctly after actions
4. **Edge cases** - Empty states, loading states, error states, boundary conditions

## Basic Test Structure

```typescript
import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  test("renders with text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  test("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Click me</Button>);
    await user.click(screen.getByRole("button"));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

## Running Tests

```bash
# Run all Vitest tests
npx vitest

# Run in watch mode (default)
npx vitest

# Run once without watch
npx vitest run

# Run specific file
npx vitest Button_test.tsx

# Filter by test name
npx vitest -t "renders"
```

## Querying Elements

Use Testing Library queries in priority order:

| Query | Use Case |
|-------|----------|
| `getByRole` | Buttons, links, headings, form controls |
| `getByLabelText` | Form inputs with labels |
| `getByPlaceholderText` | Inputs with placeholders |
| `getByText` | Non-interactive text content |
| `getByTestId` | Last resort - add `data-testid` |

```typescript
// Preferred: accessible queries
screen.getByRole("button", { name: "Submit" });
screen.getByRole("heading", { level: 1 });
screen.getByLabelText("Email");

// Avoid: test IDs (only when necessary)
screen.getByTestId("custom-element");
```

### Query Variants

| Prefix | Returns | Throws | Use Case |
|--------|---------|--------|----------|
| `getBy` | Element | Yes | Element must exist |
| `queryBy` | Element or null | No | Element may not exist |
| `findBy` | Promise | Yes | Async/waiting for element |

```typescript
// Element must exist
const button = screen.getByRole("button");

// Element might not exist
const error = screen.queryByText("Error message");
expect(error).not.toBeInTheDocument();

// Wait for element to appear
const result = await screen.findByText("Loaded");
```

## User Interactions

Always use `userEvent` over `fireEvent` for realistic interactions:

```typescript
import userEvent from "@testing-library/user-event";

test("user interactions", async () => {
  const user = userEvent.setup();

  // Clicking
  await user.click(screen.getByRole("button"));

  // Typing
  await user.type(screen.getByRole("textbox"), "hello");

  // Clearing and typing
  await user.clear(screen.getByRole("textbox"));
  await user.type(screen.getByRole("textbox"), "new value");

  // Keyboard
  await user.keyboard("{Enter}");

  // Select dropdown
  await user.selectOptions(screen.getByRole("combobox"), "option1");

  // Checkbox/radio
  await user.click(screen.getByRole("checkbox"));
});
```

## Mocking with vi

```typescript
import { vi, describe, test, expect, beforeEach } from "vitest";

// Mock function
const mockFn = vi.fn();
mockFn.mockReturnValue("mocked");
mockFn.mockResolvedValue("async mocked");

// Spy on object method
const spy = vi.spyOn(object, "method");

// Mock module
vi.mock("./api", () => ({
  fetchUser: vi.fn(() => Promise.resolve({ name: "Test" })),
}));

// Reset between tests
beforeEach(() => {
  vi.clearAllMocks();
});
```

## Common Assertions

```typescript
// Presence
expect(element).toBeInTheDocument();
expect(element).not.toBeInTheDocument();

// Visibility
expect(element).toBeVisible();
expect(element).not.toBeVisible();

// Text content
expect(element).toHaveTextContent("text");
expect(element).toHaveTextContent(/pattern/);

// Attributes
expect(element).toHaveAttribute("disabled");
expect(element).toHaveAttribute("href", "/path");

// Form state
expect(input).toHaveValue("value");
expect(checkbox).toBeChecked();
expect(input).toBeDisabled();

// Classes
expect(element).toHaveClass("active");
```

## Testing Patterns

### Async Operations

```typescript
test("loads data", async () => {
  render(<UserProfile userId={1} />);

  // Wait for loading to finish
  expect(await screen.findByText("John Doe")).toBeInTheDocument();
});
```

### Form Submission

```typescript
test("submits form", async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();

  render(<LoginForm onSubmit={onSubmit} />);

  await user.type(screen.getByLabelText("Email"), "test@example.com");
  await user.type(screen.getByLabelText("Password"), "password");
  await user.click(screen.getByRole("button", { name: "Log in" }));

  expect(onSubmit).toHaveBeenCalledWith({
    email: "test@example.com",
    password: "password",
  });
});
```

### Testing Hooks

```typescript
import { renderHook, act } from "@testing-library/react";
import { useCounter } from "./useCounter";

test("useCounter increments", () => {
  const { result } = renderHook(() => useCounter());

  expect(result.current.count).toBe(0);

  act(() => {
    result.current.increment();
  });

  expect(result.current.count).toBe(1);
});
```

## Lifecycle Hooks

```typescript
import { beforeAll, afterAll, beforeEach, afterEach } from "vitest";

beforeAll(() => {
  // Once before all tests in file
});

beforeEach(() => {
  // Before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // After each test
});

afterAll(() => {
  // Once after all tests in file
});
```

## Additional Resources

### Reference Files

- **`references/queries.md`** - Complete query reference and priority guide
- **`references/patterns.md`** - Advanced component testing patterns

### Example Files

- **`examples/component_test.tsx`** - Basic component test patterns
