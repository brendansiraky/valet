---
phase: quick-016
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/components/resource-card.tsx
autonomous: true

must_haves:
  truths:
    - "Trait cards on My Traits screen display full border in trait color"
    - "Border thickness remains 4px on all sides"
    - "Cards without accentColor remain unchanged"
  artifacts:
    - path: "app/components/resource-card.tsx"
      provides: "Full border accent color styling"
      contains: "border-4"
  key_links:
    - from: "app/components/trait-card.tsx"
      to: "app/components/resource-card.tsx"
      via: "accentColor prop"
      pattern: "accentColor={trait.color}"
---

<objective>
Extend trait tile border color from left-only (border-l-4) to full border on all sides for the My Traits screen.

Purpose: Provide stronger visual identity for trait cards by using the trait's color on all four borders instead of just the left edge.

Output: Updated ResourceCard component with full border when accentColor is provided.
</objective>

<execution_context>
@/Users/brendan/.claude/get-shit-done/workflows/execute-plan.md
@/Users/brendan/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@app/components/resource-card.tsx
@app/components/trait-card.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update ResourceCard border from left-only to full border</name>
  <files>app/components/resource-card.tsx</files>
  <action>
In ResourceCard component, change the border styling when accentColor is provided:

1. Change the className conditional from `border-l-4` to `border-4`
2. Change the style from `borderLeftColor` to `borderColor`

Current code (lines 62-65):
```tsx
<Card
  className={`flex flex-col${accentColor ? " border-l-4" : ""}`}
  style={accentColor ? { borderLeftColor: accentColor } : undefined}
>
```

Updated code:
```tsx
<Card
  className={`flex flex-col${accentColor ? " border-4" : ""}`}
  style={accentColor ? { borderColor: accentColor } : undefined}
>
```

This maintains the same 4px border thickness but applies it to all sides.
  </action>
  <verify>
1. Run `npm run typecheck` - should pass
2. Navigate to /traits in browser
3. Verify trait cards show full border in their assigned color
4. Verify cards on other screens using ResourceCard without accentColor are unaffected
  </verify>
  <done>Trait cards on My Traits screen display their color as a full 4px border on all sides instead of left-only.</done>
</task>

</tasks>

<verification>
- [ ] Trait cards show full border in trait color
- [ ] Border thickness is consistent (4px) on all sides
- [ ] ResourceCard without accentColor shows default border styling
- [ ] No visual regression on other screens using ResourceCard
</verification>

<success_criteria>
- ResourceCard applies `border-4` and `borderColor` when accentColor provided
- Trait cards visually display full-border color treatment
- TypeScript compiles without errors
</success_criteria>

<output>
After completion, create `.planning/quick/016-extend-trait-tile-border-color-to-full/016-SUMMARY.md`
</output>
