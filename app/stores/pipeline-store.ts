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

// Data for a single pipeline
export interface PipelineData {
  pipelineId: string;
  pipelineName: string;
  pipelineDescription: string;
  nodes: Node<PipelineNodeData>[];
  edges: Edge[];
}

// Special key for backward-compatible single-pipeline mode
// Will be removed in Plan 02 when all consumers use multi-pipeline API
const COMPAT_PIPELINE_ID = "__compat_default__";

interface PipelineState {
  pipelines: Map<string, PipelineData>;

  // ============================================================
  // MULTI-PIPELINE API (new - for Plan 02+)
  // ============================================================

  // Per-pipeline actions
  loadPipeline: (data: PipelineData) => void;
  updatePipeline: (
    id: string,
    updates: Partial<Omit<PipelineData, "pipelineId">>
  ) => void;
  removePipeline: (id: string) => void;
  getPipeline: (id: string) => PipelineData | undefined;

  // React Flow callbacks factory (returns callbacks scoped to pipeline ID)
  createOnNodesChange: (
    pipelineId: string
  ) => OnNodesChange<Node<PipelineNodeData>>;
  createOnEdgesChange: (pipelineId: string) => OnEdgesChange;
  createOnConnect: (pipelineId: string) => OnConnect;

  // Node manipulation (scoped by pipeline ID)
  // New multi-pipeline API - Plan 02 will use these
  addAgentNodeTo: (
    pipelineId: string,
    agent: { id: string; name: string; instructions?: string },
    position: { x: number; y: number }
  ) => void;
  addTraitNodeTo: (
    pipelineId: string,
    trait: { id: string; name: string; color: string },
    position: { x: number; y: number }
  ) => void;
  removeNodeFrom: (pipelineId: string, nodeId: string) => void;
  addTraitToNodeIn: (pipelineId: string, nodeId: string, traitId: string) => void;
  removeTraitFromNodeIn: (
    pipelineId: string,
    nodeId: string,
    traitId: string
  ) => void;

  // Legacy API (uses compat pipeline) - will be removed in Plan 02
  addAgentNode: (
    agent: { id: string; name: string; instructions?: string },
    position: { x: number; y: number }
  ) => void;
  addTraitNode: (
    trait: { id: string; name: string; color: string },
    position: { x: number; y: number }
  ) => void;
  removeNode: (nodeId: string) => void;
  addTraitToNode: (nodeId: string, traitId: string) => void;
  removeTraitFromNode: (nodeId: string, traitId: string) => void;

  // ============================================================
  // BACKWARD-COMPATIBLE API (legacy - will be removed in Plan 02)
  // These operate on a special "compat" pipeline for existing consumers
  // ============================================================

  // Current pipeline metadata (reads from compat pipeline)
  pipelineId: string | null;
  pipelineName: string;
  pipelineDescription: string;

  // React Flow state (reads from compat pipeline)
  nodes: Node<PipelineNodeData>[];
  edges: Edge[];

  // React Flow callbacks (operate on compat pipeline)
  onNodesChange: OnNodesChange<Node<PipelineNodeData>>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  // Legacy actions (operate on compat pipeline)
  setNodes: (nodes: Node<PipelineNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  setPipelineMetadata: (
    id: string | null,
    name: string,
    description: string
  ) => void;
  reset: () => void;
}

// Helper to update a pipeline in the map
function updatePipelineInMap(
  pipelines: Map<string, PipelineData>,
  id: string,
  updater: (pipeline: PipelineData) => Partial<PipelineData>
): Map<string, PipelineData> {
  const pipeline = pipelines.get(id);
  if (!pipeline) return pipelines;

  const newMap = new Map(pipelines);
  newMap.set(id, { ...pipeline, ...updater(pipeline) });
  return newMap;
}

// Default state for compat pipeline
function createCompatPipeline(): PipelineData {
  return {
    pipelineId: COMPAT_PIPELINE_ID,
    pipelineName: "Untitled Pipeline",
    pipelineDescription: "",
    nodes: [],
    edges: [],
  };
}

// Helper to get compat pipeline, creating if needed
function getOrCreateCompatPipeline(
  pipelines: Map<string, PipelineData>
): PipelineData {
  return pipelines.get(COMPAT_PIPELINE_ID) || createCompatPipeline();
}

export const usePipelineStore = create<PipelineState>((set, get) => ({
  pipelines: new Map([[COMPAT_PIPELINE_ID, createCompatPipeline()]]),

  // ============================================================
  // MULTI-PIPELINE API IMPLEMENTATION
  // ============================================================

  loadPipeline: (data) => {
    set({
      pipelines: new Map(get().pipelines).set(data.pipelineId, data),
    });
  },

  updatePipeline: (id, updates) => {
    set({
      pipelines: updatePipelineInMap(get().pipelines, id, () => updates),
    });
  },

  removePipeline: (id) => {
    const newMap = new Map(get().pipelines);
    newMap.delete(id);
    set({ pipelines: newMap });
  },

  getPipeline: (id) => {
    return get().pipelines.get(id);
  },

  createOnNodesChange: (pipelineId) => (changes) => {
    set({
      pipelines: updatePipelineInMap(
        get().pipelines,
        pipelineId,
        (pipeline) => ({
          nodes: applyNodeChanges(changes, pipeline.nodes),
        })
      ),
    });
  },

  createOnEdgesChange: (pipelineId) => (changes) => {
    set({
      pipelines: updatePipelineInMap(
        get().pipelines,
        pipelineId,
        (pipeline) => ({
          edges: applyEdgeChanges(changes, pipeline.edges),
        })
      ),
    });
  },

  createOnConnect: (pipelineId) => (connection) => {
    set({
      pipelines: updatePipelineInMap(
        get().pipelines,
        pipelineId,
        (pipeline) => ({
          edges: addEdge(connection, pipeline.edges),
        })
      ),
    });
  },

  // New multi-pipeline API with "To/From/In" suffix
  addAgentNodeTo: (pipelineId, agent, position) => {
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
    set({
      pipelines: updatePipelineInMap(
        get().pipelines,
        pipelineId,
        (pipeline) => ({
          nodes: [...pipeline.nodes, newNode],
        })
      ),
    });
  },

  addTraitNodeTo: (pipelineId, trait, position) => {
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
    set({
      pipelines: updatePipelineInMap(
        get().pipelines,
        pipelineId,
        (pipeline) => ({
          nodes: [...pipeline.nodes, newNode],
        })
      ),
    });
  },

  removeNodeFrom: (pipelineId, nodeId) => {
    set({
      pipelines: updatePipelineInMap(
        get().pipelines,
        pipelineId,
        (pipeline) => ({
          nodes: pipeline.nodes.filter((n) => n.id !== nodeId),
          edges: pipeline.edges.filter(
            (e) => e.source !== nodeId && e.target !== nodeId
          ),
        })
      ),
    });
  },

  addTraitToNodeIn: (pipelineId, nodeId, traitId) => {
    set({
      pipelines: updatePipelineInMap(
        get().pipelines,
        pipelineId,
        (pipeline) => ({
          nodes: pipeline.nodes.map((node) => {
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
        })
      ),
    });
  },

  removeTraitFromNodeIn: (pipelineId, nodeId, traitId) => {
    set({
      pipelines: updatePipelineInMap(
        get().pipelines,
        pipelineId,
        (pipeline) => ({
          nodes: pipeline.nodes.map((node) => {
            // Only agent nodes have traitIds
            if (node.id !== nodeId || node.type !== "agent") return node;
            const agentData = node.data as AgentNodeData;
            return {
              ...node,
              data: {
                ...agentData,
                traitIds: (agentData.traitIds || []).filter(
                  (id) => id !== traitId
                ),
              },
            };
          }),
        })
      ),
    });
  },

  // Legacy API - operates on compat pipeline
  addAgentNode: (agent, position) => {
    const newNode: Node<AgentNodeData> = {
      id: crypto.randomUUID(),
      type: "agent",
      position,
      data: {
        agentId: agent.id,
        agentName: agent.name,
        agentInstructions: agent.instructions,
        traitIds: [],
      },
    };
    set({
      pipelines: updatePipelineInMap(
        get().pipelines,
        COMPAT_PIPELINE_ID,
        (pipeline) => ({
          nodes: [...pipeline.nodes, newNode],
        })
      ),
    });
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
    set({
      pipelines: updatePipelineInMap(
        get().pipelines,
        COMPAT_PIPELINE_ID,
        (pipeline) => ({
          nodes: [...pipeline.nodes, newNode],
        })
      ),
    });
  },

  removeNode: (nodeId) => {
    set({
      pipelines: updatePipelineInMap(
        get().pipelines,
        COMPAT_PIPELINE_ID,
        (pipeline) => ({
          nodes: pipeline.nodes.filter((n) => n.id !== nodeId),
          edges: pipeline.edges.filter(
            (e) => e.source !== nodeId && e.target !== nodeId
          ),
        })
      ),
    });
  },

  addTraitToNode: (nodeId, traitId) => {
    set({
      pipelines: updatePipelineInMap(
        get().pipelines,
        COMPAT_PIPELINE_ID,
        (pipeline) => ({
          nodes: pipeline.nodes.map((node) => {
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
        })
      ),
    });
  },

  removeTraitFromNode: (nodeId, traitId) => {
    set({
      pipelines: updatePipelineInMap(
        get().pipelines,
        COMPAT_PIPELINE_ID,
        (pipeline) => ({
          nodes: pipeline.nodes.map((node) => {
            if (node.id !== nodeId || node.type !== "agent") return node;
            const agentData = node.data as AgentNodeData;
            return {
              ...node,
              data: {
                ...agentData,
                traitIds: (agentData.traitIds || []).filter(
                  (id) => id !== traitId
                ),
              },
            };
          }),
        })
      ),
    });
  },

  // ============================================================
  // BACKWARD-COMPATIBLE API IMPLEMENTATION
  // These read/write the compat pipeline for existing consumers
  // ============================================================

  // Computed getters that read from compat pipeline
  get pipelineId() {
    const compat = getOrCreateCompatPipeline(get().pipelines);
    // Return the "real" pipelineId if set, otherwise null
    return compat.pipelineId === COMPAT_PIPELINE_ID ? null : compat.pipelineId;
  },

  get pipelineName() {
    return getOrCreateCompatPipeline(get().pipelines).pipelineName;
  },

  get pipelineDescription() {
    return getOrCreateCompatPipeline(get().pipelines).pipelineDescription;
  },

  get nodes() {
    return getOrCreateCompatPipeline(get().pipelines).nodes;
  },

  get edges() {
    return getOrCreateCompatPipeline(get().pipelines).edges;
  },

  // React Flow callbacks for compat pipeline
  onNodesChange: (changes) => {
    set({
      pipelines: updatePipelineInMap(
        get().pipelines,
        COMPAT_PIPELINE_ID,
        (pipeline) => ({
          nodes: applyNodeChanges(changes, pipeline.nodes),
        })
      ),
    });
  },

  onEdgesChange: (changes) => {
    set({
      pipelines: updatePipelineInMap(
        get().pipelines,
        COMPAT_PIPELINE_ID,
        (pipeline) => ({
          edges: applyEdgeChanges(changes, pipeline.edges),
        })
      ),
    });
  },

  onConnect: (connection) => {
    set({
      pipelines: updatePipelineInMap(
        get().pipelines,
        COMPAT_PIPELINE_ID,
        (pipeline) => ({
          edges: addEdge(connection, pipeline.edges),
        })
      ),
    });
  },

  // Legacy setters
  setNodes: (nodes) => {
    set({
      pipelines: updatePipelineInMap(
        get().pipelines,
        COMPAT_PIPELINE_ID,
        () => ({ nodes })
      ),
    });
  },

  setEdges: (edges) => {
    set({
      pipelines: updatePipelineInMap(
        get().pipelines,
        COMPAT_PIPELINE_ID,
        () => ({ edges })
      ),
    });
  },

  setPipelineMetadata: (id, name, description) => {
    set({
      pipelines: updatePipelineInMap(
        get().pipelines,
        COMPAT_PIPELINE_ID,
        () => ({
          // Store the real pipeline ID but keep using compat key
          pipelineId: id || COMPAT_PIPELINE_ID,
          pipelineName: name,
          pipelineDescription: description,
        })
      ),
    });
  },

  reset: () => {
    set({
      pipelines: new Map(get().pipelines).set(
        COMPAT_PIPELINE_ID,
        createCompatPipeline()
      ),
    });
  },
}));
