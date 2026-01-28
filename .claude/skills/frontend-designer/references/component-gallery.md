# Component Gallery Reference

Visual patterns and consistent implementations for common UI components.

## Buttons

### Button Variants

```typescript
// Primary action (default)
<Button>Save Changes</Button>

// Destructive action
<Button variant="destructive">Delete</Button>

// Secondary action
<Button variant="secondary">Cancel</Button>

// Subtle action
<Button variant="ghost">Edit</Button>

// Outlined
<Button variant="outline">View Details</Button>

// Text link style
<Button variant="link">Learn More</Button>
```

### Button Sizes

```typescript
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Plus /></Button>
<Button size="icon-sm"><X /></Button>
```

### Button with Icon

```typescript
// Icon before text
<Button>
    <Plus /> Add Item
</Button>

// Icon after text
<Button>
    Continue <ArrowRight />
</Button>

// Icon-only button
<Button variant="ghost" size="icon">
    <Settings />
    <span className="sr-only">Settings</span>
</Button>
```

### Button Loading State

```typescript
<Button disabled={isLoading}>
    {isLoading ? (
        <>
            <Loader2 className="animate-spin" />
            Saving...
        </>
    ) : (
        'Save'
    )}
</Button>
```

## Cards

### Basic Card

```typescript
<div className="rounded-lg border bg-card p-6 shadow-sm">
    <h3 className="font-semibold">Card Title</h3>
    <p className="mt-2 text-sm text-muted-foreground">Card description</p>
</div>
```

### Card with Header and Footer

```typescript
<div className="rounded-lg border bg-card shadow-sm">
    <div className="border-b px-6 py-4">
        <h3 className="font-semibold">Card Title</h3>
    </div>
    <div className="p-6">
        {/* Card content */}
    </div>
    <div className="border-t bg-muted/50 px-6 py-4">
        <Button>Action</Button>
    </div>
</div>
```

### Interactive Card

```typescript
<button className="w-full rounded-lg border bg-card p-6 text-left transition-colors hover:bg-accent">
    <div className="flex items-start justify-between">
        <div className="space-y-1">
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </div>
</button>
```

### Stats Card

```typescript
<div className="rounded-lg border bg-card p-6">
    <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">Total Users</p>
        <Users className="h-4 w-4 text-muted-foreground" />
    </div>
    <p className="mt-2 text-3xl font-bold">2,345</p>
    <p className="mt-1 text-sm text-green-600">
        <TrendingUp className="mr-1 inline h-3 w-3" />
        +12% from last month
    </p>
</div>
```

## Form Elements

### Input Field

```typescript
<div className="space-y-2">
    <Label htmlFor="email">Email</Label>
    <Input id="email" type="email" placeholder="you@example.com" />
</div>
```

### Input with Error

```typescript
<div className="space-y-2">
    <Label htmlFor="email">Email</Label>
    <Input
        id="email"
        type="email"
        aria-invalid={!!error}
        className="border-destructive focus-visible:ring-destructive"
    />
    <p className="text-sm text-destructive">{error}</p>
</div>
```

### Form Group with Description

```typescript
<FormField
    control={form.control}
    name="username"
    render={({ field }) => (
        <FormItem>
            <FormLabel>Username</FormLabel>
            <FormControl>
                <Input placeholder="johndoe" {...field} />
            </FormControl>
            <FormDescription>
                This is your public display name.
            </FormDescription>
            <FormMessage />
        </FormItem>
    )}
/>
```

### Search Input

```typescript
<div className="relative">
    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    <Input placeholder="Search..." className="pl-9" />
</div>
```

## Badges & Status Indicators

### Badge Variants

```typescript
// Default
<span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
    Badge
</span>

// Status badges
<span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
    Active
</span>

<span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
    Pending
</span>

<span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-200">
    Error
</span>

<span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200">
    Draft
</span>
```

### Status Dot

```typescript
<span className="flex items-center gap-2">
    <span className="h-2 w-2 rounded-full bg-green-500" />
    Online
</span>
```

## Avatars

### Basic Avatar

```typescript
<div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
    <span className="text-sm font-medium text-primary">JD</span>
</div>
```

### Avatar with Image

```typescript
<img
    src={user.avatarUrl}
    alt={user.name}
    className="h-10 w-10 rounded-full object-cover"
/>
```

### Avatar Group

```typescript
<div className="flex -space-x-2">
    {users.slice(0, 3).map((user) => (
        <img
            key={user.id}
            src={user.avatarUrl}
            alt={user.name}
            className="h-8 w-8 rounded-full border-2 border-white dark:border-gray-950"
        />
    ))}
    {users.length > 3 && (
        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-xs font-medium dark:border-gray-950 dark:bg-gray-800">
            +{users.length - 3}
        </div>
    )}
</div>
```

## Empty States

### Basic Empty State

```typescript
<div className="flex flex-col items-center justify-center py-12 text-center">
    <Inbox className="h-12 w-12 text-muted-foreground" />
    <h3 className="mt-4 text-lg font-semibold">No items yet</h3>
    <p className="mt-1 text-sm text-muted-foreground max-w-sm">
        Get started by creating your first item.
    </p>
    <Button className="mt-4">
        <Plus /> Create Item
    </Button>
</div>
```

### Empty Search Results

```typescript
<div className="flex flex-col items-center justify-center py-12 text-center">
    <Search className="h-12 w-12 text-muted-foreground" />
    <h3 className="mt-4 text-lg font-semibold">No results found</h3>
    <p className="mt-1 text-sm text-muted-foreground">
        Try adjusting your search or filters.
    </p>
</div>
```

## Loading States

### Button Loading

```typescript
<Button disabled>
    <Loader2 className="animate-spin" />
    Loading...
</Button>
```

### Skeleton Card

```typescript
<div className="rounded-lg border p-6 space-y-4">
    <Skeleton className="h-6 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
    <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
    </div>
</div>
```

### Skeleton Table Row

```typescript
<tr>
    <td className="p-4"><Skeleton className="h-4 w-24" /></td>
    <td className="p-4"><Skeleton className="h-4 w-32" /></td>
    <td className="p-4"><Skeleton className="h-4 w-20" /></td>
    <td className="p-4"><Skeleton className="h-8 w-8 rounded" /></td>
</tr>
```

## Tables

### Basic Table

```typescript
<div className="rounded-lg border">
    <table className="w-full">
        <thead className="border-b bg-muted/50">
            <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
            </tr>
        </thead>
        <tbody className="divide-y">
            {items.map((item) => (
                <tr key={item.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm">{item.name}</td>
                    <td className="px-4 py-3 text-sm">{item.status}</td>
                    <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm">Edit</Button>
                    </td>
                </tr>
            ))}
        </tbody>
    </table>
</div>
```

## Navigation

### Tab Navigation

```typescript
<nav className="flex border-b">
    {tabs.map((tab) => (
        <button
            key={tab.id}
            className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setActiveTab(tab.id)}
        >
            {tab.label}
        </button>
    ))}
</nav>
```

### Sidebar Navigation

```typescript
<nav className="space-y-1">
    {items.map((item) => (
        <Link
            key={item.href}
            to={item.href}
            className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
        >
            <item.icon className="h-4 w-4" />
            {item.label}
        </Link>
    ))}
</nav>
```

## Alerts & Messages

### Info Alert

```typescript
<div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
    <div className="flex gap-3">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100">Note</h4>
            <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
                Information message here.
            </p>
        </div>
    </div>
</div>
```

### Warning Alert

```typescript
<div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950">
    <div className="flex gap-3">
        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        <div>
            <h4 className="font-medium text-yellow-900 dark:text-yellow-100">Warning</h4>
            <p className="mt-1 text-sm text-yellow-800 dark:text-yellow-200">
                Warning message here.
            </p>
        </div>
    </div>
</div>
```

### Error Alert

```typescript
<div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
    <div className="flex gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
        <div>
            <h4 className="font-medium text-red-900 dark:text-red-100">Error</h4>
            <p className="mt-1 text-sm text-red-800 dark:text-red-200">
                Error message here.
            </p>
        </div>
    </div>
</div>
```

## Dropdown Menus

### Action Dropdown

```typescript
<DropdownMenu>
    <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
        </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
        <DropdownMenuItem>
            <Edit className="mr-2 h-4 w-4" />
            Edit
        </DropdownMenuItem>
        <DropdownMenuItem>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive">
            <Trash className="mr-2 h-4 w-4" />
            Delete
        </DropdownMenuItem>
    </DropdownMenuContent>
</DropdownMenu>
```

## Dialogs

### Confirmation Dialog

```typescript
<AlertDialog>
    <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete</Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
        <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the item.
            </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
        </AlertDialogFooter>
    </AlertDialogContent>
</AlertDialog>
```

### Form Dialog

```typescript
<Dialog open={open} onOpenChange={setOpen}>
    <DialogContent>
        <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>
                Make changes to your item here.
            </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
                {/* Form fields */}
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                </Button>
                <Button type="submit">Save changes</Button>
            </DialogFooter>
        </form>
    </DialogContent>
</Dialog>
```

## Tooltips

### Basic Tooltip

```typescript
<TooltipProvider>
    <Tooltip>
        <TooltipTrigger asChild>
            <Button variant="ghost" size="icon">
                <HelpCircle className="h-4 w-4" />
            </Button>
        </TooltipTrigger>
        <TooltipContent>
            <p>Helpful information here</p>
        </TooltipContent>
    </Tooltip>
</TooltipProvider>
```
