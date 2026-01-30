import { X, Plus } from "lucide-react";
import { useNavigate } from "react-router";
import { useTabStore } from "~/stores/tab-store";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";

interface PipelineTabsProps {
  runStates: Map<string, { runId: string | null; isStarting: boolean }>;
  onCloseTab: (pipelineId: string) => void;
}

export function PipelineTabs({ runStates, onCloseTab }: PipelineTabsProps) {
  const navigate = useNavigate();
  const { tabs, activeTabId, closeTab, canOpenNewTab } = useTabStore();

  const handleTabClick = (pipelineId: string) => {
    navigate(`/pipelines/${pipelineId}`);
  };

  const handleClose = (e: React.MouseEvent, pipelineId: string) => {
    e.stopPropagation();
    // Call parent handler which may check for running pipelines (Plan 04)
    onCloseTab(pipelineId);
  };

  const handleNewTab = async () => {
    if (!canOpenNewTab()) {
      // TODO: Add toast notification when toast library is added
      console.warn("Maximum 8 tabs allowed");
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
  );
}
