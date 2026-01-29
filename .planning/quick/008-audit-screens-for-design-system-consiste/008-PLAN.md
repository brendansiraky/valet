---
type: quick
task: 008
title: Fix design system inconsistencies across screens
files_modified:
  - app/routes/agents.tsx
  - app/routes/traits.tsx
  - app/routes/pipelines.tsx
  - app/routes/artifacts.tsx
  - app/components/agent-card.tsx
  - app/components/trait-card.tsx
  - app/components/agent-form-dialog.tsx
  - app/components/trait-form-dialog.tsx
---

<objective>
Fix design system inconsistencies found during audit of agents, pipelines, traits, settings screens and sidebar.

Purpose: Ensure visual consistency across all screens by applying design system standards.
Output: All screens using consistent typography, spacing, and icon sizing patterns.
</objective>

<context>
@.claude/skills/frontend-designer/SKILL.md

**Audit findings:**

1. **Page titles use wrong typography**
   - Current: `text-3xl font-bold` (some with `tracking-tight`)
   - Design system: `text-2xl font-semibold`
   - Affected: agents.tsx, traits.tsx, pipelines.tsx, artifacts.tsx

2. **Container layouts inconsistent**
   - agents.tsx and traits.tsx use `max-w-6xl px-4`
   - pipelines.tsx and artifacts.tsx use `container mx-auto`
   - Should standardize on `container mx-auto py-8`

3. **Icon sizing uses old format**
   - Current: `h-4 w-4` or `w-4 h-4`
   - Design system: `size-4`
   - Affected: All button icons in agents, traits, pipelines routes and card components

4. **Card titles on listing pages too large**
   - Current: `text-lg font-semibold`
   - Design system for card titles: `text-base font-semibold`
   - Affected: AgentCard, TraitCard
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix page title typography across all listing screens</name>
  <files>
    app/routes/agents.tsx
    app/routes/traits.tsx
    app/routes/pipelines.tsx
    app/routes/artifacts.tsx
  </files>
  <action>
    Update page title h1 elements to use design system standard:
    - Change from `text-3xl font-bold tracking-tight` or `text-3xl font-bold` to `text-2xl font-semibold`

    In agents.tsx line 206: Change `text-3xl font-bold tracking-tight` to `text-2xl font-semibold`
    In traits.tsx line 144: Change `text-3xl font-bold tracking-tight` to `text-2xl font-semibold`
    In pipelines.tsx line 40: Change `text-3xl font-bold` to `text-2xl font-semibold`
    In artifacts.tsx line 87: Change `text-3xl font-bold` to `text-2xl font-semibold`
  </action>
  <verify>
    Grep for `text-3xl` in routes folder should return no results for these files.
    Grep for `text-2xl font-semibold` in h1 tags should show 4 matches.
  </verify>
  <done>All page titles use `text-2xl font-semibold` per design system.</done>
</task>

<task type="auto">
  <name>Task 2: Standardize container layouts and icon sizing</name>
  <files>
    app/routes/agents.tsx
    app/routes/traits.tsx
    app/routes/pipelines.tsx
    app/routes/artifacts.tsx
    app/components/agent-card.tsx
    app/components/trait-card.tsx
    app/components/agent-form-dialog.tsx
    app/components/trait-form-dialog.tsx
  </files>
  <action>
    **Container layouts:**
    - In agents.tsx: Change outer div from `min-h-screen px-4 py-8` with `mx-auto max-w-6xl` inner to `container mx-auto py-8` wrapper
    - In traits.tsx: Same change - use `container mx-auto py-8`

    **Icon sizing (use `size-4` instead of `h-4 w-4` or `w-4 h-4`):**
    - In agents.tsx: Change `h-4 w-4` to `size-4` for Plus icon
    - In traits.tsx: Change `h-4 w-4` to `size-4` for Plus icon
    - In pipelines.tsx: Change `w-4 h-4` to `size-4` for Plus icon
    - In agent-card.tsx: Change all `h-4 w-4` to `size-4` (Play, Pencil, Trash2 icons)
    - In trait-card.tsx: Change all `h-4 w-4` to `size-4` (Pencil, Trash2 icons)
    - In agent-form-dialog.tsx: Change `h-4 w-4` to `size-4` for Info icon
    - In artifacts.tsx: Change `w-12 h-12` to `size-12` for FileText empty state icon
  </action>
  <verify>
    Grep for `h-4 w-4` or `w-4 h-4` in the modified files should return no results.
    Visual check that icons render at same size (size-4 = 16px = h-4 w-4).
  </verify>
  <done>All containers use consistent layout and all icons use `size-N` format.</done>
</task>

<task type="auto">
  <name>Task 3: Fix card title sizing on listing cards</name>
  <files>
    app/components/agent-card.tsx
    app/components/trait-card.tsx
  </files>
  <action>
    Update CardTitle styling in listing cards to use design system card title size:

    In agent-card.tsx line 51: Change `text-lg font-semibold` to `text-base font-semibold`
    In trait-card.tsx line 47: Change `text-lg font-semibold` to `text-base font-semibold`

    These are cards in a grid listing, not page/section titles, so should use card title sizing.
  </action>
  <verify>
    Grep for `text-lg font-semibold` in agent-card.tsx and trait-card.tsx should return no results.
    Cards should display with slightly smaller titles that match other listing cards.
  </verify>
  <done>Agent and trait cards use `text-base font-semibold` for card titles per design system.</done>
</task>

</tasks>

<verification>
1. Run the app and visually verify:
   - All page titles (Agents, Traits, Pipelines, Artifacts) are same size
   - Icons in buttons render correctly at 16px
   - Card titles on listing pages are consistent size
2. No TypeScript or build errors
</verification>

<success_criteria>
- All h1 page titles use `text-2xl font-semibold`
- Agents and Traits screens use `container mx-auto py-8` layout
- All icons use `size-N` format instead of `h-N w-N`
- Card titles in listing grids use `text-base font-semibold`
- Visual consistency across all audited screens
</success_criteria>
