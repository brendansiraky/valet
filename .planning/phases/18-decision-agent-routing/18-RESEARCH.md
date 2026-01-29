# Phase 18: Decision Agent Routing - Research

**Researched:** 2026-01-29
**Domain:** React Flow conditional routing, graph execution with cycles, LLM decision parsing
**Confidence:** HIGH

## Summary

This phase adds conditional TRUE/FALSE routing to pipelines using decision agents. The existing codebase has:
- React Flow (`@xyflow/react` v12.10.0) for pipeline builder with custom AgentNode components
- Topological sort execution via Kahn's algorithm in `buildStepsFromFlow`
- Linear step-by-step execution in `executePipeline` passing output forward
- SSE event streaming for real-time progress updates

The implementation requires:
1. A decision node variant with diamond shape and two output handles (TRUE/FALSE)
2. Extended edge data model to include `sourceHandle` for routing
3. Non-linear executor that follows edges based on runtime decisions
4. Decision prompt injection and response parsing (extract `DECISION: TRUE/FALSE`)
5. Cycle support with iteration limit protection at account level

**Primary recommendation:** Implement decision mode as a togglable property on agent nodes in pipeline builder (stored in node data), create a new DecisionAgentNode component with diamond CSS shape and dual handles, extend the executor to use a visited-set DFS approach with sourceHandle-aware edge following, and parse decision markers using simple regex extraction.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @xyflow/react | 12.10.0 | Node-based UI with multi-handle support | Already in use, supports sourceHandle/targetHandle natively |
| zustand | 5.0.10 | State management for pipeline nodes/edges | Already managing flow state |
| CSS transform | native | Diamond shape via rotate(45deg) | No external dependencies needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| drizzle-orm | existing | Add maxIterations to users table | Account-level loop protection |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS rotate diamond | SVG path | SVG more precise but CSS is simpler for our rectangle-with-handles approach |
| DFS with visited set | Topological sort | Topo sort doesn't support cycles; DFS with iteration tracking does |
| Regex marker parsing | Structured output | Structured output requires tool calling; simple regex is sufficient for TRUE/FALSE |

**Installation:**
No new packages required - all dependencies already present.

## Architecture Patterns

### Recommended Project Structure
```
app/
├── components/
│   └── pipeline-builder/
│       ├── agent-node.tsx          # Modify: conditionally render diamond for decision mode
│       ├── pipeline-canvas.tsx     # Modify: register decision node type
│       └── decision-node.tsx       # NEW: diamond node with dual handles
├── stores/
│   └── pipeline-store.ts           # Modify: add isDecisionNode to AgentNodeData
├── services/
│   ├── pipeline-executor.server.ts # REWRITE: change from linear to graph traversal
│   └── job-queue.server.ts         # Modify: remove topological sort, call new executor
└── db/
    └── schema/
        └── users.ts                # Modify: add maxIterations field (default 10)
```

### Pattern 1: Decision Mode in Node Data
**What:** Store decision mode as boolean in node data, not as separate node type
**When to use:** Always - maintains single AgentNode with conditional rendering
**Example:**
```typescript
// Source: Codebase analysis + React Flow docs
export type AgentNodeData = {
  agentId: string;
  agentName: string;
  agentInstructions?: string;
  isOrphaned?: boolean;
  traitIds?: string[];
  isDecisionNode?: boolean;  // NEW: toggleable decision mode
  [key: string]: unknown;
};
```

### Pattern 2: Multiple Source Handles with IDs
**What:** Decision nodes have two source handles identified by "true" and "false"
**When to use:** For decision agent nodes
**Example:**
```typescript
// Source: React Flow handles documentation
// In DecisionNode component:
<Handle
  type="target"
  position={Position.Top}
  className="!bg-muted-foreground !w-3 !h-3"
/>
<Handle
  type="source"
  position={Position.Left}
  id="true"
  className="!bg-green-500 !w-3 !h-3"
/>
<Handle
  type="source"
  position={Position.Right}
  id="false"
  className="!bg-red-500 !w-3 !h-3"
/>
```

### Pattern 3: Edge with sourceHandle
**What:** Extend edge data to track which handle the connection originates from
**When to use:** All edges from decision nodes must specify sourceHandle
**Example:**
```typescript
// Source: React Flow Edge type
// FlowData edges extend to include sourceHandle
interface FlowData {
  nodes: Array<{ /* ... */ }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;  // "true" | "false" | undefined
  }>;
}
```

### Pattern 4: Diamond Shape via CSS Transform
**What:** Rotate a square container 45 degrees, counter-rotate content
**When to use:** Decision node visual rendering
**Example:**
```typescript
// Source: CSS transform patterns
<div
  className="w-[200px] h-[200px] bg-card border-2"
  style={{ transform: 'rotate(45deg)' }}
>
  <div style={{ transform: 'rotate(-45deg)' }}>
    {/* Node content */}
  </div>
</div>
```

### Pattern 5: Graph Execution with Cycles
**What:** Replace topological sort with edge-following DFS, track iteration count
**When to use:** Pipeline execution with decision routing
**Example:**
```typescript
// Source: Graph traversal algorithms
async function executeGraph(
  graph: GraphData,
  startNodeId: string,
  input: string,
  maxIterations: number
): Promise<void> {
  let iterations = 0;
  let currentNodeId: string | null = startNodeId;
  let currentInput = input;

  while (currentNodeId && iterations < maxIterations) {
    iterations++;
    const node = graph.nodes.find(n => n.id === currentNodeId);
    if (!node) break;

    // Execute agent
    const result = await executeAgent(node, currentInput);

    if (node.data.isDecisionNode) {
      // Parse decision and route
      const { decision, cleanOutput } = parseDecision(result.content);
      currentInput = cleanOutput;

      // Find edge matching the decision
      const edge = graph.edges.find(e =>
        e.source === currentNodeId &&
        e.sourceHandle === (decision ? "true" : "false")
      );
      currentNodeId = edge?.target ?? null;
    } else {
      // Normal node: follow the single output edge
      currentInput = result.content;
      const edge = graph.edges.find(e => e.source === currentNodeId);
      currentNodeId = edge?.target ?? null;
    }
  }

  if (iterations >= maxIterations) {
    throw new Error(`Pipeline reached maximum iterations (${maxIterations})`);
  }
}
```

### Pattern 6: Decision Prompt Injection
**What:** Append decision instructions to agent's system prompt automatically
**When to use:** When executing a decision mode agent
**Example:**
```typescript
// Source: Anthropic agent patterns
const DECISION_SUFFIX = `

---

After completing your analysis, you MUST end your response with a decision on exactly one line:
DECISION: TRUE
or
DECISION: FALSE

The decision should reflect whether the criteria in your instructions have been met.`;

function buildSystemPrompt(
  instructions: string,
  traitContext?: string,
  isDecision?: boolean
): string {
  let prompt = instructions;
  if (traitContext) {
    prompt = `${traitContext}\n\n---\n\n${prompt}`;
  }
  if (isDecision) {
    prompt += DECISION_SUFFIX;
  }
  return prompt;
}
```

### Pattern 7: Decision Response Parsing
**What:** Extract DECISION marker and strip it from output
**When to use:** After receiving decision agent response
**Example:**
```typescript
// Source: String parsing patterns
const DECISION_REGEX = /\nDECISION:\s*(TRUE|FALSE)\s*$/i;

function parseDecision(content: string): { decision: boolean; cleanOutput: string } {
  const match = content.match(DECISION_REGEX);
  if (!match) {
    // Default to FALSE if no decision marker found
    return { decision: false, cleanOutput: content };
  }

  const decision = match[1].toUpperCase() === 'TRUE';
  const cleanOutput = content.replace(DECISION_REGEX, '').trim();
  return { decision, cleanOutput };
}
```

### Anti-Patterns to Avoid
- **Separate DecisionAgent entity:** Decision mode is pipeline-level, not agent-level. Same agent can be normal in one pipeline, decision in another.
- **Modifying user DNA:** System injects decision suffix automatically. User writes natural instructions.
- **Topological sort with cycles:** Kahn's algorithm fails on cycles. Use edge-following traversal instead.
- **Unbounded loops:** Always enforce max iterations. Fail fast rather than infinite loop.
- **Pre-computing execution path:** Path depends on runtime decisions. Only track executed nodes.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multiple handle routing | Custom edge tracking | React Flow sourceHandle property | Native support, well-tested |
| Diamond shape | SVG library | CSS transform rotate | Simpler, no dependencies |
| Decision parsing | Complex NLP | Simple regex | TRUE/FALSE is deterministic format |
| Loop protection | Manual tracking | Iteration counter | Simple, reliable |

**Key insight:** React Flow already supports multi-handle nodes natively. The main work is extending the executor from linear to graph-based execution.

## Common Pitfalls

### Pitfall 1: Edge Connection to Wrong Handle
**What goes wrong:** Edges connect to default handle instead of TRUE/FALSE handle
**Why it happens:** React Flow uses first available handle if sourceHandle not specified
**How to avoid:** Force sourceHandle selection in `onConnect` when source is decision node
**Warning signs:** Both TRUE and FALSE paths go to same target

### Pitfall 2: Infinite Loops
**What goes wrong:** Pipeline runs forever when FALSE loops back to earlier node
**Why it happens:** No iteration limit enforcement
**How to avoid:** Track iteration count, fail when limit reached
**Warning signs:** Pipeline never completes, high token usage

### Pitfall 3: Missing Decision Marker
**What goes wrong:** Agent doesn't include DECISION: TRUE/FALSE in response
**Why it happens:** LLM may not follow instructions perfectly
**How to avoid:** Default to FALSE if marker missing, log warning
**Warning signs:** Always routes FALSE even when TRUE expected

### Pitfall 4: Handle Positioning on Diamond
**What goes wrong:** Handles appear in wrong positions on rotated node
**Why it happens:** CSS rotation affects handle placement
**How to avoid:** Position handles at diamond corners (top for input, left/right for outputs)
**Warning signs:** Handles overlap or appear inside node

### Pitfall 5: Progress UI Mismatch
**What goes wrong:** Step progress shows wrong order or duplicate steps
**Why it happens:** UI expects linear step index, but execution may revisit nodes
**How to avoid:** Use node ID + iteration number instead of step order
**Warning signs:** Step 3 shown before Step 2, same step shown multiple times

### Pitfall 6: Orphaned Edge Cleanup
**What goes wrong:** Toggling off decision mode leaves orphaned TRUE/FALSE edges
**Why it happens:** Edges with sourceHandle persist after node changes
**How to avoid:** Remove edges with sourceHandle when toggling decision mode off
**Warning signs:** Invalid edges in flow data, execution errors

## Code Examples

Verified patterns from official sources:

### Decision Node Component
```typescript
// Source: React Flow custom nodes + CSS transform patterns
import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Card, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import type { AgentNodeData } from "~/stores/pipeline-store";

type DecisionNodeType = Node<AgentNodeData, "decision">;

export const DecisionNode = memo(
  ({ data, selected }: NodeProps<DecisionNodeType>) => {
    return (
      <div className="relative">
        {/* Diamond container */}
        <div
          className={cn(
            "w-[180px] h-[180px] border-2 rounded-md bg-card",
            selected && "ring-2 ring-primary"
          )}
          style={{ transform: "rotate(45deg)" }}
        >
          {/* Counter-rotated content */}
          <div
            className="w-full h-full flex items-center justify-center p-4"
            style={{ transform: "rotate(-45deg)" }}
          >
            <span className="text-sm font-medium text-center">
              {data.agentName}
            </span>
          </div>
        </div>

        {/* Target handle at top corner */}
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-muted-foreground !w-3 !h-3"
          style={{ top: -6, left: "50%" }}
        />

        {/* TRUE handle at left corner */}
        <Handle
          type="source"
          position={Position.Left}
          id="true"
          className="!bg-green-500 !w-3 !h-3"
          style={{ left: -6, top: "50%" }}
        />

        {/* FALSE handle at right corner */}
        <Handle
          type="source"
          position={Position.Right}
          id="false"
          className="!bg-red-500 !w-3 !h-3"
          style={{ right: -6, top: "50%" }}
        />
      </div>
    );
  }
);

DecisionNode.displayName = "DecisionNode";
```

### Toggle Decision Mode in Store
```typescript
// Source: Existing pipeline-store.ts pattern
interface PipelineState {
  // ... existing ...
  toggleDecisionMode: (nodeId: string) => void;
}

toggleDecisionMode: (nodeId) => {
  const { nodes, edges } = get();

  // Find the node
  const nodeIndex = nodes.findIndex(n => n.id === nodeId);
  if (nodeIndex === -1) return;

  const node = nodes[nodeIndex];
  const isCurrentlyDecision = node.data.isDecisionNode ?? false;

  // Update node
  const updatedNodes = [...nodes];
  updatedNodes[nodeIndex] = {
    ...node,
    type: isCurrentlyDecision ? "agent" : "decision",
    data: {
      ...node.data,
      isDecisionNode: !isCurrentlyDecision,
    },
  };

  // If toggling OFF decision mode, remove edges with sourceHandle
  let updatedEdges = edges;
  if (isCurrentlyDecision) {
    updatedEdges = edges.filter(
      e => e.source !== nodeId || !e.sourceHandle
    );
  }

  set({ nodes: updatedNodes, edges: updatedEdges });
},
```

### Graph Executor (Replacing Linear Executor)
```typescript
// Source: Graph traversal patterns + existing executor
interface GraphExecutionContext {
  graph: { nodes: FlowNode[]; edges: FlowEdge[] };
  runId: string;
  maxIterations: number;
  provider: Provider;
  model: string;
}

async function executeGraphPipeline(
  ctx: GraphExecutionContext,
  initialInput: string
): Promise<void> {
  const { graph, runId, maxIterations, provider, model } = ctx;

  // Find entry node (node with no incoming edges)
  const entryNodeId = findEntryNode(graph);
  if (!entryNodeId) throw new Error("No entry node found");

  let iterations = 0;
  let currentNodeId: string | null = entryNodeId;
  let currentInput = initialInput;
  const executedSteps: string[] = [];

  while (currentNodeId && iterations < maxIterations) {
    iterations++;

    const node = graph.nodes.find(n => n.id === currentNodeId);
    if (!node) break;

    const isDecision = node.data.isDecisionNode ?? false;

    // Build prompt with decision suffix if needed
    const systemPrompt = buildSystemPrompt(
      node.data.agentInstructions ?? "",
      node.data.traitContext,
      isDecision
    );

    // Emit step start
    runEmitter.emitRunEvent(runId, {
      type: "step_start",
      stepIndex: executedSteps.length,
      agentName: node.data.agentName,
      nodeId: currentNodeId,
    });

    // Execute agent
    const result = await provider.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: currentInput },
      ],
      { model, tools: [...] }
    );

    let output = result.content;
    let nextNodeId: string | null = null;

    if (isDecision) {
      // Parse decision and route
      const { decision, cleanOutput } = parseDecision(output);
      output = cleanOutput;

      // Find edge matching the decision
      const sourceHandle = decision ? "true" : "false";
      const edge = graph.edges.find(
        e => e.source === currentNodeId && e.sourceHandle === sourceHandle
      );
      nextNodeId = edge?.target ?? null;

      // Emit decision event for UI
      runEmitter.emitRunEvent(runId, {
        type: "decision",
        nodeId: currentNodeId,
        decision,
      });
    } else {
      // Normal node: follow single output edge
      const edge = graph.edges.find(e => e.source === currentNodeId);
      nextNodeId = edge?.target ?? null;
    }

    // Record step
    executedSteps.push(currentNodeId);

    // Emit step complete
    runEmitter.emitRunEvent(runId, {
      type: "step_complete",
      stepIndex: executedSteps.length - 1,
      output,
    });

    // Advance
    currentInput = output;
    currentNodeId = nextNodeId;
  }

  if (iterations >= maxIterations) {
    throw new Error(
      `Pipeline reached maximum iterations (${maxIterations}). ` +
      `This may indicate an infinite loop.`
    );
  }
}
```

### Account Max Iterations Migration
```typescript
// Source: Drizzle schema patterns
// In users.ts
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  maxIterations: integer("max_iterations").notNull().default(10),  // NEW
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdateFn(() => new Date()),
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Linear topological sort | Edge-following graph traversal | This phase | Supports cycles and branching |
| Single output handle | Multiple output handles with IDs | This phase | Enables TRUE/FALSE routing |
| Step order tracking | Node ID + iteration tracking | This phase | Handles revisited nodes |
| Unbounded execution | Account-level max iterations | This phase | Loop protection |

**Deprecated/outdated:**
- Kahn's algorithm for step ordering will be replaced by dynamic edge following
- Linear step index tracking will be replaced by node ID tracking
- Assumption that each node executes exactly once will be removed

## Open Questions

Things that couldn't be fully resolved:

1. **Decision node size in diamond form**
   - What we know: Diamond rotated 45deg needs careful sizing for content
   - What's unclear: Exact pixel dimensions that look good with existing AgentNode
   - Recommendation: Start with 180x180 rotated container, adjust based on visual testing

2. **Progress UI for cycles**
   - What we know: Current UI shows linear step list 1, 2, 3...
   - What's unclear: How to display when step 3 routes back to step 1
   - Recommendation: Show "Iteration 2" labels, or collapse repeated nodes

3. **Partial edge cleanup**
   - What we know: Toggling decision mode off should clean edges
   - What's unclear: What if user has manually added non-decision edges to the same node?
   - Recommendation: Only remove edges where sourceHandle is "true" or "false"

4. **Edge labels for TRUE/FALSE**
   - What we know: Users need visual feedback on which path is TRUE vs FALSE
   - What's unclear: Labels on edges vs icons vs color coding
   - Recommendation: Use edge color (green for TRUE, red for FALSE) + optional labels

## Sources

### Primary (HIGH confidence)
- React Flow Handles documentation: https://reactflow.dev/learn/customization/handles
- React Flow Computing Flows guide: https://reactflow.dev/learn/advanced-use/computing-flows
- React Flow Edge type API: https://reactflow.dev/api-reference/types/edge
- Existing codebase: `app/services/pipeline-executor.server.ts`, `app/stores/pipeline-store.ts`

### Secondary (MEDIUM confidence)
- Anthropic agent patterns: https://www.anthropic.com/research/building-effective-agents
- CSS diamond shapes: Multiple verified sources (CodePen, Medium)
- Cycle detection algorithms: GeeksforGeeks, W3Schools

### Tertiary (LOW confidence)
- React Flow Pro shapes example (behind paywall, pattern inferred)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - using existing libraries with documented features
- Architecture: HIGH - clear patterns for multi-handle routing in React Flow docs
- Pitfalls: HIGH - derived from existing code patterns and graph algorithm principles
- Execution model: MEDIUM - custom implementation required, patterns are established

**Research date:** 2026-01-29
**Valid until:** 60 days (stable patterns, no major version changes expected)
