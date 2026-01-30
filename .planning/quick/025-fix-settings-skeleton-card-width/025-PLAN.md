---
task: 025
type: quick
title: Fix Settings skeleton card width to match actual settings cards
files_modified:
  - app/components/settings-skeleton.tsx
---

<objective>
Fix the SettingsSkeleton component so skeleton cards match the width of actual settings cards.

Problem: The skeleton cards appear skinny/narrow while the actual settings cards are wider (single column, full container width).

Root cause: The skeleton Cards need to explicitly fill their container width to match how the actual settings Cards render.
</objective>

<context>
@app/components/settings-skeleton.tsx - skeleton component to fix
@app/routes/settings.tsx - actual settings page for reference (lines 150-344 show Card structure)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add w-full to skeleton Cards</name>
  <files>app/components/settings-skeleton.tsx</files>
  <action>
    Update all Card components in SettingsSkeleton to include `className="w-full"` to ensure they fill the container width, matching the actual settings cards.

    Each Card element (Profile, Anthropic API, OpenAI API, Appearance, Account sections) should have:
    ```tsx
    <Card className="w-full">
    ```

    This ensures the skeleton cards expand to fill the max-w-2xl container the same way the actual cards do.
  </action>
  <verify>
    1. Run `npm run dev` and navigate to /settings
    2. Refresh page to observe skeleton loading state
    3. Skeleton cards should now match the width of actual settings cards
    4. Visual comparison: skeleton cards fill the same horizontal space as loaded cards
  </verify>
  <done>
    Skeleton cards render at full container width, matching the actual settings cards layout.
  </done>
</task>

</tasks>

<verification>
- Visual: Skeleton cards fill the same width as actual settings cards
- No layout shift when transitioning from skeleton to loaded state
- TypeScript compiles without errors
</verification>

<success_criteria>
- Settings skeleton cards match the width of actual settings cards
- Smooth visual transition from loading to loaded state
</success_criteria>
