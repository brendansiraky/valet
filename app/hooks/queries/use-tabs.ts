import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { TabData } from "~/db/schema/pipeline-tabs";

export const HOME_TAB_ID = "home";
const MAX_TABS = 8;

export interface TabState {
  tabs: TabData[];
  activeTabId: string | null;
}

// API input shape - name is NOT sent, it's derived from pipeline join
interface TabInput {
  pipelineId: string;
  pinned?: boolean;
}

interface TabsPayload {
  tabs: TabInput[];
  activeTabId: string | null;
}

// --- Query ---

// Home tab is a client-only concept - always present, never stored in DB
const HOME_TAB: TabData = {
  id: "home-tab",
  pipelineId: HOME_TAB_ID,
  name: "Home",
  pinned: true,
  position: -1, // Always first
  isActive: false, // Derived from activeTabId, not this field
};

async function fetchTabs(): Promise<TabState> {
  const res = await fetch("/api/tabs");
  if (!res.ok) throw new Error("Failed to fetch tabs");
  const data: TabState = await res.json();

  // Prepend home tab to server tabs
  return {
    tabs: [HOME_TAB, ...data.tabs],
    activeTabId: data.activeTabId,
  };
}

export function useTabsQuery() {
  return useQuery({
    queryKey: ["tabs"],
    queryFn: fetchTabs,
    staleTime: Infinity, // Managed via mutations, not polling
  });
}

// --- Save Mutation (internal) ---

// Convert TabData[] to TabInput[] for API
// Filters out home tab - it's a client-only concept, not stored in DB
function toTabInputs(tabs: TabData[]): TabInput[] {
  return tabs
    .filter((t) => t.pipelineId !== HOME_TAB_ID)
    .map((t) => ({
      pipelineId: t.pipelineId,
      pinned: t.pinned,
    }));
}

async function saveTabs(payload: TabsPayload): Promise<TabState> {
  const res = await fetch("/api/tabs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to save tabs");
  return res.json();
}

export function useSaveTabsMutation() {
  return useMutation({
    mutationFn: saveTabs,
  });
}

// --- Helper ---

export function canOpenNewTab(tabs: TabData[]): boolean {
  // Exclude home tab from the limit count
  const nonHomeTabs = tabs.filter((t) => t.pipelineId !== HOME_TAB_ID);
  return nonHomeTabs.length < MAX_TABS;
}

// --- Action Hooks ---

export function useOpenTab() {
  const queryClient = useQueryClient();
  const saveMutation = useSaveTabsMutation();

  return useMutation({
    mutationFn: async ({ pipelineId, name }: { pipelineId: string; name: string }) => {
      const current = queryClient.getQueryData<TabState>(["tabs"]);
      if (!current) throw new Error("Tab state not loaded");

      // Check if already open - just switch active
      if (current.tabs.some((t) => t.pipelineId === pipelineId)) {
        return saveMutation.mutateAsync({
          tabs: toTabInputs(current.tabs),
          activeTabId: pipelineId,
        });
      }

      // Check tab limit
      if (!canOpenNewTab(current.tabs)) {
        throw new Error("Maximum tabs reached");
      }

      // Add new tab and set as active
      const newTabs = [...current.tabs, { pipelineId, name, pinned: false } as TabData];
      return saveMutation.mutateAsync({
        tabs: toTabInputs(newTabs),
        activeTabId: pipelineId,
      });
    },
    onMutate: async ({ pipelineId, name }) => {
      await queryClient.cancelQueries({ queryKey: ["tabs"] });
      const previous = queryClient.getQueryData<TabState>(["tabs"]);

      if (previous) {
        // Check if already open - just switch active
        if (previous.tabs.some((t) => t.pipelineId === pipelineId)) {
          queryClient.setQueryData<TabState>(["tabs"], {
            ...previous,
            activeTabId: pipelineId,
          });
        } else if (canOpenNewTab(previous.tabs)) {
          // Optimistically add with name for UI (will be replaced by server response)
          queryClient.setQueryData<TabState>(["tabs"], {
            tabs: [...previous.tabs, { pipelineId, name, pinned: false } as TabData],
            activeTabId: pipelineId,
          });
        }
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["tabs"], context.previous);
      }
    },
    onSettled: () => {
      // Refetch to get accurate names from server
      queryClient.invalidateQueries({ queryKey: ["tabs"] });
    },
  });
}

export function useCloseTab() {
  const queryClient = useQueryClient();
  const saveMutation = useSaveTabsMutation();

  return useMutation({
    mutationFn: async (pipelineId: string) => {
      // Home tab cannot be closed
      if (pipelineId === HOME_TAB_ID) {
        throw new Error("Cannot close home tab");
      }

      // onMutate has already:
      // 1. Removed the closed tab from cache
      // 2. Computed the new activeTabId
      // So we just persist the current (post-optimistic-update) state
      const current = queryClient.getQueryData<TabState>(["tabs"]);
      if (!current) throw new Error("Tab state not loaded");

      return saveMutation.mutateAsync({
        tabs: toTabInputs(current.tabs),
        activeTabId: current.activeTabId,
      });
    },
    onMutate: async (pipelineId) => {
      if (pipelineId === HOME_TAB_ID) return { previous: undefined };

      await queryClient.cancelQueries({ queryKey: ["tabs"] });
      const previous = queryClient.getQueryData<TabState>(["tabs"]);

      if (previous) {
        const tabIndex = previous.tabs.findIndex((t) => t.pipelineId === pipelineId);
        if (tabIndex !== -1) {
          const newTabs = previous.tabs.filter((t) => t.pipelineId !== pipelineId);

          let newActiveId = previous.activeTabId;
          if (previous.activeTabId === pipelineId) {
            if (newTabs.length === 0) {
              newActiveId = null;
            } else if (tabIndex >= newTabs.length) {
              newActiveId = newTabs[newTabs.length - 1].pipelineId;
            } else {
              newActiveId = newTabs[tabIndex].pipelineId;
            }
          }

          queryClient.setQueryData<TabState>(["tabs"], {
            tabs: newTabs,
            activeTabId: newActiveId,
          });
        }
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["tabs"], context.previous);
      }
    },
  });
}

export function useSetActiveTab() {
  const queryClient = useQueryClient();
  const saveMutation = useSaveTabsMutation();

  return useMutation({
    mutationFn: async (pipelineId: string) => {
      const current = queryClient.getQueryData<TabState>(["tabs"]);
      if (!current) throw new Error("Tab state not loaded");

      // Only set active if tab exists
      if (!current.tabs.some((t) => t.pipelineId === pipelineId)) {
        throw new Error("Tab not found");
      }

      return saveMutation.mutateAsync({
        tabs: toTabInputs(current.tabs),
        activeTabId: pipelineId,
      });
    },
    onMutate: async (pipelineId) => {
      await queryClient.cancelQueries({ queryKey: ["tabs"] });
      const previous = queryClient.getQueryData<TabState>(["tabs"]);

      if (previous && previous.tabs.some((t) => t.pipelineId === pipelineId)) {
        queryClient.setQueryData<TabState>(["tabs"], {
          ...previous,
          activeTabId: pipelineId,
        });
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["tabs"], context.previous);
      }
    },
  });
}

export function useFocusOrOpenTab() {
  const queryClient = useQueryClient();
  const saveMutation = useSaveTabsMutation();

  return useMutation({
    mutationFn: async ({ pipelineId, name }: { pipelineId: string; name: string }) => {
      const current = queryClient.getQueryData<TabState>(["tabs"]);
      if (!current) throw new Error("Tab state not loaded");

      const existing = current.tabs.find((t) => t.pipelineId === pipelineId);
      if (existing) {
        // Focus existing tab
        return saveMutation.mutateAsync({
          tabs: toTabInputs(current.tabs),
          activeTabId: pipelineId,
        });
      } else {
        // Open new tab
        if (!canOpenNewTab(current.tabs)) {
          throw new Error("Maximum tabs reached");
        }
        const newTabs = [...current.tabs, { pipelineId, name, pinned: false } as TabData];
        return saveMutation.mutateAsync({
          tabs: toTabInputs(newTabs),
          activeTabId: pipelineId,
        });
      }
    },
    onMutate: async ({ pipelineId, name }) => {
      await queryClient.cancelQueries({ queryKey: ["tabs"] });
      const previous = queryClient.getQueryData<TabState>(["tabs"]);

      if (previous) {
        const existing = previous.tabs.find((t) => t.pipelineId === pipelineId);
        if (existing) {
          queryClient.setQueryData<TabState>(["tabs"], {
            ...previous,
            activeTabId: pipelineId,
          });
        } else if (canOpenNewTab(previous.tabs)) {
          // Optimistically add with name for UI (will be replaced by server response)
          queryClient.setQueryData<TabState>(["tabs"], {
            tabs: [...previous.tabs, { pipelineId, name, pinned: false } as TabData],
            activeTabId: pipelineId,
          });
        }
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["tabs"], context.previous);
      }
    },
    onSettled: () => {
      // Refetch to get accurate names from server
      queryClient.invalidateQueries({ queryKey: ["tabs"] });
    },
  });
}

/**
 * Updates the tab name in the local cache ONLY.
 *
 * With the normalized schema, tab names come from the pipelines table via JOIN.
 * This hook provides immediate UI feedback by updating the cache.
 * The actual persistence happens via useUpdatePipelineName.
 *
 * When the pipeline name is updated, invalidate the tabs query to refresh
 * names from the server.
 */
export function useUpdateTabName() {
  const queryClient = useQueryClient();

  return useMutation({
    // This is a cache-only mutation - returns immediately
    mutationFn: async ({ pipelineId, name }: { pipelineId: string; name: string }) => {
      return { pipelineId, name };
    },
    onMutate: async ({ pipelineId, name }) => {
      await queryClient.cancelQueries({ queryKey: ["tabs"] });
      const previous = queryClient.getQueryData<TabState>(["tabs"]);

      if (previous) {
        queryClient.setQueryData<TabState>(["tabs"], {
          tabs: previous.tabs.map((t) =>
            t.pipelineId === pipelineId ? { ...t, name } : t
          ),
          activeTabId: previous.activeTabId,
        });
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["tabs"], context.previous);
      }
    },
  });
}
