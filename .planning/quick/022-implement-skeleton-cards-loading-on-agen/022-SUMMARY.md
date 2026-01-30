---
id: "022"
title: Implement skeleton cards loading on Agents screen
type: quick
status: complete
completed: 2026-01-30
duration: 2 min

key-files:
  created:
    - app/components/agent-card-skeleton.tsx
  modified:
    - app/routes/agents.tsx
---

# Quick Task 022: Implement Skeleton Cards Loading on Agents Screen

**One-liner:** Replaced spinner with 6 animated skeleton cards matching AgentCard layout structure for modern loading UX.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create AgentCardSkeleton component and replace spinner | 89416f4 | agent-card-skeleton.tsx, agents.tsx |

## Implementation Details

### AgentCardSkeleton Component

Created a new skeleton component at `app/components/agent-card-skeleton.tsx` that matches the exact layout of `ResourceCard`/`AgentCard`:

- **CardHeader**: Skeleton for title (h-5 w-32) and timestamp (h-4 w-24)
- **CardContent**: Three skeleton lines for description (w-full, w-full, w-2/3)
- **CardFooter**: Three button skeletons for Test, Edit, Delete actions

### Agents Route Changes

- Removed `Loader2` icon import (no longer needed)
- Added `AgentCardSkeleton` import
- Replaced centered spinner with 6 skeleton cards in the same responsive grid layout (`md:grid-cols-2 lg:grid-cols-3`)

## Deviations from Plan

None - plan executed exactly as written.

## Benefits

1. **Reduced perceived loading time**: Users see content structure immediately
2. **No layout shift**: Skeleton dimensions match real card dimensions exactly
3. **Modern UX pattern**: Consistent with contemporary web application standards
4. **Reusable component**: `AgentCardSkeleton` can be used elsewhere if needed

## Verification

- [x] `npm run typecheck` passes
- [x] Skeleton structure matches AgentCard layout (header, content, footer)
- [x] 6 skeleton cards display in responsive 3-column grid during loading
