---
phase: quick-006
plan: 01
subsystem: pipeline-runner
tags: [dialog, textarea, pipeline-input, ux]
dependency-graph:
  requires: []
  provides: [pipeline-run-input-dialog]
  affects: []
tech-stack:
  added: []
  patterns: [radix-dialog, controlled-textarea]
file-tracking:
  key-files:
    created: []
    modified:
      - app/routes/pipelines.$id.tsx
decisions: []
metrics:
  duration: 3 min
  completed: 2026-01-29
---

# Quick Task 006: Add Pipeline Run Input Dialog Summary

**One-liner:** Dialog with textarea prompts user for input text before running a pipeline, replacing hardcoded empty input.

## What Was Built

Added a dialog that opens when clicking the Run button on a saved pipeline. The dialog contains:

- A title "Run Pipeline"
- A description explaining the purpose
- A multi-line textarea (6 rows) for entering input text
- Cancel button that closes without side effects
- Run Pipeline button that submits the input and starts execution

## Implementation Details

### Changes to `app/routes/pipelines.$id.tsx`

1. **New imports:**
   - Dialog components from `~/components/ui/dialog`
   - Textarea from `~/components/ui/textarea`

2. **New state:**
   - `isRunDialogOpen` - controls dialog visibility
   - `runInput` - stores textarea content

3. **Modified functions:**
   - `startPipelineRun(input: string)` - now accepts input parameter
   - `handleRun()` - opens dialog instead of running immediately
   - New `handleRunSubmit()` - closes dialog, runs pipeline with input, resets state

4. **JSX additions:**
   - Dialog component with controlled open state
   - Textarea with controlled value
   - Cancel and Run Pipeline buttons

## Commits

| Hash | Message |
|------|---------|
| dc5d52d | feat(quick-006): add pipeline run input dialog with textarea |

## Files Modified

| File | Changes |
|------|---------|
| app/routes/pipelines.$id.tsx | +48/-4 lines - added Dialog, Textarea, state, handlers |

## Verification

- [x] `npm run typecheck` passes
- [x] Run button opens dialog with textarea
- [x] Cancel closes dialog without starting pipeline
- [x] Run Pipeline submits input and starts execution
- [x] Input passed to API (not hardcoded empty string)

## Deviations from Plan

None - plan executed exactly as written.
