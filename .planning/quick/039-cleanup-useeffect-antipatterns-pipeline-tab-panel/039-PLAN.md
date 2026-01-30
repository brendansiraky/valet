# Quick Task 039: Clean up useEffect anti-patterns in pipeline-tab-panel

## Goal

Remove useEffect anti-patterns from `pipeline-tab-panel.tsx` and related components, following the new critical rule in CLAUDE.md that prohibits useEffect for state synchronization.

## Analysis

The `pipeline-tab-panel.tsx` component had three useEffect hooks that were anti-patterns:

1. **Line 66-68**: `useEffect` to reset a ref when `pipelineId` changes
2. **Line 71-99**: `useEffect` to load initial data into store
3. **Line 103-112**: `useEffect` to sync name from `initialData` when it arrives "late"

These patterns cause race conditions because:
- Multiple renders can trigger effects in unpredictable order
- Dependencies can change mid-effect execution
- State synchronization via effects creates circular update patterns

## Solution

Replace useEffect-based initialization with **lazy initialization during render**:

1. When component renders, check if pipeline exists in store
2. If not, load it immediately (synchronous, deterministic)
3. Remove all "sync" logic - parent must provide correct data

Additionally cleaned up `pipelines.$id.tsx`:
- Replaced useEffect for URL-to-tab sync with render-time logic using a ref to track last synced URL

## Tasks

- [x] Remove all 3 useEffect hooks from `pipeline-tab-panel.tsx`
- [x] Implement lazy initialization during render
- [x] Update `pipelines.$id.tsx` to use render-time URL sync
- [x] Update tests to reflect new behavior (no "late sync" tests needed)
- [x] Verify typecheck passes
- [x] Verify all tests pass
