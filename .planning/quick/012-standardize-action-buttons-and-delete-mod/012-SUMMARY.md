---
phase: quick-012
plan: 01
subsystem: ui-components
tags: [delete-dialog, ux-consistency, shadcn, alert-dialog]

dependency-graph:
  requires: [agent-delete-dialog]
  provides: [trait-delete-dialog, pipeline-delete-dialog, pipeline-card]
  affects: []

tech-stack:
  added: []
  patterns: [delete-confirmation-modal]

key-files:
  created:
    - app/components/trait-delete-dialog.tsx
    - app/components/pipeline-delete-dialog.tsx
    - app/components/pipeline-card.tsx
  modified:
    - app/components/trait-card.tsx
    - app/components/agent-card.tsx
    - app/routes/pipelines.tsx

decisions:
  - context: "Delete confirmation pattern"
    choice: "AlertDialog with Form for delete actions"
    reason: "Consistent with existing AgentDeleteDialog, uses shadcn AlertDialog, server-side delete via Form"

metrics:
  duration: 2 min
  completed: 2026-01-29
---

# Quick Task 012: Standardize Action Buttons and Delete Modals

Delete confirmation modals for Traits and Pipelines, removed timestamps from Agent and Pipeline cards.

## Summary

Added delete confirmation modals to Traits and Pipelines pages following the existing AgentDeleteDialog pattern. Removed "Updated at" timestamps from Agent and Pipeline cards for cleaner UI. Created a reusable PipelineCard component.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add delete confirmation modal to Traits | 9fbb11c | trait-delete-dialog.tsx, trait-card.tsx |
| 2 | Remove "Updated at" from Agents page | 55d4efd | agent-card.tsx |
| 3 | Add Delete button with modal to Pipelines | c838d77 | pipeline-delete-dialog.tsx, pipeline-card.tsx, pipelines.tsx |

## Changes Made

### TraitDeleteDialog Component
- New component at `app/components/trait-delete-dialog.tsx`
- Uses AlertDialog with destructive action button
- Form posts with intent="delete" and traitId hidden input
- Matches AgentDeleteDialog pattern exactly

### TraitCard Updates
- Replaced direct Form delete button with TraitDeleteDialog wrapper
- Delete button now opens confirmation modal before deletion

### AgentCard Updates
- Removed `formatRelativeTime` function
- Removed "Updated X ago" display section
- Removed `updatedAt` from AgentCardProps type

### PipelineDeleteDialog Component
- New component at `app/components/pipeline-delete-dialog.tsx`
- Uses AlertDialog with destructive action button
- Form posts with intent="delete" and pipelineId hidden input

### PipelineCard Component
- New component at `app/components/pipeline-card.tsx`
- Card with title/description and delete button
- Click on card navigates to pipeline detail
- Delete button stops propagation to prevent navigation
- No timestamp displayed

### Pipelines Route Updates
- Added action handler for intent="delete"
- Imports and uses PipelineCard component
- Removed inline card rendering with timestamps

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- [x] Traits page has Edit/Delete buttons with Delete showing modal
- [x] Agents page shows Test/Edit/Delete buttons, no timestamps
- [x] Pipelines page has Delete button with modal, no timestamps
- [x] All delete operations require confirmation before executing
- [x] `npm run typecheck` passes
