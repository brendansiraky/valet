# Phase 10: Agent UX (Polish & Cleanup) - Research

**Researched:** 2026-01-29
**Domain:** Codebase cleanup and UX polish
**Confidence:** HIGH

## Summary

This research is a **codebase audit** rather than external library research. The goal was to identify dead code from the old capability system, unused files, and UX polish opportunities.

**Key findings:**
1. Three capability service files are completely unused (dead code)
2. The `capability` column and `AgentCapability` type exist but are never used in application logic
3. The unified `runWithTools` pattern has successfully replaced all individual capability runners
4. Several TODO comments indicate missing toast notifications for error handling
5. Some debug console.log statements remain from development

**Primary recommendation:** Delete the three unused capability service files, remove the unused `AgentCapability` type export, and address the TODO items for toast notifications.

## Dead Code Audit

### Files to Delete

| File | Path | Reason | Confidence |
|------|------|--------|------------|
| text-generation.server.ts | `app/services/capabilities/text-generation.server.ts` | Never imported anywhere. Exports `generateText` which has zero usages. | HIGH |
| web-search.server.ts | `app/services/capabilities/web-search.server.ts` | Never imported anywhere. Exports `runWithWebSearch` which has zero usages. | HIGH |
| url-fetch.server.ts | `app/services/capabilities/url-fetch.server.ts` | Never imported anywhere. Exports `runWithUrlFetch` which has zero usages. | HIGH |

**Evidence:**
- Grep for `text-generation.server` in app/: 0 results
- Grep for `web-search.server` in app/: 0 results
- Grep for `url-fetch.server` in app/: 0 results
- Grep for `generateText` in app/: Only found in the file itself
- Grep for `runWithWebSearch` in app/: Only found in the file itself
- Grep for `runWithUrlFetch` in app/: Only found in the file itself

### Unused Types to Remove

| Type | Location | Reason | Confidence |
|------|----------|--------|------------|
| `AgentCapability` | `app/db/schema/agents.ts:4` | Never imported or used. Only exists in schema file. | HIGH |

**Evidence:**
- Grep for `AgentCapability` in app/: Only found in `app/db/schema/agents.ts`

### Database Column Assessment

| Column | Table | Status | Recommendation |
|--------|-------|--------|----------------|
| `capability` | `agents` | Exists with default 'none', never read or written in application code | **Keep for now** - migration adds complexity, value is always 'none' anyway |

**Rationale for keeping the column:**
- Column always has default value 'none'
- No application code reads or writes to it
- Database migration adds operational complexity
- Column is harmless (small storage overhead)
- Can be cleaned up in a future dedicated database cleanup phase

## Active Code Audit

### Currently Used Files

| File | Purpose | Status |
|------|---------|--------|
| `run-with-tools.server.ts` | Unified tool runner with web_search + web_fetch | ACTIVE - used by agent-runner.server.ts and pipeline-executor.server.ts |
| `agent-runner.server.ts` | Agent execution with trait context | ACTIVE |
| `pipeline-executor.server.ts` | Pipeline execution with variable substitution | ACTIVE |

### Import Graph

```
agent-runner.server.ts
  └── run-with-tools.server.ts (ONLY capability file used)

pipeline-executor.server.ts
  └── run-with-tools.server.ts (ONLY capability file used)

text-generation.server.ts     <- DEAD (no importers)
web-search.server.ts          <- DEAD (no importers)
url-fetch.server.ts           <- DEAD (no importers)
```

## UX Polish Opportunities

### TODO Items Found

| Location | Line | TODO | Priority |
|----------|------|------|----------|
| `pipelines.$id.tsx` | 166 | `// TODO: Show toast error` (save failed) | MEDIUM |
| `pipelines.$id.tsx` | 257 | `// TODO: Show toast error` (pipeline start failed) | MEDIUM |
| `pipelines.$id.tsx` | 301 | `// TODO: Show toast error` (run error) | MEDIUM |

### Console Statements to Review

| Location | Line | Statement | Action |
|----------|------|-----------|--------|
| `pipelines.$id.tsx` | 285 | `console.log("Pipeline completed:", finalOutput);` | Remove (debug artifact) |
| `pipelines.$id.tsx` | 298 | `console.error("Pipeline failed:", error);` | Keep (valid error logging) |
| `template-dialog.tsx` | 78 | `console.error("Failed to save template:", error);` | Keep (valid error logging) |
| `use-run-stream.ts` | 122 | `console.error("Failed to parse SSE event:", e);` | Keep (valid error logging) |
| `anthropic.server.ts` | 23 | `console.error("API key validation failed:", error);` | Keep (server-side logging) |
| `job-queue.server.ts` | 28 | `boss.on("error", ...)` | Keep (critical error handler) |
| `url-fetch.server.ts` | 112 | `console.error(...)` | Will be deleted with file |
| `web-search.server.ts` | 85 | `console.error(...)` | Will be deleted with file |

### Agent Test Dialog Assessment

Current state in `agent-test-dialog.tsx`:
- Clean implementation
- Shows model name and token usage
- Has keyboard shortcut hint (Cmd+Enter)
- Displays citations when available

The test dialog appears already polished from Phase 8 work. The PROJECT.md item "Test dialog is clearer about its purpose" seems addressed by the current implementation which clearly says "Test Agent: {name}" and has a "Run Agent" button.

### Pipeline Builder UX Assessment

The pipeline builder in `pipelines.$id.tsx` is functional but missing error feedback:
- Three TODO comments for toast notifications
- One debug console.log to remove
- Output viewer works well with tabs for each step

## Cleanup Checklist

### Must Do (Dead Code)

1. [ ] Delete `app/services/capabilities/text-generation.server.ts`
2. [ ] Delete `app/services/capabilities/web-search.server.ts`
3. [ ] Delete `app/services/capabilities/url-fetch.server.ts`
4. [ ] Remove `AgentCapability` type export from `app/db/schema/agents.ts`

### Should Do (Polish)

5. [ ] Remove `console.log("Pipeline completed:", finalOutput)` from `pipelines.$id.tsx:285`
6. [ ] Add toast notifications for the three TODO items (or decide to defer)

### Consider (Future)

7. [ ] Database migration to remove `capability` column (defer - low impact)
8. [ ] Add toast/sonner for better error feedback throughout app

## Architecture After Cleanup

### Capabilities Directory Structure

**Before:**
```
app/services/capabilities/
├── run-with-tools.server.ts    (USED)
├── text-generation.server.ts   (UNUSED)
├── url-fetch.server.ts         (UNUSED)
└── web-search.server.ts        (UNUSED)
```

**After:**
```
app/services/capabilities/
└── run-with-tools.server.ts    (sole file - unified tool runner)
```

### Schema After Type Removal

**Before (agents.ts):**
```typescript
export type AgentCapability = "none" | "search" | "fetch";  // UNUSED

export const agents = pgTable(...)

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
```

**After (agents.ts):**
```typescript
// AgentCapability type removed - was never used

export const agents = pgTable(...)

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
```

## Open Questions

1. **Toast notifications:** Should we implement toast notifications now or defer?
   - What we know: Three TODO comments exist for error toasts
   - What's unclear: Whether this is blocking for v1.1 release
   - Recommendation: Create as separate optional task, not blocking

2. **Capability column:** Should we remove it from the database?
   - What we know: Column exists, always has value 'none', never read
   - What's unclear: Whether a migration is worth the effort
   - Recommendation: Defer to future cleanup milestone

## Sources

### Primary (HIGH confidence)

All findings based on direct codebase investigation:
- Grep searches for imports and usages
- File reads to verify code structure
- Git status for current state

### Evidence Commands Run

```bash
# Verify files are not imported
grep -r "text-generation.server" app/  # 0 results
grep -r "web-search.server" app/       # 0 results
grep -r "url-fetch.server" app/        # 0 results

# Verify exports are not used
grep -r "generateText" app/            # Only in definition file
grep -r "runWithWebSearch" app/        # Only in definition file
grep -r "runWithUrlFetch" app/         # Only in definition file

# Verify AgentCapability not used
grep -r "AgentCapability" app/         # Only in schema file

# Find run-with-tools usage
grep -r "runWithTools" app/            # 3 files (definition + 2 usages)
```

## Metadata

**Confidence breakdown:**
- Dead code identification: HIGH - Direct grep verification
- UX polish items: HIGH - Direct file inspection
- Architecture impact: HIGH - Clear import graph

**Research date:** 2026-01-29
**Valid until:** N/A (codebase audit, not library research)
