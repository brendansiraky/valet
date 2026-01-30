import { useState, useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  useTabsQuery,
  useCloseTab,
  useFocusOrOpenTab,
  HOME_TAB_ID,
} from "~/hooks/queries/use-tabs";
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
import {
  ReactFlow,
  Background,
  Controls,
  ReactFlowProvider,
} from "@xyflow/react";
import type { TraitContextValue } from "~/components/pipeline-builder/traits-context";
import { useAgents } from "~/hooks/queries/useAgents";
import { useTraits } from "~/hooks/queries/use-traits";
import {
  usePipeline,
  useRunPipeline,
  type Pipeline,
  type FlowData,
  type AgentNodeData,
} from "~/hooks/queries/use-pipelines";

export default function PipelineEditorPage() {
  const { id: urlId } = useParams();
  const navigate = useNavigate();

  // Fetch data via React Query hooks
  const agentsQuery = useAgents();
  const traitsQuery = useTraits();
  const pipelineQuery = usePipeline(urlId);
  const runPipelineMutation = useRunPipeline();

  // Derive data from queries
  const userAgents = agentsQuery.data?.agents ?? [];
  const userTraits = traitsQuery.data ?? [];
  const requestedPipeline = pipelineQuery.data ?? null;

  const { data: tabState } = useTabsQuery();
  const closeTabMutation = useCloseTab();
  const focusOrOpenTabMutation = useFocusOrOpenTab();
  const queryClient = useQueryClient();

  const tabs = tabState?.tabs ?? [];
  const activeTabId = tabState?.activeTabId ?? null;

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
    () => new Map<string, TraitContextValue>(userTraits.map((t) => [t.id, t])),
    [userTraits]
  );

  // Track which URL we've already synced to tabs to avoid re-running on every render
  const lastSyncedUrlRef = useRef<string | null>(null);

  // Sync URL to tab store - runs during render, not in useEffect
  // This is deterministic: same URL always produces same tab state
  if (urlId && urlId !== "new" && urlId !== lastSyncedUrlRef.current) {
    lastSyncedUrlRef.current = urlId;

    if (urlId === "home") {
      focusOrOpenTabMutation.mutate({ pipelineId: HOME_TAB_ID, name: "Home" });
    } else {
      // Use pipeline name if available, otherwise placeholder
      // The tab name gets updated by PipelineTabPanel when it loads the data
      focusOrOpenTabMutation.mutate({
        pipelineId: urlId,
        name: requestedPipeline?.name || "Untitled Pipeline",
      });
    }
  }

  // Handle tab close - cleanup cache and run states
  const handleTabClose = useCallback(
    (pipelineId: string) => {
      closeTabMutation.mutate(pipelineId);
      // Remove from React Query cache instead of Zustand
      queryClient.removeQueries({ queryKey: ["pipelines", pipelineId] });
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

      // Navigate to first remaining tab or home
      const remaining = tabs.filter(
        (t) => t.pipelineId !== pipelineId && t.pipelineId !== HOME_TAB_ID
      );
      if (remaining.length > 0) {
        navigate(`/pipelines/${remaining[0].pipelineId}`);
      } else {
        navigate("/pipelines/home");
      }
    },
    [closeTabMutation, queryClient, tabs, navigate]
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

  const handleRunSubmit = () => {
    if (!runDialogPipelineId) return;

    const pipelineId = runDialogPipelineId;
    setRunDialogPipelineId(null);
    setRunState(pipelineId, { runId: null, isStarting: true });

    runPipelineMutation.mutate(
      { pipelineId, input: runInput },
      {
        onSuccess: (data) => {
          setRunState(pipelineId, { runId: data.runId, isStarting: false });
        },
        onError: (error) => {
          console.error("Failed to start pipeline:", error);
          setRunState(pipelineId, { runId: null, isStarting: false });
        },
      }
    );

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
      const pipeline = queryClient.getQueryData<Pipeline>(["pipelines", pipelineId]);
      if (!pipeline) return;

      const flowData = pipeline.flowData as FlowData;
      const steps = flowData.nodes
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
    [queryClient]
  );

  const handleRunError = useCallback((pipelineId: string, error: string) => {
    console.error("Pipeline failed:", error);
    setTimeout(
      () => setRunState(pipelineId, { runId: null, isStarting: false }),
      3000
    );
  }, []);

  // Helper to get pipeline steps for RunProgress component
  const getStepsForPipeline = useCallback(
    (pipelineId: string) => {
      const pipeline = queryClient.getQueryData<Pipeline>(["pipelines", pipelineId]);
      if (!pipeline) return [];
      const flowData = pipeline.flowData as FlowData;
      return flowData.nodes
        .filter((n) => n.type === "agent")
        .map((n) => ({
          agentId: (n.data as AgentNodeData).agentId,
          agentName: (n.data as AgentNodeData).agentName,
        }));
    },
    [queryClient]
  );

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

              // Home tab - render locked empty canvas
              if (tab.pipelineId === HOME_TAB_ID) {
                return (
                  <div
                    key={tab.pipelineId}
                    style={{ display: isActive ? "flex" : "none" }}
                    className="absolute inset-0 flex-col"
                  >
                    <ReactFlowProvider>
                      <div className="flex-1 relative">
                        <ReactFlow
                          nodes={[]}
                          edges={[]}
                          nodesDraggable={false}
                          nodesConnectable={false}
                          elementsSelectable={false}
                          deleteKeyCode={null}
                          fitView={false}
                        >
                          <Background />
                          <Controls showInteractive={false} />
                        </ReactFlow>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <p className="text-muted-foreground text-lg">
                            Select a pipeline or create new
                          </p>
                        </div>
                      </div>
                    </ReactFlowProvider>
                  </div>
                );
              }

              // For the requested pipeline, use React Query data
              // For other tabs, need to use data from store (will already be loaded)
              const isCurrentUrlTab = tab.pipelineId === urlId;
              const initialData = isCurrentUrlTab ? requestedPipeline : null;

              // Don't render until we know we have data (or query is disabled for "new")
              // This prevents loading with "Untitled Pipeline" while React Query fetches
              // However, if the pipeline is already in cache, render immediately
              const isQueryEnabled = !!urlId && urlId !== "home" && urlId !== "new";
              const pipelineInCache = !!queryClient.getQueryData(["pipelines", tab.pipelineId]);
              const shouldWaitForData =
                isCurrentUrlTab && isQueryEnabled && pipelineQuery.isPending && !pipelineInCache;

              if (shouldWaitForData) {
                return (
                  <div
                    key={tab.pipelineId}
                    style={{ display: isActive ? "flex" : "none" }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <p className="text-muted-foreground">Loading pipeline...</p>
                  </div>
                );
              }

              return (
                <div
                  key={tab.pipelineId}
                  style={{ display: isActive ? "flex" : "none" }}
                  className="absolute inset-0 flex-col"
                >
                  <PipelineTabPanel
                    pipelineId={tab.pipelineId}
                    initialData={initialData}
                    agents={userAgents}
                    traits={userTraits}
                    traitsMap={traitsMap}
                    runState={runState}
                    onOpenRunDialog={() => handleOpenRunDialog(tab.pipelineId)}
                    onDelete={() => handleTabClose(tab.pipelineId)}
                  />

                  {/* Run progress for this tab */}
                  {runState.runId && (
                    <div className="fixed bottom-4 right-4 w-96 z-50">
                      <RunProgress
                        runId={runState.runId}
                        steps={getStepsForPipeline(tab.pipelineId)}
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
              pipelineName={queryClient.getQueryData<Pipeline>(["pipelines", pipelineId])?.name || "Pipeline"}
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
