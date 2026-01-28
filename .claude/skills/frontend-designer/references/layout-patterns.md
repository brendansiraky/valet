# Layout Patterns Reference

Page layouts, section structures, and responsive patterns for the Valet application.

## Page Layout Types

### Dashboard Layout

Full-width layout with header and content area:

```typescript
export function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            <Header />
            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>
        </div>
    )
}
```

### Editor Layout

Sidebar + main content with collapsible panel:

```typescript
interface EditorLayoutProps {
    sidebar: React.ReactNode
    children: React.ReactNode
    sidebarOpen?: boolean
}

export function EditorLayout({ sidebar, children, sidebarOpen = true }: EditorLayoutProps) {
    return (
        <div className="flex h-screen overflow-hidden">
            <aside className={cn(
                'border-r border-gray-200 dark:border-gray-700 transition-all duration-300',
                sidebarOpen ? 'w-80' : 'w-0 overflow-hidden'
            )}>
                {sidebar}
            </aside>
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    )
}
```

### Centered Form Layout

Narrow centered container for auth and settings:

```typescript
export function CenteredFormLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
            <div className="w-full max-w-md space-y-8">
                {children}
            </div>
        </div>
    )
}
```

### Split Layout

Two-column layout for comparison or side-by-side:

```typescript
export function SplitLayout({
    left,
    right
}: {
    left: React.ReactNode
    right: React.ReactNode
}) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>{left}</div>
            <div>{right}</div>
        </div>
    )
}
```

## Page Structure Patterns

### Standard Page with Header

```typescript
interface PageProps {
    title: string
    description?: string
    actions?: React.ReactNode
    children: React.ReactNode
}

export function Page({ title, description, actions, children }: PageProps) {
    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {title}
                    </h1>
                    {description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                            {description}
                        </p>
                    )}
                </div>
                {actions && (
                    <div className="flex items-center gap-2">
                        {actions}
                    </div>
                )}
            </header>
            <main>{children}</main>
        </div>
    )
}
```

### Settings Page Structure

```typescript
<div className="space-y-8">
    <section className="space-y-4">
        <div>
            <h2 className="text-lg font-semibold">Section Title</h2>
            <p className="text-sm text-muted-foreground">Section description</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
            {/* Section content */}
        </div>
    </section>

    <section className="space-y-4">
        {/* Another section */}
    </section>
</div>
```

## Section Patterns

### Hero Section

```typescript
export function HeroSection() {
    return (
        <section className="py-16 sm:py-24 lg:py-32">
            <div className="mx-auto max-w-4xl text-center">
                <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl lg:text-6xl">
                    Main Headline
                </h1>
                <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                    Supporting description text that explains the value proposition.
                </p>
                <div className="mt-10 flex items-center justify-center gap-4">
                    <Button size="lg">Primary Action</Button>
                    <Button variant="outline" size="lg">Secondary Action</Button>
                </div>
            </div>
        </section>
    )
}
```

### Feature Grid

```typescript
export function FeatureGrid({ features }: { features: Feature[] }) {
    return (
        <section className="py-16">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {features.map((feature) => (
                    <div key={feature.id} className="space-y-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <feature.icon className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold">{feature.title}</h3>
                        <p className="text-muted-foreground">{feature.description}</p>
                    </div>
                ))}
            </div>
        </section>
    )
}
```

### Card Grid

```typescript
// 3-column responsive grid
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {items.map((item) => (
        <Card key={item.id} className="p-6">
            {/* Card content */}
        </Card>
    ))}
</div>

// 2-column with sidebar
<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
    <div className="lg:col-span-2">
        {/* Main content */}
    </div>
    <aside>
        {/* Sidebar */}
    </aside>
</div>
```

### List Section

```typescript
<section className="space-y-4">
    <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Section Title</h2>
        <Button variant="outline" size="sm">View All</Button>
    </div>
    <div className="divide-y divide-gray-200 dark:divide-gray-700 rounded-lg border">
        {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-4">
                <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                </div>
                <Button variant="ghost" size="sm">
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        ))}
    </div>
</section>
```

## Container Widths

| Class | Width | Usage |
|-------|-------|-------|
| `max-w-sm` | 384px | Small modals, tooltips |
| `max-w-md` | 448px | Auth forms, narrow dialogs |
| `max-w-lg` | 512px | Standard dialogs |
| `max-w-xl` | 576px | Wide dialogs |
| `max-w-2xl` | 672px | Content pages |
| `max-w-4xl` | 896px | Article content |
| `max-w-6xl` | 1152px | Wide content |
| `max-w-7xl` | 1280px | Dashboard container |

### Responsive Padding

```typescript
// Standard page container
'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'

// Narrow content container
'mx-auto max-w-2xl px-4'

// Full-width with padding
'px-4 sm:px-6 lg:px-8'
```

## Flex Patterns

### Horizontal Alignment

```typescript
// Space between
<div className="flex items-center justify-between">

// Centered
<div className="flex items-center justify-center">

// End-aligned
<div className="flex items-center justify-end gap-2">

// Start-aligned with gap
<div className="flex items-center gap-4">
```

### Vertical Stacking

```typescript
// With consistent spacing
<div className="space-y-4">

// Flex column
<div className="flex flex-col gap-4">

// Centered vertically and horizontally
<div className="flex min-h-screen items-center justify-center">
```

## Responsive Patterns

### Mobile-First Stack to Row

```typescript
<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>Content</div>
    <div>Actions</div>
</div>
```

### Hide/Show by Breakpoint

```typescript
// Hide on mobile, show on desktop
<div className="hidden lg:block">

// Show on mobile, hide on desktop
<div className="lg:hidden">

// Show inline on larger screens
<span className="hidden sm:inline">
```

### Responsive Grid

```typescript
// Progressive column count
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

// Two to three columns
<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
```

## Header Patterns

### App Header

```typescript
<header className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-4">
                <Logo />
                <nav className="hidden md:flex items-center gap-4">
                    {/* Nav items */}
                </nav>
            </div>
            <div className="flex items-center gap-2">
                {/* User menu, actions */}
            </div>
        </div>
    </div>
</header>
```

### Page Header with Breadcrumbs

```typescript
<header className="space-y-4">
    <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/dashboard">Dashboard</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">Current Page</span>
    </nav>
    <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Page Title</h1>
        <Button>Action</Button>
    </div>
</header>
```

## Footer Patterns

### Page Footer

```typescript
<footer className="border-t border-gray-200 dark:border-gray-700 py-8 mt-auto">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
                © 2024 Company. All rights reserved.
            </p>
            <nav className="flex gap-4 text-sm text-muted-foreground">
                <Link to="/privacy">Privacy</Link>
                <Link to="/terms">Terms</Link>
            </nav>
        </div>
    </div>
</footer>
```

### Sticky Footer Actions

```typescript
<footer className="sticky bottom-0 border-t bg-white dark:bg-gray-950 px-6 py-4">
    <div className="flex items-center justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button>Save Changes</Button>
    </div>
</footer>
```
