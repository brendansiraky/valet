---
phase: quick
plan: 010
type: execute
wave: 1
depends_on: []
files_modified:
  - app/routes/settings.tsx
  - app/components/app-sidebar.tsx
autonomous: true

must_haves:
  truths:
    - "API keys are visually grouped by provider (Anthropic section, OpenAI section)"
    - "Default model selection is in its own tile indicating it's a global setting"
    - "Theme selector appears in settings page, not in sidebar"
    - "Sign out button and email display are in settings page, not sidebar"
    - "Profile section exists as placeholder for future features"
    - "Settings page has organized sections with clear visual hierarchy"
  artifacts:
    - path: "app/routes/settings.tsx"
      provides: "Redesigned settings page with organized sections"
    - path: "app/components/app-sidebar.tsx"
      provides: "Simplified sidebar without theme/account elements"
  key_links:
    - from: "app/routes/settings.tsx"
      to: "ThemeSwitcher"
      via: "import and render"
      pattern: "ThemeSwitcher"
---

<objective>
Redesign the settings page with improved UX and organization.

Purpose: The current settings page has API keys, model selection, and footer navigation all in one card. This redesign will create distinct sections grouped logically (profile, API keys by provider, global settings, appearance, account actions) with better visual hierarchy and a more aesthetically pleasing layout.

Output: A well-organized settings page with multiple tiles/sections, theme moved from sidebar to settings, and sign out/email moved from sidebar to settings.
</objective>

<execution_context>
@/Users/brendan/.claude/get-shit-done/workflows/execute-plan.md
@/Users/brendan/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@app/routes/settings.tsx
@app/components/app-sidebar.tsx
@app/components/ui/theme-switcher.tsx
@app/components/theme-provider.tsx
@app/lib/themes.ts
@.claude/skills/frontend-designer/SKILL.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Redesign settings page layout with organized sections</name>
  <files>app/routes/settings.tsx</files>
  <action>
Redesign the settings page with a proper settings layout pattern (not centered single card):

**Layout structure:**
- Use `max-w-2xl mx-auto` container with `space-y-8` between sections
- Page header with title "Settings" and subtitle
- Multiple Card sections for different setting groups

**Sections to create (each as a Card):**

1. **Profile Section** (placeholder for future)
   - CardHeader: "Profile" title, "Manage your account details" description
   - CardContent: User email display, placeholder text "Profile picture and name coming soon"

2. **Anthropic API Key Section**
   - CardHeader: "Anthropic" title with Anthropic icon/branding hint, description about Claude models
   - CardContent: Existing API key form
   - Show validation status if key exists

3. **OpenAI API Key Section**
   - CardHeader: "OpenAI" title with OpenAI icon/branding hint, description about GPT models
   - CardContent: Existing OpenAI API key form
   - Show validation status if key exists

4. **Default Model Section** (separate tile, global setting emphasis)
   - CardHeader: "Default Model" title, description explicitly stating "Global setting applied to new agents"
   - CardContent: Model selector (existing logic)
   - Only show if at least one API key is configured
   - Use a subtle info callout to indicate this is a global default

5. **Appearance Section**
   - CardHeader: "Appearance" title, "Customize how Valet looks" description
   - CardContent: Theme selector (import ThemeSwitcher from ~/components/ui/theme-switcher)

6. **Account Section** (at bottom)
   - CardHeader: "Account" title
   - CardContent: Sign out button (Form method="post" action="/logout")
   - Use destructive variant for sign out button

**Design details (from frontend-designer skill):**
- Cards use `rounded-lg border bg-card p-6` or Card components
- Section titles: `text-lg font-semibold`
- Descriptions: `text-sm text-muted-foreground`
- Spacing between form fields: `space-y-4`
- Button variants: primary for save actions, outline for secondary, destructive for sign out
- Remove "Back to Dashboard" link (user has sidebar navigation)

**Flash messages:** Keep success/error messages at top of page, styled consistently.
  </action>
  <verify>
Run `npm run typecheck` - no TypeScript errors.
Visual inspection: Settings page shows organized sections with proper visual hierarchy.
  </verify>
  <done>
Settings page displays with 6 distinct sections (Profile, Anthropic, OpenAI, Default Model, Appearance, Account) each in their own Card with appropriate titles, descriptions, and content.
  </done>
</task>

<task type="auto">
  <name>Task 2: Simplify sidebar by removing theme and account elements</name>
  <files>app/components/app-sidebar.tsx</files>
  <action>
Remove the following from the sidebar footer since they now live in settings:

1. Remove ThemeSwitcher import and usage
2. Remove user email display
3. Remove sign out button/form

**What remains in SidebarFooter:**
- Keep the SidebarFooter component but it can be empty or removed entirely
- The sidebar should only contain: Header (logo + collapse trigger), NavMain content

**Alternatively:** If SidebarFooter becomes empty, remove it entirely for cleaner code.

The sidebar should now be purely navigation-focused with no account/preference elements.
  </action>
  <verify>
Run `npm run typecheck` - no TypeScript errors.
Visual inspection: Sidebar no longer shows theme selector, email, or sign out button.
  </verify>
  <done>
Sidebar displays only the Valet logo, collapse trigger, and main navigation. Theme, email, and sign out are no longer present.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Redesigned settings page with organized sections and simplified sidebar</what-built>
  <how-to-verify>
1. Navigate to http://localhost:5173/settings
2. Verify you see distinct sections: Profile, Anthropic, OpenAI, Default Model (if keys exist), Appearance, Account
3. Verify theme selector works in Appearance section
4. Verify sign out button is in Account section (test that it works)
5. Check sidebar no longer has theme selector, email, or sign out
6. Verify the overall layout feels organized and aesthetically pleasing
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<verification>
- `npm run typecheck` passes
- Settings page renders all sections without errors
- Theme switching works from settings page
- Sign out works from settings page
- Sidebar is simplified (navigation only)
</verification>

<success_criteria>
- Settings page has 6 organized sections in Cards
- API keys grouped separately by provider (Anthropic, OpenAI)
- Default model in its own "global setting" tile
- Theme selector moved from sidebar to settings Appearance section
- Sign out and email moved from sidebar to settings Account/Profile sections
- Sidebar contains only logo and navigation
- Layout follows frontend-designer skill patterns (spacing, typography, colors)
</success_criteria>

<output>
After completion, create `.planning/quick/010-redesign-settings-page-with-improved-ux-/010-SUMMARY.md`
</output>
