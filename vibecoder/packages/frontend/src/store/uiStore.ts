import { create } from 'zustand';

interface UIState {
  chatPanelSize: number;
  fileTreeVisible: boolean;
  fileTreeSize: number;
}

interface UIActions {
  toggleFileTree: () => void;
  showFileTree: () => void;
  setChatPanelSize: (n: number) => void;
  setFileTreeSize: (n: number) => void;
}

export const useUIStore = create<UIState & UIActions>((set) => ({
  chatPanelSize: 340,
  fileTreeVisible: false,
  fileTreeSize: 240,

  toggleFileTree: () => set((s) => ({ fileTreeVisible: !s.fileTreeVisible })),
  showFileTree: () => set({ fileTreeVisible: true }),
  setChatPanelSize: (n: number) => set({ chatPanelSize: n }),
  setFileTreeSize: (n: number) => set({ fileTreeSize: n }),
}));
