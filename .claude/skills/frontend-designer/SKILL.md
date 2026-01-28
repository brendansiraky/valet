---
name: frontend-designer
description: This skill should be used when the user asks to "design a page", "design a section", "make this consistent", "match the design system", "what spacing should I use", "what colors to use", "apply our styles", "design the UI", "layout this page", "create a consistent look", "match shadcn style", "use shadcn components", or needs guidance on visual consistency, design tokens, spacing, colors, typography, and layout decisions.
---

# Frontend Designer

Guidance for building visually consistent UIs that follow the Valet design system.

## Design Foundation: shadcn/ui

All UI components in this project are built on [shadcn/ui](https://ui.shadcn.com). This ensures visual consistency, accessibility, and a cohesive design language across the application.

### Key Principles

- **shadcn is the source of truth**: All designs must be consistent with shadcn component styling
- **Components live in `app/components/ui`**: All shadcn components are installed to `app/components/ui/`
- **Import from `~/components/ui`**: Use `import { Button, Card, ... } from '~/components/ui'`
- **Extend, don't recreate**: Build on shadcn components rather than creating custom alternatives

### Using the shadcn MCP Server

Before designing custom UI, check what shadcn offers:

1. **Search components**: `mcp__shadcn__search_items_in_registries` - find available components
2. **View examples**: `mcp__shadcn__get_item_examples_from_registries` - see usage patterns and demos
3. **Check styling**: Review component implementations to match their visual patterns

### Design Consistency Checklist

When creating or modifying UI:

- [ ] Does a shadcn component already solve this? Use it.
- [ ] Are colors using shadcn's CSS variables (`--primary`, `--muted`, etc.)?
- [ ] Does border radius match shadcn defaults (`rounded-md`, `rounded-lg`)?
- [ ] Are focus states consistent with shadcn's `focus-visible:ring` pattern?
- [ ] Does spacing align with shadcn component padding/margins?

## Core Principles

### 1. Semantic Over Arbitrary

Use semantic tokens and established patterns instead of arbitrary values:

```typescript
// Preferred: Semantic tokens
'text-muted-foreground'     // Not 'text-gray-500'
'bg-destructive'            // Not 'bg-red-600'
'border-primary'            // Not 'border-blue-500'

// When semantic doesn't apply, use Tailwind scale consistently
'text-gray-600 dark:text-gray-400'  // Consistent light/dark pairing
```

### 2. Mobile-First Responsive

Build for mobile, enhance for larger screens:

```typescript
// Base: mobile → sm: tablet → lg: desktop
'flex-col sm:flex-row'
'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
'px-4 sm:px-6 lg:px-8'
```

### 3. Dark Mode Always

Every color decision includes both modes:

```typescript
'bg-white dark:bg-gray-950'
'border-gray-200 dark:border-gray-700'
'text-gray-900 dark:text-white'
```

### 4. Consistent Spacing

Use the spacing scale systematically:

| Gap | Usage |
|-----|-------|
| `gap-1` / `space-y-1` | Tight grouping (icon + text) |
| `gap-2` / `space-y-2` | Related items (label + input) |
| `gap-4` / `space-y-4` | Content sections (form fields) |
| `gap-6` / `space-y-6` | Page sections |
| `gap-8` / `space-y-8` | Major section breaks |

## Quick Decisions

### Choosing Colors

| Context | Token/Class |
|---------|-------------|
| Primary text | `text-gray-900 dark:text-white` |
| Secondary text | `text-muted-foreground` |
| Primary action | `bg-primary` (Button default) |
| Destructive action | `bg-destructive` |
| Success indicator | `text-green-600 dark:text-green-400` |
| Warning indicator | `text-yellow-600 dark:text-yellow-400` |
| Error indicator | `text-destructive` |
| Page background | `bg-gray-50 dark:bg-gray-950` |
| Card background | `bg-card` or `bg-white dark:bg-gray-900` |

### Choosing Spacing

| Context | Class |
|---------|-------|
| Button padding | `px-4 py-2` (default), `px-3 py-1.5` (small) |
| Card padding | `p-6` (standard), `p-4` (compact) |
| Between form fields | `space-y-4` |
| Between sections | `space-y-6` or `space-y-8` |
| Container padding | `px-4 sm:px-6 lg:px-8` |
| Max container width | `max-w-7xl` (dashboard), `max-w-2xl` (content) |

### Choosing Typography

| Context | Classes |
|---------|---------|
| Page title | `text-2xl font-semibold` |
| Section title | `text-lg font-semibold` |
| Card title | `text-base font-semibold` or `font-medium` |
| Body text | `text-base` (default) |
| Secondary text | `text-sm text-muted-foreground` |
| Labels | `text-sm font-medium` |
| Metadata | `text-xs text-muted-foreground` |

### Choosing Border Radius

| Context | Class |
|---------|-------|
| Buttons, inputs | `rounded-md` |
| Cards, dialogs | `rounded-lg` |
| Feature cards, hero | `rounded-xl` |
| Avatars, pills | `rounded-full` |

## Layout Selection Guide

### Page Types

| Page Type | Layout Pattern |
|-----------|----------------|
| Dashboard/List | Full width with `max-w-7xl` container |
| Editor/Builder | Sidebar + content (flex, collapsible) |
| Form/Auth | Centered narrow (`max-w-md`) |
| Settings | Sections with cards (`space-y-8`) |
| Landing/Marketing | Hero + sections with varying widths |

### Section Patterns

| Section Type | Structure |
|--------------|-----------|
| Page header | `flex items-center justify-between` |
| Card grid | `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4` |
| List | `divide-y` within `rounded-lg border` |
| Stats row | `grid grid-cols-2 lg:grid-cols-4 gap-4` |
| Form | `space-y-4` for fields, `space-y-6` for sections |

## Component Consistency

All components should match shadcn's visual language. Use shadcn components from `~/components/ui` whenever possible.

### Buttons

Use the `Button` component from `~/components/ui`. Follow variant semantics:

- **default**: Primary actions (Save, Create, Submit)
- **destructive**: Delete, Remove, Revoke
- **outline**: Secondary actions (Cancel, Back)
- **ghost**: Subtle actions (Edit, More)
- **link**: Navigation-style actions

### Cards

Use shadcn's `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` from `~/components/ui`:

```typescript
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '~/components/ui/card'

<Card>
    <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>{content}</CardContent>
</Card>
```

For simple cases, the raw pattern is also acceptable:

```typescript
<div className="rounded-lg border bg-card p-6">
    <h3 className="font-semibold">{title}</h3>
    <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    <div className="mt-4">{content}</div>
</div>
```

### Forms

Use shadcn form components (`Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`) with react-hook-form. See the `ui-forms` skill for detailed patterns.

```typescript
<div className="space-y-4">
    <FormField ... />  // Each field
    <FormField ... />
</div>
<div className="flex justify-end gap-2 pt-4">
    <Button variant="outline">Cancel</Button>
    <Button type="submit">Save</Button>
</div>
```

## Accessibility Checklist

- Focus states: All interactive elements have visible focus rings
- Color contrast: Text meets WCAG AA standards
- Screen readers: Icon buttons have `sr-only` labels
- Form errors: Use `aria-invalid` and `aria-describedby`
- Loading states: Disable interactions, show visual feedback

## Related Skills

| Skill | Use For |
|-------|---------|
| `react-components` | Component architecture, prop interfaces, shadcn installation |
| `styling` | CVA patterns, variant definitions |
| `ui-forms` | Form implementation, validation |
| `ui-dialog` | Modal and dialog patterns |
| `writing-loading-states` | Loading, empty, error states |

## Reference Documentation

For comprehensive patterns and examples, consult:

- **`references/design-system.md`** - Complete color palette, typography scale, spacing tokens, shadows, breakpoints
- **`references/layout-patterns.md`** - Page layouts, section structures, responsive patterns, header/footer designs
- **`references/component-gallery.md`** - Button variants, cards, forms, badges, tables, navigation, alerts, dialogs
