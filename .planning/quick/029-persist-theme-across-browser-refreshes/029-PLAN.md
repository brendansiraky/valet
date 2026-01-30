---
id: "029"
title: "Persist theme across browser refreshes"
type: quick
files_modified:
  - app/root.tsx
autonomous: true

must_haves:
  truths:
    - "Theme selection persists across browser refresh"
    - "All 10 themes recognized on page load"
  artifacts:
    - path: "app/root.tsx"
      provides: "themeInitScript with complete themes array"
      contains: "northern-lights"
  key_links:
    - from: "app/root.tsx themeInitScript"
      to: "app/lib/themes.ts"
      via: "hardcoded array must match exported themes"
---

<objective>
Update the blocking theme init script in root.tsx to recognize all 10 available themes.

Purpose: Currently the script only knows 5 themes. When a user selects one of the 5 newer themes (northern-lights, neo-brutalism, nature, modern-minimal, mocha-mousse), localStorage saves it, but on refresh the init script doesn't recognize it and falls back to 'notebook'.

Output: Theme selection persists correctly for all themes.
</objective>

<context>
@app/root.tsx (lines 53-74 contain themeInitScript)
@app/lib/themes.ts (defines all 10 themes)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update themes array in themeInitScript</name>
  <files>app/root.tsx</files>
  <action>
Update line 55 in app/root.tsx to include all 10 themes from themes.ts:

Current (missing 5 themes):
```javascript
var themes = ['tangerine', 'bubblegum', 'sunset-horizon', 'soft-pop', 'notebook'];
```

Updated (all 10 themes):
```javascript
var themes = ['tangerine', 'bubblegum', 'sunset-horizon', 'soft-pop', 'notebook', 'northern-lights', 'neo-brutalism', 'nature', 'modern-minimal', 'mocha-mousse'];
```

This is a single-line change. The array order doesn't matter for functionality.
  </action>
  <verify>
1. `grep -n "northern-lights" app/root.tsx` returns the updated line
2. Count themes in array equals 10
  </verify>
  <done>themeInitScript recognizes all 10 themes</done>
</task>

<task type="auto">
  <name>Task 2: Verify theme persistence manually</name>
  <files>None</files>
  <action>
Test the fix:
1. Run `npm run dev` if not already running
2. Open browser to localhost:5173
3. Open Settings, select "Northern Lights" theme
4. Refresh the page
5. Confirm theme persists (page loads with northern-lights, not notebook)

Also verify localStorage:
```javascript
// In browser console
localStorage.getItem('valet-theme') // should return 'northern-lights'
```
  </action>
  <verify>Page refresh maintains the selected theme for any of the 10 themes</verify>
  <done>Theme persistence works for all themes including the 5 newer ones</done>
</task>

</tasks>

<verification>
- All 10 theme IDs appear in themeInitScript themes array
- Selecting any theme and refreshing maintains that theme
- No TypeScript errors: `npm run typecheck`
</verification>

<success_criteria>
- Theme selection persists across browser refresh for ALL themes
- No visual flash (FOUC) on page load
- themeInitScript themes array matches themes.ts exports
</success_criteria>

<output>
Report completion. This is a minimal fix - single array update.
</output>
