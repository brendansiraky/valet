# Quick Task 008: Fix design system inconsistencies across screens

Design system audit and fix applied to agents, traits, pipelines, artifacts screens and card components.

## Changes Made

### Task 1: Fix page title typography (139123c)
- Changed all page h1 titles from `text-3xl font-bold` to `text-2xl font-semibold`
- Applied to: agents.tsx, traits.tsx, pipelines.tsx, artifacts.tsx
- Matches design system page title standard

### Task 2: Standardize containers and icon sizing (e3c248a)
- Changed agents.tsx and traits.tsx from `max-w-6xl px-4` to `container mx-auto py-8`
- Changed all icons from `h-4 w-4` / `w-4 h-4` format to `size-4` (or `size-12` for larger)
- Applied to routes: agents, traits, pipelines, artifacts
- Applied to components: agent-card, trait-card, agent-form-dialog

### Task 3: Fix card title sizing (cf032f6)
- Changed AgentCard and TraitCard titles from `text-lg` to `text-base font-semibold`
- Matches design system card title standard for listing grids

## Files Modified

- `app/routes/agents.tsx` - title, container, icons
- `app/routes/traits.tsx` - title, container, icons
- `app/routes/pipelines.tsx` - title, icons
- `app/routes/artifacts.tsx` - title, icons
- `app/components/agent-card.tsx` - icons, card title
- `app/components/trait-card.tsx` - icons, card title
- `app/components/agent-form-dialog.tsx` - icons

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- All page titles now use `text-2xl font-semibold`
- All listing containers use `container mx-auto py-8`
- All icons use `size-N` format
- Card titles use `text-base font-semibold`
- TypeScript type check passes

## Metrics

- Tasks: 3/3 complete
- Duration: 2 min
- Commits: 3
