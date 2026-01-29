# Quick Task 009: Persist Collapsed Sidebar State via Browser Storage

## Goal
Make the sidebar collapsed/expanded state persist across page refreshes using browser localStorage.

## Current State
- `SidebarProvider` in `app/components/ui/sidebar.tsx` has cookie-based persistence code
- However, the component doesn't read from the cookie on initial load
- `defaultOpen` always starts as `true`, ignoring any stored preference

## Solution
Modify `SidebarProvider` to:
1. Use localStorage instead of cookies (simpler client-side API)
2. Read stored state on mount (with SSR safety)
3. Persist state changes to localStorage

## Tasks

### Task 1: Update SidebarProvider to persist state via localStorage
**File:** `app/components/ui/sidebar.tsx`

**Changes:**
1. Replace cookie constants with localStorage key constant
2. Add initialization logic to read from localStorage on mount
3. Update `setOpen` to persist to localStorage instead of cookie
4. Handle SSR safety (check for window availability)

**Implementation:**
- Change `SIDEBAR_COOKIE_NAME` to `SIDEBAR_STORAGE_KEY = "sidebar:state"`
- Remove `SIDEBAR_COOKIE_MAX_AGE` (not needed for localStorage)
- In `SidebarProvider`, use `useState` with a lazy initializer to read from localStorage
- Update `setOpen` callback to write to localStorage

## Verification
- Load the app with sidebar expanded → collapse it → refresh → should stay collapsed
- Expand sidebar → refresh → should stay expanded
- Works correctly on initial page load (no flash of wrong state)
