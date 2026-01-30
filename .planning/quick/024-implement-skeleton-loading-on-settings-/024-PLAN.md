# Quick Task 024: Implement Skeleton Loading on Settings Screen

## Goal

Replace spinner loading state with skeleton cards on the Settings screen for modern UX.

## Tasks

### Task 1: Create SettingsSkeleton and update Settings screen

**Files:**
- `app/components/settings-skeleton.tsx` (create)
- `app/routes/settings.tsx` (modify)

**Implementation:**
1. Create `SettingsSkeleton` component matching Settings page layout
   - Profile section skeleton
   - Anthropic API section skeleton
   - OpenAI API section skeleton
   - Appearance section skeleton (with theme circle placeholders)
   - Account section skeleton
2. Update Settings screen loading state to render SettingsSkeleton

## Verification

- [ ] SettingsSkeleton matches Settings page structure
- [ ] Loading state shows skeleton instead of spinner
- [ ] Build passes
