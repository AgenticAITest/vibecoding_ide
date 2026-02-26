import { create } from 'zustand';
import type { PreviewInfo, ProjectFramework } from '@vibecoder/shared';

type ServerState = 'idle' | 'starting' | 'running' | 'stopped';

interface PreviewState {
  nativeUrl: string | null;
  webUrl: string | null;
  qrDataUrl: string | null;
  terminalSessionId: string | null;
  viewMode: 'qr' | 'web';
  serverState: ServerState;
  previewTerminalId: string | null;
  framework: ProjectFramework;
}

interface PreviewActions {
  setPreviewInfo: (info: PreviewInfo) => void;
  clearPreview: () => void;
  setViewMode: (mode: 'qr' | 'web') => void;
  setServerState: (state: ServerState) => void;
  setPreviewTerminalId: (id: string | null) => void;
  setFramework: (fw: ProjectFramework) => void;
}

export const usePreviewStore = create<PreviewState & PreviewActions>((set) => ({
  nativeUrl: null,
  webUrl: null,
  qrDataUrl: null,
  terminalSessionId: null,
  viewMode: 'web',
  serverState: 'idle',
  previewTerminalId: null,
  framework: 'expo',

  setPreviewInfo: (info) =>
    set({
      nativeUrl: info.nativeUrl,
      webUrl: info.webUrl,
      qrDataUrl: info.qrDataUrl,
      terminalSessionId: info.terminalSessionId,
      framework: info.framework,
    }),

  clearPreview: () =>
    set({
      nativeUrl: null,
      webUrl: null,
      qrDataUrl: null,
      terminalSessionId: null,
    }),

  setViewMode: (mode) => set({ viewMode: mode }),
  setServerState: (state) => set({ serverState: state }),
  setPreviewTerminalId: (id) => set({ previewTerminalId: id }),
  setFramework: (fw) => set({ framework: fw }),
}));
