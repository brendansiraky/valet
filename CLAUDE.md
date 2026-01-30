# Valet - Project Instructions

## Tech Stack

- **Framework**: Remix
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: TanStack Query
- **AI**: Anthropic SDK (@anthropic-ai/sdk)

## Available Skills

Read the relevant skill file when encountering matching work. Do not load all skills - only read what's needed for the current task.

| Skill             | Path                                        | Use When                                                                                                  |
| ----------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Frontend Designer | `.claude/skills/frontend-designer/SKILL.md` | Designing pages, layouts, applying design system, visual consistency, spacing/colors/typography decisions |
| React Components  | `.claude/skills/react-components/SKILL.md`  | Component architecture, prop interfaces, React patterns                                                   |
| React Query       | `.claude/skills/react-query/SKILL.md`       | TanStack Query patterns, query hooks, mutations, caching, invalidation                                    |
| Styling           | `.claude/skills/styling/SKILL.md`           | CVA patterns, Tailwind organization, variant definitions                                                  |
| Vitest Testing    | `.claude/skills/vitest-testing/SKILL.md`    | Writing tests, test patterns, mocking                                                                     |

**Important**: Skills have `references/` subdirectories with additional detail. Read those when the main SKILL.md indicates they're relevant.

## Mandatory Skill Invocation

**ALWAYS invoke these skills before starting related work:**

| Skill | Invoke When | Command |
|-------|-------------|---------|
| **React Query** | Creating/modifying query hooks, adding mutations, working with server data fetching, optimistic updates, cache invalidation | `/react-query` |
| **Frontend Designer** | ANY UI/UX changes - new pages, modifying layouts, adding components, styling updates, visual consistency work | `/frontend-designer` |

These skills contain project-specific patterns and must be loaded to ensure consistency. Do not rely on general knowledge - invoke the skill first.

## Data Fetching

**ALL async server state MUST use TanStack Query.** Invoke `/react-query` for patterns.

- Query hooks live in `app/hooks/queries/`
- Zustand is for local UI state only (sidebar, tabs, form state)
