# Testing Library Query Reference

Complete guide to querying elements in component tests.

## Query Priority

Use queries in this order of preference:

### 1. Accessible Queries (Preferred)

These reflect how users and assistive technology interact with the page.

**getByRole** - Most preferred. Works with buttons, links, headings, form elements.

```typescript
// Buttons
screen.getByRole("button", { name: "Submit" });
screen.getByRole("button", { name: /submit/i }); // Case insensitive

// Links
screen.getByRole("link", { name: "Home" });

// Headings
screen.getByRole("heading", { level: 1 });
screen.getByRole("heading", { name: "Title" });

// Form elements
screen.getByRole("textbox"); // input[type="text"], textarea
screen.getByRole("textbox", { name: "Email" }); // With label
screen.getByRole("checkbox");
screen.getByRole("radio");
screen.getByRole("combobox"); // select
screen.getByRole("spinbutton"); // input[type="number"]

// Lists
screen.getByRole("list");
screen.getByRole("listitem");

// Navigation
screen.getByRole("navigation");
screen.getByRole("main");
screen.getByRole("banner"); // header
screen.getByRole("contentinfo"); // footer
```

**getByLabelText** - For form inputs with associated labels.

```typescript
screen.getByLabelText("Email");
screen.getByLabelText("Password");
screen.getByLabelText(/email/i);
```

**getByPlaceholderText** - When no label exists.

```typescript
screen.getByPlaceholderText("Search...");
```

**getByText** - For non-interactive text content.

```typescript
screen.getByText("Welcome back");
screen.getByText(/welcome/i);
```

**getByDisplayValue** - For input current values.

```typescript
screen.getByDisplayValue("current value");
```

### 2. Semantic Queries

**getByAltText** - Images with alt text.

```typescript
screen.getByAltText("Company logo");
```

**getByTitle** - Elements with title attribute.

```typescript
screen.getByTitle("Close dialog");
```

### 3. Test IDs (Last Resort)

**getByTestId** - Only when other queries don't work.

```typescript
// Component
<div data-testid="custom-element">Content</div>

// Test
screen.getByTestId("custom-element");
```

## Query Variants

Each query comes in three variants:

### getBy

Returns element or throws if not found. Use when element must exist.

```typescript
const button = screen.getByRole("button");
```

### queryBy

Returns element or null. Use when testing element doesn't exist.

```typescript
const error = screen.queryByText("Error");
expect(error).not.toBeInTheDocument();
```

### findBy

Returns Promise. Use for async elements that appear after render.

```typescript
const result = await screen.findByText("Loaded");
```

## Multiple Elements

Add `All` to get arrays:

```typescript
// Get all list items
const items = screen.getAllByRole("listitem");
expect(items).toHaveLength(3);

// Query all (returns empty array if none)
const errors = screen.queryAllByText("Error");
expect(errors).toHaveLength(0);

// Find all async
const results = await screen.findAllByRole("article");
```

## Query Options

### name

Match accessible name (button text, label text, etc.):

```typescript
screen.getByRole("button", { name: "Submit" });
screen.getByRole("button", { name: /submit/i }); // Regex
```

### level

Match heading level:

```typescript
screen.getByRole("heading", { level: 1 }); // h1
screen.getByRole("heading", { level: 2 }); // h2
```

### checked

Match checkbox/radio state:

```typescript
screen.getByRole("checkbox", { checked: true });
screen.getByRole("checkbox", { checked: false });
```

### selected

Match selected option:

```typescript
screen.getByRole("option", { selected: true });
```

### pressed

Match toggle button state:

```typescript
screen.getByRole("button", { pressed: true });
```

### expanded

Match expandable element state:

```typescript
screen.getByRole("button", { expanded: true });
```

### hidden

Include hidden elements (normally excluded):

```typescript
screen.getByRole("button", { hidden: true });
```

## within

Scope queries to a container:

```typescript
import { within } from "@testing-library/react";

const form = screen.getByRole("form");
const submitButton = within(form).getByRole("button", { name: "Submit" });
```

## Debugging Queries

When queries fail, use debug helpers:

```typescript
// Print entire DOM
screen.debug();

// Print specific element
screen.debug(screen.getByRole("form"));

// Log accessible roles
import { logRoles } from "@testing-library/react";
const { container } = render(<Component />);
logRoles(container);
```

## Common Mistakes

### Using getBy for absent elements

```typescript
// ❌ Wrong - throws error
expect(screen.getByText("Error")).not.toBeInTheDocument();

// ✅ Correct - use queryBy
expect(screen.queryByText("Error")).not.toBeInTheDocument();
```

### Not awaiting findBy

```typescript
// ❌ Wrong - returns Promise
expect(screen.findByText("Loaded")).toBeInTheDocument();

// ✅ Correct - await the Promise
expect(await screen.findByText("Loaded")).toBeInTheDocument();
```

### Using test IDs when better queries exist

```typescript
// ❌ Avoid - test IDs don't test accessibility
<button data-testid="submit-btn">Submit</button>
screen.getByTestId("submit-btn");

// ✅ Better - uses accessible role
screen.getByRole("button", { name: "Submit" });
```
