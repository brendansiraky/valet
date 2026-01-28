import { useState, useEffect } from "react";
import { useLoaderData, useNavigate } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { getSession } from "~/services/session.server";
import { db, pipelines, agents } from "~/db";
import { eq, and } from "drizzle-orm";
import { usePipelineStore } from "~/stores/pipeline-store";
import { PipelineCanvas } from "~/components/pipeline-builder/pipeline-canvas";
import { AgentSidebar } from "~/components/pipeline-builder/agent-sidebar";
import { getLayoutedElements } from "~/lib/pipeline-layout";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { LayoutGrid, Save, Trash2 } from "lucide-react";
import type { Node, Edge } from "@xyflow/react";
import type { AgentNodeData } from "~/stores/pipeline-store";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) {
    return redirect("/login");
  }

  const { id } = params;

  // Fetch user's agents for sidebar
  const userAgents = await db
    .select()
    .from(agents)
    .where(eq(agents.userId, userId));

  // For new pipelines, return null pipeline
  if (id === "new") {
    return { pipeline: null, agents: userAgents };
  }

  // Load existing pipeline
  const [pipeline] = await db
    .select()
    .from(pipelines)
    .where(and(eq(pipelines.id, id!), eq(pipelines.userId, userId)));

  if (!pipeline) {
    throw new Response("Pipeline not found", { status: 404 });
  }

  return { pipeline, agents: userAgents };
}

export default function PipelineBuilderPage() {
  const { pipeline, agents: userAgents } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  const {
    nodes,
    edges,
    pipelineId,
    pipelineName,
    setPipelineMetadata,
    addAgentNode,
    setNodes,
    setEdges,
    reset,
  } = usePipelineStore();

  // Initialize store from loaded pipeline or reset for new
  useEffect(() => {
    if (pipeline) {
      setPipelineMetadata(
        pipeline.id,
        pipeline.name,
        pipeline.description || ""
      );
      const flowData = pipeline.flowData as {
        nodes: Node<AgentNodeData>[];
        edges: Edge[];
      };
      setNodes(flowData.nodes || []);
      setEdges(flowData.edges || []);
    } else {
      reset();
    }
  }, [pipeline, setPipelineMetadata, setNodes, setEdges, reset]);

  const handleDropAgent = (
    agentId: string,
    agentName: string,
    agentInstructions: string | undefined,
    position: { x: number; y: number }
  ) => {
    addAgentNode(
      { id: agentId, name: agentName, instructions: agentInstructions },
      position
    );
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPipelineMetadata(
      pipeline?.id || null,
      e.target.value,
      pipeline?.description || ""
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.set("intent", pipelineId ? "update" : "create");
      if (pipelineId) {
        formData.set("id", pipelineId);
      }
      formData.set("name", pipelineName);
      formData.set("description", "");
      formData.set("flowData", JSON.stringify({ nodes, edges }));

      const response = await fetch("/api/pipelines", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      // If created new, navigate to the saved pipeline
      if (!pipelineId && data.pipeline) {
        navigate(`/pipelines/${data.pipeline.id}`, { replace: true });
      }
    } catch (error) {
      console.error("Failed to save pipeline:", error);
      // TODO: Show toast error
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoLayout = () => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges
    );
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  };

  const handleDelete = async () => {
    if (!pipelineId || !confirm("Delete this pipeline?")) return;

    const formData = new FormData();
    formData.set("intent", "delete");
    formData.set("id", pipelineId);

    await fetch("/api/pipelines", {
      method: "POST",
      body: formData,
    });

    navigate("/pipelines");
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="border-b p-4 flex items-center gap-4">
        <Input
          value={pipelineName}
          onChange={handleNameChange}
          placeholder="Pipeline name"
          className="max-w-xs font-semibold"
        />
        <div className="flex-1" />
        <Button variant="outline" onClick={handleAutoLayout}>
          <LayoutGrid className="w-4 h-4 mr-2" />
          Auto Layout
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
        {pipelineId && (
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        <AgentSidebar agents={userAgents} />
        <div className="flex-1">
          <PipelineCanvas onDropAgent={handleDropAgent} />
        </div>
      </div>
    </div>
  );
}
