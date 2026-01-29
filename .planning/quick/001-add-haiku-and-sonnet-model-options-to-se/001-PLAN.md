# Quick Task 001: Add Haiku and Sonnet Model Options

## Task Description
Add Claude Haiku and Claude Sonnet models to the available models list in settings, which will also make them available in agent model selection.

## Analysis
- Single source of truth: `app/lib/models.ts` contains `AVAILABLE_MODELS` array
- This array is imported by:
  - `app/routes/settings.tsx` - settings model preference dropdown
  - `app/components/agent-form-dialog.tsx` - agent model selection dropdown
- Adding models to this array automatically propagates to both locations

## Tasks

### Task 1: Update AVAILABLE_MODELS array
**File:** `app/lib/models.ts`

Add Sonnet and Haiku model entries:
- Claude Sonnet 4.5: `claude-sonnet-4-5-20250929`
- Claude 3.5 Haiku: `claude-3-5-haiku-20241022`

## Verification
- TypeScript compilation passes (ModelId type auto-updates from const assertion)
- Settings page shows all three models in dropdown
- Agent form dialog shows all three models in dropdown
