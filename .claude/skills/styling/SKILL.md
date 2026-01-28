---
name: styling
description: This skill should be used when the user asks to "add variants", "CVA styling", "component variants", "tailwind styling", "styling", "className patterns", or needs guidance on Class Variance Authority and Tailwind CSS patterns in React components.
---

# Styling Components

Conventions for styling React components using Class Variance Authority (CVA) and Tailwind CSS.

## Core Imports

```typescript
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '~/lib/utils'
```

## CVA Pattern

Define variants outside the component, then integrate with props:

```typescript
const buttonVariants = cva(
    // Base styles (always applied)
    'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
    {
        variants: {
            variant: {
                default: 'bg-primary text-primary-foreground hover:bg-primary/90',
                destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
                outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
                secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                ghost: 'hover:bg-accent hover:text-accent-foreground',
                link: 'text-primary underline-offset-4 hover:underline',
            },
            size: {
                default: 'h-10 px-4 py-2',
                sm: 'h-9 rounded-md px-3',
                lg: 'h-11 rounded-md px-8',
                icon: 'h-10 w-10',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
)

interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    // Additional custom props
}

export function Button({ className, variant, size, ...props }: ButtonProps) {
    return (
        <button
            className={cn(buttonVariants({ variant, size }), className)}
            {...props}
        />
    )
}
```

## The cn() Utility

The `cn()` function merges Tailwind classes intelligently, handling conflicts:

```typescript
// Basic merging
cn('px-4 py-2', 'px-6')  // Result: 'py-2 px-6'

// Conditional classes
cn('base-class', isActive && 'active-class', isDisabled && 'opacity-50')

// With CVA variants
cn(buttonVariants({ variant, size }), className)
```

## Common Variant Patterns

### Status Variants

```typescript
const statusVariants = cva('rounded-full px-2 py-1 text-xs font-medium', {
    variants: {
        status: {
            active: 'bg-green-100 text-green-800',
            inactive: 'bg-gray-100 text-gray-800',
            pending: 'bg-yellow-100 text-yellow-800',
            error: 'bg-red-100 text-red-800',
        },
    },
    defaultVariants: {
        status: 'inactive',
    },
})
```

### Size + Variant Combinations

```typescript
const cardVariants = cva('rounded-lg border', {
    variants: {
        variant: {
            default: 'bg-card text-card-foreground',
            elevated: 'bg-card text-card-foreground shadow-lg',
            outlined: 'bg-transparent',
        },
        padding: {
            none: '',
            sm: 'p-4',
            md: 'p-6',
            lg: 'p-8',
        },
    },
    defaultVariants: {
        variant: 'default',
        padding: 'md',
    },
})
```

### Compound Variants

Apply styles when multiple variant conditions match:

```typescript
const alertVariants = cva('rounded-lg p-4', {
    variants: {
        variant: {
            info: 'bg-blue-50 text-blue-900',
            warning: 'bg-yellow-50 text-yellow-900',
            error: 'bg-red-50 text-red-900',
        },
        size: {
            sm: 'text-sm',
            lg: 'text-base',
        },
    },
    compoundVariants: [
        {
            variant: 'error',
            size: 'lg',
            className: 'border-2 border-red-500',
        },
    ],
    defaultVariants: {
        variant: 'info',
        size: 'sm',
    },
})
```

## Key Rules

- Define CVA variants outside component functions (not inside render)
- Always include `defaultVariants` in CVA definitions
- Use `cn()` to merge CVA output with custom `className` prop
- Extend `VariantProps<typeof variants>` in props interface for type safety
- Use semantic color tokens (`primary`, `destructive`) over raw colors
- Group related styles in the base string to avoid duplication across variants
- Avoid inline styles and arbitrary Tailwind values when design tokens exist
