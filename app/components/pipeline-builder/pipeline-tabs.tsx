import { useState } from "react";
import { X, Plus } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useTabStore } from "~/stores/tab-store";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";

interface PipelineTabsProps {
  runStates: Map<string, { runId: string | null; isStarting: boolean }>;
  onCloseTab: (pipelineId: string) => void;
}

export function PipelineTabs({ runStates, onCloseTab }: PipelineTabsProps) {
  const navigate = useNavigate();
  const { tabs, activeTabId, closeTab, canOpenNewTab } = useTabStore();
  const [confirmCloseId, setConfirmCloseId] = useState<string | null>(null);

  const handleTabClick = (pipelineId: string) => {
    navigate(`/pipelines/${pipelineId}`);
  };

  const handleClose = (e: React.MouseEvent, pipelineId: string) => {
    e.stopPropagation();

    // Check if pipeline is running
    const runState = runStates.get(pipelineId);
    const isRunning = runState?.runId || runState?.isStarting;

    if (isRunning) {
      setConfirmCloseId(pipelineId);
      return;
    }

    performClose(pipelineId);
  };

  const performClose = (pipelineId: string) => {
    onCloseTab(pipelineId); // Parent cleanup
    closeTab(pipelineId);

    // Navigate to remaining tab or pipelines list
    const remaining = tabs.filter((t) => t.pipelineId !== pipelineId);
    if (remaining.length > 0) {
      const lastTab = remaining[remaining.length - 1];
      navigate(`/pipelines/${lastTab.pipelineId}`);
    } else {
      navigate("/pipelines");
    }

    setConfirmCloseId(null);
  };

  const handleNewTab = async () => {
    if (!canOpenNewTab()) {
      toast.error("Maximum 8 tabs allowed");
      return;
    }

    // Create new pipeline in DB immediately
    const formData = new FormData();
    formData.set("intent", "create");
    formData.set("name", "Untitled Pipeline");
    formData.set("flowData", JSON.stringify({ nodes: [], edges: [] }));

    const response = await fetch("/api/pipelines", {
      method: "POST",
      body: formData,
    });

    const { pipeline } = await response.json();
    navigate(`/pipelines/${pipeline.id}`);
  };

  if (tabs.length === 0) {
    return null; // No tabs = no tab bar
  }

  return (
    <>
      <div className="flex items-center border-b bg-muted/30 px-2 h-10">
        {tabs.map((tab) => (
          <button
            key={tab.pipelineId}
            onClick={() => handleTabClick(tab.pipelineId)}
            className={cn(
              "group flex items-center gap-2 px-3 py-1.5 text-sm rounded-t-md border-b-2 transition-colors",
              "hover:bg-background/50",
              activeTabId === tab.pipelineId
                ? "border-primary bg-background"
                : "border-transparent"
            )}
          >
            <span className="max-w-32 truncate">{tab.name}</span>
            <button
              onClick={(e) => handleClose(e, tab.pipelineId)}
              className="opacity-0 group-hover:opacity-100 hover:bg-muted rounded p-0.5 -mr-1"
            >
              <X className="size-3" />
            </button>
          </button>
        ))}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNewTab}
          disabled={!canOpenNewTab()}
          className="size-8 ml-1"
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <AlertDialog
        open={!!confirmCloseId}
        onOpenChange={(open) => !open && setConfirmCloseId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close running pipeline?</AlertDialogTitle>
            <AlertDialogDescription>
              This pipeline is currently running. Closing it will stop the run
              and you may lose progress.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmCloseId && performClose(confirmCloseId)}
            >
              Close Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
