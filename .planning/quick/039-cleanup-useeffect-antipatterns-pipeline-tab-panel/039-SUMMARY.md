# Quick Task 039 Summary: Clean up useEffect anti-patterns

## What Changed

### `app/components/pipeline-builder/pipeline-tab-panel.tsx`

**Before (anti-pattern):**
- 3 useEffect hooks managing state synchronization
- Race condition when `initialData` arrived after initial render
- Complex ref tracking to prevent multiple syncs

**After (correct pattern):**
- Zero useEffect hooks
- Lazy initialization during render: if pipeline not in store, load it immediately
- Simple, deterministic, synchronous

### `app/routes/pipelines.$id.tsx`

**Before:**
- useEffect to sync URL changes to tab store
- Re-ran whenever `requestedPipeline` changed (data loading)

**After:**
- Render-time sync with ref to track last synced URL
- Only syncs when URL actually changes

### `app/components/pipeline-builder/pipeline-tab-panel.test.tsx`

Updated tests to reflect new behavior:
- Removed tests for "late arriving initialData" sync (no longer a concept)
- Added test for "does not reload if already in store"
- Tests now verify lazy initialization pattern

## Files Modified

1. `app/components/pipeline-builder/pipeline-tab-panel.tsx` - Removed 3 useEffects, added lazy init
2. `app/routes/pipelines.$id.tsx` - Replaced useEffect with render-time sync
3. `app/components/pipeline-builder/pipeline-tab-panel.test.tsx` - Updated for new behavior

## Verification

- TypeScript compiles with zero errors
- All 148 tests pass
