---
id: "022"
title: Implement skeleton cards loading on Agents screen
type: quick
status: planned
created: 2026-01-30
---

<objective>
Replace the spinner loading state on the Agents screen with skeleton cards that mimic the AgentCard layout structure.

Purpose: Modern UX pattern that shows placeholder shapes matching the content structure, reducing perceived loading time and eliminating layout shift when content appears.
Output: Agents screen displays 6 skeleton cards in the same grid layout while loading.
</objective>

<context>
@app/routes/agents.tsx - Current loading state with spinner
@app/components/ui/skeleton.tsx - Existing Skeleton component
@app/components/resource-card.tsx - Card layout structure to mimic
@app/components/agent-card.tsx - AgentCard structure (uses ResourceCard)
</context>

<tasks>

<task type="auto">
  <name>Create AgentCardSkeleton component and replace spinner</name>
  <files>app/components/agent-card-skeleton.tsx, app/routes/agents.tsx</files>
  <action>
1. Create `app/components/agent-card-skeleton.tsx`:
   - Mimic the ResourceCard structure:
     - Card with `flex flex-col` layout
     - CardHeader with pb-2: Skeleton for title (h-5 w-32), Skeleton for "Updated X ago" (h-4 w-24)
     - CardContent with flex-1: Skeleton for description (3 lines: h-4 w-full, h-4 w-full, h-4 w-2/3)
     - CardFooter with flex-wrap gap-2: 3 button skeletons (h-9 w-16 each for Test, Edit, Delete)
   - Use the existing Skeleton component from ui/skeleton

2. Update `app/routes/agents.tsx` loading state:
   - Remove Loader2 icon import (if unused elsewhere)
   - Import AgentCardSkeleton
   - Replace the centered spinner with:
     ```tsx
     <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
       {Array.from({ length: 6 }).map((_, i) => (
         <AgentCardSkeleton key={i} />
       ))}
     </div>
     ```
  </action>
  <verify>
    - `npm run typecheck` passes
    - Load /agents with network throttling (slow 3G) - should show 6 skeleton cards in grid
    - Skeletons match the visual structure of real AgentCards (header, content, footer)
    - When data loads, smooth transition to real cards with no layout shift
  </verify>
  <done>
    - AgentCardSkeleton component exists at app/components/agent-card-skeleton.tsx
    - Agents screen shows skeleton cards grid during loading instead of spinner
    - Skeleton structure matches AgentCard layout (title, timestamp, description, 3 buttons)
  </done>
</task>

</tasks>

<verification>
1. Navigate to /agents with DevTools Network tab set to "Slow 3G"
2. Observe skeleton cards appear immediately in 3-column grid
3. Confirm skeleton structure matches real AgentCard structure
4. When data loads, real cards replace skeletons without layout shift
</verification>

<success_criteria>
- Spinner replaced with skeleton cards on Agents loading state
- 6 skeleton cards shown in responsive grid (1/2/3 columns)
- Skeleton anatomy matches AgentCard: title, timestamp, description (3 lines), 3 action buttons
- No layout shift when transitioning from skeleton to real content
</success_criteria>

<output>
After completion, update `.planning/STATE.md` quick tasks table with this entry.
</output>
