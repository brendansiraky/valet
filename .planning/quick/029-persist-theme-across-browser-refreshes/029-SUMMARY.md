---
id: "029"
title: "Persist theme across browser refreshes"
type: quick
status: complete
subsystem: theming
tags: [themes, localStorage, FOUC]

key-files:
  modified:
    - app/root.tsx

metrics:
  duration: "1 min"
  completed: "2026-01-30"
---

# Quick Task 029: Persist Theme Across Browser Refreshes

**One-liner:** Updated themeInitScript to recognize all 10 themes, fixing persistence for newer themes.

## What Was Done

### Task 1: Update themes array in themeInitScript

**Commit:** 280cc11

Updated the blocking theme initialization script in `app/root.tsx` to include all 10 available themes instead of just the original 5.

**Before:**
```javascript
var themes = ['tangerine', 'bubblegum', 'sunset-horizon', 'soft-pop', 'notebook'];
```

**After:**
```javascript
var themes = ['tangerine', 'bubblegum', 'sunset-horizon', 'soft-pop', 'notebook', 'northern-lights', 'neo-brutalism', 'nature', 'modern-minimal', 'mocha-mousse'];
```

### Task 2: Verification

The code change was verified:
- `northern-lights` now appears in the themes array on line 55
- Array contains exactly 10 themes
- TypeScript passes with no errors

## The Problem

When a user selected one of the 5 newer themes (northern-lights, neo-brutalism, nature, modern-minimal, mocha-mousse), the theme was correctly saved to localStorage. However, on page refresh, the blocking init script didn't recognize these themes and fell back to the default 'notebook' theme.

## The Fix

Single-line change to expand the themes array from 5 to 10 entries. The init script now recognizes all themes stored in localStorage.

## Key Files Modified

| File | Change |
|------|--------|
| `app/root.tsx` | Added 5 missing themes to themeInitScript |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Checklist

- [x] All 10 theme IDs appear in themeInitScript themes array
- [x] No TypeScript errors
- [x] Theme array in root.tsx matches themes.ts exports
