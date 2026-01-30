---
id: quick-037
type: quick
subsystem: ui
tags: [resource-card, styling, trait-tiles]

key-files:
  modified:
    - app/components/resource-card.tsx

duration: 1min
completed: 2026-01-30
---

# Quick Task 037: Change Trait Tile Border to Left-Only Color

**Reverted ResourceCard accent border from all-sides to left-only for subtler category indicator styling**

## Performance

- **Duration:** 1 min
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Changed `borderColor` to `borderLeftColor` in ResourceCard style prop
- Trait tiles now show colored left border only, other borders use theme default
- Reverts styling from quick-016 to more subtle left-only accent pattern

## Task Commits

1. **Task 1: Change borderColor to borderLeftColor** - `5ef1fb7` (fix)

## Files Modified

- `app/components/resource-card.tsx` - Changed `borderColor` to `borderLeftColor` in style prop

## Decisions Made

None - followed plan as specified (single property name change).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

---
*Quick Task: 037*
*Completed: 2026-01-30*
