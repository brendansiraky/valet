import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { TabData } from "~/db/schema/user-tabs";

export const HOME_TAB_ID = "home";
const MAX_TABS = 8;

interface TabState {
  tabs: TabData[];
  activeTabId: string | null;
}

// --- Query ---

async function fetchTabs(): Promise<TabState> {
  const res = await fetch("/api/tabs");
  if (!res.ok) throw new Error("Failed to fetch tabs");
  return res.json();
}

export function useTabsQuery() {
  return useQuery({
    queryKey: ["tabs"],
    queryFn: fetchTabs,
    staleTime: Infinity, // Managed via mutations, not polling
  });
}

// --- Save Mutation (internal) ---

async function saveTabs(state: TabState): Promise<TabState> {
  const res = await fetch("/api/tabs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
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
        return saveMutation.mutateAsync({ ...current, activeTabId: pipelineId });
      }

      // Check tab limit
      if (!canOpenNewTab(current.tabs)) {
        throw new Error("Maximum tabs reached");
      }

      // Add new tab and set as active
      return saveMutation.mutateAsync({
        tabs: [...current.tabs, { pipelineId, name }],
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
          queryClient.setQueryData<TabState>(["tabs"], {
            tabs: [...previous.tabs, { pipelineId, name }],
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

      const current = queryClient.getQueryData<TabState>(["tabs"]);
      if (!current) throw new Error("Tab state not loaded");

      const tabIndex = current.tabs.findIndex((t) => t.pipelineId === pipelineId);
      if (tabIndex === -1) {
        throw new Error("Tab not found");
      }

      const newTabs = current.tabs.filter((t) => t.pipelineId !== pipelineId);

      // Determine new active tab if we closed the active one
      let newActiveId = current.activeTabId;
      if (current.activeTabId === pipelineId) {
        if (newTabs.length === 0) {
          newActiveId = null;
        } else if (tabIndex >= newTabs.length) {
          // Closed last tab, activate new last
          newActiveId = newTabs[newTabs.length - 1].pipelineId;
        } else {
          // Activate tab at same index (which is now the next tab)
          newActiveId = newTabs[tabIndex].pipelineId;
        }
      }

      return saveMutation.mutateAsync({ tabs: newTabs, activeTabId: newActiveId });
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

      return saveMutation.mutateAsync({ ...current, activeTabId: pipelineId });
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
        return saveMutation.mutateAsync({ ...current, activeTabId: pipelineId });
      } else {
        // Open new tab
        if (!canOpenNewTab(current.tabs)) {
          throw new Error("Maximum tabs reached");
        }
        return saveMutation.mutateAsync({
          tabs: [...current.tabs, { pipelineId, name }],
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
          queryClient.setQueryData<TabState>(["tabs"], {
            tabs: [...previous.tabs, { pipelineId, name }],
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
  });
}

export function useUpdateTabName() {
  const queryClient = useQueryClient();
  const saveMutation = useSaveTabsMutation();

  return useMutation({
    mutationFn: async ({ pipelineId, name }: { pipelineId: string; name: string }) => {
      const current = queryClient.getQueryData<TabState>(["tabs"]);
      if (!current) throw new Error("Tab state not loaded");

      return saveMutation.mutateAsync({
        tabs: current.tabs.map((t) =>
          t.pipelineId === pipelineId ? { ...t, name } : t
        ),
        activeTabId: current.activeTabId,
      });
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
