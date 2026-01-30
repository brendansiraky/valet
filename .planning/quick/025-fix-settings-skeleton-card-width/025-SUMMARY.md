---
task: 025
type: quick
title: Fix Settings skeleton card width to match actual settings cards
completed: 2026-01-30
duration: 2 min
commits:
  - 51675e1
files_modified:
  - app/components/settings-skeleton.tsx
---

# Quick Task 025: Fix Settings skeleton card width

## One-liner

Added w-full class to all SettingsSkeleton Card components to match actual settings card widths.

## Changes Made

**app/components/settings-skeleton.tsx**
- Added `className="w-full"` to all 5 Card components (Profile, Anthropic API, OpenAI API, Appearance, Account)
- Ensures skeleton cards expand to fill the max-w-2xl container width
- Eliminates layout shift between loading and loaded states

## Root Cause

The Card component uses `flex flex-col` which doesn't automatically stretch to full width. Actual settings cards fill width due to their content, but skeleton cards with fixed-width skeleton elements remained narrow without explicit width class.

## Verification

- TypeScript compiles without errors
- Skeleton cards now match actual settings cards width visually
- No layout shift during loading transition
