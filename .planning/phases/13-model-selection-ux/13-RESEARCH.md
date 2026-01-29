# Phase 13: Model Selection UX - Research

**Researched:** 2026-01-29
**Domain:** Multi-Provider Model Selection, React UI Patterns, Form UX
**Confidence:** HIGH

## Summary

Phase 13 implements a unified model selection experience across providers with clean UX. The core challenge is presenting models from multiple providers (Anthropic, OpenAI) in a single dropdown while only showing models for providers the user has configured API keys for.

The research identified that the existing `@radix-ui/react-select` component (already in use via shadcn) fully supports grouped selections with `SelectGroup` and `SelectLabel` - this is the standard pattern for multi-category dropdowns. The current codebase already has `ALL_MODELS` defined with provider attribution, and Phase 12 added multi-provider API key storage, so the foundation is complete.

The main work involves: (1) creating a `ModelSelector` component that groups models by provider and filters by configured keys, (2) updating the agent form to use this component, (3) passing `configuredProviders` data from loaders to forms, and (4) adding orphan indicators to the pipeline builder for deleted agents.

**Primary recommendation:** Create a reusable `ModelSelector` component using `SelectGroup`/`SelectLabel` from existing shadcn/ui select, pass configured providers from loaders, and filter `ALL_MODELS` by provider availability at render time.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @radix-ui/react-select | existing | Accessible grouped select | Already in use, supports SelectGroup/SelectLabel |
| shadcn/ui select | existing | Select styling/components | Already wrapped, has all needed primitives |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None new | - | - | All needed components exist |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Grouped Select | Combobox with search | Combobox better for 20+ items; 5-10 models works fine with select |
| Select + Groups | Segmented buttons | Segmented limits to ~4 items max; doesn't scale to multiple models |
| Client-side filtering | Server-side filtered options | Client simpler; models list is small (<10), no perf concern |

**Installation:**
```bash
# No new packages needed - use existing dependencies
```

## Architecture Patterns

### Recommended Project Structure
```
app/
├── components/
│   ├── model-selector.tsx       # New: Reusable grouped model dropdown
│   ├── agent-form-dialog.tsx    # Update: Use ModelSelector
│   └── pipeline-builder/
│       └── agent-node.tsx       # Update: Orphan indicator (already exists)
├── lib/
│   └── models.ts                # Existing: ALL_MODELS with provider attribution
└── routes/
    ├── agents.tsx               # Update: Pass configuredProviders to forms
    └── settings.tsx             # Existing: Multi-provider key storage
```

### Pattern 1: Grouped Select with Provider Filtering
**What:** Single dropdown with models grouped by provider, filtered by configured keys
**When to use:** Any model selection (agent form, settings, pipeline builder)
**Example:**
```typescript
// app/components/model-selector.tsx
import { ALL_MODELS, ANTHROPIC_MODELS, OPENAI_MODELS } from "~/lib/models";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

interface ModelSelectorProps {
  name: string;
  defaultValue?: string;
  configuredProviders: string[];  // ["anthropic", "openai"]
  showDefault?: boolean;          // Show "Use default" option
}

export function ModelSelector({
  name,
  defaultValue,
  configuredProviders,
  showDefault = true,
}: ModelSelectorProps) {
  const hasAnthropic = configuredProviders.includes("anthropic");
  const hasOpenAI = configuredProviders.includes("openai");

  return (
    <Select name={name} defaultValue={defaultValue ?? (showDefault ? "__default__" : undefined)}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a model" />
      </SelectTrigger>
      <SelectContent>
        {showDefault && (
          <SelectItem value="__default__">Use default from settings</SelectItem>
        )}

        {hasAnthropic && (
          <SelectGroup>
            <SelectLabel>Anthropic</SelectLabel>
            {ANTHROPIC_MODELS.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.name}
              </SelectItem>
            ))}
          </SelectGroup>
        )}

        {hasOpenAI && (
          <SelectGroup>
            <SelectLabel>OpenAI</SelectLabel>
            {OPENAI_MODELS.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.name}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
}
```

### Pattern 2: Configured Providers from Loader
**What:** Query user's API keys and derive configured providers list
**When to use:** Any route that needs to show model selection
**Example:**
```typescript
// In loader function (agents.tsx, settings.tsx, etc.)
export async function loader({ request }: LoaderFunctionArgs) {
  // ... auth checks ...

  // Get configured providers
  const userApiKeys = await db.query.apiKeys.findMany({
    where: eq(apiKeys.userId, userId),
    columns: { provider: true },
  });
  const configuredProviders = userApiKeys.map((k) => k.provider);

  return {
    agents: userAgents,
    traits: userTraits,
    configuredProviders,  // ["anthropic", "openai"] or subset
  };
}
```

### Pattern 3: Model Validation with Provider Check
**What:** Validate model selection against configured providers
**When to use:** Form actions that accept model selection
**Example:**
```typescript
// In action function
const modelId = formData.get("model") as string;

// Skip validation for default
if (modelId && modelId !== "__default__") {
  const model = ALL_MODELS.find((m) => m.id === modelId);
  if (!model) {
    return data({ errors: { model: ["Invalid model"] } }, { status: 400 });
  }

  // Check if user has key for this provider
  const hasKey = await db.query.apiKeys.findFirst({
    where: and(
      eq(apiKeys.userId, userId),
      eq(apiKeys.provider, model.provider)
    ),
  });

  if (!hasKey) {
    return data(
      { errors: { model: [`No API key configured for ${model.provider}`] } },
      { status: 400 }
    );
  }
}
```

### Pattern 4: Empty State Handling
**What:** Handle case where no providers are configured
**When to use:** Model selector component
**Example:**
```typescript
// In ModelSelector
if (configuredProviders.length === 0) {
  return (
    <Select disabled>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Configure API keys in Settings" />
      </SelectTrigger>
    </Select>
  );
}
```

### Anti-Patterns to Avoid
- **Flat list without grouping:** With multiple providers, ungrouped lists become confusing. Always group by provider.
- **Showing unavailable models:** Don't show OpenAI models if user hasn't configured OpenAI key. Leads to runtime errors.
- **Duplicating model definitions:** Use single source (models.ts). Don't define models in components.
- **Filtering on every render without memoization:** For static lists like models, this is fine. But if list became dynamic, memoize.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Grouped dropdown | Custom grouped UI | SelectGroup/SelectLabel | Radix handles accessibility, keyboard nav |
| Model-provider mapping | Manual mapping | ALL_MODELS.provider field | Already in models.ts |
| Provider detection | Custom per-route | Reusable loader pattern | DRY, single source of truth |
| Orphan styling | Custom component | Conditional classes on AgentNode | Already has isOrphaned flag |

**Key insight:** The existing components and data structures are designed for this. Phase 13 is primarily about wiring them together correctly.

## Common Pitfalls

### Pitfall 1: Model Selection Without Key Validation
**What goes wrong:** User selects GPT-4o model but doesn't have OpenAI key, gets runtime error
**Why it happens:** Form allows selection of any model, validation happens too late
**How to avoid:** Filter dropdown options by configured providers at render time
**Warning signs:** "No API key for provider" errors after form submission

### Pitfall 2: Orphaned Default Model
**What goes wrong:** User's default model is from a provider whose key was deleted
**Why it happens:** modelPreference in api_keys table points to deleted provider
**How to avoid:** When deleting API key, check/clear modelPreference if it points to that provider
**Warning signs:** Agent runs fail with provider lookup errors

### Pitfall 3: Missing configuredProviders in SSR
**What goes wrong:** Component renders with no models on first paint
**Why it happens:** Loader data not available during server-side render
**How to avoid:** Ensure configuredProviders is always returned from loader (empty array if none)
**Warning signs:** Flash of "no providers configured" then correct content

### Pitfall 4: Stale Provider Config After Settings Change
**What goes wrong:** User adds OpenAI key in settings, goes to agents, OpenAI models not showing
**Why it happens:** Agent page was rendered before key was added
**How to avoid:** Remix handles this with loader invalidation on navigation. Verify SPA navigation triggers reload.
**Warning signs:** Models don't appear until hard refresh

### Pitfall 5: Visual Confusion Between Providers
**What goes wrong:** Users can't tell which provider a model belongs to
**Why it happens:** Models listed without context
**How to avoid:** Use SelectGroup with SelectLabel showing provider name
**Warning signs:** User picks wrong model, surprised by behavior differences

## Code Examples

Verified patterns from existing codebase and shadcn documentation:

### Grouped Select with Shadcn/UI
```typescript
// Source: shadcn/ui select-demo pattern (verified via shadcn MCP)
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select a model" />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      <SelectLabel>Anthropic</SelectLabel>
      <SelectItem value="claude-opus-4-5-20251101">Claude Opus 4.5</SelectItem>
      <SelectItem value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5</SelectItem>
    </SelectGroup>
    <SelectGroup>
      <SelectLabel>OpenAI</SelectLabel>
      <SelectItem value="gpt-4o">GPT-4o</SelectItem>
      <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
    </SelectGroup>
  </SelectContent>
</Select>
```

### Orphan Indicator (Already Implemented)
```typescript
// Source: app/components/pipeline-builder/agent-node.tsx
// Already has isOrphaned flag and styling:
<Card
  className={cn(
    "w-[250px] py-0",
    selected && "ring-2 ring-primary",
    data.isOrphaned && "opacity-70 border-destructive/50 bg-destructive/5"
  )}
>
  <CardTitle className="text-sm font-medium flex items-center gap-2">
    {data.isOrphaned && (
      <Unplug className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
    )}
    {data.agentName}
  </CardTitle>
</Card>
```

### Provider Filtering in Loader
```typescript
// Pattern from settings.tsx, adapted for reuse
const userApiKeys = await db.query.apiKeys.findMany({
  where: eq(apiKeys.userId, userId),
  columns: { provider: true },
});
const configuredProviders = userApiKeys.map((k) => k.provider);
// Returns: ["anthropic"] or ["anthropic", "openai"] or []
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-provider hardcoded | Multi-provider with grouping | 2024-2025 | Users expect provider choice |
| Show all models | Filter by configured | Best practice | Prevents runtime errors |
| Radio buttons for model | Grouped dropdown | Scaling concern | Dropdowns handle 5-20 items cleanly |

**Deprecated/outdated:**
- Showing models user can't use: Always filter by API key availability
- Separate model pickers per provider: Unified picker is better UX

## Open Questions

Things that couldn't be fully resolved:

1. **Default model scope**
   - What we know: Current modelPreference is global (one default for all agents)
   - What's unclear: Should default be per-provider? (Anthropic default, OpenAI default)
   - Recommendation: Keep single global default for Phase 13. If user wants different defaults per use case, they can set per-agent models. Revisit if user feedback suggests otherwise.

2. **Model availability indicators**
   - What we know: We can check if key exists for provider
   - What's unclear: Should we show model availability (quota, rate limits)?
   - Recommendation: Out of scope for Phase 13. Just check key existence. Model-level availability is complex (requires API calls to check).

3. **Provider key deletion cascade**
   - What we know: Deleting Anthropic key should affect agents using Claude models
   - What's unclear: Should we prevent deletion, warn, or silently allow?
   - Recommendation: Allow deletion with warning. Agents with that provider's models will fail at runtime with clear error. Don't cascade-update all agents (too destructive).

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `app/components/ui/select.tsx` - SelectGroup/SelectLabel already exist
- Codebase analysis: `app/lib/models.ts` - ALL_MODELS with provider attribution
- Codebase analysis: `app/routes/settings.tsx` - Multi-provider key storage pattern
- Codebase analysis: `app/components/pipeline-builder/agent-node.tsx` - Orphan indicator exists
- shadcn MCP: select-demo showing grouped select pattern

### Secondary (MEDIUM confidence)
- Phase 11 research: Provider abstraction patterns
- Phase 12 summary: Multi-provider integration complete

### Tertiary (LOW confidence)
- None - all patterns verified in existing code

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All components exist, no new dependencies
- Architecture: HIGH - Clear patterns from existing code
- Pitfalls: HIGH - Based on real codebase analysis
- UX patterns: HIGH - Using established shadcn patterns

**Research date:** 2026-01-29
**Valid until:** 90 days (stable domain, using existing components)
