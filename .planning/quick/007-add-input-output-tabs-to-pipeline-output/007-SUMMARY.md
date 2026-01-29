---
phase: quick-007
plan: 01
subsystem: ui/output-viewer
tags: [pipeline, output, tabs, download, ux]
dependency-graph:
  requires: [quick-006]
  provides: [step-input-visibility, context-aware-downloads]
  affects: []
tech-stack:
  added: []
  patterns: [nested-tabs, controlled-tabs]
key-files:
  created: []
  modified:
    - app/components/output-viewer/output-viewer.tsx
    - app/components/output-viewer/download-buttons.tsx
    - app/routes/pipelines.$id.tsx
    - app/routes/artifacts.$id.tsx
decisions:
  - id: "Q007-D1"
    choice: "Compute inputs from outputs chain"
    rationale: "No schema change needed - input for step N equals output of step N-1"
metrics:
  duration: "4 min"
  completed: "2026-01-29"
---

# Quick Task 007: Add Input/Output Tabs to Pipeline Output Summary

Users can now see both the input and output for each agent step in a pipeline run, enabling better debugging and understanding of data flow between agents.

## What Was Built

### Input/Output Sub-tabs
Each agent step tab now contains nested "Input" and "Output" sub-tabs:
- **Input tab**: Shows what the agent received (step 0 = run input, step N = step N-1 output)
- **Output tab**: Shows what the agent produced (default view)

### Context-aware Downloads
Download buttons now generate descriptive filenames:
- Step input: `{pipeline}-{agent}-input.txt`
- Step output: `{pipeline}-{agent}-output.txt`
- Final output: `{pipeline}-final.txt`

Example with 3 agents (Researcher, Writer, Editor):
- `my-pipeline-Researcher-input.txt`
- `my-pipeline-Researcher-output.txt`
- `my-pipeline-Writer-input.txt`
- `my-pipeline-Writer-output.txt`
- `my-pipeline-Editor-input.txt`
- `my-pipeline-Editor-output.txt`

## Technical Implementation

### Input Tracking
Instead of modifying the run stream or artifact schema, inputs are computed at display time:
1. Step 0 input = the original `runInput` captured before run starts (stored in ref)
2. Step N input = Step N-1's output (from `stepOutputs` map)

This approach works for both live runs and artifact viewing without requiring schema changes.

### State Management
The OutputViewer tracks which sub-tab is selected for each step using a `Record<number, 'input' | 'output'>` state, defaulting to 'output' view.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 0663590 | feat | Track step inputs in pipeline run |
| 3272f98 | feat | Add input/output sub-tabs to OutputViewer |
| f4dac65 | feat | Add context-aware download filenames |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added input support to artifact viewer**
- **Found during:** Task 2
- **Issue:** artifacts.$id.tsx also uses OutputViewer but didn't provide input
- **Fix:** Compute inputs from artifact data's output chain
- **Files modified:** app/routes/artifacts.$id.tsx
- **Commit:** 3272f98

## Files Modified

- `app/routes/pipelines.$id.tsx`: Store runInput in ref, compute step inputs in handleRunComplete
- `app/components/output-viewer/output-viewer.tsx`: Add nested Tabs for Input/Output per step, track selected view
- `app/components/output-viewer/download-buttons.tsx`: Add stepName and contentType props for descriptive filenames
- `app/routes/artifacts.$id.tsx`: Compute inputs from outputs chain for artifact viewing
