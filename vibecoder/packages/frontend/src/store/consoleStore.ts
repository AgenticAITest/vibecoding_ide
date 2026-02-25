import { create } from 'zustand';
import type { LogEntry } from '@vibecoder/shared';

const MAX_ENTRIES = 500;

type FilterType = 'all' | 'console' | 'network';

interface ConsoleState {
  entries: LogEntry[];
  filter: FilterType;
  addEntry: (entry: LogEntry) => void;
  clear: () => void;
  setFilter: (f: FilterType) => void;
}

export const useConsoleStore = create<ConsoleState>((set) => ({
  entries: [],
  filter: 'all',

  addEntry: (entry) =>
    set((state) => {
      const next = [...state.entries, entry];
      if (next.length > MAX_ENTRIES) {
        return { entries: next.slice(next.length - MAX_ENTRIES) };
      }
      return { entries: next };
    }),

  clear: () => set({ entries: [] }),

  setFilter: (filter) => set({ filter }),
}));
