import { useState } from "react";
import { X, Plus, Home, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useTabStore, HOME_TAB_ID } from "~/stores/tab-store";
import { usePipelines } from "~/hooks/queries/use-pipelines";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
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
  const { tabs, activeTabId, closeTab, canOpenNewTab, focusOrOpenTab } =
    useTabStore();
  const [confirmCloseId, setConfirmCloseId] = useState<string | null>(null);
  const { data: pipelines = [] } = usePipelines();

  const handleTabClick = (pipelineId: string) => {
    navigate(`/pipelines/${pipelineId}`);
  };

  const handleClose = (e: React.MouseEvent, pipelineId: string) => {
    e.stopPropagation();

    // Home tab cannot be closed
    if (pipelineId === HOME_TAB_ID) return;

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

    // Navigate to remaining tab or home
    const remaining = tabs.filter(
      (t) => t.pipelineId !== pipelineId && t.pipelineId !== HOME_TAB_ID
    );
    if (remaining.length > 0) {
      const lastTab = remaining[remaining.length - 1];
      navigate(`/pipelines/${lastTab.pipelineId}`);
    } else {
      navigate("/pipelines/home");
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

  const handleSelectPipeline = (pipelineId: string, name: string) => {
    // Check if already open as a tab
    const existingTab = tabs.find((t) => t.pipelineId === pipelineId);
    if (existingTab) {
      // Just focus the existing tab
      navigate(`/pipelines/${pipelineId}`);
    } else {
      // Open new tab via navigation (route will add to store)
      focusOrOpenTab(pipelineId, name);
      navigate(`/pipelines/${pipelineId}`);
    }
  };

  // Filter out pipelines already open in tabs for dropdown
  const openTabIds = new Set(tabs.map((t) => t.pipelineId));
  const availablePipelines = pipelines.filter((p) => !openTabIds.has(p.id));

  // Separate regular tabs from home tab
  const regularTabs = tabs.filter((t) => t.pipelineId !== HOME_TAB_ID);

  return (
    <>
      <div className="flex items-center border-b bg-muted/30 px-2 h-10">
        {/* Pinned home tab - fixed width */}
        <button
          onClick={() => handleTabClick(HOME_TAB_ID)}
          className={cn(
            "flex-shrink-0 flex items-center justify-center size-8 rounded-t-md border-b-2 transition-colors",
            "hover:bg-background/50",
            activeTabId === HOME_TAB_ID
              ? "border-primary bg-background"
              : "border-transparent"
          )}
          title="Home"
        >
          <Home className="size-4" />
        </button>

        {/* Regular tabs - flex container that allows shrinking */}
        <div className="flex min-w-0 items-center">
          {regularTabs.map((tab) => (
            <button
              key={tab.pipelineId}
              onClick={() => handleTabClick(tab.pipelineId)}
              className={cn(
                "group flex items-center gap-2 px-3 py-1.5 text-sm rounded-t-md border-b-2 transition-colors",
                "hover:bg-background/50 min-w-0 max-w-44 flex-shrink",
                activeTabId === tab.pipelineId
                  ? "border-primary bg-background"
                  : "border-transparent"
              )}
            >
              <span className="truncate">{tab.name}</span>
              <button
                onClick={(e) => handleClose(e, tab.pipelineId)}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 hover:bg-muted rounded p-0.5 -mr-1"
              >
                <X className="size-3" />
              </button>
            </button>
          ))}
        </div>

        {/* Dropdown for adding tabs - hidden when at limit */}
        {canOpenNewTab() && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="flex-shrink-0 size-8 ml-1">
                <Plus className="size-4" />
                <ChevronDown className="size-3 -ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={handleNewTab} className="font-medium">
                <Plus className="size-4 mr-2" />
                New Pipeline
              </DropdownMenuItem>
              {availablePipelines.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  {availablePipelines.map((pipeline) => (
                    <DropdownMenuItem
                      key={pipeline.id}
                      onClick={() =>
                        handleSelectPipeline(pipeline.id, pipeline.name)
                      }
                    >
                      <span className="truncate">{pipeline.name}</span>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
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
