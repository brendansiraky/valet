---
quick: 003
type: execute
files_modified:
  - app/routes/pipelines.$id.tsx
  - app/components/pipeline-builder/agent-node.tsx
autonomous: true

must_haves:
  truths:
    - "Run button is disabled when pipeline contains deleted agents"
    - "Deleted agent tiles show visual indicator (muted styling + unplug icon)"
    - "User can still drag/move deleted agent tiles in the editor"
  artifacts:
    - path: "app/routes/pipelines.$id.tsx"
      provides: "Orphan detection logic and disabled Run button"
    - path: "app/components/pipeline-builder/agent-node.tsx"
      provides: "Visual indicator for deleted agents"
  key_links:
    - from: "app/routes/pipelines.$id.tsx"
      to: "app/components/pipeline-builder/agent-node.tsx"
      via: "isOrphaned prop in node data"
---

<objective>
Prevent users from running pipelines that contain deleted agents by disabling the Run button and showing a visual indicator on affected agent tiles.

Purpose: Improve UX by catching the "orphan agent" error before it happens rather than showing a cryptic error after clicking Run.

Output: Run button disabled with clear reason, deleted agents visually marked in editor.
</objective>

<context>
@app/routes/pipelines.$id.tsx (pipeline editor page - has loader with userAgents and nodes)
@app/components/pipeline-builder/agent-node.tsx (agent tile component)
@app/stores/pipeline-store.ts (AgentNodeData type)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Detect orphaned agents and disable Run button</name>
  <files>app/routes/pipelines.$id.tsx</files>
  <action>
Add a `useMemo` to compute which agent nodes are orphaned (their `agentId` is not in `userAgents`):

```typescript
const orphanedAgentIds = useMemo(() => {
  const validAgentIds = new Set(userAgents.map(a => a.id));
  return new Set(
    nodes
      .filter(n => n.data.agentId && !validAgentIds.has(n.data.agentId))
      .map(n => n.data.agentId)
  );
}, [nodes, userAgents]);

const hasOrphanedAgents = orphanedAgentIds.size > 0;
```

Update the Run button to also be disabled when `hasOrphanedAgents` is true:
```typescript
disabled={isStartingRun || !!currentRunId || hasOrphanedAgents}
```

Update button text to show why disabled when orphaned:
- If hasOrphanedAgents: show "Remove Deleted Agents" (or similar warning text)
- Keep existing Starting.../Running... states

Add `orphanedAgentIds` Set to context so agent-node can use it. Pass it through PipelineCanvas via prop, then use React context or store.

Simplest approach: Add `isOrphaned` to AgentNodeData when initializing/setting nodes. Update the `setNodes` call in `useEffect` to enrich node data:

```typescript
const validAgentIds = new Set(userAgents.map(a => a.id));
const enrichedNodes = (flowData.nodes || []).map(node => ({
  ...node,
  data: {
    ...node.data,
    isOrphaned: !validAgentIds.has(node.data.agentId),
  },
}));
setNodes(enrichedNodes);
```

Also update `handleDropAgent` to set `isOrphaned: false` for newly dropped agents (they come from userAgents so they exist).
  </action>
  <verify>
1. Load a pipeline containing a deleted agent
2. Run button should be disabled
3. Button text should indicate the issue
  </verify>
  <done>Run button disabled with clear indication when pipeline contains deleted agents</done>
</task>

<task type="auto">
  <name>Task 2: Add visual indicator to deleted agent tiles</name>
  <files>app/components/pipeline-builder/agent-node.tsx, app/stores/pipeline-store.ts</files>
  <action>
Update AgentNodeData type in pipeline-store.ts to include optional `isOrphaned` field:
```typescript
export type AgentNodeData = {
  agentId: string;
  agentName: string;
  agentInstructions?: string;
  isOrphaned?: boolean;
  [key: string]: unknown;
};
```

Update AgentNode component in agent-node.tsx:
1. Import `Unplug` icon from lucide-react
2. Check `data.isOrphaned` to apply visual styling:
   - Muted/faded card background: add `opacity-60` or `bg-destructive/10` when orphaned
   - Add subtle border tint: `border-destructive/50` when orphaned
   - Show small unplug icon in the card header next to the name

Example styling approach:
```tsx
<Card
  className={cn(
    "w-[250px] py-0",
    selected && "ring-2 ring-primary",
    data.isOrphaned && "opacity-70 border-destructive/50 bg-destructive/5"
  )}
>
  <CardHeader className="py-3 px-4">
    <CardTitle className="text-sm font-medium flex items-center gap-2">
      {data.isOrphaned && <Unplug className="w-3.5 h-3.5 text-destructive" />}
      {data.agentName}
    </CardTitle>
  </CardHeader>
  ...
</Card>
```

Note: The tile remains draggable/movable since ReactFlow handles that and we're not disabling it.
  </action>
  <verify>
1. Load pipeline with deleted agent
2. Deleted agent tile should show muted styling and unplug icon
3. Tile should still be draggable/selectable
4. Normal agents should render as before
  </verify>
  <done>Deleted agent tiles visually distinguished with muted styling and unplug icon while remaining functional</done>
</task>

</tasks>

<verification>
1. Create an agent, add it to a pipeline, save pipeline
2. Delete the agent from agents list
3. Return to pipeline editor
4. Verify: Deleted agent tile shows unplug icon and muted styling
5. Verify: Run button is disabled with appropriate text
6. Verify: Deleted agent tile can still be selected and moved
7. Verify: Removing the deleted agent tile re-enables Run button
</verification>

<success_criteria>
- Run button disabled when pipeline contains deleted agents
- Clear indication to user why Run is disabled
- Deleted agent tiles have subtle visual indicator (unplug icon + muted styling)
- User can still manipulate (drag, select, delete) orphaned tiles
- Normal agents render and function as before
</success_criteria>

<output>
After completion, create `.planning/quick/003-prevent-running-pipelines-with-deleted-a/003-SUMMARY.md`
</output>
