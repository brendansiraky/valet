---
status: diagnosed
phase: 04-pipeline-builder
source: 04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md
started: 2026-01-28T11:00:00Z
updated: 2026-01-28T11:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Navigate to Pipelines
expected: Click "Pipelines" in the dashboard navigation. Pipelines list page appears with empty state or existing pipelines shown as cards.
result: pass

### 2. Create New Pipeline
expected: Click "New Pipeline" or equivalent button. Pipeline builder opens with empty canvas and agent sidebar visible.
result: pass

### 3. Drag Agent to Canvas
expected: Drag an agent from the sidebar onto the canvas. Agent appears as a node showing name and instructions with input/output connection handles.
result: pass

### 4. Connect Two Agents
expected: Drag from one agent's output handle to another agent's input handle. A connection line appears linking the two nodes.
result: pass

### 5. Auto-Layout Pipeline
expected: Click "Auto Layout" button. Nodes rearrange in a left-to-right flow using dagre layout.
result: pass

### 6. Save Pipeline
expected: Click "Save" button. Pipeline persists. Refreshing the page reloads the same nodes and connections.
result: pass

### 7. Load Existing Pipeline
expected: From pipelines list, click on a saved pipeline card. Builder opens with previously saved nodes and connections restored.
result: pass

### 8. Delete Pipeline
expected: Click delete button on pipeline. Pipeline removed from list. Navigating to its URL shows error or redirects.
result: pass

### 9. Save as Template
expected: Click "Save as Template" button. Template dialog opens where you can define variables (name, description, default value).
result: pass

### 10. Define Template Variables
expected: In template dialog, add a variable with name and optional description/default. Save template. Dialog closes.
result: issue
reported: "variables save but Edit Template shows empty dialog - doesn't load saved variables"
severity: major

### 11. Run with Variable Fill
expected: Click "Run" button on a pipeline with template variables. Variable fill dialog opens prompting for values before execution.
result: pass

## Summary

total: 11
passed: 10
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "Template variables persist after saving and appear when reopening Edit Template"
  status: failed
  reason: "User reported: variables save but Edit Template shows empty dialog - doesn't load saved variables"
  severity: major
  test: 10
  root_cause: "TemplateDialog component does not accept initialVariables prop; useState always initializes empty"
  artifacts:
    - path: "app/components/pipeline-builder/template-dialog.tsx"
      issue: "Missing initialVariables prop; useState hardcoded to empty array"
    - path: "app/routes/pipelines.$id.tsx"
      issue: "Does not pass templateVariables to TemplateDialog"
  missing:
    - "Add initialVariables prop to TemplateDialogProps interface"
    - "Initialize useState with initialVariables"
    - "Add useEffect to reset state when initialVariables changes"
    - "Pass initialVariables={templateVariables} in route"
  debug_session: ".planning/debug/template-dialog-not-loading.md"
