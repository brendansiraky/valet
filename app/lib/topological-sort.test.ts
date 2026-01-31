import { describe, it, expect } from "vitest";
import type { Node, Edge } from "@xyflow/react";
import { topologicalSortNodes } from "./topological-sort";

describe("topologicalSortNodes", () => {
  it("sorts nodes in execution order based on edges", () => {
    const nodes: Node[] = [
      { id: "node1", type: "agent", position: { x: 0, y: 0 }, data: { name: "Agent1" } },
      { id: "node2", type: "agent", position: { x: 100, y: 0 }, data: { name: "Agent2" } },
    ];
    const edges: Edge[] = [
      { id: "e1", source: "node1", target: "node2" },
    ];

    const sorted = topologicalSortNodes(nodes, edges);

    expect(sorted).toHaveLength(2);
    expect(sorted[0].id).toBe("node1");
    expect(sorted[1].id).toBe("node2");
  });

  it("handles reversed node array order (drag order different from execution order)", () => {
    // Simulates: Agent2 dragged first, Agent1 dragged second
    // But edge says Agent1 → Agent2 (Agent1 should execute first)
    const nodes: Node[] = [
      { id: "node2", type: "agent", position: { x: 0, y: 0 }, data: { name: "Agent2" } },
      { id: "node1", type: "agent", position: { x: 100, y: 0 }, data: { name: "Agent1" } },
    ];
    const edges: Edge[] = [
      { id: "e1", source: "node1", target: "node2" },
    ];

    const sorted = topologicalSortNodes(nodes, edges);

    // Execution order should be node1 first, regardless of drag order
    expect(sorted).toHaveLength(2);
    expect(sorted[0].id).toBe("node1");
    expect(sorted[1].id).toBe("node2");
  });

  it("handles three agents in a chain", () => {
    const nodes: Node[] = [
      { id: "c", type: "agent", position: { x: 0, y: 0 }, data: {} },
      { id: "b", type: "agent", position: { x: 100, y: 0 }, data: {} },
      { id: "a", type: "agent", position: { x: 200, y: 0 }, data: {} },
    ];
    const edges: Edge[] = [
      { id: "e1", source: "a", target: "b" },
      { id: "e2", source: "b", target: "c" },
    ];

    const sorted = topologicalSortNodes(nodes, edges);

    expect(sorted.map((n) => n.id)).toEqual(["a", "b", "c"]);
  });

  it("excludes trait nodes from result", () => {
    const nodes: Node[] = [
      { id: "trait1", type: "trait", position: { x: 0, y: 0 }, data: {} },
      { id: "agent1", type: "agent", position: { x: 100, y: 0 }, data: {} },
      { id: "agent2", type: "agent", position: { x: 200, y: 0 }, data: {} },
    ];
    const edges: Edge[] = [
      { id: "e1", source: "trait1", target: "agent1" },
      { id: "e2", source: "agent1", target: "agent2" },
    ];

    const sorted = topologicalSortNodes(nodes, edges);

    expect(sorted).toHaveLength(2);
    expect(sorted.map((n) => n.id)).toEqual(["agent1", "agent2"]);
  });

  it("handles disconnected agents (no edges)", () => {
    const nodes: Node[] = [
      { id: "node1", type: "agent", position: { x: 0, y: 0 }, data: {} },
      { id: "node2", type: "agent", position: { x: 100, y: 0 }, data: {} },
    ];
    const edges: Edge[] = [];

    const sorted = topologicalSortNodes(nodes, edges);

    // Both agents included, order depends on array order when disconnected
    expect(sorted).toHaveLength(2);
    expect(sorted.map((n) => n.id)).toContain("node1");
    expect(sorted.map((n) => n.id)).toContain("node2");
  });

  it("matches backend behavior for realistic pipeline scenario", () => {
    // Scenario: User drags Summarizer first, then Researcher
    // User wants Researcher → Summarizer flow
    const researcherNodeId = "researcher-uuid";
    const summarizerNodeId = "summarizer-uuid";

    const nodes: Node[] = [
      // Summarizer dragged FIRST
      { id: summarizerNodeId, type: "agent", position: { x: 0, y: 0 }, data: { name: "Summarizer" } },
      // Researcher dragged SECOND
      { id: researcherNodeId, type: "agent", position: { x: 200, y: 0 }, data: { name: "Researcher" } },
    ];
    // Edge: Researcher → Summarizer
    const edges: Edge[] = [
      { id: "e1", source: researcherNodeId, target: summarizerNodeId },
    ];

    const sorted = topologicalSortNodes(nodes, edges);

    // Researcher should execute first (receives initial input)
    // Summarizer should execute second (receives Researcher's output)
    expect(sorted[0].id).toBe(researcherNodeId);
    expect(sorted[1].id).toBe(summarizerNodeId);
  });
});
