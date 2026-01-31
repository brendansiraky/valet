import { describe, it, expect } from "vitest";

/**
 * Extract the pure topological sort logic for testing.
 * This mirrors the algorithm in buildStepsFromFlow.
 */
function topologicalSort(
  nodes: Array<{ id: string; type: string }>,
  edges: Array<{ source: string; target: string }>
): string[] {
  // Build map of trait nodes (for filtering)
  const traitNodeIds = new Set(
    nodes.filter((n) => n.type === "trait").map((n) => n.id)
  );

  // Build adjacency list and in-degree map
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  nodes.forEach((node) => {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  });

  edges.forEach((edge) => {
    // Skip trait-to-agent edges (they don't affect execution order)
    if (traitNodeIds.has(edge.source)) return;

    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    adjacency.get(edge.source)?.push(edge.target);
  });

  // Kahn's algorithm
  const queue = nodes.filter((n) => inDegree.get(n.id) === 0).map((n) => n.id);
  const sorted: string[] = [];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    sorted.push(nodeId);

    for (const neighbor of adjacency.get(nodeId) || []) {
      inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    }
  }

  // Filter to only agent nodes (matching buildStepsFromFlow behavior)
  return sorted.filter((id) => {
    const node = nodes.find((n) => n.id === id);
    return node?.type === "agent";
  });
}

describe("topologicalSort (Kahn's algorithm)", () => {
  it("sorts two agents with Agent1 → Agent2 edge correctly", () => {
    const nodes = [
      { id: "node1", type: "agent" },
      { id: "node2", type: "agent" },
    ];
    const edges = [{ source: "node1", target: "node2" }];

    const sorted = topologicalSort(nodes, edges);

    // Agent1 (node1) should come BEFORE Agent2 (node2)
    expect(sorted).toEqual(["node1", "node2"]);
  });

  it("handles reversed node array order", () => {
    // Node2 listed before Node1 in array
    const nodes = [
      { id: "node2", type: "agent" },
      { id: "node1", type: "agent" },
    ];
    const edges = [{ source: "node1", target: "node2" }];

    const sorted = topologicalSort(nodes, edges);

    // Even with reversed array order, Agent1 should still come first
    expect(sorted).toEqual(["node1", "node2"]);
  });

  it("handles three agents in a chain", () => {
    const nodes = [
      { id: "a", type: "agent" },
      { id: "b", type: "agent" },
      { id: "c", type: "agent" },
    ];
    // A → B → C
    const edges = [
      { source: "a", target: "b" },
      { source: "b", target: "c" },
    ];

    const sorted = topologicalSort(nodes, edges);

    expect(sorted).toEqual(["a", "b", "c"]);
  });

  it("handles diamond pattern (A → B, A → C, B → D, C → D)", () => {
    const nodes = [
      { id: "a", type: "agent" },
      { id: "b", type: "agent" },
      { id: "c", type: "agent" },
      { id: "d", type: "agent" },
    ];
    const edges = [
      { source: "a", target: "b" },
      { source: "a", target: "c" },
      { source: "b", target: "d" },
      { source: "c", target: "d" },
    ];

    const sorted = topologicalSort(nodes, edges);

    // A must come first, D must come last
    // B and C can be in either order relative to each other
    expect(sorted[0]).toBe("a");
    expect(sorted[3]).toBe("d");
    expect(sorted.slice(1, 3).sort()).toEqual(["b", "c"]);
  });

  it("excludes trait nodes from result", () => {
    const nodes = [
      { id: "trait1", type: "trait" },
      { id: "agent1", type: "agent" },
      { id: "agent2", type: "agent" },
    ];
    // Trait → Agent1, Agent1 → Agent2
    const edges = [
      { source: "trait1", target: "agent1" },
      { source: "agent1", target: "agent2" },
    ];

    const sorted = topologicalSort(nodes, edges);

    // Only agents should be in result
    expect(sorted).toEqual(["agent1", "agent2"]);
  });

  it("handles disconnected agents (no edges)", () => {
    const nodes = [
      { id: "node1", type: "agent" },
      { id: "node2", type: "agent" },
    ];
    const edges: Array<{ source: string; target: string }> = [];

    const sorted = topologicalSort(nodes, edges);

    // With no edges, order depends on nodes array
    // Both agents have inDegree 0, so they're added in array order
    expect(sorted).toHaveLength(2);
    expect(sorted).toContain("node1");
    expect(sorted).toContain("node2");
  });

  describe("BUG INVESTIGATION: edge direction", () => {
    it("if edge is REVERSED (node2 → node1), node2 runs first", () => {
      const nodes = [
        { id: "node1", type: "agent" },
        { id: "node2", type: "agent" },
      ];
      // REVERSED: node2 is source, node1 is target
      const edges = [{ source: "node2", target: "node1" }];

      const sorted = topologicalSort(nodes, edges);

      // With reversed edge, node2 has no incoming edges (inDegree=0)
      // So node2 runs FIRST, then node1
      expect(sorted).toEqual(["node2", "node1"]);
    });

    it("demonstrates the bug: visual Agent1 → Agent2 but edge stored backwards", () => {
      // User VISUALLY connects Agent1 to Agent2
      // But edge is stored with source/target swapped
      const nodes = [
        { id: "visual-agent1", type: "agent" }, // User's "first agent"
        { id: "visual-agent2", type: "agent" }, // User's "second agent"
      ];

      // BUG: Edge stored backwards (Agent2 → Agent1)
      const edges = [{ source: "visual-agent2", target: "visual-agent1" }];

      const sorted = topologicalSort(nodes, edges);

      // Result: Agent2 runs first (receives initial input)
      // This matches the user's bug report!
      expect(sorted).toEqual(["visual-agent2", "visual-agent1"]);
    });
  });

  describe("REPORTED BUG: drag order determines execution order", () => {
    it("with correct edge, execution follows edge direction NOT drag order", () => {
      // Scenario: User drags Agent2 first, then Agent1
      // Then creates edge from Agent1 → Agent2 (Agent1 should run first)
      const nodes = [
        // Node order matches drag order (Agent2 dragged first)
        { id: "uuid-agent2-node", type: "agent" },
        { id: "uuid-agent1-node", type: "agent" },
      ];

      // Edge correctly specifies Agent1 → Agent2
      const edges = [{ source: "uuid-agent1-node", target: "uuid-agent2-node" }];

      const sorted = topologicalSort(nodes, edges);

      // CRITICAL: Agent1 should run first because of the edge,
      // regardless of drag order (Agent2 was dragged first)
      expect(sorted).toEqual(["uuid-agent1-node", "uuid-agent2-node"]);
    });

    it("with three agents dragged in reverse order, edges still determine order", () => {
      // Drag order: C, B, A (reversed)
      // Edges: A → B → C (correct chain)
      const nodes = [
        { id: "node-c", type: "agent" },
        { id: "node-b", type: "agent" },
        { id: "node-a", type: "agent" },
      ];

      const edges = [
        { source: "node-a", target: "node-b" },
        { source: "node-b", target: "node-c" },
      ];

      const sorted = topologicalSort(nodes, edges);

      // Execution order should be A → B → C regardless of drag order
      expect(sorted).toEqual(["node-a", "node-b", "node-c"]);
    });

    it("simulates realistic React Flow data with UUIDs", () => {
      // Simulating actual data structure from React Flow
      // Drag order: Agent "Summarizer" first, then "Researcher"
      // User wants: Researcher → Summarizer
      const researcherNodeId = "550e8400-e29b-41d4-a716-446655440001";
      const summarizerNodeId = "550e8400-e29b-41d4-a716-446655440002";

      const nodes = [
        // Summarizer dragged onto canvas FIRST
        { id: summarizerNodeId, type: "agent" },
        // Researcher dragged onto canvas SECOND
        { id: researcherNodeId, type: "agent" },
      ];

      // User draws edge from Researcher → Summarizer
      // (dragged from Researcher's right handle to Summarizer's left handle)
      const edges = [{ source: researcherNodeId, target: summarizerNodeId }];

      const sorted = topologicalSort(nodes, edges);

      // Researcher should run first (receives initial input)
      // Summarizer should run second (receives Researcher's output)
      expect(sorted[0]).toBe(researcherNodeId);
      expect(sorted[1]).toBe(summarizerNodeId);
    });
  });
});
