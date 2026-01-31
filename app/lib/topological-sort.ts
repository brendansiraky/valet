import type { Node, Edge } from "@xyflow/react";

/**
 * Topological sort of pipeline nodes using Kahn's algorithm.
 * Returns nodes in execution order based on edge connections.
 *
 * This mirrors the server-side algorithm in job-queue.server.ts
 * to ensure frontend displays match actual execution order.
 */
export function topologicalSortNodes<T extends { type?: string }>(
  nodes: Node<T>[],
  edges: Edge[]
): Node<T>[] {
  // Build set of trait node IDs (to filter their edges)
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
  const sortedIds: string[] = [];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    sortedIds.push(nodeId);

    for (const neighbor of adjacency.get(nodeId) || []) {
      inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    }
  }

  // Build result array in sorted order, filtering to only agent nodes
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  return sortedIds
    .map((id) => nodeMap.get(id)!)
    .filter((n) => n && n.type === "agent");
}
