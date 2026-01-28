# Design System Reference

Complete design tokens, color palette, typography, and spacing conventions for the Valet application.

## Color System

### Semantic Colors

Use semantic color tokens for consistent theming:

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `primary` | Blue 600 | Blue 500 | Primary actions, links, focus states |
| `primary-foreground` | White | White | Text on primary backgrounds |
| `secondary` | Gray 100 | Gray 800 | Secondary actions, subtle backgrounds |
| `secondary-foreground` | Gray 900 | Gray 100 | Text on secondary backgrounds |
| `destructive` | Red 600 | Red 400 | Delete actions, errors |
| `muted` | Gray 100 | Gray 800 | Subdued backgrounds |
| `muted-foreground` | Gray 500 | Gray 400 | Secondary text, placeholders |
| `accent` | Gray 100 | Gray 800 | Hover states, highlights |
| `accent-foreground` | Gray 900 | Gray 100 | Text on accent backgrounds |

### Direct Color Usage

When semantic tokens don't apply, use Tailwind's color scale:

```typescript
// Status indicators
'bg-green-100 text-green-800'     // Success (light)
'dark:bg-green-900 dark:text-green-200'  // Success (dark)

'bg-yellow-100 text-yellow-800'   // Warning (light)
'dark:bg-yellow-900 dark:text-yellow-200' // Warning (dark)

'bg-red-100 text-red-800'         // Error (light)
'dark:bg-red-900 dark:text-red-200'      // Error (dark)

'bg-blue-100 text-blue-800'       // Info (light)
'dark:bg-blue-900 dark:text-blue-200'    // Info (dark)

// Neutral grays
'bg-gray-50'   // Lightest background
'bg-gray-100'  // Light background, hover states
'bg-gray-200'  // Borders (light mode)
'bg-gray-700'  // Borders (dark mode)
'bg-gray-800'  // Dark backgrounds
'bg-gray-900'  // Darker backgrounds
'bg-gray-950'  // Darkest (dark mode base)
```

### Dark Mode Pattern

Always pair light and dark mode classes:

```typescript
// Background
'bg-white dark:bg-gray-950'

// Text
'text-gray-900 dark:text-white'
'text-gray-600 dark:text-gray-400'

// Borders
'border-gray-200 dark:border-gray-700'

// Hover states
'hover:bg-gray-100 dark:hover:bg-gray-800'
```

## Typography

### Font Family

Inter is the primary font, loaded from Google Fonts:

```css
@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
}
```

### Text Sizes

| Class | Size | Usage |
|-------|------|-------|
| `text-xs` | 12px | Badges, metadata, timestamps |
| `text-sm` | 14px | Secondary text, descriptions, form labels |
| `text-base` | 16px | Body text, default |
| `text-lg` | 18px | Section titles, emphasized text |
| `text-xl` | 20px | Card titles |
| `text-2xl` | 24px | Page titles, section headers |
| `text-3xl` | 30px | Hero text |
| `text-4xl+` | 36px+ | Landing page heroes only |

### Font Weights

| Class | Weight | Usage |
|-------|--------|-------|
| `font-normal` | 400 | Body text |
| `font-medium` | 500 | Buttons, labels, emphasis |
| `font-semibold` | 600 | Headings, card titles |
| `font-bold` | 700 | Strong emphasis only |

### Text Color Hierarchy

```typescript
// Primary text
'text-gray-900 dark:text-white'

// Secondary text
'text-gray-600 dark:text-gray-400'
// Or use semantic: 'text-muted-foreground'

// Tertiary/disabled text
'text-gray-500 dark:text-gray-500'
```

## Spacing

### Spacing Scale

Use Tailwind's spacing scale consistently:

| Token | Size | Common Usage |
|-------|------|--------------|
| `1` | 4px | Tight gaps between related items |
| `2` | 8px | Button padding (y), icon spacing |
| `3` | 12px | Small button padding (x) |
| `4` | 16px | Card padding, section gaps |
| `6` | 24px | Large card padding, content sections |
| `8` | 32px | Section separation |
| `12` | 48px | Page section margins |
| `16` | 64px | Major section breaks |

### Component Spacing Conventions

```typescript
// Buttons
'px-4 py-2'      // Default
'px-3 py-1.5'    // Small
'px-6 py-2.5'    // Large

// Cards
'p-4'            // Compact
'p-6'            // Standard
'p-8'            // Spacious

// Form fields
'space-y-4'      // Between form groups
'space-y-2'      // Between label and input

// Lists
'space-y-2'      // Tight list
'space-y-4'      // Standard list
'gap-4'          // Grid items

// Page sections
'space-y-6'      // Between sections
'space-y-8'      // Between major sections
```

## Border Radius

| Class | Radius | Usage |
|-------|--------|-------|
| `rounded` | 4px | Small elements, badges |
| `rounded-md` | 6px | Buttons, inputs, chips |
| `rounded-lg` | 8px | Cards, modals |
| `rounded-xl` | 12px | Feature cards, hero sections |
| `rounded-full` | 50% | Avatars, circular buttons |

### Consistency Rule

Match border radius within component families:

```typescript
// Card with buttons
<div className="rounded-lg">           // Container
    <button className="rounded-md">    // Inner elements
```

## Shadows

| Class | Usage |
|-------|-------|
| `shadow-xs` | Subtle depth (hover states) |
| `shadow-sm` | Inputs, small cards |
| `shadow` | Cards, dropdowns |
| `shadow-md` | Elevated cards, modals |
| `shadow-lg` | Popovers, floating elements |

### Dark Mode Shadows

Shadows are less visible in dark mode. Use borders for emphasis:

```typescript
'shadow-md dark:shadow-none dark:border dark:border-gray-700'
```

## Focus States

### Standard Focus Ring

```typescript
'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
```

### Focus Within (for containers)

```typescript
'focus-within:ring-2 focus-within:ring-primary'
```

## Transitions

### Standard Transitions

```typescript
// Color changes
'transition-colors duration-200'

// All properties
'transition-all duration-200'

// Layout changes
'transition-all duration-300'
```

### When to Use Transitions

- Hover states: Always
- Focus states: Yes, but subtle
- Layout changes: Smooth, not jarring
- Color theme changes: Use `transition-colors`

## Breakpoints

Mobile-first responsive design:

| Prefix | Breakpoint | Target |
|--------|------------|--------|
| (none) | 0px | Mobile |
| `sm:` | 640px | Large mobile / small tablet |
| `md:` | 768px | Tablet |
| `lg:` | 1024px | Desktop |
| `xl:` | 1280px | Large desktop |
| `2xl:` | 1536px | Extra large |

### Common Responsive Patterns

```typescript
// Show/hide
'hidden sm:block'
'block sm:hidden'

// Grid columns
'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'

// Flex direction
'flex-col sm:flex-row'

// Container padding
'px-4 sm:px-6 lg:px-8'

// Max width containers
'max-w-md sm:max-w-2xl lg:max-w-4xl'
```

## Z-Index Layers

| Value | Usage |
|-------|-------|
| `z-0` | Base content |
| `z-10` | Sticky headers |
| `z-20` | Dropdowns, tooltips |
| `z-30` | Modal overlays |
| `z-40` | Modals, dialogs |
| `z-50` | Toasts, notifications |

## Icon Sizes

Standard icon sizing with Lucide React:

| Class | Size | Usage |
|-------|------|-------|
| `h-3 w-3` | 12px | Inline with small text |
| `h-4 w-4` | 16px | Default, buttons, inputs |
| `h-5 w-5` | 20px | Emphasized icons |
| `h-6 w-6` | 24px | Section headers |
| `h-8 w-8` | 32px | Empty states, features |
| `h-12 w-12` | 48px | Hero sections |

### Icon Styling

```typescript
// Default
<Icon className="h-4 w-4" />

// With color inheritance
<Icon className="h-4 w-4 text-muted-foreground" />

// Spinning loader
<Loader2 className="h-4 w-4 animate-spin" />

// In buttons (auto-sized by CVA)
<Button><Plus /> Add Item</Button>
```
