import { useCallback } from 'react';
import type { WSMessage, PreviewInfo } from '@vibecoder/shared';
import { useWebSocket } from './useWebSocket';
import { usePreviewStore } from '../store/previewStore';
import { useTabStore } from '../store/tabStore';

export function usePreviewWatcher() {
  const setPreviewInfo = usePreviewStore((s) => s.setPreviewInfo);
  const clearPreview = usePreviewStore((s) => s.clearPreview);
  const setServerState = usePreviewStore((s) => s.setServerState);

  const handler = useCallback(
    (msg: WSMessage) => {
      switch (msg.type) {
        case 'preview:url-detected': {
          const info = msg.payload as PreviewInfo;
          setPreviewInfo(info);
          setServerState('running');
          // Only auto-open preview tab if it doesn't already exist —
          // never steal focus from the terminal or other tabs
          const tabs = useTabStore.getState().tabs;
          if (!tabs.find((t) => t.id === 'preview')) {
            useTabStore.getState().openTab({
              id: 'preview',
              type: 'preview',
              label: 'Preview',
              closable: true,
            });
          }
          break;
        }
        case 'preview:server-stopped': {
          const { terminalSessionId } = msg.payload as { terminalSessionId: string };
          const currentSession = usePreviewStore.getState().terminalSessionId;
          if (currentSession === terminalSessionId) {
            clearPreview();
            setServerState('stopped');
          }
          break;
        }
      }
    },
    [setPreviewInfo, clearPreview, setServerState]
  );

  useWebSocket('preview', handler);
}
