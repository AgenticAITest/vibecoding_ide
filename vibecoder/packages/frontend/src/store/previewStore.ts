import { create } from 'zustand';
import type { ExpoUrlInfo } from '@vibecoder/shared';

type ServerState = 'idle' | 'starting' | 'running' | 'stopped';

interface PreviewState {
  expoUrl: string | null;
  webUrl: string | null;
  qrDataUrl: string | null;
  terminalSessionId: string | null;
  viewMode: 'qr' | 'web';
  serverState: ServerState;
  expoTerminalId: string | null;
}

interface PreviewActions {
  setExpoInfo: (info: ExpoUrlInfo) => void;
  clearPreview: () => void;
  setViewMode: (mode: 'qr' | 'web') => void;
  setServerState: (state: ServerState) => void;
  setExpoTerminalId: (id: string | null) => void;
}

export const usePreviewStore = create<PreviewState & PreviewActions>((set) => ({
  expoUrl: null,
  webUrl: null,
  qrDataUrl: null,
  terminalSessionId: null,
  viewMode: 'web',
  serverState: 'idle',
  expoTerminalId: null,

  setExpoInfo: (info) =>
    set({
      expoUrl: info.expoUrl,
      webUrl: info.webUrl,
      qrDataUrl: info.qrDataUrl,
      terminalSessionId: info.terminalSessionId,
    }),

  clearPreview: () =>
    set({
      expoUrl: null,
      webUrl: null,
      qrDataUrl: null,
      terminalSessionId: null,
    }),

  setViewMode: (mode) => set({ viewMode: mode }),
  setServerState: (state) => set({ serverState: state }),
  setExpoTerminalId: (id) => set({ expoTerminalId: id }),
}));
