# Phase 6: Output & Export - Research

**Researched:** 2026-01-28
**Domain:** File downloads, markdown rendering, output viewing UI
**Confidence:** HIGH

## Summary

Phase 6 focuses on allowing users to view pipeline execution outputs and download them as files. The existing codebase already stores all necessary output data in the `pipeline_runs` and `pipeline_run_steps` tables, including `finalOutput` and per-step `output` columns. The phase requires:

1. **Output Viewing UI** - Display outputs from each agent step with proper markdown rendering
2. **Text File Download** - Generate and download final output as `.txt`
3. **Markdown File Download** - Generate and download final output as `.md`

The standard approach uses `react-markdown` for rendering markdown content with proper styling via `@tailwindcss/typography`, and client-side Blob generation for file downloads (no server-side file storage needed).

**Primary recommendation:** Use `react-markdown` with `@tailwindcss/typography` prose classes for viewing, and client-side Blob/createObjectURL pattern for downloads - no additional server infrastructure required.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-markdown | ^9.x | Markdown to React components | 116k+ users, safe by default (no dangerouslySetInnerHTML), plugin ecosystem |
| @tailwindcss/typography | ^0.5.x | Prose styling for rendered content | First-party Tailwind plugin, handles all HTML elements consistently |
| remark-gfm | ^4.x | GitHub Flavored Markdown support | Tables, task lists, strikethrough - expected by users |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| rehype-highlight | ^7.x | Syntax highlighting for code blocks | Only if code output is expected |
| highlight.js | ^11.x | Syntax highlighting engine | Required by rehype-highlight |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-markdown | markdown-to-jsx | Lighter but less plugin ecosystem |
| @tailwindcss/typography | Custom CSS | More work, inconsistent styling |
| Client-side Blob | Server resource route | Unnecessary complexity for text files |

**Installation:**
```bash
npm install react-markdown remark-gfm @tailwindcss/typography
```

## Architecture Patterns

### Recommended Project Structure
```
app/
├── components/
│   └── output-viewer/
│       ├── output-viewer.tsx       # Main output display component
│       ├── step-output-panel.tsx   # Individual step output display
│       └── download-buttons.tsx    # Text/Markdown download actions
├── lib/
│   └── download.ts                 # Client-side download utilities
└── routes/
    └── pipelines.$id.run.$runId.tsx  # Run detail page (new)
```

### Pattern 1: Client-Side File Download
**What:** Generate and trigger file download entirely in browser using Blob API
**When to use:** Text content that doesn't require server processing
**Example:**
```typescript
// Source: MDN Web Docs - Blob API
export function downloadAsFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();

  // Cleanup to prevent memory leaks
  URL.revokeObjectURL(url);
}

// Usage
downloadAsFile(output, 'pipeline-output.txt', 'text/plain');
downloadAsFile(output, 'pipeline-output.md', 'text/markdown');
```

### Pattern 2: Markdown Rendering with Prose Styling
**What:** Render markdown safely with consistent typography
**When to use:** Displaying AI-generated markdown content
**Example:**
```typescript
// Source: react-markdown GitHub
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function OutputDisplay({ content }: { content: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <Markdown remarkPlugins={[remarkGfm]}>
        {content}
      </Markdown>
    </div>
  );
}
```

### Pattern 3: Tabbed Output Display
**What:** Show each agent's output in separate tabs
**When to use:** Multi-step pipeline results
**Example:**
```typescript
// Using shadcn/ui Tabs component
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

function PipelineOutputViewer({ steps }: { steps: StepOutput[] }) {
  return (
    <Tabs defaultValue="step-0">
      <TabsList>
        {steps.map((step, i) => (
          <TabsTrigger key={i} value={`step-${i}`}>
            {step.agentName}
          </TabsTrigger>
        ))}
        <TabsTrigger value="final">Final Output</TabsTrigger>
      </TabsList>

      {steps.map((step, i) => (
        <TabsContent key={i} value={`step-${i}`}>
          <OutputDisplay content={step.output} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
```

### Anti-Patterns to Avoid
- **Server-side file storage:** Don't store generated files on disk; generate on demand from DB content
- **dangerouslySetInnerHTML for markdown:** Always use react-markdown for XSS safety
- **Fetching output in SSE handler:** SSE is for streaming; fetch complete runs via loader

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown rendering | Regex-based converter | react-markdown | XSS vulnerabilities, edge cases in CommonMark spec |
| Prose typography | Custom CSS for each element | @tailwindcss/typography | 20+ HTML elements to style consistently |
| GFM features | Custom table/checkbox parser | remark-gfm | Spec compliance is complex |
| File downloads | Form POST to server | Blob + createObjectURL | No server round-trip needed for text |

**Key insight:** Text/markdown downloads are pure client-side operations. The content already exists in the React state from the database loader. Server resource routes are unnecessary overhead.

## Common Pitfalls

### Pitfall 1: Typography Styles Clashing
**What goes wrong:** shadcn/ui base styles override markdown prose styles
**Why it happens:** CSS specificity conflicts between component library and typography plugin
**How to avoid:** Apply prose classes to a dedicated container, use `max-w-none` to prevent width constraints
**Warning signs:** Headings look like body text, lists have no bullets

### Pitfall 2: Memory Leaks from Object URLs
**What goes wrong:** Browser accumulates blob URLs, consuming memory
**Why it happens:** Not calling `URL.revokeObjectURL()` after download
**How to avoid:** Always revoke object URL immediately after programmatic click
**Warning signs:** Memory usage grows with each download

### Pitfall 3: Missing Dark Mode Support
**What goes wrong:** Rendered markdown unreadable in dark mode
**Why it happens:** Forgetting `prose-invert` class for dark theme
**How to avoid:** Always pair `prose` with `dark:prose-invert`
**Warning signs:** Black text on dark background

### Pitfall 4: Oversized Output Display
**What goes wrong:** Large outputs break page layout or cause performance issues
**Why it happens:** No max-height or virtualization for very long content
**How to avoid:** Use ScrollArea component with fixed height, consider "show more" pattern
**Warning signs:** Page becomes unresponsive with large pipeline outputs

### Pitfall 5: Missing Filename Sanitization
**What goes wrong:** Download fails or creates malformed filename
**Why it happens:** Pipeline names may contain special characters
**How to avoid:** Sanitize pipeline name before using in filename
**Warning signs:** Downloads fail on pipelines with names like "My / Special Pipeline"

## Code Examples

Verified patterns from official sources:

### Tailwind Typography Setup (Tailwind v4)
```css
/* app/app.css */
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

### Safe Markdown Rendering
```typescript
// Source: react-markdown GitHub README
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownViewerProps {
  content: string;
  className?: string;
}

export function MarkdownViewer({ content, className }: MarkdownViewerProps) {
  return (
    <article className={`prose prose-sm dark:prose-invert max-w-none ${className}`}>
      <Markdown remarkPlugins={[remarkGfm]}>
        {content}
      </Markdown>
    </article>
  );
}
```

### Client-Side Download Utility
```typescript
// Source: MDN Blob API, URL.createObjectURL
export function downloadTextFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export function downloadMarkdownFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\?%*:|"<>]/g, '-')  // Replace forbidden chars
    .replace(/\s+/g, '-')            // Replace spaces
    .replace(/-+/g, '-')             // Collapse multiple dashes
    .slice(0, 200);                  // Limit length
}
```

### Fetching Run Data with Steps
```typescript
// Route loader pattern
import { db, pipelineRuns, pipelineRunSteps } from "~/db";
import { eq, and } from "drizzle-orm";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");
  const { runId } = params;

  const [run] = await db
    .select()
    .from(pipelineRuns)
    .where(and(eq(pipelineRuns.id, runId!), eq(pipelineRuns.userId, userId)));

  if (!run) throw new Response("Not found", { status: 404 });

  const steps = await db
    .select()
    .from(pipelineRunSteps)
    .where(eq(pipelineRunSteps.runId, runId!))
    .orderBy(pipelineRunSteps.stepOrder);

  return { run, steps };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| marked + dangerouslySetInnerHTML | react-markdown | 2020+ | XSS-safe by default |
| Server-generated download files | Client-side Blob API | Browser support mature | No server storage needed |
| Custom prose CSS | @tailwindcss/typography | 2020 | Consistent styling |

**Deprecated/outdated:**
- `marked` library with innerHTML: Security risk, use react-markdown
- Download via server form POST for text: Unnecessary round-trip
- Manual prose styling: Use typography plugin

## Integration with Existing Codebase

### Data Already Available
The execution engine (Phase 5) already stores all necessary data:

```typescript
// From app/db/schema/pipeline-runs.ts
pipelineRuns: {
  finalOutput: text("final_output"),  // Final pipeline output for download
  // ...
}

pipelineRunSteps: {
  output: text("output"),  // Per-agent output for viewing
  // ...
}
```

### UI Integration Points
1. **Pipeline detail page** (`pipelines.$id.tsx`) - Add "View Results" section after run completes
2. **Run progress component** (`run-progress.tsx`) - Add link to view full output when complete
3. **New route** - Consider `pipelines.$id.run.$runId.tsx` for dedicated output viewing

### Missing shadcn Components
The Tabs component is not yet installed. Add via:
```bash
npx shadcn@latest add tabs
```

## Open Questions

Things that couldn't be fully resolved:

1. **Output history view**
   - What we know: v2 requirement OUTP-05 is "view run history"
   - What's unclear: Should Phase 6 show list of past runs, or just current run output?
   - Recommendation: Phase 6 focuses on current run only per v1 requirements; history is v2

2. **Syntax highlighting for code**
   - What we know: rehype-highlight can add code highlighting
   - What's unclear: Will pipeline outputs contain significant code?
   - Recommendation: Skip for v1; add if user feedback indicates need

## Sources

### Primary (HIGH confidence)
- [react-markdown GitHub](https://github.com/remarkjs/react-markdown) - API, usage, plugins
- [MDN Blob API](https://developer.mozilla.org/en-US/docs/Web/API/Blob) - File download pattern
- [MDN URL.createObjectURL](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static) - Object URL lifecycle
- [Tailwind Typography Plugin](https://github.com/tailwindlabs/tailwindcss-typography) - Prose styling

### Secondary (MEDIUM confidence)
- [sergiodxa tutorial](https://sergiodxa.com/tutorials/download-a-file-from-a-react-router-route) - React Router download patterns
- [Remix Resource Routes](https://v2.remix.run/docs/guides/resource-routes/) - Content-Disposition headers

### Tertiary (LOW confidence)
- Various blog posts on markdown rendering best practices

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - react-markdown is well-documented, widely used
- Architecture: HIGH - patterns verified against MDN and official docs
- Pitfalls: MEDIUM - based on common issues in GitHub discussions

**Research date:** 2026-01-28
**Valid until:** 60 days (stable libraries, mature APIs)
