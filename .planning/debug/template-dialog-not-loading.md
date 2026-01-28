---
status: investigating
trigger: "Edit Template dialog doesn't load saved template variables"
created: 2026-01-28T00:00:00Z
updated: 2026-01-28T00:00:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED - TemplateDialog never receives initialVariables prop
test: Traced complete data flow
expecting: Found where data breaks
next_action: Return diagnosis

## Symptoms

expected: When clicking "Edit Template", TemplateDialog should show previously saved variables
actual: TemplateDialog opens empty, no saved variables displayed
errors: None reported
reproduction: 1) Save template variables 2) Click Edit Template 3) Dialog is empty
started: Unknown - variables ARE saved (confirmed via Run button showing them)

## Eliminated

## Evidence

- timestamp: 2026-01-28T00:01:00Z
  checked: Loader in pipelines.$id.tsx (lines 23-61)
  found: Template IS loaded from database and returned to component
  implication: Data available at page level

- timestamp: 2026-01-28T00:02:00Z
  checked: Component state in pipelines.$id.tsx (lines 73-75)
  found: templateVariables state initialized from template?.variables || []
  implication: Variables ARE available in the page component

- timestamp: 2026-01-28T00:03:00Z
  checked: VariableFillDialog usage (lines 282-288)
  found: Receives `variables={templateVariables}` - explains why Run shows them
  implication: Data flow works to VariableFillDialog

- timestamp: 2026-01-28T00:04:00Z
  checked: TemplateDialog usage (lines 276-281)
  found: DOES NOT receive any variables prop - no initialVariables passed
  implication: TemplateDialog has no way to know about existing variables

- timestamp: 2026-01-28T00:05:00Z
  checked: TemplateDialog props interface (lines 18-23)
  found: Only accepts { open, onOpenChange, pipelineId, onSave }
  implication: No prop defined for initial/existing variables

- timestamp: 2026-01-28T00:06:00Z
  checked: TemplateDialog internal state (lines 31-33)
  found: Always initializes to [{ name: "", description: "", defaultValue: "" }]
  implication: Hardcoded empty state, never receives existing data

## Resolution

root_cause: TemplateDialog component does not accept an initialVariables prop, and the parent component does not pass the existing templateVariables to it. The dialog's internal state always initializes with an empty variable object.
fix:
verification:
files_changed: []
