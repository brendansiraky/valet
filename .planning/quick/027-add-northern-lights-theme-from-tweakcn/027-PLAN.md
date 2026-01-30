# Quick Task 027: Add Northern Lights Theme from tweakcn

## Goal
Add the northern-lights theme from tweakcn to the application, ensuring it appears in the settings dropdown.

## Tasks

### Task 1: Add theme entry to themes.ts
**File:** `app/lib/themes.ts`

Add a new entry to the `themes` object:
```typescript
"northern-lights": {
  name: "Northern Lights",
  fonts: {
    sans: "Plus Jakarta Sans",
    mono: "JetBrains Mono",
    serif: "Source Serif 4",
  },
},
```

### Task 2: Add CSS variables to app.css
**File:** `app/app.css`

Add `.theme-northern-lights` (light mode) and `.theme-northern-lights.dark` CSS blocks with all variables from the tweakcn theme JSON.

Insert after the notebook theme section (before `@layer base`).

## Verification
- Theme appears in settings dropdown
- Theme applies correctly in light mode
- Theme applies correctly in dark mode
