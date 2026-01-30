import { useState, useEffect, useCallback, useMemo } from "react";
import { useLoaderData, useNavigate, useParams } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { getSession } from "~/services/session.server";
import { db, pipelines, agents, traits } from "~/db";
import { eq, and } from "drizzle-orm";
import { useTabStore } from "~/stores/tab-store";
import { usePipelineStore } from "~/stores/pipeline-store";
import { PipelineTabs } from "~/components/pipeline-builder/pipeline-tabs";
import { PipelineTabPanel } from "~/components/pipeline-builder/pipeline-tab-panel";
import { AgentSidebar } from "~/components/pipeline-builder/agent-sidebar";
import { TraitsContext } from "~/components/pipeline-builder/traits-context";
import { RunProgress } from "~/components/pipeline-runner/run-progress";
import { OutputViewer } from "~/components/output-viewer/output-viewer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { Play } from "lucide-react";
import type { Node, Edge } from "@xyflow/react";
import type { AgentNodeData, PipelineNodeData } from "~/stores/pipeline-store";
import type { Trait } from "~/db/schema/traits";
import { useAutosave } from "~/hooks/use-autosave";

// Loader returns data for the requested pipeline
export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) {
    return redirect("/login");
  }

  const { id } = params;

  // Fetch user's agents and traits for sidebar
  const [userAgents, userTraits] = await Promise.all([
    db.select().from(agents).where(eq(agents.userId, userId)),
    db
      .select()
      .from(traits)
      .where(eq(traits.userId, userId))
      .orderBy(traits.name),
  ]);

  // For new pipelines, return null pipeline
  if (id === "new") {
    return {
      requestedPipeline: null,
      requestedId: "new",
      agents: userAgents,
      traits: userTraits,
    };
  }

  // Load the requested pipeline
  const [requestedPipeline] = await db
    .select()
    .from(pipelines)
    .where(and(eq(pipelines.id, id!), eq(pipelines.userId, userId)));

  if (!requestedPipeline) {
    throw new Response("Pipeline not found", { status: 404 });
  }

  return {
    requestedPipeline,
    requestedId: id,
    agents: userAgents,
    traits: userTraits,
  };
}

export default function PipelineEditorPage() {
  const {
    requestedPipeline,
    requestedId,
    agents: userAgents,
    traits: userTraits,
  } = useLoaderData<typeof loader>();
  const { id: urlId } = useParams();
  const navigate = useNavigate();

  const { tabs, activeTabId, closeTab, focusOrOpenTab } = useTabStore();
  const { removePipeline, getPipeline } = usePipelineStore();

  // Per-tab run state (lifted to container to persist across tab switches)
  const [runStates, setRunStates] = useState<
    Map<string, { runId: string | null; isStarting: boolean }>
  >(new Map());
  const [completedOutputs, setCompletedOutputs] = useState<
    Map<
      string,
      {
        steps: Array<{ agentName: string; output: string; input: string }>;
        finalOutput: string;
        usage: { inputTokens: number; outputTokens: number } | null;
        model: string | null;
      }
    >
  >(new Map());
  const [runDialogPipelineId, setRunDialogPipelineId] = useState<string | null>(
    null
  );
  const [runInput, setRunInput] = useState("");

  // Traits lookup map for context
  const traitsMap = useMemo(
    () => new Map(userTraits.map((t) => [t.id, t])),
    [userTraits]
  );

  // Sync URL to tab store on load/navigation
  useEffect(() => {
    if (!urlId || urlId === "new") return;

    // Open or focus the tab for this URL
    focusOrOpenTab(urlId, requestedPipeline?.name || "Untitled Pipeline");
  }, [urlId, requestedPipeline, focusOrOpenTab]);

  // Handle tab close - cleanup store and run states
  const handleTabClose = useCallback(
    (pipelineId: string) => {
      closeTab(pipelineId);
      removePipeline(pipelineId);
      setRunStates((prev) => {
        const next = new Map(prev);
        next.delete(pipelineId);
        return next;
      });
      setCompletedOutputs((prev) => {
        const next = new Map(prev);
        next.delete(pipelineId);
        return next;
      });

      // Navigate to first remaining tab or pipelines list
      const remaining = tabs.filter((t) => t.pipelineId !== pipelineId);
      if (remaining.length > 0) {
        navigate(`/pipelines/${remaining[0].pipelineId}`);
      } else {
        navigate("/pipelines");
      }
    },
    [closeTab, removePipeline, tabs, navigate]
  );

  // Get or create run state for a pipeline
  const getRunState = (pipelineId: string) =>
    runStates.get(pipelineId) || { runId: null, isStarting: false };

  const setRunState = (
    pipelineId: string,
    state: { runId: string | null; isStarting: boolean }
  ) => {
    setRunStates((prev) => new Map(prev).set(pipelineId, state));
  };

  // Run dialog handlers
  const handleOpenRunDialog = (pipelineId: string) => {
    setRunDialogPipelineId(pipelineId);
  };

  const handleRunSubmit = async () => {
    if (!runDialogPipelineId) return;

    const pipelineId = runDialogPipelineId;
    setRunDialogPipelineId(null);
    setRunState(pipelineId, { runId: null, isStarting: true });

    try {
      const formData = new FormData();
      formData.set("input", runInput);

      const response = await fetch(`/api/pipeline/${pipelineId}/run`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setRunState(pipelineId, { runId: data.runId, isStarting: false });
    } catch (error) {
      console.error("Failed to start pipeline:", error);
      setRunState(pipelineId, { runId: null, isStarting: false });
    }

    setRunInput("");
  };

  const handleRunComplete = useCallback(
    (
      pipelineId: string,
      finalOutput: string,
      stepOutputs: Map<number, string>,
      stepInputs: Map<number, string>,
      usage: { inputTokens: number; outputTokens: number } | null,
      model: string | null
    ) => {
      const pipeline = getPipeline(pipelineId);
      if (!pipeline) return;

      const steps = pipeline.nodes
        .filter((n) => n.type === "agent")
        .map((node, index) => ({
          agentName: (node.data as AgentNodeData).agentName,
          output: stepOutputs.get(index) || "",
          input: stepInputs.get(index) || "",
        }));

      setCompletedOutputs((prev) =>
        new Map(prev).set(pipelineId, {
          steps,
          finalOutput,
          usage,
          model,
        })
      );
      setRunState(pipelineId, { runId: null, isStarting: false });
    },
    [getPipeline]
  );

  const handleRunError = useCallback((pipelineId: string, error: string) => {
    console.error("Pipeline failed:", error);
    setTimeout(
      () => setRunState(pipelineId, { runId: null, isStarting: false }),
      3000
    );
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Tab bar */}
      <PipelineTabs runStates={runStates} onCloseTab={handleTabClose} />

      {/* Main content: sidebar + tab panels */}
      <div className="flex flex-1 min-h-0">
        {/* Shared sidebar */}
        <AgentSidebar agents={userAgents} traits={userTraits} />

        {/* Tab panels (CSS hidden when not active) */}
        <TraitsContext.Provider value={traitsMap}>
          <div className="flex-1 relative">
            {tabs.map((tab) => {
              const isActive = tab.pipelineId === activeTabId;
              const runState = getRunState(tab.pipelineId);

              // For the requested pipeline, use loader data
              // For other tabs, need to use data from store (will already be loaded)
              const initialData =
                tab.pipelineId === requestedId
                  ? requestedPipeline
                  : null; // PipelineTabPanel will use store data if pipeline already loaded

              return (
                <div
                  key={tab.pipelineId}
                  style={{ display: isActive ? "flex" : "none" }}
                  className="absolute inset-0 flex-col"
                >
                  <PipelineTabPanelWithAutosave
                    pipelineId={tab.pipelineId}
                    initialData={initialData}
                    agents={userAgents}
                    traits={userTraits}
                    traitsMap={traitsMap}
                    runState={runState}
                    onOpenRunDialog={() => handleOpenRunDialog(tab.pipelineId)}
                  />

                  {/* Run progress for this tab */}
                  {runState.runId && (
                    <div className="fixed bottom-4 right-4 w-96 z-50">
                      <RunProgress
                        runId={runState.runId}
                        steps={
                          getPipeline(tab.pipelineId)
                            ?.nodes.filter((n) => n.type === "agent")
                            .map((n) => ({
                              agentId: (n.data as AgentNodeData).agentId,
                              agentName: (n.data as AgentNodeData).agentName,
                            })) || []
                        }
                        onComplete={(final, outputs, inputs, usage, model) =>
                          handleRunComplete(
                            tab.pipelineId,
                            final,
                            outputs,
                            inputs,
                            usage,
                            model
                          )
                        }
                        onError={(err) => handleRunError(tab.pipelineId, err)}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Empty state when no tabs */}
            {tabs.length === 0 && (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Open a pipeline from the list or create a new one
              </div>
            )}
          </div>
        </TraitsContext.Provider>
      </div>

      {/* Output viewer modals */}
      {Array.from(completedOutputs.entries()).map(([pipelineId, output]) => (
        <div
          key={pipelineId}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        >
          <div className="w-full max-w-4xl mx-4">
            <OutputViewer
              steps={output.steps}
              finalOutput={output.finalOutput}
              pipelineName={getPipeline(pipelineId)?.pipelineName || "Pipeline"}
              usage={output.usage}
              model={output.model}
              onClose={() =>
                setCompletedOutputs((prev) => {
                  const next = new Map(prev);
                  next.delete(pipelineId);
                  return next;
                })
              }
            />
          </div>
        </div>
      ))}

      {/* Run input dialog */}
      <Dialog
        open={!!runDialogPipelineId}
        onOpenChange={(open) => !open && setRunDialogPipelineId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run Pipeline</DialogTitle>
            <DialogDescription>
              Enter the input text for this pipeline run.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter your input here..."
            value={runInput}
            onChange={(e) => setRunInput(e.target.value)}
            rows={6}
            className="resize-none"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRunDialogPipelineId(null)}
            >
              Cancel
            </Button>
            <Button onClick={handleRunSubmit}>
              <Play className="size-4 mr-2" />
              Run Pipeline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Wrapper that adds autosave to each tab panel
function PipelineTabPanelWithAutosave({
  pipelineId,
  initialData,
  agents,
  traits,
  traitsMap,
  runState,
  onOpenRunDialog,
}: {
  pipelineId: string;
  initialData: {
    id: string;
    name: string;
    description: string | null;
    flowData: unknown;
  } | null;
  agents: Array<{ id: string; name: string; instructions: string | null }>;
  traits: Array<{ id: string; name: string; color: string }>;
  traitsMap: Map<string, Trait>;
  runState: { runId: string | null; isStarting: boolean };
  onOpenRunDialog: () => void;
}) {
  // Autosave for this pipeline
  useAutosave(pipelineId);

  return (
    <PipelineTabPanel
      pipelineId={pipelineId}
      initialData={initialData}
      agents={agents}
      traits={traits}
      traitsMap={traitsMap}
      runState={runState}
      onOpenRunDialog={onOpenRunDialog}
    />
  );
}
