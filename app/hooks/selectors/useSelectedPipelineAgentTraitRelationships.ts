import { useMemo } from "react";
import { useSelectedPipelineFlow } from "./useSelectedPipelineFlow";
import type { AgentNodeData, TraitNodeData } from "../queries/use-pipelines";

/**
 * Represents a trait connected to an agent via an edge.
 */
export interface ConnectedTrait {
  traitId: string;
  traitName: string;
  traitColor: string;
}

/**
 * Represents an agent with all traits connected to it.
 */
export interface AgentWithTraits {
  agentId: string;
  agentName: string;
  agentInstructions?: string;
  connectedTraits: ConnectedTrait[];
}

/**
 * Derives agent-trait relationships from the pipeline flow graph.
 *
 * This hook analyzes the nodes and edges of the selected pipeline to determine
 * which traits are connected to which agents. The relationship is derived from
 * edges where:
 * - source = trait node ID
 * - target = agent node ID
 *
 * @returns Array of agents with their connected traits
 */
export function useSelectedPipelineAgentTraitRelationships(): AgentWithTraits[] {
  const { nodes, edges } = useSelectedPipelineFlow();

  return useMemo(() => {
    // Separate agent and trait nodes
    const agentNodes = nodes.filter((n) => n.type === "agent");
    const traitNodes = nodes.filter((n) => n.type === "trait");

    // Create lookup map: node ID -> trait data
    const traitsByNodeId = new Map(
      traitNodes.map((n) => [n.id, n.data as TraitNodeData])
    );

    // For each agent, find connected traits via edges
    return agentNodes.map((agentNode) => {
      const agentData = agentNode.data as AgentNodeData;

      // Find edges where this agent is the target (traits feeding INTO the agent)
      const connectedTraitNodeIds = edges
        .filter((e) => e.target === agentNode.id)
        .map((e) => e.source);

      // Resolve trait node IDs to trait data
      const connectedTraits: ConnectedTrait[] = connectedTraitNodeIds
        .map((nodeId) => traitsByNodeId.get(nodeId))
        .filter((trait): trait is TraitNodeData => trait !== undefined)
        .map((trait) => ({
          traitId: trait.traitId,
          traitName: trait.traitName,
          traitColor: trait.traitColor,
        }));

      return {
        agentId: agentData.agentId,
        agentName: agentData.agentName,
        agentInstructions: agentData.agentInstructions,
        connectedTraits,
      };
    });
  }, [nodes, edges]);
}
