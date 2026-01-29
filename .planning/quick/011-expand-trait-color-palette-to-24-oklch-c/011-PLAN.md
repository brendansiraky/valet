---
phase: quick-011
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/lib/trait-colors.ts
autonomous: true

must_haves:
  truths:
    - "User sees 24 color swatches in the trait form dialog"
    - "Colors span the full hue spectrum (reds, oranges, yellows, greens, blues, purples, pinks)"
    - "Colors are vibrant and distinguishable from each other"
    - "Existing traits with old hex colors still display correctly"
  artifacts:
    - path: "app/lib/trait-colors.ts"
      provides: "24 OKLCH trait colors"
      exports: ["TRAIT_COLORS", "DEFAULT_TRAIT_COLOR"]
  key_links:
    - from: "app/components/trait-form-dialog.tsx"
      to: "app/lib/trait-colors.ts"
      via: "import TRAIT_COLORS"
      pattern: "import.*TRAIT_COLORS.*from.*trait-colors"
---

<objective>
Expand the trait color palette from 10 arbitrary colors to 24 well-distributed OKLCH colors spanning the full color spectrum.

Purpose: Give users a much broader range of colors for organizing and visually distinguishing their traits.
Output: Updated trait-colors.ts with 24 OKLCH color values that work well in both light and dark modes.
</objective>

<execution_context>
@/Users/brendan/.claude/get-shit-done/workflows/execute-plan.md
@/Users/brendan/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@app/lib/trait-colors.ts
@app/components/color-swatch-picker.tsx
@app/components/trait-form-dialog.tsx
@app/components/trait-card.tsx
@app/app.css
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace trait colors with 24 OKLCH colors</name>
  <files>app/lib/trait-colors.ts</files>
  <action>
Replace the current 10-color hex palette with a new 24-color OKLCH palette.

Design the palette with these requirements:
1. Use OKLCH format: `oklch(L C H)` where:
   - L (lightness): ~0.65-0.70 for good contrast on white backgrounds and white text readability
   - C (chroma): ~0.15-0.20 for vibrant but not garish colors
   - H (hue): evenly distributed around the 360° color wheel

2. Hue distribution - spread across the spectrum with 15° intervals:
   - Reds: 0°, 15°, 30°
   - Oranges: 45°, 60°
   - Yellows: 75°, 90° (may need lower chroma to avoid being too bright)
   - Lime/Green: 120°, 135°, 150°
   - Teal/Cyan: 165°, 180°, 195°
   - Blues: 210°, 225°, 240°
   - Indigo/Purple: 255°, 270°, 285°
   - Magenta/Pink: 300°, 315°, 330°, 345°

3. Fine-tune individual colors:
   - Yellows (60-90°): Lower lightness (~0.75-0.80) and chroma (~0.12-0.15) to stay visible
   - Blues (210-270°): Can have higher chroma (~0.18-0.22) for vibrancy
   - Add variety by slightly varying L and C values so colors feel natural, not mechanical

4. Use descriptive names that match the actual hue:
   - Ruby, Crimson, Scarlet, Coral, Tangerine, Amber, Gold, Lime, Emerald, Jade, Teal, Cyan, Sky, Azure, Cobalt, Indigo, Violet, Purple, Orchid, Magenta, Rose, Blush, etc.

5. Keep the same export structure:
   ```typescript
   export const TRAIT_COLORS = [
     { name: "Ruby", value: "oklch(0.65 0.20 15)" },
     // ... 23 more
   ] as const;

   export const DEFAULT_TRAIT_COLOR = TRAIT_COLORS[0].value;
   ```

Note: Existing traits may have old hex values stored in the database. The app uses inline styles which accept any valid CSS color, so old hex values and new OKLCH values will both work.
  </action>
  <verify>
1. Run `npm run typecheck` to verify TypeScript compiles
2. Start dev server and navigate to /traits
3. Click "Create Trait" and verify 24 color swatches appear
4. Visually confirm colors span the full rainbow spectrum
5. Test in both light and dark modes
  </verify>
  <done>
- trait-colors.ts exports 24 OKLCH colors
- Colors span full hue range (reds through pinks)
- All colors are distinguishable and vibrant
- Color picker displays 24 swatches in the form dialog
  </done>
</task>

</tasks>

<verification>
- [ ] `npm run typecheck` passes
- [ ] Color picker shows 24 swatches
- [ ] Colors span full spectrum (not just warm colors)
- [ ] Colors work in both light and dark modes
- [ ] Existing traits with hex colors still display correctly
</verification>

<success_criteria>
1. TRAIT_COLORS array contains exactly 24 color objects
2. All colors use OKLCH format
3. Hues are distributed across the full 0-360° spectrum
4. Colors are visually distinct and suitable for the app's design
</success_criteria>

<output>
After completion, create `.planning/quick/011-expand-trait-color-palette-to-24-oklch-c/011-SUMMARY.md`
</output>
