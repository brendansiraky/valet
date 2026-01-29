import { useState, useEffect, useCallback, useMemo } from "react";
import { useLoaderData, useNavigate } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { getSession } from "~/services/session.server";
import { db, pipelines, agents, pipelineTemplates } from "~/db";
import { eq, and } from "drizzle-orm";
import { usePipelineStore } from "~/stores/pipeline-store";
import { PipelineCanvas } from "~/components/pipeline-builder/pipeline-canvas";
import { AgentSidebar } from "~/components/pipeline-builder/agent-sidebar";
import {
  TemplateDialog,
  type TemplateVariable,
} from "~/components/pipeline-builder/template-dialog";
import { VariableFillDialog } from "~/components/pipeline-builder/variable-fill-dialog";
import { RunProgress } from "~/components/pipeline-runner/run-progress";
import { OutputViewer } from "~/components/output-viewer/output-viewer";
import { getLayoutedElements } from "~/lib/pipeline-layout";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { LayoutGrid, Save, Trash2, FileCode, Play, Loader2 } from "lucide-react";
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
    return { pipeline: null, agents: userAgents, template: null };
  }

  // Load existing pipeline
  const [pipeline] = await db
    .select()
    .from(pipelines)
    .where(and(eq(pipelines.id, id!), eq(pipelines.userId, userId)));

  if (!pipeline) {
    throw new Response("Pipeline not found", { status: 404 });
  }

  // Load template if exists
  const [template] = await db
    .select()
    .from(pipelineTemplates)
    .where(eq(pipelineTemplates.pipelineId, id!));

  return { pipeline, agents: userAgents, template: template || null };
}

export default function PipelineBuilderPage() {
  const {
    pipeline,
    agents: userAgents,
    template,
  } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [variableFillDialogOpen, setVariableFillDialogOpen] = useState(false);
  const [templateVariables, setTemplateVariables] = useState<
    TemplateVariable[]
  >(template?.variables || []);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [isStartingRun, setIsStartingRun] = useState(false);
  const [completedOutput, setCompletedOutput] = useState<{
    steps: Array<{ agentName: string; output: string }>;
    finalOutput: string;
    usage: { inputTokens: number; outputTokens: number } | null;
    model: string | null;
  } | null>(null);

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

  const handleSaveTemplate = useCallback(
    async (variables: TemplateVariable[]) => {
      if (!pipelineId) return;

      const formData = new FormData();
      formData.set("intent", "create-template");
      formData.set("pipelineId", pipelineId);
      formData.set("variables", JSON.stringify(variables));

      const response = await fetch("/api/pipelines", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setTemplateVariables(variables);
    },
    [pipelineId]
  );

  // Get steps from store nodes for progress display
  const pipelineSteps = useMemo(() => {
    return nodes.map((node) => ({
      agentId: node.data.agentId,
      agentName: node.data.agentName,
    }));
  }, [nodes]);

  // Start pipeline execution by calling API and tracking run ID
  const startPipelineRun = async (
    input: string,
    variables?: Record<string, string>
  ) => {
    if (!pipelineId) return;

    setIsStartingRun(true);
    try {
      const formData = new FormData();
      formData.set("input", input);
      if (variables) {
        formData.set("variables", JSON.stringify(variables));
      }

      const response = await fetch(`/api/pipeline/${pipelineId}/run`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setCurrentRunId(data.runId);
      setVariableFillDialogOpen(false);
    } catch (error) {
      console.error("Failed to start pipeline:", error);
      // TODO: Show toast error
    } finally {
      setIsStartingRun(false);
    }
  };

  const handleRun = async () => {
    // If template has variables, show variable fill dialog
    if (templateVariables.length > 0) {
      setVariableFillDialogOpen(true);
    } else {
      // Run directly with empty input (first agent uses its instructions)
      await startPipelineRun("");
    }
  };

  const handleRunWithVariables = async (values: Record<string, string>) => {
    // Pass empty input - first agent uses its instructions
    // Variables are substituted in agent instructions by executor
    await startPipelineRun("", values);
  };

  const handleRunComplete = useCallback((
    finalOutput: string,
    stepOutputs: Map<number, string>,
    usage: { inputTokens: number; outputTokens: number } | null,
    model: string | null
  ) => {
    // Convert stepOutputs map to array with agent names
    const steps = pipelineSteps.map((step, index) => ({
      agentName: step.agentName,
      output: stepOutputs.get(index) || "",
    }));

    setCompletedOutput({ steps, finalOutput, usage, model });
    setCurrentRunId(null);
  }, [pipelineSteps]);

  const handleRunError = useCallback((error: string) => {
    console.error("Pipeline failed:", error);
    // Reset run state after a brief delay to show error message
    setTimeout(() => setCurrentRunId(null), 3000);
    // TODO: Show toast error
  }, []);

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
          <>
            <Button
              variant="outline"
              onClick={() => setTemplateDialogOpen(true)}
            >
              <FileCode className="w-4 h-4 mr-2" />
              {templateVariables.length > 0 ? "Edit Template" : "Save as Template"}
            </Button>
            <Button
              onClick={handleRun}
              disabled={isStartingRun || !!currentRunId}
            >
              {isStartingRun ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : currentRunId ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run
                </>
              )}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        <AgentSidebar agents={userAgents} />
        <div className="flex-1">
          <PipelineCanvas onDropAgent={handleDropAgent} />
        </div>
      </div>

      {/* Run Progress */}
      {currentRunId && (
        <div className="fixed bottom-4 right-4 w-96 z-50">
          <RunProgress
            runId={currentRunId}
            steps={pipelineSteps}
            onComplete={handleRunComplete}
            onError={handleRunError}
          />
        </div>
      )}

      {/* Output Viewer Modal */}
      {completedOutput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-full max-w-4xl mx-4">
            <OutputViewer
              steps={completedOutput.steps}
              finalOutput={completedOutput.finalOutput}
              pipelineName={pipelineName}
              usage={completedOutput.usage}
              model={completedOutput.model}
              onClose={() => setCompletedOutput(null)}
            />
          </div>
        </div>
      )}

      {/* Dialogs */}
      {pipelineId && (
        <>
          <TemplateDialog
            open={templateDialogOpen}
            onOpenChange={setTemplateDialogOpen}
            pipelineId={pipelineId}
            onSave={handleSaveTemplate}
            initialVariables={templateVariables}
          />
          <VariableFillDialog
            open={variableFillDialogOpen}
            onOpenChange={setVariableFillDialogOpen}
            templateName={pipelineName}
            variables={templateVariables}
            onSubmit={handleRunWithVariables}
          />
        </>
      )}
    </div>
  );
}
