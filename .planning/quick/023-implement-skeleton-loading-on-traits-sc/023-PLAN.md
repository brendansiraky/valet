# Quick Task 023: Implement Skeleton Loading on Traits Screen

## Goal

Replace spinner loading state with skeleton cards on the Traits screen for modern UX.

## Tasks

### Task 1: Create TraitCardSkeleton and update Traits screen

**Files:**
- `app/components/trait-card-skeleton.tsx` (create)
- `app/routes/traits.tsx` (modify)

**Implementation:**
1. Create `TraitCardSkeleton` component matching TraitCard layout
   - Card with left border accent (muted color for skeleton)
   - Header: title + timestamp skeletons
   - Content: 3-line description skeleton
   - Footer: 2 button skeletons (Edit, Delete)
2. Update Traits screen loading state to show 6 skeleton cards in grid

## Verification

- [ ] TraitCardSkeleton matches TraitCard structure
- [ ] Loading state shows skeleton grid instead of spinner
- [ ] Build passes
