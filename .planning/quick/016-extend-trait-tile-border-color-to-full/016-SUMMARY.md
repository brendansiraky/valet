---
phase: quick-016
plan: 01
subsystem: ui
tags: [styling, traits, resource-card]
dependency-graph:
  requires: []
  provides:
    - Full border accent color styling for ResourceCard
  affects: []
tech-stack:
  added: []
  patterns: []
key-files:
  created: []
  modified:
    - app/components/resource-card.tsx
decisions: []
metrics:
  duration: 2 min
  completed: 2026-01-30
---

# Quick Task 016: Extend Trait Tile Border Color to Full

**One-liner:** Changed ResourceCard from left-only border (border-l-4) to full border (border-4) when accentColor is provided.

## What Was Built

Updated the ResourceCard component to display the accent color as a full 4px border on all sides instead of just the left edge. This provides stronger visual identity for trait cards on the My Traits screen.

## Technical Implementation

### ResourceCard Border Change

Changed the border styling conditional:

**Before:**
```tsx
<Card
  className={`flex flex-col${accentColor ? " border-l-4" : ""}`}
  style={accentColor ? { borderLeftColor: accentColor } : undefined}
>
```

**After:**
```tsx
<Card
  className={`flex flex-col${accentColor ? " border-4" : ""}`}
  style={accentColor ? { borderColor: accentColor } : undefined}
>
```

## Commits

| Hash | Message |
|------|---------|
| 22b729d | feat(quick-016): extend trait tile border from left-only to full border |

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- [x] Trait cards show full border in trait color
- [x] Border thickness is consistent (4px) on all sides
- [x] ResourceCard without accentColor shows default border styling
- [x] TypeScript compiles without errors
