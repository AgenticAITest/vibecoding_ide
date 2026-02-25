import { create } from 'zustand';
import type { Tab } from '@vibecoder/shared';

interface TabState {
  tabs: Tab[];
  activeTabId: string;
}

interface TabActions {
  openTab: (tab: Tab) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
}

const welcomeTab: Tab = {
  id: 'welcome',
  type: 'welcome',
  label: 'Welcome',
  closable: false,
};

export const useTabStore = create<TabState & TabActions>((set, get) => ({
  tabs: [welcomeTab],
  activeTabId: 'welcome',

  openTab: (tab: Tab) => {
    const { tabs } = get();
    const existing = tabs.find((t) => t.id === tab.id);
    if (existing) {
      set({ activeTabId: tab.id });
    } else {
      set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
    }
  },

  closeTab: (id: string) => {
    const { tabs, activeTabId } = get();
    const tab = tabs.find((t) => t.id === id);
    if (!tab || !tab.closable) return;
    const filtered = tabs.filter((t) => t.id !== id);
    if (activeTabId === id) {
      const idx = tabs.findIndex((t) => t.id === id);
      const nextTab = filtered[Math.min(idx, filtered.length - 1)];
      set({ tabs: filtered, activeTabId: nextTab?.id || 'welcome' });
    } else {
      set({ tabs: filtered });
    }
  },

  setActiveTab: (id: string) => set({ activeTabId: id }),
}));
