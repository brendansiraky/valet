# Phase 4: Pipeline Builder - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Visual canvas for constructing pipelines by arranging and connecting agents. Users can drag agents from their library onto the canvas, connect them in sequence, reorder them, save pipeline definitions, and create reusable templates with input variables. Execution is a separate phase.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

User delegated all implementation decisions. Guidelines from project research:

**Canvas interaction:**
- Standard drag-and-drop patterns
- Simplified for non-technical users (simpler than n8n)
- Sequential layout (no branching complexity)

**Agent nodes:**
- Display agent name and key info
- Clear selection/hover states
- Reasonable size for readability

**Connections:**
- Visual representation of sequential flow
- Clear indication of data passing between agents
- Support reordering (drag or move up/down)

**Templates & variables:**
- Save pipeline as template
- Define input variables that inject into agent prompts
- Load templates from library

**Key constraints from research:**
- Sequential pipelines only (deliberate simplicity)
- No branching/conditional logic
- Non-technical user focus
- Standard visual workflow patterns

</decisions>

<specifics>
## Specific Ideas

From project context and research:
- "Sets up agents once, then runs automated pipelines" — reusability is key
- "Same pipeline, different inputs" — variables enable true reusability
- Target user is content writer (Luke) — not a developer
- Simpler than competitors like n8n — focus on sequential document workflows

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-pipeline-builder*
*Context gathered: 2026-01-28*
