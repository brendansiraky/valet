# React Best Practices

This reference covers fundamental React patterns and anti-patterns for building maintainable applications.

## Breaking UI into Components

- Each component should focus on **one thing** (single responsibility)
- UI components naturally align with data model structure
- Components appearing within others should be children in the hierarchy

```
FilterableProductTable
  ├── SearchBar
  └── ProductTable
      ├── ProductCategoryRow
      └── ProductRow
```

## Build Static First, Add Interactivity Later

- Start without state—render UI from data model first
- Use props for initial data flow from parent to child
- Add state only when you need interactivity

## Identifying Minimal State

State should only include data that:
1. **Changes over time**, AND
2. **Cannot be computed** from other data

Ask these questions for each piece of data:
- Does it remain unchanged? → **Not state**
- Is it passed from a parent via props? → **Not state**
- Can you compute it from existing state or props? → **Not state**

## Where State Should Live

1. Identify every component that uses that state
2. Find their **closest common parent** component
3. Place state in that common parent (or above it)

## One-Way Data Flow

- Data flows **downward** from parent to child via props
- Children request state changes by calling handler functions passed as props
- Parents own and update state

```typescript
// Parent owns state and passes handler to child
function FilterableProductTable() {
    const [filterText, setFilterText] = useState('')

    return (
        <SearchBar
            filterText={filterText}
            onFilterTextChange={setFilterText}
        />
    )
}

// Child calls handler when user interacts
function SearchBar({ filterText, onFilterTextChange }: SearchBarProps) {
    return (
        <input
            value={filterText}
            onChange={(e) => onFilterTextChange(e.target.value)}
        />
    )
}
```

## Props vs State

| Props | State |
|-------|-------|
| Arguments passed from parent → child | Component's internal memory |
| Read-only for the receiving component | Can be updated by the owning component |
| Like function parameters | Triggers re-renders when changed |

## Don't Abuse useEffect

`useEffect` has ONE purpose: **synchronizing with external systems** (code not controlled by React).

### Valid useEffect Use Cases

- Timer management (`setInterval`/`clearInterval`)
- Event subscriptions (`addEventListener`/`removeEventListener`)
- Third-party library APIs
- Network connections (WebSockets, chat servers)
- Browser APIs (IntersectionObserver, dialog management)

```typescript
useEffect(() => {
    const connection = createConnection(serverUrl, roomId)
    connection.connect()
    return () => connection.disconnect()
}, [serverUrl, roomId])
```

### Anti-Patterns to Avoid

**Derived state** — calculate during render instead:

```typescript
// BAD
useEffect(() => {
    setFullName(firstName + ' ' + lastName)
}, [firstName, lastName])

// GOOD
const fullName = firstName + ' ' + lastName
```

**Transforming data** — filter/map during render:

```typescript
// BAD
useEffect(() => {
    setFilteredList(items.filter(item => item.active))
}, [items])

// GOOD
const filteredList = items.filter(item => item.active)
```

**Handling user events** — use event handlers:

```typescript
// BAD
useEffect(() => {
    if (submitted) handleSubmit()
}, [submitted])

// GOOD
<button onClick={handleSubmit}>Submit</button>
```

### Data Fetching

Don't use raw `useEffect` for data fetching. Use TanStack Query (React Query) which handles caching, race conditions, and loading states.

### Red Flags

If your Effect is doing any of these, you probably don't need it:
- Calculating values from props/state
- Transforming data for rendering
- Handling form inputs
- Adjusting state based on other state
- Running on every render (missing dependency array)

**Rule of thumb:** If you're not synchronizing with an external system, you don't need `useEffect`.

## useMemo and useCallback

These hooks are **performance optimizations**, not defaults. Don't use them unless you have a measured performance problem.

### When useMemo IS Needed

1. **Expensive calculations** (1ms+ measured impact):
```typescript
const sortedItems = useMemo(
    () => items.sort((a, b) => a.name.localeCompare(b.name)),
    [items]
)
```

2. **Passing objects/arrays to memoized components**:
```typescript
const filters = useMemo(() => ({ status, category }), [status, category])
return <MemoizedList filters={filters} />
```

3. **Stabilizing dependencies for other hooks**:
```typescript
const options = useMemo(() => ({ serverUrl, roomId }), [serverUrl, roomId])

useEffect(() => {
    const connection = createConnection(options)
    connection.connect()
    return () => connection.disconnect()
}, [options])
```

### When useCallback IS Needed

1. **Passing functions to memoized components**:
```typescript
const handleDelete = useCallback((id: string) => {
    deleteMutation.mutate(id)
}, [deleteMutation])

return <MemoizedTable onDelete={handleDelete} />
```

2. **Function used as dependency in other hooks**:
```typescript
const fetchData = useCallback(() => {
    return api.getData(userId)
}, [userId])

useEffect(() => {
    fetchData()
}, [fetchData])
```

### When NOT to Use Them

```typescript
// UNNECESSARY - simple calculations
const doubled = useMemo(() => count * 2, [count])

// UNNECESSARY - not passed to memoized component
const handleClick = useCallback(() => {
    setOpen(true)
}, [])

// UNNECESSARY - inline object in non-memoized component
const style = useMemo(() => ({ color: 'red' }), [])
```

### useMemo vs useCallback

| Hook | Caches | Use For |
|------|--------|---------|
| `useMemo` | The **result** of a function | Expensive calculations, objects, arrays |
| `useCallback` | The **function itself** | Event handlers passed to memoized children |

```typescript
// These are equivalent
useCallback(fn, deps)
useMemo(() => fn, deps)
```

### Better Alternatives to Memoization

Before reaching for useMemo/useCallback, try:
- **Keep state local** — don't lift state higher than necessary
- **Accept children as props** — prevents re-rendering wrapper contents
- **Move objects/functions inside useEffect** — removes the need to stabilize them
- **Split components** — isolate frequently-changing parts

**Rule of thumb:** Profile first. If you can't measure the slowdown, you don't need memoization.
