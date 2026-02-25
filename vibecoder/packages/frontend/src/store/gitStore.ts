import { create } from 'zustand';
import type { GitStatus, GitLogEntry, GitBranch } from '@vibecoder/shared';
import { gitApi } from '../lib/api';

interface GitState {
  status: GitStatus | null;
  log: GitLogEntry[];
  branches: GitBranch[];
  isLoading: boolean;
  error: string | null;
  commitMessage: string;
  diff: string | null;
}

interface GitActions {
  fetchStatus: () => Promise<void>;
  fetchLog: () => Promise<void>;
  fetchBranches: () => Promise<void>;
  stageFiles: (paths: string[]) => Promise<void>;
  stageAll: () => Promise<void>;
  unstageFiles: (paths: string[]) => Promise<void>;
  commit: () => Promise<void>;
  push: () => Promise<void>;
  pull: () => Promise<void>;
  initRepo: () => Promise<void>;
  setCommitMessage: (msg: string) => void;
  fetchDiff: (path?: string) => Promise<void>;
  clearError: () => void;
}

export const useGitStore = create<GitState & GitActions>((set, get) => ({
  status: null,
  log: [],
  branches: [],
  isLoading: false,
  error: null,
  commitMessage: '',
  diff: null,

  fetchStatus: async () => {
    try {
      const status = await gitApi.status();
      set({ status, error: null });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  fetchLog: async () => {
    try {
      const { log } = await gitApi.log();
      set({ log, error: null });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  fetchBranches: async () => {
    try {
      const { branches } = await gitApi.branches();
      set({ branches, error: null });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  stageFiles: async (paths) => {
    set({ isLoading: true });
    try {
      await gitApi.stage(paths);
      await get().fetchStatus();
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ isLoading: false });
    }
  },

  stageAll: async () => {
    set({ isLoading: true });
    try {
      await gitApi.stageAll();
      await get().fetchStatus();
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ isLoading: false });
    }
  },

  unstageFiles: async (paths) => {
    set({ isLoading: true });
    try {
      await gitApi.unstage(paths);
      await get().fetchStatus();
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ isLoading: false });
    }
  },

  commit: async () => {
    const { commitMessage } = get();
    if (!commitMessage.trim()) return;
    set({ isLoading: true });
    try {
      await gitApi.commit(commitMessage.trim());
      set({ commitMessage: '' });
      await get().fetchStatus();
      await get().fetchLog();
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ isLoading: false });
    }
  },

  push: async () => {
    set({ isLoading: true });
    try {
      await gitApi.push();
      await get().fetchStatus();
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ isLoading: false });
    }
  },

  pull: async () => {
    set({ isLoading: true });
    try {
      await gitApi.pull();
      await get().fetchStatus();
      await get().fetchLog();
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ isLoading: false });
    }
  },

  initRepo: async () => {
    set({ isLoading: true });
    try {
      await gitApi.init();
      await get().fetchStatus();
      await get().fetchLog();
      await get().fetchBranches();
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ isLoading: false });
    }
  },

  setCommitMessage: (msg) => set({ commitMessage: msg }),

  fetchDiff: async (path?) => {
    try {
      const { diff } = await gitApi.diff(path);
      set({ diff, error: null });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  clearError: () => set({ error: null }),
}));
