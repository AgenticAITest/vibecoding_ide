import { create } from 'zustand';
import type { FileNode } from '@vibecoder/shared';

interface FileState {
  tree: FileNode[];
  expandedDirs: Set<string>;
  loading: boolean;
  error: string | null;
  projectDir: string;
}

interface FileActions {
  setTree: (tree: FileNode[]) => void;
  toggleDir: (path: string) => void;
  expandDir: (path: string) => void;
  collapseDir: (path: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setProjectDir: (dir: string) => void;
}

export const useFileStore = create<FileState & FileActions>((set, get) => ({
  tree: [],
  expandedDirs: new Set<string>(),
  loading: false,
  error: null,
  projectDir: '',

  setTree: (tree) => set({ tree }),

  toggleDir: (path) => {
    const { expandedDirs } = get();
    const next = new Set(expandedDirs);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    set({ expandedDirs: next });
  },

  expandDir: (path) => {
    const { expandedDirs } = get();
    if (expandedDirs.has(path)) return;
    const next = new Set(expandedDirs);
    next.add(path);
    set({ expandedDirs: next });
  },

  collapseDir: (path) => {
    const { expandedDirs } = get();
    if (!expandedDirs.has(path)) return;
    const next = new Set(expandedDirs);
    next.delete(path);
    set({ expandedDirs: next });
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setProjectDir: (dir) => set({ projectDir: dir }),
}));
