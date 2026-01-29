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

interface PipelineState {
  // Current pipeline metadata
  pipelineId: string | null;
  pipelineName: string;
  pipelineDescription: string;

  // React Flow state
  nodes: Node<AgentNodeData>[];
  edges: Edge[];

  // React Flow callbacks
  onNodesChange: OnNodesChange<Node<AgentNodeData>>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  // Actions
  setNodes: (nodes: Node<AgentNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  addAgentNode: (
    agent: { id: string; name: string; instructions?: string },
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
  nodes: [] as Node<AgentNodeData>[],
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
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                traitIds: [...new Set([...(node.data.traitIds || []), traitId])],
              },
            }
          : node
      ),
    });
  },

  removeTraitFromNode: (nodeId, traitId) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                traitIds: (node.data.traitIds || []).filter((id) => id !== traitId),
              },
            }
          : node
      ),
    });
  },

  reset: () => set(initialState),
}));
