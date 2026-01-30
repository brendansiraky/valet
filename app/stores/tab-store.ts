import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const HOME_TAB_ID = "home";

export interface Tab {
  pipelineId: string;
  name: string;
  pinned?: boolean;
}

const MAX_TABS = 8;

interface TabState {
  tabs: Tab[];
  activeTabId: string | null;

  openTab: (pipelineId: string, name: string) => void;
  closeTab: (pipelineId: string) => void;
  setActiveTab: (pipelineId: string) => void;
  focusOrOpenTab: (pipelineId: string, name: string) => void;
  updateTabName: (pipelineId: string, name: string) => void;
  canOpenNewTab: () => boolean;
}

export const useTabStore = create<TabState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,

      openTab: (pipelineId, name) => {
        const { tabs } = get();

        // Check if already open - focus instead
        if (tabs.some((t) => t.pipelineId === pipelineId)) {
          set({ activeTabId: pipelineId });
          return;
        }

        // Check tab limit
        if (tabs.length >= MAX_TABS) {
          return;
        }

        // Add new tab and set as active
        set({
          tabs: [...tabs, { pipelineId, name }],
          activeTabId: pipelineId,
        });
      },

      closeTab: (pipelineId) => {
        // Pinned home tab cannot be closed
        if (pipelineId === HOME_TAB_ID) return;

        const { tabs, activeTabId } = get();
        const tabIndex = tabs.findIndex((t) => t.pipelineId === pipelineId);
        if (tabIndex === -1) return;

        const newTabs = tabs.filter((t) => t.pipelineId !== pipelineId);

        // Determine new active tab if we closed the active one
        let newActiveId = activeTabId;
        if (activeTabId === pipelineId) {
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

        set({ tabs: newTabs, activeTabId: newActiveId });
      },

      setActiveTab: (pipelineId) => {
        const { tabs } = get();
        // Only set active if tab exists
        if (tabs.some((t) => t.pipelineId === pipelineId)) {
          set({ activeTabId: pipelineId });
        }
      },

      focusOrOpenTab: (pipelineId, name) => {
        const { tabs, openTab, setActiveTab } = get();
        const existing = tabs.find((t) => t.pipelineId === pipelineId);
        if (existing) {
          setActiveTab(pipelineId);
        } else {
          openTab(pipelineId, name);
        }
      },

      updateTabName: (pipelineId, name) => {
        const { tabs } = get();
        set({
          tabs: tabs.map((t) =>
            t.pipelineId === pipelineId ? { ...t, name } : t
          ),
        });
      },

      canOpenNewTab: () => {
        // Exclude home tab from the limit count
        const nonHomeTabs = get().tabs.filter(
          (t) => t.pipelineId !== HOME_TAB_ID
        );
        return nonHomeTabs.length < MAX_TABS;
      },
    }),
    {
      name: "valet-pipeline-tabs",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
      }),
    }
  )
);
