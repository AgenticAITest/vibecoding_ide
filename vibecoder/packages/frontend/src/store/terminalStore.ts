import { create } from 'zustand';

interface TerminalSession {
  id: string;
  number: number;
}

interface TerminalState {
  sessions: TerminalSession[];
  counter: number;
}

interface TerminalActions {
  addSession: (id: string, number: number) => void;
  removeSession: (id: string) => void;
  nextTerminalNumber: () => number;
}

export const useTerminalStore = create<TerminalState & TerminalActions>((set, get) => ({
  sessions: [],
  counter: 0,

  addSession: (id, number) => {
    set((s) => ({
      sessions: [...s.sessions, { id, number }],
    }));
  },

  removeSession: (id) => {
    set((s) => ({
      sessions: s.sessions.filter((t) => t.id !== id),
    }));
  },

  nextTerminalNumber: () => {
    const next = get().counter + 1;
    set({ counter: next });
    return next;
  },
}));
