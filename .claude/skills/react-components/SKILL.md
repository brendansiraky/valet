---
name: react-components
description: This skill should be used when the user asks to "create a component", "build a React component", "add component props", "extend HTML attributes", "component interface", "layout structure", "component architecture", "props pattern", "slot props", "render props", "add a shadcn component", "install UI component", "use shadcn", or needs guidance on React component patterns, prop interfaces, and shadcn UI component usage.
---

# React Components

This skill provides conventions for creating React components in the Valet application.

## When to Apply

- Creating new React components in `app/components/`
- Defining component props interfaces
- Extending HTML element attributes
- Implementing consistent layout structures

## Component Architecture

| Location | Purpose |
|----------|---------|
| `app/components/` | Feature components |
| `app/components/ui/` | Reusable UI components (shadcn) |
| `app/routes/` | Route components (Remix) |

## shadcn UI Components

This project uses [shadcn/ui](https://ui.shadcn.com) for consistent, accessible UI components. All shadcn components are installed into `app/components/ui/`.

### Using the shadcn MCP Server

The shadcn MCP server provides tools for discovering and installing components:

1. **Search for components**: Use `mcp__shadcn__search_items_in_registries` to find components
2. **View component details**: Use `mcp__shadcn__view_items_in_registries` to see implementation
3. **Get usage examples**: Use `mcp__shadcn__get_item_examples_from_registries` to see demos
4. **Get install command**: Use `mcp__shadcn__get_add_command_for_items` to get the CLI command

### Installation Workflow

When adding a new shadcn component:

```bash
# Install from project root
npx shadcn@latest add button
```

### Importing UI Components

Import shadcn components from the local ui directory:

```typescript
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Dialog } from '~/components/ui/dialog'
```

### When to Use shadcn Components

- **Always check first**: Before creating a custom component, search the shadcn registry
- **Consistent UI**: Use shadcn components for buttons, inputs, dialogs, dropdowns, etc.
- **Customization**: Extend shadcn components rather than building from scratch
- **Accessibility**: shadcn components include proper ARIA attributes and keyboard navigation

## Props Interface Pattern

Always name interfaces as `[ComponentName]Props` and extend the appropriate HTML element:

```typescript
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string
    description?: string
    children?: React.ReactNode
}

export function Card({ title, description, children, className, ...props }: CardProps) {
    return (
        <div className={cn('rounded-lg border p-4', className)} {...props}>
            {title && <h3 className="font-semibold">{title}</h3>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
            {children}
        </div>
    )
}
```

### Element-Specific Extensions

```typescript
// Button components
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean
}

// Input components
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
}

// Form components
interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
    onSubmitSuccess?: () => void
}

// Anchor/Link components
interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    external?: boolean
}
```

## Standard Layout Structure

Components with headers follow this consistent pattern:

```typescript
interface PageComponentProps extends React.HTMLAttributes<HTMLDivElement> {
    title?: string
    description?: string
    children: React.ReactNode
    headerActions?: React.ReactNode
}

export function PageComponent({
    title,
    description,
    children,
    headerActions,
    className,
    ...props
}: PageComponentProps) {
    return (
        <div className={cn('space-y-6', className)} {...props}>
            {(title || description || headerActions) && (
                <header className="flex items-center justify-between">
                    <div>
                        {title && (
                            <h1 className="text-2xl font-semibold">{title}</h1>
                        )}
                        {description && (
                            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                        )}
                    </div>
                    {headerActions && (
                        <div className="flex items-center gap-2">{headerActions}</div>
                    )}
                </header>
            )}
            <main>{children}</main>
        </div>
    )
}
```

## Composition Patterns

### Slot Props for Flexibility

```typescript
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    header?: React.ReactNode
    footer?: React.ReactNode
    children: React.ReactNode
}
```

### Render Props for Control

```typescript
interface ListProps<T> {
    items: T[]
    renderItem: (item: T, index: number) => React.ReactNode
    keyExtractor: (item: T) => string
}
```

## Key Rules

### Do's
- Always use `[ComponentName]Props` naming convention
- Extend the correct HTML element attributes
- Spread `...props` to the root element
- Accept and merge `className` using `cn()`
- Use optional chaining for conditional rendering
- Check shadcn registry before creating new UI components
- Install shadcn components to `app/components/ui/`
- Import UI components from `~/components/ui/`

### Don'ts
- Never use `any` type in props
- Don't omit HTML attribute extension when wrapping native elements
- Don't forget to spread remaining props
- Don't hardcode classes that should be customizable
- Don't recreate components that exist in shadcn (Button, Input, Dialog, etc.)
- Don't install shadcn components anywhere except `app/components/ui/`

## Additional Resources

For detailed React patterns and anti-patterns, consult:

- **`references/react-best-practices.md`** - State management, component hierarchy, useEffect anti-patterns, useMemo/useCallback guidelines

### Related Skills

- **`styling`** - CVA and Tailwind patterns for component styling
