---
id: quick-037
type: quick
title: Change trait tile border to left-only color
status: planned
created: 2026-01-30
files_modified:
  - app/components/resource-card.tsx
---

<objective>
Revert trait tile border styling so only the left border uses the accent color, while other borders use the standard card border color from the theme.

Purpose: Quick task 016 changed the border to apply accent color to all sides. User wants to revert to left-only accent, which is the more subtle and standard design pattern for category/type indicators.

Output: ResourceCard component with `borderLeftColor` instead of `borderColor` in the style prop.
</objective>

<context>
@app/components/resource-card.tsx

Current implementation (line 64):
```tsx
style={accentColor ? { borderColor: accentColor } : undefined}
```

This applies the accent color to ALL four borders. Combined with `border-l-4` class, it creates a thick left border plus colored top/right/bottom borders.

Desired behavior: Only the left border should have the accent color. Other borders should use the theme's default card border.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Change borderColor to borderLeftColor</name>
  <files>app/components/resource-card.tsx</files>
  <action>
  On line 64 of resource-card.tsx, change the style prop from:
  ```tsx
  style={accentColor ? { borderColor: accentColor } : undefined}
  ```
  to:
  ```tsx
  style={accentColor ? { borderLeftColor: accentColor } : undefined}
  ```

  This is a single property name change from `borderColor` to `borderLeftColor`.
  </action>
  <verify>
  1. Run `npm run typecheck` - must pass with no errors
  2. Run `npm test app/components/resource-card` - any existing tests must pass
  3. Visual check: Trait cards on /traits page should show colored left border only, with standard theme border on other sides
  </verify>
  <done>
  - ResourceCard applies accent color only to left border
  - Top, right, and bottom borders use theme default
  - TypeScript compiles without errors
  </done>
</task>

</tasks>

<verification>
```bash
npm run typecheck
npm test
```
Visual: Navigate to /traits page, confirm trait cards have colored left border with standard border on other sides.
</verification>

<success_criteria>
- Single line change: `borderColor` -> `borderLeftColor`
- TypeScript compiles
- All tests pass
- Trait tiles visually show left-only accent color
</success_criteria>
