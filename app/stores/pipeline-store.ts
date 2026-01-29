import { create } from "zustand";
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
} from "@xyflow/react";

// Type for agent node data
// Index signature required for React Flow compatibility (extends Record<string, unknown>)
export type AgentNodeData = {
  agentId: string;
  agentName: string;
  agentInstructions?: string;
  isOrphaned?: boolean;
  traitIds: string[]; // Array of trait IDs assigned to this pipeline step
  [key: string]: unknown;
};

// Type for trait node data (standalone trait nodes on canvas)
export type TraitNodeData = {
  traitId: string;
  traitName: string;
  traitColor: string;
  [key: string]: unknown;
};

// Union type for all node data types
export type PipelineNodeData = AgentNodeData | TraitNodeData;

interface PipelineState {
  // Current pipeline metadata
  pipelineId: string | null;
  pipelineName: string;
  pipelineDescription: string;

  // React Flow state
  nodes: Node<PipelineNodeData>[];
  edges: Edge[];

  // React Flow callbacks
  onNodesChange: OnNodesChange<Node<PipelineNodeData>>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  // Actions
  setNodes: (nodes: Node<PipelineNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  addAgentNode: (
    agent: { id: string; name: string; instructions?: string },
    position: { x: number; y: number }
  ) => void;
  addTraitNode: (
    trait: { id: string; name: string; color: string },
    position: { x: number; y: number }
  ) => void;
  removeNode: (nodeId: string) => void;
  setPipelineMetadata: (
    id: string | null,
    name: string,
    description: string
  ) => void;
  addTraitToNode: (nodeId: string, traitId: string) => void;
  removeTraitFromNode: (nodeId: string, traitId: string) => void;
  reset: () => void;
}

const initialState = {
  pipelineId: null,
  pipelineName: "Untitled Pipeline",
  pipelineDescription: "",
  nodes: [] as Node<PipelineNodeData>[],
  edges: [] as Edge[],
};

export const usePipelineStore = create<PipelineState>((set, get) => ({
  ...initialState,

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (connection) => {
    set({ edges: addEdge(connection, get().edges) });
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  addAgentNode: (agent, position) => {
    const newNode: Node<AgentNodeData> = {
      id: crypto.randomUUID(),
      type: "agent",
      position,
      data: {
        agentId: agent.id,
        agentName: agent.name,
        agentInstructions: agent.instructions,
        traitIds: [], // Initialize empty trait array
      },
    };
    set({ nodes: [...get().nodes, newNode] });
  },

  addTraitNode: (trait, position) => {
    const newNode: Node<TraitNodeData> = {
      id: crypto.randomUUID(),
      type: "trait",
      position,
      data: {
        traitId: trait.id,
        traitName: trait.name,
        traitColor: trait.color,
      },
    };
    set({ nodes: [...get().nodes, newNode] });
  },

  removeNode: (nodeId) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      ),
    });
  },

  setPipelineMetadata: (id, name, description) => {
    set({ pipelineId: id, pipelineName: name, pipelineDescription: description });
  },

  addTraitToNode: (nodeId, traitId) => {
    set({
      nodes: get().nodes.map((node) => {
        // Only agent nodes have traitIds
        if (node.id !== nodeId || node.type !== "agent") return node;
        const agentData = node.data as AgentNodeData;
        return {
          ...node,
          data: {
            ...agentData,
            traitIds: [...new Set([...(agentData.traitIds || []), traitId])],
          },
        };
      }),
    });
  },

  removeTraitFromNode: (nodeId, traitId) => {
    set({
      nodes: get().nodes.map((node) => {
        // Only agent nodes have traitIds
        if (node.id !== nodeId || node.type !== "agent") return node;
        const agentData = node.data as AgentNodeData;
        return {
          ...node,
          data: {
            ...agentData,
            traitIds: (agentData.traitIds || []).filter((id) => id !== traitId),
          },
        };
      }),
    });
  },

  reset: () => set(initialState),
}));
